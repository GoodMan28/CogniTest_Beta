"""
Composes one student's complete StudentSnapshot from their QuestionResult
rows. This is the only function Phase R3's preparation service calls to
build the per-student snapshot; it in turn is the only place that calls
build_summary / build_breakdowns / build_insights / build_revision_list
together, so there is exactly one assembly path to keep in sync with the
StudentSnapshot contract (app/schemas/reports.py).
"""
from typing import List

from app.domain.analytics import build_breakdowns, build_summary
from app.domain.insights import build_insights, build_revision_list
from app.schemas.reports import QuestionResult, StudentSnapshot


def build_student_snapshot(results: List[QuestionResult]) -> StudentSnapshot:
    return StudentSnapshot(
        schemaVersion="1.0",
        summary=build_summary(results),
        breakdowns=build_breakdowns(results),
        insights=build_insights(results),
        revisionList=build_revision_list(results),
        questions=sorted(results, key=lambda r: r.questionNo),
    )
