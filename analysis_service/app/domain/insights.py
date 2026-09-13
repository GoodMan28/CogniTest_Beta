"""
Rule-based (never LLM-based) strengths/weaknesses and revision priorities,
grouped by (subject, topic) over one student's QuestionResult rows.

Thresholds below are documented heuristics, not validated diagnoses (see
CogniTest_DEMO_IMPLEMENTATION_BLUEPRINT.md Section 9.3) — kept as module
constants in one place so they are easy to find and change.
"""
from decimal import Decimal
from typing import Dict, List

from app.domain.analytics import format_decimal
from app.schemas.reports import Insight, InsightLabel, QuestionResult, RevisionItem

MIN_ATTEMPTS_FOR_LABEL = 3
STRENGTH_ACCURACY = Decimal("80")
WEAK_ACCURACY = Decimal("50")

MAX_REVISION_ITEMS = 10


def _group_by_subject_topic(results: List[QuestionResult]) -> Dict[str, Dict]:
    """
    A question can carry multiple topics, so it can appear in more than one
    group here — the same "overlapping" principle as the topic breakdown in
    app.domain.analytics.build_breakdowns. Insertion order follows first
    appearance in `results` (already questionNo-ordered), so output is
    deterministic without an extra sort key.
    """
    groups: Dict[str, Dict] = {}
    for row in results:
        for topic in row.topic:
            key = f"{row.subject}::{topic}"
            groups.setdefault(key, {"subject": row.subject, "topic": topic, "rows": []})[
                "rows"
            ].append(row)
    return groups


def _label_for(attempted: int, correct: int) -> InsightLabel:
    if attempted < MIN_ATTEMPTS_FOR_LABEL:
        return "Limited evidence"
    accuracy = (Decimal(correct) / Decimal(attempted)) * Decimal("100")
    if accuracy >= STRENGTH_ACCURACY:
        return "Strength"
    if accuracy < WEAK_ACCURACY:
        return "Needs improvement"
    return "Developing"


def build_insights(results: List[QuestionResult]) -> List[Insight]:
    insights: List[Insight] = []
    for key, group in _group_by_subject_topic(results).items():
        rows = group["rows"]
        correct = sum(1 for r in rows if r.status == "correct")
        incorrect = sum(1 for r in rows if r.status == "incorrect")
        skipped = sum(1 for r in rows if r.status == "skipped")
        attempted = correct + incorrect

        accuracy_pct = None
        if attempted > 0:
            accuracy_pct = format_decimal((Decimal(correct) / Decimal(attempted)) * Decimal("100"))

        insights.append(
            Insight(
                key=key,
                subject=group["subject"],
                topic=group["topic"],
                label=_label_for(attempted, correct),
                questionCount=len(rows),
                attempted=attempted,
                correct=correct,
                incorrect=incorrect,
                skipped=skipped,
                accuracyPct=accuracy_pct,
                questionNos=sorted({r.questionNo for r in rows}),
            )
        )
    return insights


def build_revision_list(results: List[QuestionResult]) -> List[RevisionItem]:
    """
    Ranks (subject, topic) groups by marks lost (maximumMarks - awardedMarks,
    summed over the group), descending, tie-broken by subject then topic
    name. Topics with zero marks lost (every question in them answered
    correctly) are excluded entirely — there is nothing to revise. Capped at
    MAX_REVISION_ITEMS.

    Deviation from the literal signature sketched in
    CogniTest_REMEDIATION_PROMPTS.md Section 4 task 3
    ("build_revision_list(results, practice_counts)"): QuestionResult rows
    already carry `practiceCount` per question (app.domain.results sets it
    from the caller-supplied practice_counts map at build time), so passing
    a second, separately-keyed practice_counts dict here would be redundant
    and could silently drift out of sync with the rows it is describing.
    This function sums each group's own `row.practiceCount` instead.
    """
    raw_items: List[Dict] = []
    for group in _group_by_subject_topic(results).values():
        rows = group["rows"]
        marks_lost = sum(
            (Decimal(r.maximumMarks) - Decimal(r.awardedMarks) for r in rows), Decimal("0")
        )
        if marks_lost <= 0:
            continue

        incorrect = sum(1 for r in rows if r.status == "incorrect")
        skipped = sum(1 for r in rows if r.status == "skipped")
        reason = "skipped" if skipped >= incorrect else "inaccurate"

        raw_items.append(
            {
                "subject": group["subject"],
                "topic": group["topic"],
                "marksLost": marks_lost,
                "reason": reason,
                "questionNos": sorted({r.questionNo for r in rows}),
                "practiceCount": sum(r.practiceCount for r in rows),
            }
        )

    raw_items.sort(key=lambda item: (-item["marksLost"], item["subject"], item["topic"]))
    raw_items = raw_items[:MAX_REVISION_ITEMS]

    return [
        RevisionItem(
            rank=index + 1,
            subject=item["subject"],
            topic=item["topic"],
            marksLost=format_decimal(item["marksLost"]),
            reason=item["reason"],
            questionNos=item["questionNos"],
            practiceCount=item["practiceCount"],
        )
        for index, item in enumerate(raw_items)
    ]
