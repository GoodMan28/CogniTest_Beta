from typing import Any, Dict, List

from bson import ObjectId
from pymongo import UpdateOne

from app.db import db_client
from app.services.validation import sanitize_svg

SUBJECT_COLLECTIONS = {
    "physics": "physics_questions",
    "chemistry": "chemistry_questions",
    "biology": "biology_questions",
    "mathematics": "mathematics_questions",
}


def get_collection_for_subject(subject: str) -> str:
    normalized = subject.lower().strip()
    if normalized not in SUBJECT_COLLECTIONS:
        raise ValueError(f"Invalid subject: {subject}")
    return SUBJECT_COLLECTIONS[normalized]


def _sanitized_diagram_svg(question: Dict[str, Any]) -> Any:
    raw_svg = question.get("diagramSvg")
    if not raw_svg:
        return raw_svg
    # Sanitize once, at import time (defusedxml, not a regex filter) — the
    # stored value is what every later read (report detail, practice) uses
    # directly; nothing downstream re-sanitizes untrusted SVG.
    return sanitize_svg(raw_svg)


def upsert_demo_questions(
    institute_id: ObjectId, test_key: str, questions: List[Dict[str, Any]]
) -> Dict[int, ObjectId]:
    """
    Upserts original paper questions into their respective subject
    collections, keyed by the stable source key
    "<testKey>:original:<questionNo>". Returns questionNo -> ObjectId.
    """
    if not questions:
        return {}

    db = db_client.get_db()
    operations_by_coll: Dict[str, List[UpdateOne]] = {}

    for q in questions:
        coll = get_collection_for_subject(q["subject"])
        operations_by_coll.setdefault(coll, [])

        source_key = f"{test_key}:original:{q['questionNo']}"
        doc = {
            "instituteId": institute_id,
            "subject": q["subject"],
            "unit": q["unit"],
            "chapter": q["chapter"],
            "topic": q["topic"],
            "questionType": q["questionType"],
            "difficulty": q.get("difficulty"),
            "questionIntent": q["questionIntent"],
            "questionText": q["questionText"],
            "options": q.get("options") or [],
            "correctOption": None,  # the answer key, not questions.json, owns correctness
            "numericalAnswer": None,
            "solutionText": q["solutionText"],
            "imageUrl": q.get("imageUrl"),
            "diagramSvg": _sanitized_diagram_svg(q),
            "smilesNotation": q.get("smilesNotation"),
            "isEmbedded": False,
            "analysisDemo": {
                "managed": True,
                "sourceKey": source_key,
                "contentHash": q.get("contentHash"),
            },
        }

        op = UpdateOne(
            {"instituteId": institute_id, "analysisDemo.sourceKey": source_key},
            {"$set": doc},
            upsert=True,
        )
        operations_by_coll[coll].append(op)

    for coll, ops in operations_by_coll.items():
        if ops:
            db[coll].bulk_write(ops, ordered=False)

    mapping: Dict[int, ObjectId] = {}
    for q in questions:
        coll = get_collection_for_subject(q["subject"])
        source_key = f"{test_key}:original:{q['questionNo']}"
        doc = db[coll].find_one({"instituteId": institute_id, "analysisDemo.sourceKey": source_key}, {"_id": 1})
        if doc:
            mapping[q["questionNo"]] = doc["_id"]

    return mapping


def upsert_practice_questions(
    institute_id: ObjectId, test_key: str, practice_questions: List[Dict[str, Any]]
) -> Dict[str, ObjectId]:
    """
    Upserts practice questions into their respective subject collections,
    keyed by the stable source key "<testKey>:practice:<providedSourceKey>".

    practice_questions: PracticeQuestionSchema-shaped dicts, each with its
    own `sourceKey` (as supplied in recommendations.json), `correctOption`
    or `numericalAnswer`, and `solutionText`.

    Returns the *provided* sourceKey (not the stored "<testKey>:practice:..."
    key) -> ObjectId, since that is what callers (preparation.py building
    Test.questions[].recommendations) look the ids up by.
    """
    if not practice_questions:
        return {}

    db = db_client.get_db()
    operations_by_coll: Dict[str, List[UpdateOne]] = {}

    for pq in practice_questions:
        coll = get_collection_for_subject(pq["subject"])
        operations_by_coll.setdefault(coll, [])

        stored_source_key = f"{test_key}:practice:{pq['sourceKey']}"
        doc = {
            "instituteId": institute_id,
            "subject": pq["subject"],
            "unit": pq["unit"],
            "chapter": pq["chapter"],
            "topic": pq["topic"],
            "questionType": pq["questionType"],
            "difficulty": pq.get("difficulty"),
            "questionIntent": pq["questionIntent"],
            "questionText": pq["questionText"],
            "options": pq.get("options") or [],
            "correctOption": pq.get("correctOption"),
            "numericalAnswer": pq.get("numericalAnswer"),
            "solutionText": pq["solutionText"],
            "imageUrl": pq.get("imageUrl"),
            "diagramSvg": _sanitized_diagram_svg(pq),
            "smilesNotation": pq.get("smilesNotation"),
            "isEmbedded": False,
            "analysisDemo": {
                "managed": True,
                "sourceKey": stored_source_key,
                "contentHash": pq.get("contentHash"),
            },
        }

        op = UpdateOne(
            {"instituteId": institute_id, "analysisDemo.sourceKey": stored_source_key},
            {"$set": doc},
            upsert=True,
        )
        operations_by_coll[coll].append(op)

    for coll, ops in operations_by_coll.items():
        if ops:
            db[coll].bulk_write(ops, ordered=False)

    mapping: Dict[str, ObjectId] = {}
    for pq in practice_questions:
        coll = get_collection_for_subject(pq["subject"])
        stored_source_key = f"{test_key}:practice:{pq['sourceKey']}"
        doc = db[coll].find_one({"instituteId": institute_id, "analysisDemo.sourceKey": stored_source_key}, {"_id": 1})
        if doc:
            mapping[pq["sourceKey"]] = doc["_id"]

    return mapping
