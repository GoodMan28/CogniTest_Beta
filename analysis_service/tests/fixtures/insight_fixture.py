"""
A second, DB-free fixture whose sole purpose is exercising
app.domain.insights.build_insights across all four InsightLabel values.
The primary synthetic_fixture.py deliberately gives every topic exactly one
question (so every insight there is "Limited evidence" by construction);
this fixture instead gives three topics >= 3 attempted questions each, at
three different accuracy levels.

Not a full prepared bundle — just enough QuestionResult-shaped rows,
already graded, to call build_insights/build_revision_list directly. No
manifest/roster/recommendations needed since nothing here touches
ingestion, MongoDB, or HTTP.
"""
from app.schemas.reports import QuestionResult


def _row(no: int, topic: str, status: str, awarded: str, max_marks: str = "4.00") -> QuestionResult:
    return QuestionResult(
        questionNo=no,
        questionId=f"q{no}",
        contentHash=f"hash{no}",
        subject="Physics",
        unit="Mechanics",
        chapter=["Kinematics"],
        topic=[topic],
        questionType="multiple_choice",
        difficulty="medium",
        questionIntent="Practice",
        questionText=f"Question {no}",
        options=["A", "B", "C", "D"],
        studentAnswer="A" if status != "skipped" else None,
        correctAnswer="A" if status == "correct" else "B",
        status=status,
        awardedMarks=awarded,
        maximumMarks=max_marks,
        solutionText="Solution",
        practiceCount=0,
    )


# "Strength" topic: 4 attempted, 4 correct -> 100% accuracy, >= 80.
STRENGTH_ROWS = [
    _row(1, "Strength Topic", "correct", "4.00"),
    _row(2, "Strength Topic", "correct", "4.00"),
    _row(3, "Strength Topic", "correct", "4.00"),
    _row(4, "Strength Topic", "correct", "4.00"),
]

# "Developing" topic: 4 attempted, 2 correct, 2 incorrect -> 50% accuracy
# (>= 50, < 80): neither Strength nor Needs improvement.
DEVELOPING_ROWS = [
    _row(5, "Developing Topic", "correct", "4.00"),
    _row(6, "Developing Topic", "correct", "4.00"),
    _row(7, "Developing Topic", "incorrect", "-1.00"),
    _row(8, "Developing Topic", "incorrect", "-1.00"),
]

# "Needs improvement" topic: 4 attempted, 1 correct, 3 incorrect -> 25% accuracy, < 50.
WEAK_ROWS = [
    _row(9, "Weak Topic", "correct", "4.00"),
    _row(10, "Weak Topic", "incorrect", "-1.00"),
    _row(11, "Weak Topic", "incorrect", "-1.00"),
    _row(12, "Weak Topic", "incorrect", "-1.00"),
]

# "Limited evidence" topic: only 2 attempted (below MIN_ATTEMPTS_FOR_LABEL=3),
# even though both are correct — must not be labeled Strength.
LIMITED_EVIDENCE_ROWS = [
    _row(13, "New Topic", "correct", "4.00"),
    _row(14, "New Topic", "correct", "4.00"),
]

ALL_ROWS = STRENGTH_ROWS + DEVELOPING_ROWS + WEAK_ROWS + LIMITED_EVIDENCE_ROWS
