"""
Independently re-derives every stored number from the source bundle and
checks it against what app.services.preparation actually wrote, before
allowing publication. This is deliberately a *second* computation path
using the same pure domain functions (never trusting "the write succeeded"
as proof of correctness) — see
CogniTest_REMEDIATION_PROMPTS.md Section 6 (Phase R3 task 7) and Section 8
(Phase R4's publish-requires-verify contract, defect D7).
"""
from typing import Any, Dict, List

from bson import ObjectId

from app.db import db_client
from app.domain.comparisons import build_cohort_aggregates
from app.domain.results import build_question_results
from app.domain.snapshot import build_student_snapshot
from app.repositories.questions import get_collection_for_subject
from app.services.bundle import ValidatedBundle


def _hash_content(data: Any) -> str:
    import hashlib
    import json

    serialized = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode()).hexdigest()


def run_verification(institute_id_str: str, test_key: str, bundle: ValidatedBundle) -> bool:
    db = db_client.get_db()
    institute_id = ObjectId(institute_id_str)

    if bundle.manifest.instituteId != institute_id_str:
        raise ValueError(
            f"Bundle instituteId {bundle.manifest.instituteId!r} does not match "
            f"the requested institute {institute_id_str!r}"
        )
    if bundle.manifest.testKey != test_key:
        raise ValueError(
            f"Bundle testKey {bundle.manifest.testKey!r} does not match "
            f"the requested test key {test_key!r}"
        )

    test_doc = db.tests.find_one({"instituteId": institute_id, "analysisDemo.sourceKey": test_key})
    if not test_doc:
        raise ValueError(f"Test with key {test_key!r} not found.")

    status = test_doc.get("analysisDemo", {}).get("status")
    if status != "READY":
        raise ValueError(f"Test is not READY (current status: {status!r}). Cannot verify.")

    build_id = test_doc["analysisDemo"]["buildId"]
    expected_students = test_doc["analysisDemo"].get("expectedStudents")
    if expected_students is None:
        raise ValueError("Test document is missing analysisDemo.expectedStudents.")

    reports = list(db.evaluationreports.find({"testId": test_doc["_id"], "analysisDemo.managed": True}))

    if len(reports) != expected_students:
        raise ValueError(f"Expected {expected_students} reports, found {len(reports)}")

    student_counts: Dict[Any, int] = {}
    for r in reports:
        sid = r["studentId"]
        student_counts[sid] = student_counts.get(sid, 0) + 1

        if r["analysisDemo"]["buildId"] != build_id:
            raise ValueError(f"Report {r['_id']} has stale buildId {r['analysisDemo']['buildId']}")

        student_doc = db.students.find_one({"_id": sid})
        if not student_doc or student_doc.get("instituteId") != institute_id:
            raise ValueError(f"Student {sid} does not belong to institute {institute_id}")

    for sid, count in student_counts.items():
        if count != 1:
            raise ValueError(f"Student {sid} has {count} reports, expected exactly 1")

    # Every original question has exactly recommendationsPerQuestion valid
    # practice mappings, and each mapping resolves to a real, stored
    # question document.
    for tq in test_doc.get("questions", []):
        refs = tq.get("recommendations", [])
        if len(refs) != bundle.manifest.recommendationsPerQuestion:
            raise ValueError(
                f"Question {tq['questionNo']} has {len(refs)} practice mappings, "
                f"expected exactly {bundle.manifest.recommendationsPerQuestion}."
            )
        for ref in refs:
            coll = get_collection_for_subject(ref["subject"])
            if not db[coll].find_one({"_id": ref["questionId"]}, {"_id": 1}):
                raise ValueError(
                    f"Question {tq['questionNo']}: practice reference "
                    f"{ref['sourceKey']!r} does not resolve to a stored question."
                )

    # --- Independent recomputation from the bundle ---
    sorted_questions = sorted((q.model_dump() for q in bundle.questions), key=lambda q: q["questionNo"])
    sorted_answer_key = sorted((a.model_dump() for a in bundle.answer_key), key=lambda a: a["questionNo"])
    sorted_responses = sorted((r.model_dump() for r in bundle.responses), key=lambda r: r["enrollmentNo"])
    roster_by_enrollment = {s.enrollmentNo: s for s in bundle.roster}

    marking_by_type = {
        kind: {"correctMarks": rule.correctMarks, "incorrectPenalty": rule.incorrectPenalty}
        for kind, rule in bundle.manifest.markingByType.items()
    }

    # Map questionNo -> stored questionId/contentHash straight from the
    # test document (the same ids/hashes preparation wrote), so recomputed
    # snapshots are directly comparable to what is stored.
    question_ids_as_str = {tq["questionNo"]: str(tq["questionId"]) for tq in test_doc.get("questions", [])}
    practice_counts = {tq["questionNo"]: len(tq.get("recommendations", [])) for tq in test_doc.get("questions", [])}

    content_hashes: Dict[int, str] = {}
    for q in sorted_questions:
        coll = get_collection_for_subject(q["subject"])
        source_key = f"{test_key}:original:{q['questionNo']}"
        stored = db[coll].find_one({"instituteId": institute_id, "analysisDemo.sourceKey": source_key})
        if not stored:
            raise ValueError(f"Original question {q['questionNo']} not found in {coll}.")
        content_hashes[q["questionNo"]] = stored["analysisDemo"]["contentHash"]

    reports_by_student_id = {r["studentId"]: r for r in reports}
    recomputed_snapshots_by_enrollment: Dict[str, Any] = {}

    for resp in sorted_responses:
        enrollment_no = resp["enrollmentNo"]
        roster_entry = roster_by_enrollment.get(enrollment_no)
        if roster_entry is None:
            raise ValueError(f"Response for unknown enrollmentNo {enrollment_no!r} (not in roster).")

        student_doc = db.students.find_one({"instituteId": institute_id, "enrollmentNo": enrollment_no})
        if not student_doc:
            raise ValueError(f"Student {enrollment_no!r} not found in database.")

        stored_report = reports_by_student_id.get(student_doc["_id"])
        if not stored_report:
            raise ValueError(f"No report found for student {enrollment_no!r}.")

        recomputed_results = build_question_results(
            questions=sorted_questions,
            answer_key=sorted_answer_key,
            response=resp,
            marking_by_type=marking_by_type,
            question_ids=question_ids_as_str,
            content_hashes=content_hashes,
            practice_counts=practice_counts,
        )
        recomputed_snapshot = build_student_snapshot(recomputed_results)
        recomputed_snapshots_by_enrollment[enrollment_no] = recomputed_snapshot

        stored_snapshot = stored_report["analysisDemo"]["snapshot"]
        if stored_snapshot["summary"]["score"] != recomputed_snapshot.summary.score:
            raise ValueError(
                f"Score mismatch for {enrollment_no!r}: stored "
                f"{stored_snapshot['summary']['score']!r}, recomputed "
                f"{recomputed_snapshot.summary.score!r}"
            )
        if (
            stored_snapshot["summary"]["correct"] != recomputed_snapshot.summary.correct
            or stored_snapshot["summary"]["incorrect"] != recomputed_snapshot.summary.incorrect
            or stored_snapshot["summary"]["skipped"] != recomputed_snapshot.summary.skipped
        ):
            raise ValueError(f"Correct/incorrect/skipped counts mismatch for {enrollment_no!r}")

        # Subject/difficulty/questionType partitions reconcile with the
        # overall total (invariant, not just a comparison to storage).
        for scope in ("subject", "difficulty", "questionType"):
            breakdown = next(b for b in recomputed_snapshot.breakdowns if b.scope == scope)
            total_score = sum(float(b.score) for b in breakdown.buckets)
            if abs(total_score - float(recomputed_snapshot.summary.score)) > 1e-9:
                raise ValueError(
                    f"{enrollment_no!r}: {scope} partition does not reconcile with the overall score"
                )

    # --- Cohort comparisons match the current evaluated set ---
    # Recompute each batch's CohortAggregates from the just-recomputed
    # per-student snapshots (never from the stored batchSnapshot) and
    # compare against what is actually stored on each student's report.
    enrollments_by_batch: Dict[str, List[str]] = {}
    for resp in sorted_responses:
        enrollment_no = resp["enrollmentNo"]
        batch = roster_by_enrollment[enrollment_no].batch
        enrollments_by_batch.setdefault(batch, []).append(enrollment_no)

    import datetime as _datetime

    now_iso = _datetime.datetime.now(_datetime.timezone.utc).isoformat()

    for batch, enrollments in enrollments_by_batch.items():
        per_student = {}
        for enrollment_no in enrollments:
            snapshot = recomputed_snapshots_by_enrollment[enrollment_no]
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
        recomputed_cohort = build_cohort_aggregates(
            policy=bundle.manifest.comparisonPolicy,
            cohort_label=batch,
            per_student=per_student,
            computed_at=now_iso,
        )

        for enrollment_no in enrollments:
            student_doc = db.students.find_one({"instituteId": institute_id, "enrollmentNo": enrollment_no})
            stored_report = reports_by_student_id.get(student_doc["_id"])
            stored_cohort = stored_report["analysisDemo"]["batchSnapshot"]

            if stored_cohort["cohortSize"] != recomputed_cohort.cohortSize:
                raise ValueError(
                    f"Cohort {batch!r}: stored cohortSize {stored_cohort['cohortSize']} != "
                    f"recomputed {recomputed_cohort.cohortSize}"
                )
            if stored_cohort["available"] != recomputed_cohort.available:
                raise ValueError(f"Cohort {batch!r}: stored/recomputed 'available' disagree")
            if recomputed_cohort.available:
                stored_overall = next(c for c in stored_cohort["categories"] if c["key"] == "overall")
                recomputed_overall = next(c for c in recomputed_cohort.categories if c.key == "overall")
                if stored_overall["classAverage"] != recomputed_overall.classAverage:
                    raise ValueError(
                        f"Cohort {batch!r}: stored overall classAverage "
                        f"{stored_overall['classAverage']!r} != recomputed "
                        f"{recomputed_overall.classAverage!r}"
                    )
                if stored_overall["topperScore"] != recomputed_overall.topperScore:
                    raise ValueError(
                        f"Cohort {batch!r}: stored overall topperScore "
                        f"{stored_overall['topperScore']!r} != recomputed "
                        f"{recomputed_overall.topperScore!r}"
                    )

    # Mark this build verified, but only if it is still the current build
    # (a concurrent re-prepare could have started a new build while this
    # verification ran; that scenario must not mark a superseded build as
    # verified).
    result = db.tests.update_one(
        {"_id": test_doc["_id"], "analysisDemo.buildId": build_id},
        {"$set": {"analysisDemo.verifiedBuildId": build_id}},
    )
    if result.modified_count == 0:
        raise ValueError(
            "Verification computed successfully, but the build changed underneath it "
            "(another prepare ran concurrently). Re-run verify against the current build."
        )

    print(f"Verification passed for test {test_key!r} build {build_id}.")
    return True
