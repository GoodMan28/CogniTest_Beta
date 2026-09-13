from typing import Any, Dict, List

from bson import ObjectId
from pymongo import UpdateOne

from app.db import db_client


def _flatten_analysis_demo(report: Dict[str, Any]) -> Dict[str, Any]:
    """
    Turns {"score": ..., "analysisDemo": {"buildId": ..., "snapshot": ...}}
    into {"score": ..., "analysisDemo.buildId": ..., "analysisDemo.snapshot": ...}.

    This is the fix for defect D8: the previous implementation did
    `{"$set": report}` with `report["analysisDemo"]` as a whole nested
    object, which REPLACED the entire analysisDemo subdocument on every
    rebuild — silently wiping analysisDemo.reflections (a field this
    function's caller never includes, since reflections are owned by
    app.services.reports.update_reflection, not by preparation). Using
    dotted $set paths instead means MongoDB only touches the fields named
    here; analysisDemo.reflections (and anything else not mentioned) is
    left exactly as it was.
    """
    flat: Dict[str, Any] = {}
    for key, value in report.items():
        if key == "analysisDemo" and isinstance(value, dict):
            for sub_key, sub_value in value.items():
                flat[f"analysisDemo.{sub_key}"] = sub_value
        else:
            flat[key] = value
    return flat


def upsert_student_reports(test_id: ObjectId, reports: List[Dict[str, Any]]) -> None:
    """
    Upserts one report per (testId, studentId), preserving any existing
    analysisDemo.reflections untouched (see _flatten_analysis_demo).
    """
    if not reports:
        return

    db = db_client.get_db()
    operations: List[UpdateOne] = []

    for report in reports:
        student_id = report.pop("studentId")
        flat_set = _flatten_analysis_demo(report)
        op = UpdateOne(
            {"testId": test_id, "studentId": student_id, "analysisDemo.managed": True},
            {"$set": flat_set},
            upsert=True,
        )
        operations.append(op)

    if operations:
        db["evaluationreports"].bulk_write(operations, ordered=False)
