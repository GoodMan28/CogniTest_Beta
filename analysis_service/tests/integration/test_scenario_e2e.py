import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from app.config import settings
from app.db import db_client
from app.main import app
from app.repositories.tests import publish_test, unpublish_test
from app.services.auth import generate_claims
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

client = TestClient(app, base_url="https://testserver")


@pytest.fixture(autouse=True)
def clean_db():
    db = db_client.get_db()
    for coll in db.list_collection_names():
        db[coll].delete_many({})
    yield


def _bundle(directory, **overrides):
    kwargs = dict(
        manifest=MANIFEST, questions=QUESTIONS, answer_key=ANSWER_KEY,
        students=STUDENTS, responses=RESPONSES, recommendations=RECOMMENDATIONS,
    )
    kwargs.update(overrides)
    write_bundle(directory, **kwargs)
    return validate_bundle(load_bundle(directory))


def test_full_lifecycle(tmp_path):
    institute_id = ObjectId(settings.institute_id)
    test_key = MANIFEST["testKey"]

    # 1. Prepare, verify, publish the shared fixture bundle.
    bundle = _bundle(str(tmp_path / "before"))
    run_preparation_algorithm(bundle)
    assert run_verification(settings.institute_id, test_key, bundle) is True
    publish_test(institute_id, test_key)

    test_doc = db_client.get_db()["tests"].find_one(
        {"instituteId": institute_id, "analysisDemo.sourceKey": test_key}
    )
    assert test_doc["analysisDemo"]["status"] == "PUBLISHED"

    # 2. Issue claims, activate student A.
    claims = generate_claims(institute_id, test_key)
    assert len(claims) == 4
    token_a = next(c["claimCode"] for c in claims if c["enrollmentNo"] == "A")

    headers = {"Origin": "http://localhost:3000"}
    resp = client.post(
        "/api/v2/demo/auth/activate",
        json={"code": token_a, "enrollmentNo": "A", "password": "password123"},
        headers=headers,
    )
    assert resp.status_code == 200

    resp = client.post(
        "/api/v2/demo/auth/login",
        json={"enrollmentNo": "A", "password": "password123"},
        headers=headers,
    )
    assert resp.status_code == 200
    cookies_a = resp.cookies

    resp = client.get("/api/v2/demo/auth/me", cookies=cookies_a)
    assert resp.status_code == 200
    assert resp.json()["enrollmentNo"] == "A"

    # 3. Report list/detail (Phase R4 territory — see xfail reason above).
    resp = client.get("/api/v2/demo/reports", cookies=cookies_a)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["score"] == EXPECTED["student_A"]["summary"]["score"]

    report_a_id = data[0]["reportId"]

    resp = client.get(f"/api/v2/demo/reports/{report_a_id}", cookies=cookies_a)
    assert resp.status_code == 200
    detail = resp.json()
    assert detail["summary"]["score"] == EXPECTED["student_A"]["summary"]["score"]
    assert detail["comparisons"]["rows"][0]["classAverage"] == EXPECTED["cohort_alpha"]["categories"]["overall"]["classAverage"]
    build_id = detail["buildId"]
    q1_hash = next(q["contentHash"] for q in detail["questions"] if q["questionNo"] == 1)

    resp = client.get(f"/api/v2/demo/reports/{report_a_id}/questions/1/practice", cookies=cookies_a)
    assert resp.status_code == 200
    assert len(resp.json()) == 3

    resp = client.put(
        f"/api/v2/demo/reports/{report_a_id}/questions/1/reflection",
        json={"text": "I knew this!", "buildId": build_id, "questionContentHash": q1_hash},
        cookies=cookies_a,
    )
    assert resp.status_code == 200

    resp = client.get(f"/api/v2/demo/reports/{report_a_id}", cookies=cookies_a)
    detail2 = resp.json()
    assert detail2["reflections"]["1"]["text"] == "I knew this!"

    resp = client.post("/api/v2/demo/auth/logout", cookies=cookies_a, headers=headers)
    assert resp.status_code == 200

    # 4. Log in as another student (C) and verify isolation.
    token_c = next(c["claimCode"] for c in claims if c["enrollmentNo"] == "C")
    client.post(
        "/api/v2/demo/auth/activate",
        json={"code": token_c, "enrollmentNo": "C", "password": "pass1234"},
        headers=headers,
    )
    resp = client.post(
        "/api/v2/demo/auth/login", json={"enrollmentNo": "C", "password": "pass1234"}, headers=headers
    )
    cookies_c = resp.cookies

    resp = client.get(f"/api/v2/demo/reports/{report_a_id}", cookies=cookies_c)
    assert resp.status_code == 404  # C cannot see A's report

    resp = client.get("/api/v2/demo/reports", cookies=cookies_c)
    report_c_id = resp.json()[0]["reportId"]
    assert report_c_id != report_a_id

    # 5. Unpublish: nothing visible via the API.
    unpublish_test(institute_id, test_key)

    resp = client.get("/api/v2/demo/reports", cookies=cookies_a)
    assert len(resp.json()) == 0

    resp = client.get(f"/api/v2/demo/reports/{report_a_id}", cookies=cookies_a)
    assert resp.status_code == 404

    # 6. Answer-key correction + full-cohort rebuild.
    corrected_bundle = _bundle(str(tmp_path / "after"), answer_key=ANSWER_KEY_CORRECTED)
    run_preparation_algorithm(corrected_bundle)
    assert run_verification(settings.institute_id, test_key, corrected_bundle) is True
    publish_test(institute_id, test_key)

    resp = client.get("/api/v2/demo/reports", cookies=cookies_c)
    expected_c_score = EXPECTED["after_key_correction"]["totals"]["C"]
    assert resp.json()[0]["score"] == f"{float(expected_c_score):.2f}"

    # A's stale reflection reference (old buildId/hash) is rejected.
    resp = client.put(
        f"/api/v2/demo/reports/{report_a_id}/questions/1/reflection",
        json={"text": "Still right?", "buildId": build_id, "questionContentHash": q1_hash},
        cookies=cookies_a,
    )
    assert resp.status_code == 409
