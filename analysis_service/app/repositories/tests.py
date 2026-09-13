import datetime
from typing import Any, Dict, Optional

from bson import ObjectId
from pymongo.collection import ReturnDocument

from app.db import db_client


def get_build_status(institute_id: ObjectId, source_key: str) -> Optional[Dict[str, Any]]:
    """
    Reads {"status": ..., "sourceHash": ...} for an existing demo-managed
    test, or None if it does not exist yet. Read-only; used by
    app.services.preparation to produce a precise error message when
    acquire_build_lock declines to lock (it only returns None, without
    saying why, to keep its own logic a single atomic decision point).
    """
    db = db_client.get_db()
    existing = db["tests"].find_one(
        {"instituteId": institute_id, "analysisDemo.sourceKey": source_key},
        {"analysisDemo.status": 1, "analysisDemo.sourceHash": 1},
    )
    if not existing:
        return None
    return {
        "status": existing.get("analysisDemo", {}).get("status"),
        "sourceHash": existing.get("analysisDemo", {}).get("sourceHash"),
    }


def acquire_build_lock(
    institute_id: ObjectId,
    source_key: str,
    new_build_id: str,
    new_hash: str,
    manifest_title: str,
    manifest_date: datetime.datetime,
    manifest_exam_type: str,
) -> Optional[ObjectId]:
    """
    Attempts to atomically acquire a build lock for a test.
    Returns the test ObjectId if successful, None otherwise.

    manifest_title/manifest_date/manifest_exam_type seed a brand-new test
    document's `title`/`date`/`examType` (defect D24: these used to be a
    placeholder "Test <sourceKey>" string and `now`, never the manifest's
    actual values). An existing test's title/date/examType are left alone
    here — they are refreshed from the manifest in
    app.services.preparation on every successful build, same as any other
    manifest-derived field.
    """
    db = db_client.get_db()

    existing = db["tests"].find_one({"instituteId": institute_id, "analysisDemo.sourceKey": source_key})

    now = datetime.datetime.now(datetime.timezone.utc)

    if existing:
        status = existing.get("analysisDemo", {}).get("status")
        old_hash = existing.get("analysisDemo", {}).get("sourceHash")

        if status == "BUILDING":
            return None  # Locked: another build is already in progress

        if status == "PUBLISHED":
            # Reject unconditionally, whether content changed or not: an
            # unchanged published bundle is a safe no-op ("already
            # published"); a CHANGED published bundle must never be
            # rebuilt in place while live (Section 1.2's correction
            # policy requires an explicit `unpublish` first). Either way
            # this function returns None; run_preparation_algorithm
            # distinguishes the two cases for its error message.
            return None

        if status == "READY" and old_hash == new_hash:
            return None  # Already built with this exact content; no-op

        doc = db["tests"].find_one_and_update(
            {
                "_id": existing["_id"],
                "analysisDemo.status": {"$ne": "BUILDING"},
            },
            {
                "$set": {
                    "analysisDemo.status": "BUILDING",
                    "analysisDemo.buildId": new_build_id,
                    "analysisDemo.sourceHash": new_hash,
                    "analysisDemo.computedAt": now,
                },
                "$unset": {
                    "analysisDemo.verifiedBuildId": "",
                    "analysisDemo.lastError": "",
                },
            },
            return_document=ReturnDocument.AFTER,
        )
        return doc["_id"] if doc else None
    else:
        new_test = {
            "instituteId": institute_id,
            "title": manifest_title,
            "date": manifest_date,
            "examType": manifest_exam_type,
            "totalQuestions": 0,
            "marksPerQuestion": 0,
            "negativeMarking": 0,
            "isPublished": False,
            "questions": [],
            "analysisDemo": {
                "managed": True,
                "sourceKey": source_key,
                "status": "BUILDING",
                "buildId": new_build_id,
                "sourceHash": new_hash,
                "computedAt": now,
            },
        }
        res = db["tests"].insert_one(new_test)
        return res.inserted_id


def update_test(test_id: ObjectId, build_id: str, update_doc: Dict[str, Any]) -> bool:
    """
    update_doc keys must already be full dotted paths for nested fields
    (e.g. "analysisDemo.status", not "status") — this function passes them
    to $set verbatim and never merges/replaces the analysisDemo subdocument
    as a whole, so sibling fields like analysisDemo.reflections-equivalent
    state on the test side (there is none today, but the same rule applies
    to evaluationreports.analysisDemo.reflections in app/repositories/reports.py)
    are never clobbered.
    """
    db = db_client.get_db()
    res = db["tests"].update_one(
        {"_id": test_id, "analysisDemo.buildId": build_id},
        {"$set": update_doc},
    )
    return res.modified_count > 0


def mark_build_failed(test_id: ObjectId, build_id: str, error_summary: str) -> bool:
    db = db_client.get_db()
    res = db["tests"].update_one(
        {"_id": test_id, "analysisDemo.buildId": build_id},
        {"$set": {"analysisDemo.status": "FAILED", "analysisDemo.lastError": error_summary[:2000]}},
    )
    return res.modified_count > 0


def publish_test(institute_id: ObjectId, test_key: str) -> None:
    """
    Publication requires the current build to have been independently
    re-verified (analysisDemo.verifiedBuildId == analysisDemo.buildId) —
    defect D7: previously a test could publish straight from READY without
    ever having passed app.services.verification.run_verification.
    """
    db = db_client.get_db()
    now = datetime.datetime.now(datetime.timezone.utc)

    already_ready_unverified = db["tests"].find_one(
        {
            "instituteId": institute_id,
            "analysisDemo.sourceKey": test_key,
            "analysisDemo.status": "READY",
        }
    )

    res = db["tests"].update_one(
        {
            "instituteId": institute_id,
            "analysisDemo.sourceKey": test_key,
            "analysisDemo.status": "READY",
            "$expr": {"$eq": ["$analysisDemo.verifiedBuildId", "$analysisDemo.buildId"]},
        },
        {"$set": {"analysisDemo.status": "PUBLISHED", "analysisDemo.publishedAt": now}},
    )
    if res.modified_count == 0:
        if already_ready_unverified is not None:
            raise ValueError(
                "Cannot publish. Test is READY but has not passed verification for "
                "the current build — run `python -m app.cli verify` first."
            )
        raise ValueError("Cannot publish. Test is either not found or not in READY state.")


def unpublish_test(institute_id: ObjectId, test_key: str) -> None:
    db = db_client.get_db()
    res = db["tests"].update_one(
        {
            "instituteId": institute_id,
            "analysisDemo.sourceKey": test_key,
            "analysisDemo.status": "PUBLISHED",
        },
        {"$set": {"analysisDemo.status": "READY"}},
    )
    if res.modified_count == 0:
        raise ValueError("Cannot unpublish. Test is either not found or not in PUBLISHED state.")
