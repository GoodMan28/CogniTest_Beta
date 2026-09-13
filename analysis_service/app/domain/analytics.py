from typing import List, Dict, Optional
from decimal import Decimal, ROUND_HALF_UP
from app.schemas.reports import Breakdown, BreakdownScope, MetricBucket, QuestionResult
from app.domain.grading import GradeResult

def format_decimal(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

def compute_metrics(
    key: str,
    label: str,
    results: List[GradeResult],
    max_marks: Decimal,
    subject: Optional[str] = None,
    overlapping: bool = False
) -> MetricBucket:
    question_count = len(results)
    correct = sum(1 for r in results if r.status == "correct")
    incorrect = sum(1 for r in results if r.status == "incorrect")
    skipped = sum(1 for r in results if r.status == "skipped")
    attempted = correct + incorrect

    score = sum((r.awarded_marks for r in results), Decimal("0"))

    accuracy_pct = None
    if attempted > 0:
        accuracy_pct = format_decimal((Decimal(correct) / Decimal(attempted)) * Decimal("100"))

    coverage_pct = None
    if question_count > 0:
        coverage_pct = format_decimal((Decimal(attempted) / Decimal(question_count)) * Decimal("100"))

    return MetricBucket(
        key=key,
        label=label,
        subject=subject,
        questionCount=question_count,
        correct=correct,
        incorrect=incorrect,
        skipped=skipped,
        attempted=attempted,
        score=format_decimal(score),
        maximumMarks=format_decimal(max_marks),
        accuracyPct=accuracy_pct,
        coveragePct=coverage_pct,
        overlapping=overlapping
    )


# --- Grouping over QuestionResult rows (app.domain.results output) ---
#
# compute_metrics() above takes List[GradeResult] (status + awarded_marks
# only) and is kept unchanged so existing direct callers/tests are
# unaffected. The functions below operate on List[QuestionResult] (the
# richer, tagged rows app.domain.results.build_question_results produces)
# and adapt each group down to GradeResult-shaped tuples purely to reuse
# compute_metrics's percentage/rounding logic in exactly one place.

DIFFICULTY_LABELS = {"easy": "Easy", "medium": "Medium", "hard": "Hard"}
QUESTION_TYPE_LABELS = {"multiple_choice": "Multiple choice", "numerical": "Numerical"}


def _as_grade_results(rows: List[QuestionResult]) -> List[GradeResult]:
    return [
        GradeResult(
            status=row.status,
            normalized_answer=row.studentAnswer,
            awarded_marks=Decimal(row.awardedMarks),
        )
        for row in rows
    ]


def _bucket_for_group(
    key: str, label: str, rows: List[QuestionResult], subject: Optional[str], overlapping: bool
) -> MetricBucket:
    max_marks = sum((Decimal(row.maximumMarks) for row in rows), Decimal("0"))
    return compute_metrics(
        key=key,
        label=label,
        results=_as_grade_results(rows),
        max_marks=max_marks,
        subject=subject,
        overlapping=overlapping,
    )


def build_summary(results: List[QuestionResult]) -> MetricBucket:
    """The single 'overall' bucket for one student's attempt."""
    return _bucket_for_group("overall", "Overall", results, subject=None, overlapping=False)


def build_breakdowns(results: List[QuestionResult]) -> List[Breakdown]:
    """
    Builds all seven required breakdowns, in the documented order. Buckets
    within each breakdown preserve the order their key first appears in
    `results` (which is already questionNo-ordered), not insertion via a
    sorted() call, so re-running this on the same input is deterministic
    without depending on dict/set iteration of unrelated keys.

    unit/chapter/topic breakdowns are marked overlapping=True: a question
    can carry multiple chapters/topics (and, administratively, a unit name
    could repeat across subjects), so these breakdowns must never be summed
    to reconstruct the overall total. subject/difficulty/subjectDifficulty/
    questionType are true partitions of `results` and are not overlapping.
    """
    subject_groups: Dict[str, Dict] = {}
    difficulty_groups: Dict[str, Dict] = {}
    subject_difficulty_groups: Dict[str, Dict] = {}
    type_groups: Dict[str, Dict] = {}
    unit_groups: Dict[str, Dict] = {}
    chapter_groups: Dict[str, Dict] = {}
    topic_groups: Dict[str, Dict] = {}

    for row in results:
        subject_groups.setdefault(
            row.subject, {"label": row.subject, "subject": None, "rows": []}
        )["rows"].append(row)

        diff_label = DIFFICULTY_LABELS[row.difficulty]
        difficulty_groups.setdefault(
            row.difficulty, {"label": diff_label, "subject": None, "rows": []}
        )["rows"].append(row)

        sd_key = f"{row.subject}::{row.difficulty}"
        sd_label = f"{row.subject} · {diff_label}"
        subject_difficulty_groups.setdefault(
            sd_key, {"label": sd_label, "subject": row.subject, "rows": []}
        )["rows"].append(row)

        type_label = QUESTION_TYPE_LABELS[row.questionType]
        type_groups.setdefault(
            row.questionType, {"label": type_label, "subject": None, "rows": []}
        )["rows"].append(row)

        unit_key = f"{row.subject}::{row.unit}"
        unit_groups.setdefault(
            unit_key, {"label": row.unit, "subject": row.subject, "rows": []}
        )["rows"].append(row)

        for chapter in row.chapter:
            key = f"{row.subject}::{chapter}"
            chapter_groups.setdefault(
                key, {"label": chapter, "subject": row.subject, "rows": []}
            )["rows"].append(row)

        for topic in row.topic:
            key = f"{row.subject}::{topic}"
            topic_groups.setdefault(
                key, {"label": topic, "subject": row.subject, "rows": []}
            )["rows"].append(row)

    def build(groups: Dict[str, Dict], overlapping: bool) -> List[MetricBucket]:
        return [
            _bucket_for_group(key, g["label"], g["rows"], g["subject"], overlapping)
            for key, g in groups.items()
        ]

    scopes: List[tuple[BreakdownScope, str, Dict[str, Dict], bool]] = [
        ("subject", "By subject", subject_groups, False),
        ("difficulty", "By difficulty", difficulty_groups, False),
        ("subjectDifficulty", "By subject and difficulty", subject_difficulty_groups, False),
        ("questionType", "By question type", type_groups, False),
        ("unit", "By unit", unit_groups, True),
        ("chapter", "By chapter (overlapping)", chapter_groups, True),
        ("topic", "By topic (overlapping)", topic_groups, True),
    ]

    return [
        Breakdown(scope=scope, label=label, overlapping=overlapping, buckets=build(groups, overlapping))
        for scope, label, groups, overlapping in scopes
    ]
