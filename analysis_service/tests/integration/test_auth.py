import pytest
from bson import ObjectId

from app.config import settings
from app.db import db_client
from app.repositories.tests import publish_test
from app.services.auth import activate_student, create_jwt, decode_jwt, generate_claims, verify_password
from app.services.bundle import load_bundle, validate_bundle
from app.services.preparation import run_preparation_algorithm
from app.services.rate_limiter import check_rate_limit
from app.services.verification import run_verification
from tests.fixtures.bundle_writer import write_synthetic_fixture


def test_auth_lifecycle(tmp_path):
    institute_id = settings.institute_id
    directory = write_synthetic_fixture(str(tmp_path))
    bundle = validate_bundle(load_bundle(directory))
    test_key = bundle.manifest.testKey

    run_preparation_algorithm(bundle)
    run_verification(institute_id, test_key, bundle)
    publish_test(ObjectId(institute_id), test_key)

    # Generate claims
    claims = generate_claims(ObjectId(institute_id), test_key)
    assert len(claims) == 4

    student_claim = claims[0]
    enrollment = student_claim["enrollmentNo"]
    code = student_claim["claimCode"]

    # Activate
    password = "StrongPassword123"
    assert activate_student(ObjectId(institute_id), enrollment, code, password) is True

    db = db_client.get_db()
    student_doc = db.students.find_one({"instituteId": ObjectId(institute_id), "enrollmentNo": enrollment})

    # Field names match backend/src/models/Student.ts (defect D10):
    # analysisDemo.claimedAt (a Date), not analysisDemo.activation.claimed.
    assert student_doc["analysisDemo"]["claimedAt"] is not None
    assert student_doc["analysisDemo"]["claimDigest"]

    # Login
    assert verify_password(student_doc, password) is True
    assert verify_password(student_doc, "WrongPassword") is False

    # JWT Check
    token = create_jwt(student_doc)
    decoded = decode_jwt(token)
    assert decoded["sub"] == str(student_doc["_id"])
    assert decoded["role"] == "student"

    # Cannot activate again
    with pytest.raises(ValueError, match="Already activated"):
        activate_student(ObjectId(institute_id), enrollment, code, password)


def test_expired_claim_fails(tmp_path):
    import datetime

    institute_id = settings.institute_id
    directory = write_synthetic_fixture(str(tmp_path))
    bundle = validate_bundle(load_bundle(directory))
    test_key = bundle.manifest.testKey

    run_preparation_algorithm(bundle)
    run_verification(institute_id, test_key, bundle)
    publish_test(ObjectId(institute_id), test_key)

    claims = generate_claims(ObjectId(institute_id), test_key)
    student_claim = claims[0]

    db = db_client.get_db()
    db.students.update_one(
        {"instituteId": ObjectId(institute_id), "enrollmentNo": student_claim["enrollmentNo"]},
        {"$set": {"analysisDemo.claimExpiresAt": datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=1)}},
    )

    with pytest.raises(ValueError, match="Claim expired"):
        activate_student(
            ObjectId(institute_id), student_claim["enrollmentNo"], student_claim["claimCode"], "SomePassword123"
        )


def test_wrong_claim_code_fails(tmp_path):
    institute_id = settings.institute_id
    directory = write_synthetic_fixture(str(tmp_path))
    bundle = validate_bundle(load_bundle(directory))
    test_key = bundle.manifest.testKey

    run_preparation_algorithm(bundle)
    run_verification(institute_id, test_key, bundle)
    publish_test(ObjectId(institute_id), test_key)

    claims = generate_claims(ObjectId(institute_id), test_key)
    student_claim = claims[0]

    with pytest.raises(ValueError, match="Invalid claim code"):
        activate_student(
            ObjectId(institute_id), student_claim["enrollmentNo"], "wrong-code-entirely", "SomePassword123"
        )


def test_rate_limiter():
    key = "rl:test:123"
    allowed = 0
    for _ in range(5):
        if check_rate_limit(key, 3, 60):
            allowed += 1

    assert allowed == 3
