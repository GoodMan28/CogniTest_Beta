"""
Serves precomputed report/practice/reflection data straight from what
app.services.preparation already stored. No grading and no cohort
recomputation happen anywhere on this request path — every number here was
computed once, at prepare time, by app.domain.* (see
CogniTest_REMEDIATION_PROMPTS.md Section 1.5).
"""
import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId

from app.api.schemas.reports import (
    Comparisons,
    ComparisonRow,
    PracticeQuestionDTO,
    ReflectionItemDTO,
    ReportDetailDTO,
    ReportSummaryDTO,
    TestInfoDTO,
)
from app.db import db_client
from app.repositories.questions import get_collection_for_subject


def _iso(value: Any) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def get_student_reports(
    student_id: ObjectId, institute_id: ObjectId, skip: int = 0, limit: int = 10
) -> List[ReportSummaryDTO]:
    db = db_client.get_db()

    pipeline = [
        {"$match": {"studentId": student_id, "analysisDemo.managed": True}},
        {
            "$lookup": {
                "from": "tests",
                "localField": "testId",
                "foreignField": "_id",
                "as": "test",
            }
        },
        {"$unwind": "$test"},
        {
            "$match": {
                "test.analysisDemo.status": "PUBLISHED",
                "test.instituteId": institute_id,
                # Only the current build's report is a live report; a report
                # left over from a superseded build must never be listed.
                "$expr": {"$eq": ["$analysisDemo.buildId", "$test.analysisDemo.buildId"]},
            }
        },
        {"$sort": {"createdAt": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {
            "$project": {
                "_id": 1,
                "testId": 1,
                "test.title": 1,
                "test.date": 1,
                "analysisDemo.computedAt": 1,
                "analysisDemo.snapshot.summary": 1,
            }
        },
    ]

    docs = list(db.evaluationreports.aggregate(pipeline))

    results: List[ReportSummaryDTO] = []
    for d in docs:
        summary = d["analysisDemo"]["snapshot"]["summary"]
        results.append(
            ReportSummaryDTO(
                reportId=str(d["_id"]),
                testId=str(d["testId"]),
                testTitle=d["test"]["title"],
                testDate=_iso(d["test"]["date"]),
                score=summary["score"],
                maximumMarks=summary["maximumMarks"],
                correct=summary["correct"],
                incorrect=summary["incorrect"],
                skipped=summary["skipped"],
                questionCount=summary["questionCount"],
                computedAt=_iso(d["analysisDemo"].get("computedAt")),
            )
        )
    return results


def _authorize_report(db, student_id: ObjectId, institute_id: ObjectId, report_id: ObjectId):
    """
    The six checks every detail/practice/reflection request must pass
    (Section 4 authorization requirements): authenticated student exists
    (enforced by the caller's dependency), report belongs to that student,
    test and student belong to the configured institute, test is
    demo-managed and published, report build matches the published build.
    Returns (report, test) or raises ValueError (mapped to 404 by the
    router) without distinguishing "does not exist" from "belongs to
    someone else".
    """
    report = db.evaluationreports.find_one(
        {"_id": report_id, "studentId": student_id, "analysisDemo.managed": True}
    )
    if not report:
        raise ValueError("Report not found")

    test = db.tests.find_one(
        {
            "_id": report["testId"],
            "instituteId": institute_id,
            "analysisDemo.managed": True,
            "analysisDemo.status": "PUBLISHED",
        }
    )
    if not test:
        raise ValueError("Test not found or not published")

    if report["analysisDemo"]["buildId"] != test["analysisDemo"]["buildId"]:
        raise ValueError("Stale report build. Cannot access.")

    return report, test


def get_report_detail(student_id: ObjectId, institute_id: ObjectId, report_id: ObjectId) -> ReportDetailDTO:
    db = db_client.get_db()
    report, test = _authorize_report(db, student_id, institute_id, report_id)

    snapshot = report["analysisDemo"]["snapshot"]
    batch_snapshot = report["analysisDemo"].get("batchSnapshot") or {}

    # Comparisons: fold the viewer's own score into each stored cohort
    # category row. "overall" comes from snapshot.summary; everything else
    # from the subject/difficulty/questionType breakdowns.
    your_scores: Dict[str, str] = {"overall": snapshot["summary"]["score"]}
    for breakdown in snapshot["breakdowns"]:
        if breakdown["scope"] in ("subject", "difficulty", "questionType"):
            for bucket in breakdown["buckets"]:
                your_scores[bucket["key"]] = bucket["score"]

    comparison_rows = [
        ComparisonRow(
            scope=cat["scope"],
            key=cat["key"],
            label=cat["label"],
            maximumMarks=cat["maximumMarks"],
            yourScore=your_scores.get(cat["key"], "0.00"),
            classAverage=cat["classAverage"],
            topperScore=cat["topperScore"],
        )
        for cat in batch_snapshot.get("categories", [])
    ]

    comparisons = Comparisons(
        policy=batch_snapshot.get("policy", ""),
        cohortLabel=batch_snapshot.get("cohortLabel", ""),
        cohortSize=batch_snapshot.get("cohortSize", 0),
        computedAt=batch_snapshot.get("computedAt", ""),
        available=batch_snapshot.get("available", False),
        unavailableReason=batch_snapshot.get("unavailableReason"),
        topperCount=batch_snapshot.get("topperCount", 0),
        topperLabel=batch_snapshot.get("topperLabel", "Topper"),
        rows=comparison_rows,
    )

    content_hash_by_no = {q["questionNo"]: q["contentHash"] for q in snapshot["questions"]}
    reflections: Dict[str, ReflectionItemDTO] = {}
    for question_no_str, refl in (report["analysisDemo"].get("reflections") or {}).items():
        current_hash = content_hash_by_no.get(int(question_no_str))
        reflections[question_no_str] = ReflectionItemDTO(
            text=refl["text"],
            updatedAt=_iso(refl.get("updatedAt")),
            questionContentHash=refl["questionContentHash"],
            stale=(current_hash != refl["questionContentHash"]),
        )

    test_analysis_demo = test.get("analysisDemo", {})
    return ReportDetailDTO(
        reportId=str(report["_id"]),
        buildId=report["analysisDemo"]["buildId"],
        test=TestInfoDTO(
            testId=str(test["_id"]),
            title=test["title"],
            date=_iso(test.get("date")),
            examType=test.get("examType", ""),
            questionCount=test.get("totalQuestions", 0),
            computedAt=_iso(test_analysis_demo.get("computedAt")),
            publishedAt=_iso(test_analysis_demo.get("publishedAt")),
        ),
        summary=snapshot["summary"],
        breakdowns=snapshot["breakdowns"],
        comparisons=comparisons,
        insights=snapshot["insights"],
        revisionList=snapshot["revisionList"],
        questions=snapshot["questions"],
        reflections=reflections,
    )


def get_practice_questions(
    student_id: ObjectId, institute_id: ObjectId, report_id: ObjectId, question_no: int
) -> List[PracticeQuestionDTO]:
    db = db_client.get_db()
    report, test = _authorize_report(db, student_id, institute_id, report_id)

    refs: List[Dict[str, Any]] = []
    for q in test.get("questions", []):
        if q["questionNo"] == question_no:
            refs = q.get("recommendations", [])
            break

    if not refs:
        raise ValueError("Question not found in this report")

    # One grouped lookup per subject, not one query per practice question.
    ids_by_subject: Dict[str, List[ObjectId]] = {}
    for ref in refs:
        ids_by_subject.setdefault(ref["subject"], []).append(ref["questionId"])

    docs_by_id: Dict[ObjectId, Dict[str, Any]] = {}
    for subject, ids in ids_by_subject.items():
        coll = get_collection_for_subject(subject)
        for doc in db[coll].find({"_id": {"$in": ids}}):
            docs_by_id[doc["_id"]] = doc

    results: List[PracticeQuestionDTO] = []
    for ref in refs:
        doc = docs_by_id.get(ref["questionId"])
        if not doc:
            continue

        if doc["questionType"] == "multiple_choice":
            correct_answer = doc.get("correctOption") or ""
        else:
            value = doc.get("numericalAnswer")
            # Whole-number floats from older imports must not render as "5.0".
            if isinstance(value, float) and value.is_integer():
                value = int(value)
            correct_answer = str(value)

        media = None
        if doc.get("imageUrl") or doc.get("diagramSvg"):
            media = {"imageUrl": doc.get("imageUrl"), "diagramSvg": doc.get("diagramSvg")}

        results.append(
            PracticeQuestionDTO(
                sourceKey=ref["sourceKey"],
                subject=doc["subject"],
                questionType=doc["questionType"],
                difficulty=doc.get("difficulty") or "medium",
                questionText=doc["questionText"],
                options=doc.get("options") or [],
                correctAnswer=correct_answer,
                solutionText=doc["solutionText"],
                media=media,
            )
        )

    return results


def update_reflection(
    student_id: ObjectId,
    institute_id: ObjectId,
    report_id: ObjectId,
    question_no: int,
    text: str,
    build_id: str,
    content_hash: str,
) -> Optional[ReflectionItemDTO]:
    """
    Returns the saved ReflectionItemDTO, or None when `text` was empty
    (explicit clearing — the router maps that to a plain {"status": "ok"}).
    """
    db = db_client.get_db()
    report, test = _authorize_report(db, student_id, institute_id, report_id)

    if report["analysisDemo"]["buildId"] != build_id:
        raise ValueError("Stale build ID")

    snapshot_questions = report["analysisDemo"]["snapshot"]["questions"]
    current_hash = next(
        (q["contentHash"] for q in snapshot_questions if q["questionNo"] == question_no), None
    )
    if current_hash is None:
        raise ValueError("Question not found in this report")
    if current_hash != content_hash:
        raise ValueError("Stale question content hash")

    field_path = f"analysisDemo.reflections.{question_no}"

    if text == "":
        db.evaluationreports.update_one(
            {"_id": report_id, "analysisDemo.buildId": build_id},
            {"$unset": {field_path: ""}},
        )
        return None

    now = datetime.datetime.now(datetime.timezone.utc)
    db.evaluationreports.update_one(
        {"_id": report_id, "analysisDemo.buildId": build_id},
        {
            "$set": {
                field_path: {
                    "text": text,
                    "updatedAt": now,
                    "questionContentHash": content_hash,
                }
            }
        },
    )
    return ReflectionItemDTO(
        text=text, updatedAt=_iso(now), questionContentHash=content_hash, stale=False
    )
