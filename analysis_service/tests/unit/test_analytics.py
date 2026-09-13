from decimal import Decimal

from app.domain.grading import GradeResult
from app.domain.analytics import build_breakdowns, build_summary, compute_metrics, format_decimal
from app.domain.results import build_question_results
from tests.fixtures.synthetic_fixture import ANSWER_KEY, EXPECTED, QUESTIONS, RESPONSES


def test_compute_metrics():
    results = [
        GradeResult(status="correct", normalized_answer="B", awarded_marks=Decimal("4")),
        GradeResult(status="incorrect", normalized_answer="A", awarded_marks=Decimal("-1")),
        GradeResult(status="skipped", normalized_answer=None, awarded_marks=Decimal("0")),
    ]
    bucket = compute_metrics(key="test", label="Test Bucket", results=results, max_marks=Decimal("12"))

    assert bucket.questionCount == 3
    assert bucket.attempted == 2
    assert bucket.correct == 1
    assert bucket.incorrect == 1
    assert bucket.skipped == 1
    assert bucket.score == "3.00"
    assert bucket.maximumMarks == "12.00"
    assert bucket.accuracyPct == "50.00"
    assert bucket.coveragePct == "66.67"


def test_format_decimal_rounding():
    assert format_decimal(Decimal("8.66666")) == "8.67"
    assert format_decimal(Decimal("-2.0")) == "-2.00"


# --- build_summary / build_breakdowns, against the fixture's EXPECTED values ---
# (evaluate_insight's old tests are superseded by test_insights.py, which
# tests build_insights directly — insight labeling is no longer computed
# from a MetricBucket, it is computed by grouping QuestionResult rows by
# (subject, topic) directly; see app/domain/insights.py, Phase R2 task 3.)

MARKING = {
    "multiple_choice": {"correctMarks": Decimal("4"), "incorrectPenalty": Decimal("1")},
    "numerical": {"correctMarks": Decimal("4"), "incorrectPenalty": Decimal("1")},
}
QUESTION_IDS = {q["questionNo"]: f"q{q['questionNo']}" for q in QUESTIONS}
CONTENT_HASHES = {q["questionNo"]: f"hash{q['questionNo']}" for q in QUESTIONS}
PRACTICE_COUNTS = {1: 3, 2: 3, 3: 3, 4: 3}


def _results_for(enrollment_no: str):
    response = next(r for r in RESPONSES if r["enrollmentNo"] == enrollment_no)
    return build_question_results(
        questions=QUESTIONS,
        answer_key=ANSWER_KEY,
        response=response,
        marking_by_type=MARKING,
        question_ids=QUESTION_IDS,
        content_hashes=CONTENT_HASHES,
        practice_counts=PRACTICE_COUNTS,
    )


def _bucket_by_key(buckets, key):
    return next(b for b in buckets if b.key == key)


def _breakdown_by_scope(breakdowns, scope):
    return next(b for b in breakdowns if b.scope == scope)


def test_build_summary_matches_student_a_expected():
    summary = build_summary(_results_for("A"))
    expected = EXPECTED["student_A"]["summary"]
    assert summary.key == "overall"
    assert summary.overlapping is False
    assert summary.questionCount == expected["questionCount"]
    assert summary.correct == expected["correct"]
    assert summary.incorrect == expected["incorrect"]
    assert summary.skipped == expected["skipped"]
    assert summary.attempted == expected["attempted"]
    assert summary.score == expected["score"]
    assert summary.maximumMarks == expected["maximumMarks"]
    assert summary.accuracyPct == expected["accuracyPct"]
    assert summary.coveragePct == expected["coveragePct"]


def test_build_breakdowns_has_seven_scopes_in_order():
    breakdowns = build_breakdowns(_results_for("A"))
    assert [b.scope for b in breakdowns] == [
        "subject", "difficulty", "subjectDifficulty", "questionType", "unit", "chapter", "topic",
    ]


def test_build_breakdowns_subject_matches_student_a_expected():
    breakdowns = build_breakdowns(_results_for("A"))
    subject_breakdown = _breakdown_by_scope(breakdowns, "subject")
    assert subject_breakdown.overlapping is False
    expected = EXPECTED["student_A"]["subject_buckets"]
    for subject, exp in expected.items():
        bucket = _bucket_by_key(subject_breakdown.buckets, subject)
        assert bucket.score == exp["score"]
        assert bucket.maximumMarks == exp["maximumMarks"]
        assert bucket.accuracyPct == exp["accuracyPct"]
        assert bucket.coveragePct == exp["coveragePct"]


def test_build_breakdowns_difficulty_matches_student_a_expected():
    breakdowns = build_breakdowns(_results_for("A"))
    difficulty_breakdown = _breakdown_by_scope(breakdowns, "difficulty")
    expected = EXPECTED["student_A"]["difficulty_buckets"]
    for difficulty, exp in expected.items():
        bucket = _bucket_by_key(difficulty_breakdown.buckets, difficulty)
        assert bucket.score == exp["score"]
        assert bucket.maximumMarks == exp["maximumMarks"]
        assert bucket.accuracyPct == exp["accuracyPct"]
        assert bucket.coveragePct == exp["coveragePct"]


def test_build_breakdowns_question_type_matches_student_a_expected():
    breakdowns = build_breakdowns(_results_for("A"))
    type_breakdown = _breakdown_by_scope(breakdowns, "questionType")
    expected = EXPECTED["student_A"]["questionType_buckets"]
    for qtype, exp in expected.items():
        bucket = _bucket_by_key(type_breakdown.buckets, qtype)
        assert bucket.score == exp["score"]
        assert bucket.maximumMarks == exp["maximumMarks"]
        assert bucket.accuracyPct == exp["accuracyPct"]
        assert bucket.coveragePct == exp["coveragePct"]


def test_overlapping_breakdowns_never_inflate_overall_total():
    results = _results_for("A")
    summary = build_summary(results)
    breakdowns = build_breakdowns(results)

    # Overlapping scopes (unit/chapter/topic) are flagged overlapping=True
    # and must never be summed to reconstruct the overall score/questionCount.
    for scope_name in ("unit", "chapter", "topic"):
        breakdown = _breakdown_by_scope(breakdowns, scope_name)
        assert breakdown.overlapping is True
        for bucket in breakdown.buckets:
            assert bucket.overlapping is True

    # True partitions (subject/difficulty/questionType) DO reconcile with
    # the overall total, since every question belongs to exactly one bucket
    # in each of those breakdowns.
    for scope_name in ("subject", "difficulty", "questionType"):
        breakdown = _breakdown_by_scope(breakdowns, scope_name)
        assert breakdown.overlapping is False
        total_score = sum(Decimal(b.score) for b in breakdown.buckets)
        total_questions = sum(b.questionCount for b in breakdown.buckets)
        assert total_score == Decimal(summary.score)
        assert total_questions == summary.questionCount


def test_same_topic_name_in_different_subjects_stays_separate():
    # Two questions tagged with the identical topic string but different
    # subjects must produce two distinct topic buckets, not one merged bucket.
    from app.schemas.reports import QuestionResult

    shared_topic_rows = [
        QuestionResult(
            questionNo=1, questionId="x1", contentHash="h1", subject="Physics",
            unit="U", chapter=["C"], topic=["Equilibrium"], questionType="multiple_choice",
            difficulty="easy", questionIntent="i", questionText="t", options=["A", "B"],
            studentAnswer="A", correctAnswer="A", status="correct",
            awardedMarks="4.00", maximumMarks="4.00", solutionText="s", practiceCount=0,
        ),
        QuestionResult(
            questionNo=2, questionId="x2", contentHash="h2", subject="Chemistry",
            unit="U", chapter=["C"], topic=["Equilibrium"], questionType="multiple_choice",
            difficulty="easy", questionIntent="i", questionText="t", options=["A", "B"],
            studentAnswer="B", correctAnswer="A", status="incorrect",
            awardedMarks="-1.00", maximumMarks="4.00", solutionText="s", practiceCount=0,
        ),
    ]
    breakdowns = build_breakdowns(shared_topic_rows)
    topic_breakdown = _breakdown_by_scope(breakdowns, "topic")
    assert len(topic_breakdown.buckets) == 2
    keys = {b.key for b in topic_breakdown.buckets}
    assert keys == {"Physics::Equilibrium", "Chemistry::Equilibrium"}


def test_breakdown_input_order_does_not_change_output():
    results = _results_for("A")
    forward = build_breakdowns(results)
    backward = build_breakdowns(list(reversed(results)))

    def as_dict(breakdowns):
        return {
            b.scope: sorted((bucket.key, bucket.score, bucket.maximumMarks) for bucket in b.buckets)
            for b in breakdowns
        }

    assert as_dict(forward) == as_dict(backward)
