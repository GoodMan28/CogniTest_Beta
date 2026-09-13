"""
Turns a validated prepared-data bundle into stored MongoDB documents:
students, original + practice questions, and one fully-computed report per
evaluated student, under a new build id. Publication (a separate, explicit
step) is the only thing that makes any of this visible to students —
run_preparation_algorithm never sets analysisDemo.status to PUBLISHED.

Only app.services.bundle.validate_bundle's output (a ValidatedBundle) is
accepted; this function does not parse or validate raw JSON itself. See
CogniTest_REMEDIATION_PROMPTS.md Section 5 ("Preparation algorithm") for
the numbered steps this implements.
"""
import datetime
import hashlib
import json
import uuid
from typing import Any, Dict, List

from bson import ObjectId

from app.domain.comparisons import build_cohort_aggregates
from app.domain.results import build_question_results
from app.domain.snapshot import build_student_snapshot
from app.repositories.questions import upsert_demo_questions, upsert_practice_questions
from app.repositories.reports import upsert_student_reports
from app.repositories.students import find_case_insensitive_collisions, upsert_students
from app.repositories.tests import acquire_build_lock, get_build_status, mark_build_failed, update_test
from app.schemas.reports import QuestionResult
from app.services.bundle import ValidatedBundle
from app.services.validation import check_bson_size


def _hash_content(data: Any) -> str:
    serialized = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode()).hexdigest()


def run_preparation_algorithm(bundle: ValidatedBundle) -> None:
    institute_id = ObjectId(bundle.manifest.instituteId)
    test_key = bundle.manifest.testKey

    # 2. Resolve identity collisions before writing anything.
    collisions = find_case_insensitive_collisions(
        institute_id, [s.model_dump() for s in bundle.roster]
    )
    if collisions:
        raise ValueError("Roster identity collision(s): " + "; ".join(collisions))

    # Canonicalize (sorted, so semantically-identical file ordering never
    # changes the hash) and compute the source hash.
    sorted_questions = sorted((q.model_dump() for q in bundle.questions), key=lambda q: q["questionNo"])
    sorted_answer_key = sorted((a.model_dump() for a in bundle.answer_key), key=lambda a: a["questionNo"])
    sorted_roster = sorted((s.model_dump() for s in bundle.roster), key=lambda s: s["enrollmentNo"])
    sorted_responses = sorted((r.model_dump() for r in bundle.responses), key=lambda r: r["enrollmentNo"])
    sorted_recommendations = sorted(
        (r.model_dump() for r in bundle.recommendations), key=lambda r: r["originalQuestionNo"]
    )

    canonical_state = {
        "manifest": bundle.manifest.model_dump(mode="json"),
        "questions": sorted_questions,
        "answer_key": sorted_answer_key,
        "roster": sorted_roster,
        "responses": sorted_responses,
        "recommendations": sorted_recommendations,
    }
    source_hash = _hash_content(canonical_state)
    new_build_id = str(uuid.uuid4())

    # 5/6. Acquire the build lock. acquire_build_lock alone cannot say
    # *why* it declined (that would break its single atomic decision
    # point), so on failure we do one extra read purely to build a
    # specific, actionable error message for the operator.
    test_id = acquire_build_lock(
        institute_id,
        test_key,
        new_build_id,
        source_hash,
        manifest_title=bundle.manifest.title,
        manifest_date=bundle.manifest.date,
        manifest_exam_type=bundle.manifest.examType,
    )
    if not test_id:
        status_info = get_build_status(institute_id, test_key)
        if status_info is None:
            raise RuntimeError("Could not acquire build lock for an unknown reason.")
        status = status_info["status"]
        if status == "BUILDING":
            raise RuntimeError(
                "Cannot prepare: another build is currently in progress for this test. "
                "If that process has definitely stopped, an operator must confirm that "
                "before recovering the lock (see RUNBOOK.md)."
            )
        if status_info["sourceHash"] == source_hash and status in ("READY", "PUBLISHED"):
            # Idempotency rule (Section 5): "An unchanged published bundle
            # ... must not rewrite data" — and by the same logic, an
            # unchanged READY-but-not-yet-published bundle needs no
            # rebuild either. This is a silent, successful no-op, not an
            # error: it must not create additional tests/students/
            # questions/reports, and it does not.
            return
        if status == "PUBLISHED":
            raise RuntimeError(
                "Cannot prepare: this test is currently PUBLISHED and the new content "
                "differs. Run `python -m app.cli unpublish` first, then prepare, "
                "verify, and publish again (see the correction policy in RUNBOOK.md)."
            )
        raise RuntimeError(
            f"Could not acquire build lock (test status: {status!r})."
        )

    try:
        # 7. Upsert students (never touches password/analysisDemo.claim*).
        student_ids = upsert_students(institute_id, sorted_roster)

        # Stable per-item content hashes, computed after upsert-time
        # normalization so a re-import of identical content reuses them.
        for q in sorted_questions:
            q["contentHash"] = _hash_content(q)
        practice_questions_flat: List[Dict[str, Any]] = []
        for rec in sorted_recommendations:
            for pq in rec["recommendations"]:
                pq["contentHash"] = _hash_content(pq)
                practice_questions_flat.append(pq)

        # Upsert original + practice questions.
        question_ids = upsert_demo_questions(institute_id, test_key, sorted_questions)
        practice_ids_by_source_key = upsert_practice_questions(
            institute_id, test_key, practice_questions_flat
        )

        # 8. Resolve recommendation references (questionNo -> stored refs).
        recommendations_by_question_no: Dict[int, List[Dict[str, Any]]] = {}
        practice_counts: Dict[int, int] = {}
        for rec in sorted_recommendations:
            no = rec["originalQuestionNo"]
            refs = []
            for pq in rec["recommendations"]:
                refs.append(
                    {
                        "questionId": practice_ids_by_source_key[pq["sourceKey"]],
                        "subject": pq["subject"],
                        "sourceKey": pq["sourceKey"],
                    }
                )
            recommendations_by_question_no[no] = refs
            practice_counts[no] = len(refs)

        # Marking rules, kept as Decimal (from the Pydantic model directly,
        # never re-parsed from the JSON-mode dump used only for hashing).
        marking_by_type = {
            kind: {"correctMarks": rule.correctMarks, "incorrectPenalty": rule.incorrectPenalty}
            for kind, rule in bundle.manifest.markingByType.items()
        }
        content_hashes = {q["questionNo"]: q["contentHash"] for q in sorted_questions}
        question_ids_as_str = {no: str(qid) for no, qid in question_ids.items()}

        # 3/9. Compute every student's graded results and full snapshot.
        results_by_enrollment: Dict[str, List[QuestionResult]] = {}
        for resp in sorted_responses:
            try:
                results_by_enrollment[resp["enrollmentNo"]] = build_question_results(
                    questions=sorted_questions,
                    answer_key=sorted_answer_key,
                    response=resp,
                    marking_by_type=marking_by_type,
                    question_ids=question_ids_as_str,
                    content_hashes=content_hashes,
                    practice_counts=practice_counts,
                )
            except ValueError as exc:
                raise ValueError(f"Grading failed for enrollmentNo {resp['enrollmentNo']!r}: {exc}") from exc

        snapshots_by_enrollment = {
            enrollment_no: build_student_snapshot(results)
            for enrollment_no, results in results_by_enrollment.items()
        }

        # Cohort = same roster batch, computed separately per batch so
        # batches never mix (Section 1.4).
        batch_by_enrollment = {s["enrollmentNo"]: s["batch"] for s in sorted_roster}
        enrollments_by_batch: Dict[str, List[str]] = {}
        for enrollment_no in results_by_enrollment:
            batch = batch_by_enrollment.get(enrollment_no)
            enrollments_by_batch.setdefault(batch, []).append(enrollment_no)

        now = datetime.datetime.now(datetime.timezone.utc)
        now_iso = now.isoformat()

        cohort_by_batch = {}
        for batch, enrollments in enrollments_by_batch.items():
            per_student = {}
            for enrollment_no in enrollments:
                snapshot = snapshots_by_enrollment[enrollment_no]
                per_student[enrollment_no] = {
                    "overall": snapshot.summary,
                    "subject": {b.key: b for br in snapshot.breakdowns if br.scope == "subject" for b in br.buckets},
                    "difficulty": {
                        b.key: b for br in snapshot.breakdowns if br.scope == "difficulty" for b in br.buckets
                    },
                    "questionType": {
                        b.key: b for br in snapshot.breakdowns if br.scope == "questionType" for b in br.buckets
                    },
                }
            cohort_by_batch[batch] = build_cohort_aggregates(
                policy=bundle.manifest.comparisonPolicy,
                cohort_label=batch,
                per_student=per_student,
                computed_at=now_iso,
            )

        # 9. Build one report document per evaluated student.
        report_docs: List[Dict[str, Any]] = []
        for resp in sorted_responses:
            enrollment_no = resp["enrollmentNo"]
            student_id = student_ids[enrollment_no]
            results = results_by_enrollment[enrollment_no]
            snapshot = snapshots_by_enrollment[enrollment_no]
            batch = batch_by_enrollment[enrollment_no]
            cohort = cohort_by_batch[batch]

            correct_ids = [ObjectId(r.questionId) for r in results if r.status == "correct"]
            incorrect_ids = [ObjectId(r.questionId) for r in results if r.status == "incorrect"]
            unanswered_ids = [ObjectId(r.questionId) for r in results if r.status == "skipped"]
            responses_doc = [
                {"questionNo": r.questionNo, "selectedOption": r.studentAnswer}
                for r in results
                if r.studentAnswer is not None
            ]

            report_doc = {
                "studentId": student_id,
                "score": float(snapshot.summary.score),
                "totalMarks": float(snapshot.summary.maximumMarks),
                "performance": {
                    "correct": correct_ids,
                    "incorrect": incorrect_ids,
                    "unanswered": unanswered_ids,
                },
                "responses": responses_doc,
                "createdAt": now,
                "analysisDemo": {
                    "managed": True,
                    "buildId": new_build_id,
                    "sourceHash": source_hash,
                    "computedAt": now,
                    "schemaVersion": "1.0",
                    "snapshot": snapshot.model_dump(mode="json"),
                    "batchSnapshot": cohort.model_dump(mode="json"),
                },
            }
            check_bson_size(report_doc)
            report_docs.append(report_doc)

        # 10. Upsert reports; analysisDemo.reflections is never touched here.
        upsert_student_reports(test_id, report_docs)

        # 12. Move the test to READY (only if this build still holds the lock).
        test_questions_array = []
        for q in sorted_questions:
            no = q["questionNo"]
            marking = marking_by_type[q["questionType"]]
            test_questions_array.append(
                {
                    "questionNo": no,
                    "questionId": question_ids[no],
                    "subject": q["subject"],
                    "demoMarking": {
                        "correctMarks": float(marking["correctMarks"]),
                        "incorrectPenalty": float(marking["incorrectPenalty"]),
                    },
                    "recommendations": recommendations_by_question_no.get(no, []),
                }
            )

        test_update = {
            "title": bundle.manifest.title,
            "date": bundle.manifest.date,
            "examType": bundle.manifest.examType,
            "totalQuestions": len(sorted_questions),
            "questions": test_questions_array,
            "analysisDemo.status": "READY",
            "analysisDemo.expectedStudents": bundle.manifest.expectedStudentCount,
            "analysisDemo.policy": bundle.manifest.comparisonPolicy,
        }
        if not update_test(test_id, new_build_id, test_update):
            raise RuntimeError(
                "Lost the build lock while preparing (another process changed this "
                "test's buildId). Preparation aborted; re-run from a clean state."
            )

    except Exception as exc:
        # 13. On any failure, leave the test unpublished (never touch
        # isPublished/analysisDemo.status=PUBLISHED here) and record a
        # bounded error summary rather than a silent, half-written build.
        mark_build_failed(test_id, new_build_id, str(exc))
        raise
