from decimal import Decimal

import pytest

from app.domain.results import build_question_results
from tests.fixtures.synthetic_fixture import ANSWER_KEY, EXPECTED, QUESTIONS, RESPONSES

MARKING = {
    "multiple_choice": {"correctMarks": Decimal("4"), "incorrectPenalty": Decimal("1")},
    "numerical": {"correctMarks": Decimal("4"), "incorrectPenalty": Decimal("1")},
}
QUESTION_IDS = {q["questionNo"]: f"q{q['questionNo']}" for q in QUESTIONS}
CONTENT_HASHES = {q["questionNo"]: f"hash{q['questionNo']}" for q in QUESTIONS}
PRACTICE_COUNTS = {1: 3, 2: 3, 3: 3, 4: 3}


def _build_for(enrollment_no: str):
    response = next(r for r in RESPONSES if r["enrollmentNo"] == enrollment_no)
    return build_question_results(
        questions=QUESTIONS, answer_key=ANSWER_KEY, response=response,
        marking_by_type=MARKING, question_ids=QUESTION_IDS,
        content_hashes=CONTENT_HASHES, practice_counts=PRACTICE_COUNTS,
    )


@pytest.mark.parametrize("enrollment_no", ["A", "B", "C", "D"])
def test_totals_match_expected(enrollment_no):
    results = _build_for(enrollment_no)
    total = sum(Decimal(r.awardedMarks) for r in results)
    assert total == Decimal(EXPECTED["totals"][enrollment_no])


def test_student_a_statuses_and_answers():
    results = {r.questionNo: r for r in _build_for("A")}
    assert results[1].status == "correct"
    assert results[1].studentAnswer == "B"
    assert results[1].correctAnswer == "B"
    assert results[2].status == "correct"
    assert results[2].studentAnswer == "0"  # numerical zero is a real, correct answer
    assert results[3].status == "skipped"
    assert results[3].studentAnswer is None
    assert results[3].correctAnswer == "A"  # the key is still resolved even though skipped
    assert results[4].status == "correct"
    assert results[4].studentAnswer == "-2"


def test_student_c_incorrect_and_skipped():
    results = {r.questionNo: r for r in _build_for("C")}
    assert results[1].status == "incorrect"
    assert results[1].studentAnswer == "D"
    assert results[3].status == "incorrect"
    assert results[3].studentAnswer == "B"
    assert results[4].status == "skipped"


def test_practice_count_is_populated():
    results = _build_for("A")
    assert all(r.practiceCount == 3 for r in results)


def test_negative_scores_are_not_clamped():
    # Give student C's Q1/Q3 incorrect answers a penalty > correct marks scenario
    # is not part of this fixture, but verify per-question awardedMarks itself
    # is negative for an incorrect answer (not clamped to 0).
    results = {r.questionNo: r for r in _build_for("C")}
    assert Decimal(results[1].awardedMarks) == Decimal("-1.00")
    assert Decimal(results[3].awardedMarks) == Decimal("-1.00")


def test_normalizes_plus_prefixed_and_negative_zero_integers():
    questions = [
        {
            "questionNo": 1, "subject": "Mathematics", "unit": "U", "chapter": ["C"],
            "topic": ["T"], "questionType": "numerical", "difficulty": "easy",
            "questionIntent": "i", "questionText": "t", "solutionText": "s",
        }
    ]
    answer_key = [{"questionNo": 1, "numericalAnswer": 4}]
    response = {"enrollmentNo": "X", "answers": [{"questionNo": 1, "answer": "+04"}]}
    results = build_question_results(
        questions=questions, answer_key=answer_key, response=response,
        marking_by_type=MARKING, question_ids={1: "q1"}, content_hashes={1: "h1"},
        practice_counts={1: 0},
    )
    assert results[0].status == "correct"
    assert results[0].studentAnswer == "4"

    response_neg_zero = {"enrollmentNo": "Y", "answers": [{"questionNo": 1, "answer": "-0"}]}
    answer_key_zero = [{"questionNo": 1, "numericalAnswer": 0}]
    results2 = build_question_results(
        questions=questions, answer_key=answer_key_zero, response=response_neg_zero,
        marking_by_type=MARKING, question_ids={1: "q1"}, content_hashes={1: "h1"},
        practice_counts={1: 0},
    )
    assert results2[0].status == "correct"
    assert results2[0].studentAnswer == "0"


@pytest.mark.parametrize("bad_answer", [True, "4.0", "1e2", "one"])
def test_malformed_numerical_answers_are_rejected(bad_answer):
    questions = [
        {
            "questionNo": 1, "subject": "Mathematics", "unit": "U", "chapter": ["C"],
            "topic": ["T"], "questionType": "numerical", "difficulty": "easy",
            "questionIntent": "i", "questionText": "t", "solutionText": "s",
        }
    ]
    answer_key = [{"questionNo": 1, "numericalAnswer": 4}]
    response = {"enrollmentNo": "X", "answers": [{"questionNo": 1, "answer": bad_answer}]}
    with pytest.raises(ValueError):
        build_question_results(
            questions=questions, answer_key=answer_key, response=response,
            marking_by_type=MARKING, question_ids={1: "q1"}, content_hashes={1: "h1"},
            practice_counts={1: 0},
        )


def test_invalid_mcq_letter_is_rejected():
    questions = [
        {
            "questionNo": 1, "subject": "Physics", "unit": "U", "chapter": ["C"],
            "topic": ["T"], "questionType": "multiple_choice", "difficulty": "easy",
            "questionIntent": "i", "questionText": "t", "options": ["A", "B"],
            "solutionText": "s",
        }
    ]
    answer_key = [{"questionNo": 1, "correctOption": "A"}]
    response = {"enrollmentNo": "X", "answers": [{"questionNo": 1, "answer": "Z"}]}
    with pytest.raises(ValueError):
        build_question_results(
            questions=questions, answer_key=answer_key, response=response,
            marking_by_type=MARKING, question_ids={1: "q1"}, content_hashes={1: "h1"},
            practice_counts={1: 0},
        )


def test_missing_response_row_is_an_error_not_skipped():
    questions = [
        {
            "questionNo": 1, "subject": "Physics", "unit": "U", "chapter": ["C"],
            "topic": ["T"], "questionType": "multiple_choice", "difficulty": "easy",
            "questionIntent": "i", "questionText": "t", "options": ["A", "B"],
            "solutionText": "s",
        },
        {
            "questionNo": 2, "subject": "Physics", "unit": "U", "chapter": ["C"],
            "topic": ["T"], "questionType": "multiple_choice", "difficulty": "easy",
            "questionIntent": "i", "questionText": "t", "options": ["A", "B"],
            "solutionText": "s",
        },
    ]
    answer_key = [
        {"questionNo": 1, "correctOption": "A"},
        {"questionNo": 2, "correctOption": "A"},
    ]
    # Only one answer row supplied for two questions.
    response = {"enrollmentNo": "X", "answers": [{"questionNo": 1, "answer": "A"}]}
    with pytest.raises(ValueError, match="questionNo 2"):
        build_question_results(
            questions=questions, answer_key=answer_key, response=response,
            marking_by_type=MARKING, question_ids={1: "q1", 2: "q2"},
            content_hashes={1: "h1", 2: "h2"}, practice_counts={1: 0, 2: 0},
        )
