from pymongo import ASCENDING
from app.db import db_client

def _has_equivalent_index(existing_indexes, key_pattern: list) -> bool:
    """
    True if any existing index (as returned by list_indexes) already covers
    exactly this key pattern, regardless of its name. Used so apply_indexes
    never blindly creates a duplicate/conflicting index next to one the
    legacy Express/Mongoose app may already maintain (Section 6, index
    requirements: "Inspect existing indexes first. Never drop an existing
    index automatically.").
    """
    for idx in existing_indexes:
        idx_keys = list(idx.get("key", {}).items())
        if idx_keys == key_pattern:
            return True
    return False

def apply_indexes():
    db = db_client.get_db()

    # 1. Unique demo test source key per institute
    db["tests"].create_index(
        [("instituteId", ASCENDING), ("analysisDemo.sourceKey", ASCENDING)],
        unique=True,
        partialFilterExpression={"analysisDemo.sourceKey": {"$exists": True}}
    )

    # 1b. Fast lookup of demo-managed tests by status (e.g. the demo report
    # list's $lookup + $match on test.analysisDemo.status == "PUBLISHED").
    db["tests"].create_index(
        [("instituteId", ASCENDING), ("analysisDemo.status", ASCENDING)],
        partialFilterExpression={"analysisDemo.managed": True}
    )

    # 2. Unique demo question source key per institute within each subject collection
    for coll_name in ["physics_questions", "chemistry_questions", "biology_questions", "mathematics_questions"]:
        db[coll_name].create_index(
            [("instituteId", ASCENDING), ("analysisDemo.sourceKey", ASCENDING)],
            unique=True,
            partialFilterExpression={"analysisDemo.sourceKey": {"$exists": True}}
        )

    # 3. Unique (testId, studentId) for demo-managed reports
    db["evaluationreports"].create_index(
        [("testId", ASCENDING), ("studentId", ASCENDING)],
        unique=True,
        partialFilterExpression={"analysisDemo.managed": True}
    )

    # 4. Student report lookup index
    db["evaluationreports"].create_index(
        [("studentId", ASCENDING), ("analysisDemo.managed", ASCENDING)]
    )

    # 5. Rate limit TTL index
    db["rate_limits"].create_index("expiresAt", expireAfterSeconds=0)

    # 6. Demo roster identity: unique (instituteId, enrollmentNo) — only
    # added if an equivalent index does not already exist. The legacy
    # Express/Mongoose backend (backend/src/models/Student.ts) declares a
    # GLOBAL unique index on enrollmentNo alone, which is a *stronger*
    # constraint than this one and must never be dropped by this service;
    # that legacy index is created by Mongoose when the Express app
    # connects, not by this Python service, so a database this service's
    # tests run against (never touched by Express) will not have it yet —
    # inspect first rather than assuming either way.
    students_indexes = list(db["students"].list_indexes())
    desired_key_pattern = [("instituteId", ASCENDING), ("enrollmentNo", ASCENDING)]
    global_enrollment_pattern = [("enrollmentNo", ASCENDING)]
    if not _has_equivalent_index(students_indexes, desired_key_pattern) and not _has_equivalent_index(
        students_indexes, global_enrollment_pattern
    ):
        db["students"].create_index(desired_key_pattern, unique=True)

def check_indexes() -> dict:
    db = db_client.get_db()
    results = {}

    collections = [
        "tests", "students", "physics_questions", "chemistry_questions",
        "biology_questions", "mathematics_questions", "evaluationreports",
    ]
    for coll in collections:
        try:
            results[coll] = list(db[coll].list_indexes())
        except Exception:
            results[coll] = []

    return results
