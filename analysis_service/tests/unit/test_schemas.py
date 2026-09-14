import pytest
from pydantic import ValidationError

from app.schemas.inputs import (
    AnswerSchema,
    AnswerKeySchema,
    ManifestSchema,
    QuestionSchema,
    PracticeQuestionSchema,
    RecommendationSchema,
    RosterEntrySchema,
    StudentResponseSchema,
    validate_roster_uniqueness,
)
from tests.fixtures.synthetic_fixture import (
    MANIFEST,
    QUESTIONS,
    ANSWER_KEY,
    ANSWER_KEY_CORRECTED,
    STUDENTS,
    RESPONSES,
    RECOMMENDATIONS,
)


def test_boolean_rejected_numerical_answer():
    with pytest.raises(ValidationError):
        AnswerKeySchema(questionNo=1, numericalAnswer=True)

def test_boolean_rejected_student_answer():
    with pytest.raises(ValidationError):
        AnswerSchema(questionNo=1, answer=False)

def test_unknown_question_type_fails():
    q = QUESTIONS[0].copy()
    q["questionType"] = "unknown"
    with pytest.raises(ValidationError):
        QuestionSchema(**q)

def test_unknown_subject_fails():
    q = QUESTIONS[0].copy()
    q["subject"] = "History"
    with pytest.raises(ValidationError):
        QuestionSchema(**q)

def test_numerical_zero_valid():
    ans = AnswerKeySchema(questionNo=2, numericalAnswer=0)
    assert ans.numericalAnswer == 0
    ans2 = AnswerSchema(questionNo=2, answer=0)
    assert ans2.answer == 0

def test_missing_responses_fail():
    with pytest.raises(ValidationError):
        StudentResponseSchema(enrollmentNo="test")

    with pytest.raises(ValidationError):
        StudentResponseSchema(enrollmentNo="test", answers=[])


# --- Manifest / marking ---

def test_manifest_negative_penalty_fails():
    bad = MANIFEST.copy()
    bad["markingByType"] = {
        "multiple_choice": {"correctMarks": 4, "incorrectPenalty": -1},
    }
    with pytest.raises(ValidationError):
        ManifestSchema(**bad)

def test_manifest_zero_correct_marks_fails():
    bad = MANIFEST.copy()
    bad["markingByType"] = {
        "multiple_choice": {"correctMarks": 0, "incorrectPenalty": 1},
    }
    with pytest.raises(ValidationError):
        ManifestSchema(**bad)

def test_manifest_naive_date_fails():
    bad = MANIFEST.copy()
    bad["date"] = "2026-09-12T00:00:00"  # no offset/Z: not timezone-aware
    with pytest.raises(ValidationError):
        ManifestSchema(**bad)

def test_manifest_wrong_institute_id_fails():
    bad = MANIFEST.copy()
    bad["instituteId"] = "000000000000000000000000"  # valid ObjectId, wrong institute
    with pytest.raises(ValidationError):
        ManifestSchema(**bad)

def test_manifest_malformed_institute_id_fails():
    bad = MANIFEST.copy()
    bad["instituteId"] = "not-an-object-id"
    with pytest.raises(ValidationError):
        ManifestSchema(**bad)

def test_manifest_parses_the_fixture():
    m = ManifestSchema(**MANIFEST)
    assert m.testKey == "demo-test"
    assert m.date.tzinfo is not None
    assert set(m.markingByType.keys()) == {"multiple_choice", "numerical"}


# --- Roster ---

def test_roster_case_insensitive_duplicate_fails():
    entries = [
        RosterEntrySchema(enrollmentNo="a1", name="X", batch="Y"),
        RosterEntrySchema(enrollmentNo="A1", name="Z", batch="Y"),
    ]
    with pytest.raises(ValueError):
        validate_roster_uniqueness(entries)

def test_roster_exact_duplicate_fails():
    entries = [
        RosterEntrySchema(enrollmentNo="a1", name="X", batch="Y"),
        RosterEntrySchema(enrollmentNo="a1", name="Z", batch="Y"),
    ]
    with pytest.raises(ValueError):
        validate_roster_uniqueness(entries)

def test_roster_distinct_ids_ok_even_with_same_name():
    entries = [RosterEntrySchema(**s) for s in STUDENTS]
    # Should not raise: A and C share a display name but have distinct
    # enrollment numbers.
    validate_roster_uniqueness(entries)
    names = {e.enrollmentNo: e.name for e in entries}
    assert names["A"] == names["C"] == "Rahul Sharma"

def test_roster_blank_fields_rejected():
    with pytest.raises(ValidationError):
        RosterEntrySchema(enrollmentNo="   ", name="X", batch="Y")


# --- QuestionSchema no longer accepts recommendationRefs ---

def test_question_schema_rejects_recommendation_refs():
    q = {**QUESTIONS[0], "recommendationRefs": ["x", "y", "z"]}
    with pytest.raises(ValidationError):
        QuestionSchema(**q)


# --- PracticeQuestionSchema ---

def test_practice_question_rejects_both_answers():
    bad = RECOMMENDATIONS[0]["recommendations"][0].copy()
    bad["numericalAnswer"] = 0  # already has correctOption "A"
    with pytest.raises(ValidationError):
        PracticeQuestionSchema(**bad)

def test_practice_question_rejects_neither_answer():
    bad = RECOMMENDATIONS[0]["recommendations"][0].copy()
    bad.pop("correctOption")
    with pytest.raises(ValidationError):
        PracticeQuestionSchema(**bad)

def test_practice_question_rejects_option_letter_out_of_range():
    bad = RECOMMENDATIONS[0]["recommendations"][0].copy()
    bad["correctOption"] = "Z"  # only 4 options (A-D)
    with pytest.raises(ValidationError):
        PracticeQuestionSchema(**bad)

def test_practice_question_has_no_question_no_field():
    # sourceKey-identified, never questionNo-identified.
    parsed = PracticeQuestionSchema(**RECOMMENDATIONS[0]["recommendations"][0])
    assert not hasattr(parsed, "questionNo")


def _numerical_practice(**overrides):
    base = {
        "sourceKey": "p2-1", "subject": "Physics", "unit": "Mechanics",
        "chapter": ["Kinematics"], "topic": ["1D Motion"], "questionType": "numerical",
        "difficulty": "easy", "questionIntent": "x", "questionText": "x", "solutionText": "x",
    }
    base.update(overrides)
    return base

def test_practice_question_accepts_decimal_numerical_answer():
    # Practice answers are self-study (never graded) so 6.93 is legitimate.
    parsed = PracticeQuestionSchema(**_numerical_practice(numericalAnswer=6.93))
    assert parsed.numericalAnswer == 6.93

def test_practice_question_normalizes_whole_float_to_int():
    parsed = PracticeQuestionSchema(**_numerical_practice(numericalAnswer=5.0))
    assert parsed.numericalAnswer == 5 and isinstance(parsed.numericalAnswer, int)

def test_practice_question_rejects_non_finite_and_boolean_numerical_answer():
    with pytest.raises(ValidationError):
        PracticeQuestionSchema(**_numerical_practice(numericalAnswer=float("inf")))
    with pytest.raises(ValidationError):
        PracticeQuestionSchema(**_numerical_practice(numericalAnswer=True))

def test_answer_key_still_rejects_decimal_numerical_answer():
    # The real paper's key is unchanged: integers only.
    with pytest.raises(ValidationError):
        AnswerKeySchema(questionNo=2, numericalAnswer=6.93)


# --- RecommendationSchema ---

def test_recommendation_schema_parses_the_fixture():
    recs = [RecommendationSchema(**r) for r in RECOMMENDATIONS]
    assert len(recs) == 4
    assert sum(len(r.recommendations) for r in recs) == 12

def test_recommendation_two_items_parses_at_schema_level():
    # The exact "== manifest.recommendationsPerQuestion" check is cross-file
    # (Phase R3, app/services/bundle.py) — at the schema level alone, any
    # nonempty list of valid practice questions is acceptable.
    short = {
        "originalQuestionNo": 1,
        "recommendations": RECOMMENDATIONS[0]["recommendations"][:2],
    }
    parsed = RecommendationSchema(**short)
    assert len(parsed.recommendations) == 2

def test_recommendation_duplicate_source_key_within_entry_fails():
    dup = RECOMMENDATIONS[0]["recommendations"][0].copy()
    dup2 = RECOMMENDATIONS[0]["recommendations"][1].copy()
    dup2["sourceKey"] = dup["sourceKey"]
    with pytest.raises(ValidationError):
        RecommendationSchema(originalQuestionNo=1, recommendations=[dup, dup2])


# --- Full-fixture round trip ---

def test_fixture_round_trips_through_every_schema():
    ManifestSchema(**MANIFEST)
    for q in QUESTIONS:
        QuestionSchema(**q)
    for a in ANSWER_KEY:
        AnswerKeySchema(**a)
    for a in ANSWER_KEY_CORRECTED:
        AnswerKeySchema(**a)
    roster = [RosterEntrySchema(**s) for s in STUDENTS]
    validate_roster_uniqueness(roster)
    for r in RESPONSES:
        StudentResponseSchema(**r)
    for rec in RECOMMENDATIONS:
        RecommendationSchema(**rec)
