import pytest
from bson import ObjectId

from app.config import settings
from app.db import db_client
from app.repositories.tests import publish_test, unpublish_test
from app.services.bundle import load_bundle, validate_bundle
from app.services.preparation import run_preparation_algorithm
from app.services.reports import get_practice_questions, get_report_detail, get_student_reports, update_reflection
from app.services.verification import run_verification
from tests.fixtures.bundle_writer import write_synthetic_fixture
from tests.fixtures.synthetic_fixture import EXPECTED, MANIFEST


@pytest.fixture
def published_bundle(tmp_path):
    directory = write_synthetic_fixture(str(tmp_path))
    bundle = validate_bundle(load_bundle(directory))
    run_preparation_algorithm(bundle)
    run_verification(settings.institute_id, MANIFEST["testKey"], bundle)
    publish_test(ObjectId(settings.institute_id), MANIFEST["testKey"])
    return bundle


def _student_id(enrollment_no: str) -> ObjectId:
    db = db_client.get_db()
    doc = db.students.find_one({"instituteId": ObjectId(settings.institute_id), "enrollmentNo": enrollment_no})
    return doc["_id"]


def test_reports_empty_before_publish(tmp_path):
    directory = write_synthetic_fixture(str(tmp_path))
    bundle = validate_bundle(load_bundle(directory))
    run_preparation_algorithm(bundle)  # READY, not yet published

    student_id = _student_id("A")
    reports = get_student_reports(student_id, ObjectId(settings.institute_id))
    assert reports == []


def test_list_and_detail_match_expected(published_bundle):
    student_id = _student_id("A")
    institute_id = ObjectId(settings.institute_id)

    reports = get_student_reports(student_id, institute_id)
    assert len(reports) == 1
    expected_summary = EXPECTED["student_A"]["summary"]
    assert reports[0].score == expected_summary["score"]
    assert reports[0].maximumMarks == expected_summary["maximumMarks"]
    assert reports[0].correct == expected_summary["correct"]

    report_id = ObjectId(reports[0].reportId)
    detail = get_report_detail(student_id, institute_id, report_id)
    assert detail.summary.score == expected_summary["score"]
    assert detail.summary.correct == expected_summary["correct"]
    assert len(detail.breakdowns) == 7
    assert [b.scope for b in detail.breakdowns] == [
        "subject", "difficulty", "subjectDifficulty", "questionType", "unit", "chapter", "topic",
    ]
    assert detail.comparisons.available is True
    assert detail.comparisons.topperLabel == EXPECTED["cohort_alpha"]["topperLabel"]
    overall_row = next(r for r in detail.comparisons.rows if r.key == "overall")
    assert overall_row.classAverage == EXPECTED["cohort_alpha"]["categories"]["overall"]["classAverage"]
    assert overall_row.yourScore == expected_summary["score"]


def test_detail_for_single_student_cohort_shows_unavailable(published_bundle):
    student_id = _student_id("D")
    institute_id = ObjectId(settings.institute_id)

    reports = get_student_reports(student_id, institute_id)
    detail = get_report_detail(student_id, institute_id, ObjectId(reports[0].reportId))
    assert detail.comparisons.available is False
    assert detail.comparisons.unavailableReason == EXPECTED["cohort_beta"]["unavailableReason"]
    assert detail.comparisons.rows == []


def test_practice_questions_for_q1_are_real_and_complete(published_bundle):
    student_id = _student_id("A")
    institute_id = ObjectId(settings.institute_id)
    report_id = ObjectId(get_student_reports(student_id, institute_id)[0].reportId)

    practice = get_practice_questions(student_id, institute_id, report_id, 1)
    assert len(practice) == 3
    assert {p.sourceKey for p in practice} == {"p1", "p2", "p3"}
    for p in practice:
        assert p.subject == "Physics"
        assert p.correctAnswer
        assert p.solutionText


def test_practice_for_unknown_question_number_is_404(published_bundle):
    student_id = _student_id("A")
    institute_id = ObjectId(settings.institute_id)
    report_id = ObjectId(get_student_reports(student_id, institute_id)[0].reportId)

    with pytest.raises(ValueError, match="Question not found"):
        get_practice_questions(student_id, institute_id, report_id, 99)


def test_reflection_lifecycle(published_bundle):
    student_id = _student_id("A")
    institute_id = ObjectId(settings.institute_id)
    report_id = ObjectId(get_student_reports(student_id, institute_id)[0].reportId)

    detail = get_report_detail(student_id, institute_id, report_id)
    build_id = detail.buildId
    q1_hash = next(q.contentHash for q in detail.questions if q.questionNo == 1)

    saved = update_reflection(student_id, institute_id, report_id, 1, "Hard question", build_id, q1_hash)
    assert saved.text == "Hard question"
    assert saved.stale is False

    detail2 = get_report_detail(student_id, institute_id, report_id)
    assert detail2.reflections["1"].text == "Hard question"
    assert detail2.reflections["1"].stale is False

    # Clear it.
    cleared = update_reflection(student_id, institute_id, report_id, 1, "", build_id, q1_hash)
    assert cleared is None
    detail3 = get_report_detail(student_id, institute_id, report_id)
    assert "1" not in detail3.reflections

    # Stale build id.
    with pytest.raises(ValueError, match="Stale build ID"):
        update_reflection(student_id, institute_id, report_id, 1, "Text", "not-the-real-build-id", q1_hash)

    # Stale content hash.
    with pytest.raises(ValueError, match="Stale question content hash"):
        update_reflection(student_id, institute_id, report_id, 1, "Text", build_id, "not-the-real-hash")


def test_cross_student_access_is_denied(published_bundle):
    student_a = _student_id("A")
    student_b = _student_id("B")
    institute_id = ObjectId(settings.institute_id)
    report_a_id = ObjectId(get_student_reports(student_a, institute_id)[0].reportId)

    with pytest.raises(ValueError, match="Report not found"):
        get_report_detail(student_b, institute_id, report_a_id)
    with pytest.raises(ValueError, match="Report not found"):
        get_practice_questions(student_b, institute_id, report_a_id, 1)
    with pytest.raises(ValueError, match="Report not found"):
        update_reflection(student_b, institute_id, report_a_id, 1, "sneaky", "whatever", "whatever")


def test_unpublished_test_reports_are_inaccessible(published_bundle):
    student_id = _student_id("A")
    institute_id = ObjectId(settings.institute_id)
    report_id = ObjectId(get_student_reports(student_id, institute_id)[0].reportId)

    unpublish_test(institute_id, MANIFEST["testKey"])

    assert get_student_reports(student_id, institute_id) == []
    with pytest.raises(ValueError, match="not published"):
        get_report_detail(student_id, institute_id, report_id)


def test_response_contains_no_other_student_identity(published_bundle):
    # Fixture enrollment numbers are single uppercase letters (A/B/C/D),
    # which also happen to be legitimate MCQ option letters elsewhere in a
    # real response (e.g. correctAnswer "B") — a naive substring check on
    # single letters would false-positive on those. Names, and the
    # "enrollmentNo" key itself, are unambiguous and don't collide.
    student_id = _student_id("A")
    institute_id = ObjectId(settings.institute_id)
    report_id = ObjectId(get_student_reports(student_id, institute_id)[0].reportId)
    detail = get_report_detail(student_id, institute_id, report_id)

    dumped = detail.model_dump_json()
    assert "enrollmentNo" not in dumped
    for other_name in ("Priya Nair", "Arjun Mehta"):
        assert other_name not in dumped


def test_detail_issues_at_most_two_top_level_queries(published_bundle, monkeypatch):
    """
    No per-question database query loop for report detail: the snapshot
    already contains every question row (Section 6 performance requirement).
    We allow at most 2 top-level find_one calls (report, then test) — the
    comparisons/reflections/questions all come from the already-fetched
    snapshot, not from further queries.
    """
    import pymongo.collection

    call_count = {"find_one": 0}
    original_find_one = pymongo.collection.Collection.find_one

    def counting_find_one(self, *args, **kwargs):
        call_count["find_one"] += 1
        return original_find_one(self, *args, **kwargs)

    monkeypatch.setattr(pymongo.collection.Collection, "find_one", counting_find_one)

    student_id = _student_id("A")
    institute_id = ObjectId(settings.institute_id)
    report_id = ObjectId(get_student_reports(student_id, institute_id)[0].reportId)

    call_count["find_one"] = 0  # reset after the list call above
    get_report_detail(student_id, institute_id, report_id)
    assert call_count["find_one"] <= 2
