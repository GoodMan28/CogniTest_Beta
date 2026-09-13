import copy

import pytest
from bson import ObjectId

from app.config import settings
from app.db import db_client
from app.repositories.tests import publish_test, unpublish_test
from app.services.bundle import load_bundle, validate_bundle
from app.services.preparation import run_preparation_algorithm
from app.services.verification import run_verification
from tests.fixtures.bundle_writer import write_bundle
from tests.fixtures.synthetic_fixture import (
    ANSWER_KEY,
    ANSWER_KEY_CORRECTED,
    EXPECTED,
    MANIFEST,
    QUESTIONS,
    RECOMMENDATIONS,
    RESPONSES,
    STUDENTS,
)


def _bundle(tmp_path, **overrides):
    kwargs = dict(
        manifest=MANIFEST, questions=QUESTIONS, answer_key=ANSWER_KEY,
        students=STUDENTS, responses=RESPONSES, recommendations=RECOMMENDATIONS,
    )
    kwargs.update(overrides)
    directory = write_bundle(str(tmp_path), **kwargs)
    return validate_bundle(load_bundle(directory))


def test_publish_before_verify_fails(tmp_path):
    institute_id = ObjectId(settings.institute_id)
    bundle = _bundle(tmp_path)
    run_preparation_algorithm(bundle)

    with pytest.raises(ValueError, match="has not passed verification|not in READY state"):
        publish_test(institute_id, MANIFEST["testKey"])


def test_full_publication_lifecycle(tmp_path):
    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)
    test_key = MANIFEST["testKey"]

    bundle = _bundle(tmp_path)
    run_preparation_algorithm(bundle)
    assert run_verification(settings.institute_id, test_key, bundle) is True

    test_doc = db.tests.find_one({"instituteId": institute_id, "analysisDemo.sourceKey": test_key})
    assert test_doc["analysisDemo"]["verifiedBuildId"] == test_doc["analysisDemo"]["buildId"]

    publish_test(institute_id, test_key)
    test_doc = db.tests.find_one({"instituteId": institute_id, "analysisDemo.sourceKey": test_key})
    assert test_doc["analysisDemo"]["status"] == "PUBLISHED"
    assert test_doc["isPublished"] is False  # legacy field, never flipped

    # Repeated publish is a clear state error, not a silent duplicate.
    with pytest.raises(ValueError, match="not in READY state"):
        publish_test(institute_id, test_key)

    unpublish_test(institute_id, test_key)
    test_doc = db.tests.find_one({"instituteId": institute_id, "analysisDemo.sourceKey": test_key})
    assert test_doc["analysisDemo"]["status"] == "READY"

    with pytest.raises(ValueError, match="not in PUBLISHED state"):
        unpublish_test(institute_id, test_key)

    # verifiedBuildId survived the unpublish (still same buildId), so a
    # direct re-publish (no re-verify needed) succeeds.
    publish_test(institute_id, test_key)
    test_doc = db.tests.find_one({"instituteId": institute_id, "analysisDemo.sourceKey": test_key})
    assert test_doc["analysisDemo"]["status"] == "PUBLISHED"


def test_cannot_rebuild_in_place_while_published(tmp_path):
    institute_id = ObjectId(settings.institute_id)
    test_key = MANIFEST["testKey"]

    bundle = _bundle(tmp_path / "first")
    run_preparation_algorithm(bundle)
    run_verification(settings.institute_id, test_key, bundle)
    publish_test(institute_id, test_key)

    changed_manifest = copy.deepcopy(MANIFEST)
    changed_manifest["title"] = "Changed while published"
    changed_bundle = _bundle(tmp_path / "second", manifest=changed_manifest)

    with pytest.raises(RuntimeError, match="PUBLISHED"):
        run_preparation_algorithm(changed_bundle)


def test_verify_fails_on_missing_recommendation(tmp_path):
    bad_recs = copy.deepcopy(RECOMMENDATIONS)
    bad_recs[0]["recommendations"] = bad_recs[0]["recommendations"][:2]  # only 2 of 3
    directory = write_bundle(
        str(tmp_path), manifest=MANIFEST, questions=QUESTIONS, answer_key=ANSWER_KEY,
        students=STUDENTS, responses=RESPONSES, recommendations=bad_recs,
    )
    # validate_bundle itself rejects this before any write is attempted —
    # a demo cannot even reach "prepare" with an incomplete practice set.
    from app.services.bundle import BundleValidationError

    with pytest.raises(BundleValidationError, match="expected exactly 3"):
        validate_bundle(load_bundle(directory))


def test_answer_key_correction_rebuilds_the_whole_cohort(tmp_path):
    db = db_client.get_db()
    institute_id = ObjectId(settings.institute_id)
    test_key = MANIFEST["testKey"]

    bundle = _bundle(tmp_path / "before")
    run_preparation_algorithm(bundle)
    run_verification(settings.institute_id, test_key, bundle)
    publish_test(institute_id, test_key)

    unpublish_test(institute_id, test_key)

    corrected_bundle = _bundle(tmp_path / "after", answer_key=ANSWER_KEY_CORRECTED)
    run_preparation_algorithm(corrected_bundle)
    assert run_verification(settings.institute_id, test_key, corrected_bundle) is True
    publish_test(institute_id, test_key)

    expected_totals = EXPECTED["after_key_correction"]["totals"]
    for enrollment_no, expected_score in expected_totals.items():
        student = db.students.find_one({"instituteId": institute_id, "enrollmentNo": enrollment_no})
        report = db.evaluationreports.find_one({"studentId": student["_id"]})
        assert report["score"] == float(expected_score), enrollment_no

    student_a = db.students.find_one({"instituteId": institute_id, "enrollmentNo": "A"})
    report_a = db.evaluationreports.find_one({"studentId": student_a["_id"]})
    expected_alpha = EXPECTED["after_key_correction"]["alpha_overall"]
    overall = next(c for c in report_a["analysisDemo"]["batchSnapshot"]["categories"] if c["key"] == "overall")
    assert overall["classAverage"] == expected_alpha["classAverage"]
    assert overall["topperScore"] == expected_alpha["topperScore"]
    assert report_a["analysisDemo"]["batchSnapshot"]["topperCount"] == expected_alpha["topperCount"]
