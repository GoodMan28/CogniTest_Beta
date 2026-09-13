import re
from typing import Any, Dict, List

from bson import ObjectId
from pymongo import UpdateOne

from app.db import db_client


def find_case_insensitive_collisions(
    institute_id: ObjectId, roster: List[Dict[str, Any]]
) -> List[str]:
    """
    Returns a list of human-readable collision descriptions (empty if none)
    for roster entries whose enrollmentNo differs only in case from an
    EXISTING student record already stored under a different exact casing.
    Call this before upserting; abort preparation if it returns anything
    (defect D3 / Section 1.2: "Reject ambiguous case-insensitive matches").
    """
    db = db_client.get_db()
    collection = db["students"]
    collisions: List[str] = []

    for entry in roster:
        enrollment_no = entry["enrollmentNo"]
        pattern = f"^{re.escape(enrollment_no)}$"
        matches = list(
            collection.find(
                {"instituteId": institute_id, "enrollmentNo": {"$regex": pattern, "$options": "i"}},
                {"enrollmentNo": 1},
            )
        )
        other_casings = {m["enrollmentNo"] for m in matches if m["enrollmentNo"] != enrollment_no}
        if other_casings:
            collisions.append(
                f"roster enrollmentNo {enrollment_no!r} collides case-insensitively with "
                f"existing student record(s) {sorted(other_casings)!r}"
            )

    return collisions


def upsert_students(institute_id: ObjectId, students: List[Dict[str, Any]]) -> Dict[str, ObjectId]:
    """
    Upserts students by (instituteId, enrollmentNo).

    Safety rules (defect D3): never write `password`, `profilePictureUrl`,
    or any `analysisDemo.*` field here — those belong to activation
    (app.services.auth) and must survive every re-import untouched. On an
    UPDATE (student already exists), only `name` and `batch` are $set, and
    only when the roster supplies a non-empty value — an empty/missing
    value in a re-import must never blank out a previously-good name/batch.
    `email` is set only on INSERT via $setOnInsert (an existing student's
    email is never overwritten by a re-import either).

    Callers must run find_case_insensitive_collisions first and abort if it
    finds anything; this function does not check that itself so it stays a
    plain, auditable bulk upsert.

    Returns a mapping of enrollmentNo -> ObjectId for every roster entry
    (both newly inserted and pre-existing).
    """
    if not students:
        return {}

    db = db_client.get_db()
    collection = db["students"]

    operations = []
    enrollments = [s["enrollmentNo"] for s in students]

    for s in students:
        set_fields: Dict[str, Any] = {}
        if s.get("name"):
            set_fields["name"] = s["name"]
        if s.get("batch"):
            set_fields["batch"] = s["batch"]

        set_on_insert_fields: Dict[str, Any] = {
            "instituteId": institute_id,
            "enrollmentNo": s["enrollmentNo"],
        }
        if s.get("email"):
            set_on_insert_fields["email"] = s["email"]

        update: Dict[str, Any] = {"$setOnInsert": set_on_insert_fields}
        if set_fields:
            update["$set"] = set_fields

        op = UpdateOne(
            {"instituteId": institute_id, "enrollmentNo": s["enrollmentNo"]},
            update,
            upsert=True,
        )
        operations.append(op)

    if operations:
        collection.bulk_write(operations, ordered=False)

    cursor = collection.find(
        {"instituteId": institute_id, "enrollmentNo": {"$in": enrollments}}, {"_id": 1, "enrollmentNo": 1}
    )
    return {doc["enrollmentNo"]: doc["_id"] for doc in cursor}
