import copy

import pytest
from bson import ObjectId

from app.config import settings
from app.db import db_client
from app.services.bundle import load_bundle, validate_bundle
from app.services.preparation import run_preparation_algorithm
from app.services.validation import sanitize_svg
from tests.fixtures.bundle_writer import write_bundle
from tests.fixtures.synthetic_fixture import (
    ANSWER_KEY,
    EXPECTED,
    MANIFEST,
    QUESTIONS,
    RECOMMENDATIONS,
    RESPONSES,
    STUDENTS,
)


def _prepare(tmp_path, **overrides):
    kwargs = dict(
        manifest=MANIFEST, questions=QUESTIONS, answer_key=ANSWER_KEY,
        students=STUDENTS, responses=RESPONSES, recommendations=RECOMMENDATIONS,
    )
    kwargs.update(overrides)
    directory = write_bundle(str(tmp_path), **kwargs)
    bundle = validate_bundle(load_bundle(directory))
    run_preparation_algorithm(bundle)
    return bundle


def test_defusedxml_sanitization():
    unsafe_svg = '''<?xml version="1.0"?>
    <!DOCTYPE svg [
      <!ENTITY xxe SYSTEM "file:///etc/passwd">
    ]>
    <svg xmlns="http://www.w3.org/2000/svg"><text>&xxe;</text></svg>'''
    with pytest.raises(ValueError):
        sanitize_svg(unsafe_svg)

    safe_svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>Hello</text></svg>'
    assert "Hello" in sanitize_svg(safe_svg)


def test_prepare_creates_expected_counts(tmp_path):
    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)

    _prepare(tmp_path)

    assert db.tests.count_documents({"instituteId": institute_id}) == 1
    assert db.students.count_documents({"instituteId": institute_id}) == 4
    assert db.evaluationreports.count_documents({}) == 4
    # Each subject collection holds both the original question(s) AND their
    # practice questions (3 practice per original): Physics 1 original (Q1)
    # + 3 practice = 4; Chemistry 1 original (Q3) + 3 practice = 4;
    # Mathematics 2 originals (Q2, Q4) + 6 practice = 8.
    assert db.physics_questions.count_documents({}) == 4
    assert db.chemistry_questions.count_documents({}) == 4
    assert db.mathematics_questions.count_documents({}) == 8
    assert db.physics_questions.count_documents({"analysisDemo.sourceKey": {"$regex": "^demo-test:original:"}}) == 1
    assert db.chemistry_questions.count_documents({"analysisDemo.sourceKey": {"$regex": "^demo-test:original:"}}) == 1
    assert db.mathematics_questions.count_documents({"analysisDemo.sourceKey": {"$regex": "^demo-test:original:"}}) == 2
    # 12 practice questions total across the three subject collections.
    assert (
        db.physics_questions.count_documents({"analysisDemo.sourceKey": {"$regex": "^demo-test:practice:"}})
        + db.chemistry_questions.count_documents({"analysisDemo.sourceKey": {"$regex": "^demo-test:practice:"}})
        + db.mathematics_questions.count_documents({"analysisDemo.sourceKey": {"$regex": "^demo-test:practice:"}})
    ) == 12

    test_doc = db.tests.find_one({"instituteId": institute_id})
    assert test_doc["analysisDemo"]["status"] == "READY"
    assert test_doc["analysisDemo"]["expectedStudents"] == 4
    assert test_doc["title"] == MANIFEST["title"]
    assert test_doc["examType"] == MANIFEST["examType"]
    assert test_doc["isPublished"] is False  # legacy field, unaffected


def test_prepare_is_idempotent(tmp_path):
    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)

    _prepare(tmp_path / "run1")
    _prepare(tmp_path / "run2")  # identical content, different temp dir

    assert db.tests.count_documents({"instituteId": institute_id}) == 1
    assert db.students.count_documents({"instituteId": institute_id}) == 4
    assert db.evaluationreports.count_documents({}) == 4
    assert db.physics_questions.count_documents({}) == 4


def test_preserves_existing_password_and_profile_fields(tmp_path):
    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)

    # Pre-create student A with a password and profile fields, as if
    # already activated by a previous test cycle.
    db.students.insert_one(
        {
            "instituteId": institute_id,
            "enrollmentNo": "A",
            "name": "Old Name",
            "batch": "OldBatch",
            "email": "old@example.com",
            "profilePictureUrl": "https://example.com/old.png",
            "password": "already-hashed-value",
        }
    )

    _prepare(tmp_path)

    student_a = db.students.find_one({"instituteId": institute_id, "enrollmentNo": "A"})
    assert student_a["password"] == "already-hashed-value"
    assert student_a["profilePictureUrl"] == "https://example.com/old.png"
    assert student_a["email"] == "old@example.com"
    # name/batch ARE refreshed from the roster on every prepare.
    assert student_a["name"] == "Rahul Sharma"
    assert student_a["batch"] == "Alpha"


def test_two_students_with_identical_names_stay_distinct(tmp_path):
    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)

    _prepare(tmp_path)

    matches = list(db.students.find({"instituteId": institute_id, "name": "Rahul Sharma"}))
    assert len(matches) == 2
    assert {m["enrollmentNo"] for m in matches} == {"A", "C"}
    assert matches[0]["_id"] != matches[1]["_id"]


def test_reflection_survives_a_rebuild(tmp_path):
    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)

    _prepare(tmp_path / "first")

    student_a = db.students.find_one({"instituteId": institute_id, "enrollmentNo": "A"})
    report_a = db.evaluationreports.find_one({"studentId": student_a["_id"]})
    db.evaluationreports.update_one(
        {"_id": report_a["_id"]},
        {"$set": {"analysisDemo.reflections.1": {"text": "I knew this one", "updatedAt": None, "questionContentHash": "x"}}},
    )

    # Re-prepare with identical content is a same-hash no-op per the build
    # lock (status stays READY, old_hash == new_hash) — use a trivially
    # different manifest field that does not affect grading (title) to
    # force a genuinely new build without changing anything the reflection
    # cares about.
    changed_manifest = copy.deepcopy(MANIFEST)
    changed_manifest["title"] = "Phase 1 Test (rebuilt)"
    _prepare(tmp_path / "second", manifest=changed_manifest)

    report_a_after = db.evaluationreports.find_one({"studentId": student_a["_id"]})
    assert report_a_after["analysisDemo"]["reflections"]["1"]["text"] == "I knew this one"


def test_stored_snapshot_matches_expected_for_student_a(tmp_path):
    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)

    _prepare(tmp_path)

    student_a = db.students.find_one({"instituteId": institute_id, "enrollmentNo": "A"})
    report_a = db.evaluationreports.find_one({"studentId": student_a["_id"]})
    snapshot = report_a["analysisDemo"]["snapshot"]

    expected = EXPECTED["student_A"]["summary"]
    assert snapshot["summary"]["score"] == expected["score"]
    assert snapshot["summary"]["correct"] == expected["correct"]
    assert snapshot["summary"]["accuracyPct"] == expected["accuracyPct"]


def test_batch_snapshot_matches_expected_and_has_no_identities(tmp_path):
    import json

    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)

    _prepare(tmp_path)

    for enrollment_no in ("A", "B", "C"):
        student = db.students.find_one({"instituteId": institute_id, "enrollmentNo": enrollment_no})
        report = db.evaluationreports.find_one({"studentId": student["_id"]})
        cohort = report["analysisDemo"]["batchSnapshot"]
        assert cohort["cohortLabel"] == "Alpha"
        assert cohort["cohortSize"] == 3
        assert cohort["topperLabel"] == "Joint toppers' average"
        overall = next(c for c in cohort["categories"] if c["key"] == "overall")
        assert overall["classAverage"] == EXPECTED["cohort_alpha"]["categories"]["overall"]["classAverage"]
        # No student identity anywhere in the cohort payload.
        dumped = json.dumps(cohort)
        assert "enrollmentNo" not in dumped
        for other in ("A", "B", "C"):
            assert f'"{other}"' not in dumped

    student_d = db.students.find_one({"instituteId": institute_id, "enrollmentNo": "D"})
    report_d = db.evaluationreports.find_one({"studentId": student_d["_id"]})
    cohort_d = report_d["analysisDemo"]["batchSnapshot"]
    assert cohort_d["cohortLabel"] == "Beta"
    assert cohort_d["available"] is False
    assert cohort_d["unavailableReason"] == EXPECTED["cohort_beta"]["unavailableReason"]


def test_failed_build_marks_status_failed_and_records_error(tmp_path, monkeypatch):
    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)

    def _boom(*args, **kwargs):
        raise RuntimeError("simulated failure mid-preparation")

    monkeypatch.setattr("app.services.preparation.upsert_student_reports", _boom)

    directory = write_bundle(
        str(tmp_path), manifest=MANIFEST, questions=QUESTIONS, answer_key=ANSWER_KEY,
        students=STUDENTS, responses=RESPONSES, recommendations=RECOMMENDATIONS,
    )
    bundle = validate_bundle(load_bundle(directory))

    with pytest.raises(RuntimeError, match="simulated failure"):
        run_preparation_algorithm(bundle)

    test_doc = db.tests.find_one({"instituteId": institute_id, "analysisDemo.sourceKey": MANIFEST["testKey"]})
    assert test_doc["analysisDemo"]["status"] == "FAILED"
    assert "simulated failure" in test_doc["analysisDemo"]["lastError"]
    assert test_doc["isPublished"] is False


def test_mathematics_subject_and_numerical_answers_are_preserved(tmp_path):
    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)

    _prepare(tmp_path)

    math_questions = list(db.mathematics_questions.find({"instituteId": institute_id, "analysisDemo.sourceKey": {"$regex": "original"}}))
    assert len(math_questions) == 2
    assert all(q["subject"] == "Mathematics" for q in math_questions)

    student_a = db.students.find_one({"instituteId": institute_id, "enrollmentNo": "A"})
    report_a = db.evaluationreports.find_one({"studentId": student_a["_id"]})
    q2_result = next(q for q in report_a["analysisDemo"]["snapshot"]["questions"] if q["questionNo"] == 2)
    assert q2_result["subject"] == "Mathematics"
    assert q2_result["studentAnswer"] == "0"  # numerical zero preserved, not treated as missing


def test_concurrent_preparation_for_the_same_test_is_rejected(tmp_path):
    """
    Simulates a second `prepare` starting while a first one is still
    BUILDING, by directly setting the test document's status to BUILDING
    before calling run_preparation_algorithm — acquire_build_lock must
    refuse to proceed rather than race a real in-progress build.
    """
    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)

    directory = write_bundle(
        str(tmp_path), manifest=MANIFEST, questions=QUESTIONS, answer_key=ANSWER_KEY,
        students=STUDENTS, responses=RESPONSES, recommendations=RECOMMENDATIONS,
    )
    bundle = validate_bundle(load_bundle(directory))

    db.tests.insert_one(
        {
            "instituteId": institute_id,
            "title": "In-progress build",
            "date": None,
            "examType": "Demo",
            "totalQuestions": 0,
            "marksPerQuestion": 0,
            "negativeMarking": 0,
            "isPublished": False,
            "questions": [],
            "analysisDemo": {
                "managed": True,
                "sourceKey": MANIFEST["testKey"],
                "status": "BUILDING",
                "buildId": "some-other-build-in-progress",
                "sourceHash": "irrelevant",
            },
        }
    )

    with pytest.raises(RuntimeError, match="another build is currently in progress"):
        run_preparation_algorithm(bundle)

    # Confirm nothing was written under the rejected attempt.
    assert db.students.count_documents({"instituteId": institute_id}) == 0
    assert db.evaluationreports.count_documents({}) == 0


def test_oversized_report_document_is_rejected_with_actionable_message(tmp_path, monkeypatch):
    from app.services import validation as validation_module

    monkeypatch.setattr(validation_module, "MAX_BSON_SIZE", 100)  # force every report to be "oversized"

    directory = write_bundle(
        str(tmp_path), manifest=MANIFEST, questions=QUESTIONS, answer_key=ANSWER_KEY,
        students=STUDENTS, responses=RESPONSES, recommendations=RECOMMENDATIONS,
    )
    bundle = validate_bundle(load_bundle(directory))

    with pytest.raises(ValueError, match="exceeds MongoDB BSON limit"):
        run_preparation_algorithm(bundle)

    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)
    test_doc = db.tests.find_one({"instituteId": institute_id, "analysisDemo.sourceKey": MANIFEST["testKey"]})
    assert test_doc["analysisDemo"]["status"] == "FAILED"
    assert "exceeds MongoDB BSON limit" in test_doc["analysisDemo"]["lastError"]


def test_unsafe_svg_in_a_question_is_rejected_before_storage(tmp_path):
    unsafe_svg = (
        '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'
        '<svg xmlns="http://www.w3.org/2000/svg"><text>&xxe;</text></svg>'
    )
    bad_questions = copy.deepcopy(QUESTIONS)
    bad_questions[0]["diagramSvg"] = unsafe_svg

    directory = write_bundle(
        str(tmp_path), manifest=MANIFEST, questions=bad_questions, answer_key=ANSWER_KEY,
        students=STUDENTS, responses=RESPONSES, recommendations=RECOMMENDATIONS,
    )
    bundle = validate_bundle(load_bundle(directory))

    with pytest.raises(ValueError, match="Invalid or unsafe SVG content"):
        run_preparation_algorithm(bundle)

    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)
    # No question should have been stored from this failed attempt.
    assert db.physics_questions.count_documents({"instituteId": institute_id}) == 0
