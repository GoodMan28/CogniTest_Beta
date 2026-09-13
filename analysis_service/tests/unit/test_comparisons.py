from decimal import Decimal

from app.domain.analytics import build_breakdowns, build_summary
from app.domain.comparisons import build_cohort_aggregates, compute_cohort_stats
from app.domain.results import build_question_results
from tests.fixtures.synthetic_fixture import ANSWER_KEY, EXPECTED, QUESTIONS, RESPONSES

MARKING = {
    "multiple_choice": {"correctMarks": Decimal("4"), "incorrectPenalty": Decimal("1")},
    "numerical": {"correctMarks": Decimal("4"), "incorrectPenalty": Decimal("1")},
}
QUESTION_IDS = {q["questionNo"]: f"q{q['questionNo']}" for q in QUESTIONS}
CONTENT_HASHES = {q["questionNo"]: f"hash{q['questionNo']}" for q in QUESTIONS}
PRACTICE_COUNTS = {1: 3, 2: 3, 3: 3, 4: 3}


# --- Legacy shim: kept working, unchanged, until Phase R3 retires it ---

def test_compute_cohort_stats_alpha():
    student_scores = {
        "A": {"total": Decimal("12"), "Mathematics": Decimal("3"), "Physics": Decimal("4")},
        "B": {"total": Decimal("12"), "Mathematics": Decimal("3"), "Physics": Decimal("4")},
        "C": {"total": Decimal("2"), "Mathematics": Decimal("4"), "Physics": Decimal("-1")},
    }

    stats = compute_cohort_stats(student_scores)
    assert stats["cohort_size"] == 3
    assert stats["mean"] == "8.67"
    assert "A" in stats["toppers"]
    assert "B" in stats["toppers"]
    assert len(stats["toppers"]) == 2

    assert stats["toppers_subject_means"]["Mathematics"] == "3.00"
    assert stats["toppers_subject_means"]["Physics"] == "4.00"

def test_compute_cohort_stats_beta():
    student_scores = {
        "D": {"total": Decimal("16"), "Mathematics": Decimal("3"), "Physics": Decimal("4")}
    }
    stats = compute_cohort_stats(student_scores)
    assert stats["cohort_size"] == 1
    assert stats["mean"] is None
    assert stats["toppers"] == []
    assert stats["toppers_subject_means"] == {}


# --- build_cohort_aggregates: the real Section 1.4 contract ---

def _student_category_buckets(enrollment_no: str):
    response = next(r for r in RESPONSES if r["enrollmentNo"] == enrollment_no)
    results = build_question_results(
        questions=QUESTIONS, answer_key=ANSWER_KEY, response=response,
        marking_by_type=MARKING, question_ids=QUESTION_IDS,
        content_hashes=CONTENT_HASHES, practice_counts=PRACTICE_COUNTS,
    )
    overall = build_summary(results)
    breakdowns = {b.scope: b for b in build_breakdowns(results)}
    return {
        "overall": overall,
        "subject": {b.key: b for b in breakdowns["subject"].buckets},
        "difficulty": {b.key: b for b in breakdowns["difficulty"].buckets},
        "questionType": {b.key: b for b in breakdowns["questionType"].buckets},
    }

def _category(aggregates, scope, key):
    return next(c for c in aggregates.categories if c.scope == scope and c.key == key)

def test_build_cohort_aggregates_alpha_matches_expected():
    per_student = {sid: _student_category_buckets(sid) for sid in ("A", "B", "C")}
    aggregates = build_cohort_aggregates(
        policy="default", cohort_label="Alpha", per_student=per_student,
        computed_at="2026-09-12T00:00:00+00:00",
    )
    expected = EXPECTED["cohort_alpha"]

    assert aggregates.cohortSize == expected["cohortSize"]
    assert aggregates.available == expected["available"]
    assert aggregates.unavailableReason == expected["unavailableReason"]
    assert aggregates.topperCount == expected["topperCount"]
    assert aggregates.topperLabel == expected["topperLabel"]

    scope_of = {
        "overall": "overall", "Physics": "subject", "Chemistry": "subject",
        "Mathematics": "subject", "easy": "difficulty", "medium": "difficulty",
        "hard": "difficulty", "multiple_choice": "questionType", "numerical": "questionType",
    }
    for key, exp in expected["categories"].items():
        cat = _category(aggregates, scope_of[key], key)
        assert cat.classAverage == exp["classAverage"], key
        assert cat.topperScore == exp["topperScore"], key

def test_build_cohort_aggregates_beta_unavailable():
    per_student = {"D": _student_category_buckets("D")}
    aggregates = build_cohort_aggregates(
        policy="default", cohort_label="Beta", per_student=per_student,
        computed_at="2026-09-12T00:00:00+00:00",
    )
    expected = EXPECTED["cohort_beta"]

    assert aggregates.cohortSize == expected["cohortSize"]
    assert aggregates.available == expected["available"]
    assert aggregates.unavailableReason == expected["unavailableReason"]
    assert aggregates.categories == []

def test_cohort_output_contains_no_student_identities():
    per_student = {sid: _student_category_buckets(sid) for sid in ("A", "B", "C")}
    aggregates = build_cohort_aggregates(
        policy="default", cohort_label="Alpha", per_student=per_student,
        computed_at="2026-09-12T00:00:00+00:00",
    )
    dumped = aggregates.model_dump_json()
    for enrollment_no in ("A", "B", "C"):
        assert f'"{enrollment_no}"' not in dumped

def test_after_answer_key_correction_alpha_overall_matches_expected():
    from tests.fixtures.synthetic_fixture import ANSWER_KEY_CORRECTED

    def buckets_for(enrollment_no: str):
        response = next(r for r in RESPONSES if r["enrollmentNo"] == enrollment_no)
        results = build_question_results(
            questions=QUESTIONS, answer_key=ANSWER_KEY_CORRECTED, response=response,
            marking_by_type=MARKING, question_ids=QUESTION_IDS,
            content_hashes=CONTENT_HASHES, practice_counts=PRACTICE_COUNTS,
        )
        overall = build_summary(results)
        breakdowns = {b.scope: b for b in build_breakdowns(results)}
        return {
            "overall": overall,
            "subject": {b.key: b for b in breakdowns["subject"].buckets},
            "difficulty": {b.key: b for b in breakdowns["difficulty"].buckets},
            "questionType": {b.key: b for b in breakdowns["questionType"].buckets},
        }

    per_student = {sid: buckets_for(sid) for sid in ("A", "B", "C")}
    aggregates = build_cohort_aggregates(
        policy="default", cohort_label="Alpha", per_student=per_student,
        computed_at="2026-09-12T00:00:00+00:00",
    )
    expected = EXPECTED["after_key_correction"]["alpha_overall"]
    overall = _category(aggregates, "overall", "overall")
    assert overall.classAverage == expected["classAverage"]
    assert overall.topperScore == expected["topperScore"]
    assert aggregates.topperCount == expected["topperCount"]
    assert aggregates.topperLabel == expected["topperLabel"]
