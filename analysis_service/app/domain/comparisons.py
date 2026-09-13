"""
Cohort (class-average / topper) comparisons.

A "cohort" is all evaluated students sharing the same roster `batch` for
one test build (CogniTest_REMEDIATION_PROMPTS.md Section 1.4: "Cohort =
all evaluated students with the same batch"). Grouping students by batch
into separate cohorts, and never mixing batches into one call, is the
CALLER's responsibility (Phase R3's preparation service) — this module
just aggregates whatever `per_student` dict it is given for one cohort at
a time.

The output never carries student identities: no enrollment numbers, names,
or ids anywhere in CohortAggregates.
"""
from decimal import Decimal
from typing import Any, Dict, List

from app.domain.analytics import format_decimal
from app.schemas.reports import CohortAggregates, CohortCategoryStat, MetricBucket

SINGLE_STUDENT_UNAVAILABLE_REASON = "Comparison unavailable: only one evaluated student."
EMPTY_COHORT_UNAVAILABLE_REASON = "Comparison unavailable: no evaluated students."


# One student's category buckets, keyed by scope. This is a more explicit
# structure than the one-line sketch in Section 1.4
# ("dict[str, dict[str, MetricBucket]] maps an opaque student key to
# {bucket_key: MetricBucket}"): a single flat {bucket_key: MetricBucket}
# dict cannot tell "Easy" (a difficulty) apart from a subject that happened
# to be named "Easy" without reverse-engineering the scope from the key.
# Nesting one level by scope name removes that ambiguity. Documented here
# per the same "state the conflict" rule used for the
# QuestionContentBase/PracticeQuestionSchema correction in
# app/schemas/inputs.py.
StudentCategoryBuckets = Dict[str, object]  # {"overall": MetricBucket, "subject": {...}, "difficulty": {...}, "questionType": {...}}


def build_cohort_aggregates(
    *,
    policy: str,
    cohort_label: str,
    per_student: Dict[str, StudentCategoryBuckets],
    computed_at: str,
) -> CohortAggregates:
    """
    per_student: opaque student key (never exposed in the output) ->
        {"overall": MetricBucket, "subject": {key: MetricBucket},
         "difficulty": {key: MetricBucket}, "questionType": {key: MetricBucket}}.
        All students in one call are assumed to share the same paper (same
        test build), so they share the same category key sets; category
        maximumMarks is read from an arbitrary student for that reason.
    computed_at: ISO-8601 UTC string: pass one fixed value, do not compute
        `datetime.now()` separately per category (keeps one cohort
        computation internally consistent even if categories are added
        later).
    """
    cohort_size = len(per_student)

    if cohort_size < 2:
        reason = (
            SINGLE_STUDENT_UNAVAILABLE_REASON
            if cohort_size == 1
            else EMPTY_COHORT_UNAVAILABLE_REASON
        )
        return CohortAggregates(
            policy=policy,
            cohortLabel=cohort_label,
            cohortSize=cohort_size,
            computedAt=computed_at,
            available=False,
            unavailableReason=reason,
            topperCount=cohort_size,
            topperLabel="Topper",  # unused by the UI when available=False
            categories=[],
        )

    overall_scores = {sid: Decimal(data["overall"].score) for sid, data in per_student.items()}
    max_score = max(overall_scores.values())
    toppers = [sid for sid, score in overall_scores.items() if score == max_score]
    topper_count = len(toppers)
    topper_label = "Topper" if topper_count == 1 else "Joint toppers' average"

    any_student = next(iter(per_student.values()))
    categories: List[CohortCategoryStat] = []

    def add_category(scope: str, key: str, label: str, max_marks: str, get_score) -> None:
        class_average = sum(
            (Decimal(get_score(data)) for data in per_student.values()), Decimal("0")
        ) / Decimal(cohort_size)
        topper_average = sum(
            (Decimal(get_score(per_student[sid])) for sid in toppers), Decimal("0")
        ) / Decimal(topper_count)
        categories.append(
            CohortCategoryStat(
                scope=scope,
                key=key,
                label=label,
                maximumMarks=max_marks,
                classAverage=format_decimal(class_average),
                topperScore=format_decimal(topper_average),
            )
        )

    overall_bucket: MetricBucket = any_student["overall"]
    add_category(
        "overall", "overall", "Overall", overall_bucket.maximumMarks,
        lambda data: data["overall"].score,
    )

    for scope in ("subject", "difficulty", "questionType"):
        bucket_map: Dict[str, MetricBucket] = any_student[scope]
        for key, bucket in bucket_map.items():
            add_category(
                scope, key, bucket.label, bucket.maximumMarks,
                lambda data, scope=scope, key=key: data[scope][key].score,
            )

    return CohortAggregates(
        policy=policy,
        cohortLabel=cohort_label,
        cohortSize=cohort_size,
        computedAt=computed_at,
        available=True,
        unavailableReason=None,
        topperCount=topper_count,
        topperLabel=topper_label,
        categories=categories,
    )


def compute_cohort_stats(student_scores: Dict[str, Dict[str, Decimal]]) -> Dict[str, Any]:
    """
    DEPRECATED, kept only so app/services/preparation.py (not yet rewritten)
    keeps working until Phase R3 replaces its call with
    build_cohort_aggregates above. Defects D4 (identities leaked in
    batchSnapshot.toppers) and the "cohort ignores batch" gap live in how
    *preparation.py calls this*, not in this function's own arithmetic —
    R3 removes this function and every caller once preparation.py is
    rewritten to call build_cohort_aggregates per-batch instead.

    student_scores: map of enrollmentNo -> {"total": Decimal, "<Subject>": Decimal, ...}.
    """
    if not student_scores:
        return {}

    cohort_size = len(student_scores)

    if cohort_size <= 1:
        return {
            "cohort_size": cohort_size,
            "mean": None,
            "toppers": [],
            "toppers_subject_means": {},
        }

    total_score_sum = sum(
        (scores.get("total", Decimal("0")) for scores in student_scores.values()), Decimal("0")
    )
    mean_score = total_score_sum / Decimal(cohort_size)

    max_score = max(scores.get("total", Decimal("-999999")) for scores in student_scores.values())
    toppers = [
        enrollment for enrollment, scores in student_scores.items() if scores.get("total") == max_score
    ]

    toppers_subject_means: Dict[str, str] = {}
    subjects = set()
    for scores in student_scores.values():
        subjects.update(k for k in scores.keys() if k != "total")

    for subject in subjects:
        subj_sum = sum(
            (student_scores[t].get(subject, Decimal("0")) for t in toppers), Decimal("0")
        )
        toppers_subject_means[subject] = format_decimal(subj_sum / Decimal(len(toppers)))

    return {
        "cohort_size": cohort_size,
        "mean": format_decimal(mean_score),
        "toppers": toppers,
        "toppers_subject_means": toppers_subject_means,
    }
