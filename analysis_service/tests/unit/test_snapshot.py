from decimal import Decimal

from app.domain.results import build_question_results
from app.domain.snapshot import build_student_snapshot
from tests.fixtures.synthetic_fixture import ANSWER_KEY, EXPECTED, QUESTIONS, RESPONSES

MARKING = {
    "multiple_choice": {"correctMarks": Decimal("4"), "incorrectPenalty": Decimal("1")},
    "numerical": {"correctMarks": Decimal("4"), "incorrectPenalty": Decimal("1")},
}
QUESTION_IDS = {q["questionNo"]: f"q{q['questionNo']}" for q in QUESTIONS}
CONTENT_HASHES = {q["questionNo"]: f"hash{q['questionNo']}" for q in QUESTIONS}
PRACTICE_COUNTS = {1: 3, 2: 3, 3: 3, 4: 3}


def _snapshot_for(enrollment_no: str):
    response = next(r for r in RESPONSES if r["enrollmentNo"] == enrollment_no)
    results = build_question_results(
        questions=QUESTIONS, answer_key=ANSWER_KEY, response=response,
        marking_by_type=MARKING, question_ids=QUESTION_IDS,
        content_hashes=CONTENT_HASHES, practice_counts=PRACTICE_COUNTS,
    )
    return build_student_snapshot(results)


def test_snapshot_has_seven_breakdowns_in_required_order():
    snapshot = _snapshot_for("A")
    assert [b.scope for b in snapshot.breakdowns] == [
        "subject", "difficulty", "subjectDifficulty", "questionType", "unit", "chapter", "topic",
    ]


def test_snapshot_questions_sorted_by_question_no_regardless_of_input_order():
    response = next(r for r in RESPONSES if r["enrollmentNo"] == "A")
    shuffled_questions = list(reversed(QUESTIONS))
    results = build_question_results(
        questions=shuffled_questions, answer_key=ANSWER_KEY, response=response,
        marking_by_type=MARKING, question_ids=QUESTION_IDS,
        content_hashes=CONTENT_HASHES, practice_counts=PRACTICE_COUNTS,
    )
    snapshot = build_student_snapshot(results)
    assert [q.questionNo for q in snapshot.questions] == [1, 2, 3, 4]


def test_snapshot_summary_matches_expected_for_student_a():
    snapshot = _snapshot_for("A")
    expected = EXPECTED["student_A"]["summary"]
    assert snapshot.summary.score == expected["score"]
    assert snapshot.summary.correct == expected["correct"]


def test_snapshot_schema_version():
    snapshot = _snapshot_for("A")
    assert snapshot.schemaVersion == "1.0"


def test_snapshot_revision_list_matches_expected_for_student_c():
    snapshot = _snapshot_for("C")
    expected = EXPECTED["student_C"]["revision_list"]
    actual = [
        {
            "rank": item.rank, "subject": item.subject, "topic": item.topic,
            "marksLost": item.marksLost, "reason": item.reason, "questionNos": item.questionNos,
        }
        for item in snapshot.revisionList
    ]
    assert actual == expected
