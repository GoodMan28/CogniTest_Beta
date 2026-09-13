from decimal import Decimal

from app.domain.insights import build_insights, build_revision_list
from tests.fixtures.insight_fixture import (
    ALL_ROWS,
    DEVELOPING_ROWS,
    LIMITED_EVIDENCE_ROWS,
    STRENGTH_ROWS,
    WEAK_ROWS,
)


def _insight_for(insights, topic):
    return next(i for i in insights if i.topic == topic)


def test_all_four_insight_labels_are_reachable():
    insights = build_insights(ALL_ROWS)
    assert _insight_for(insights, "Strength Topic").label == "Strength"
    assert _insight_for(insights, "Developing Topic").label == "Developing"
    assert _insight_for(insights, "Weak Topic").label == "Needs improvement"
    assert _insight_for(insights, "New Topic").label == "Limited evidence"


def test_limited_evidence_even_when_perfect_accuracy():
    insights = build_insights(LIMITED_EVIDENCE_ROWS)
    insight = _insight_for(insights, "New Topic")
    assert insight.attempted == 2
    assert insight.correct == 2
    assert insight.label == "Limited evidence"


def test_strength_threshold_is_inclusive_of_80_percent():
    # 4 attempted, exactly 80% correct (not 100%) still counts as Strength.
    from tests.fixtures.insight_fixture import _row

    rows = [
        _row(101, "Boundary Topic", "correct", "4.00"),
        _row(102, "Boundary Topic", "correct", "4.00"),
        _row(103, "Boundary Topic", "correct", "4.00"),
        _row(104, "Boundary Topic", "incorrect", "-1.00"),
        _row(105, "Boundary Topic", "correct", "4.00"),
    ]
    insight = _insight_for(build_insights(rows), "Boundary Topic")
    assert insight.attempted == 5
    assert insight.accuracyPct == "80.00"
    assert insight.label == "Strength"


def test_skipped_heavy_topic_is_not_automatically_a_weakness():
    # All skipped: 0 attempted -> Limited evidence, never "Needs improvement".
    from tests.fixtures.insight_fixture import _row

    rows = [
        _row(201, "Skipped Topic", "skipped", "0.00"),
        _row(202, "Skipped Topic", "skipped", "0.00"),
        _row(203, "Skipped Topic", "skipped", "0.00"),
    ]
    insight = _insight_for(build_insights(rows), "Skipped Topic")
    assert insight.attempted == 0
    assert insight.accuracyPct is None
    assert insight.label == "Limited evidence"


def test_revision_list_ranking_and_reason():
    revision_list = build_revision_list(ALL_ROWS)
    by_topic = {item.topic: item for item in revision_list}

    # Strength Topic and New Topic (both all-correct or... New Topic is
    # all-correct too) lose 0 marks and must be excluded entirely.
    assert "Strength Topic" not in by_topic
    assert "New Topic" not in by_topic

    # Developing Topic: 2 incorrect * (4.00 - (-1.00)) = 10.00 lost, reason inaccurate
    # (incorrect=2 > skipped=0).
    developing = by_topic["Developing Topic"]
    assert developing.marksLost == "10.00"
    assert developing.reason == "inaccurate"

    # Weak Topic: 3 incorrect * 5.00 = 15.00 lost.
    weak = by_topic["Weak Topic"]
    assert weak.marksLost == "15.00"
    assert weak.reason == "inaccurate"

    # Ranked descending by marksLost: Weak (15.00) before Developing (10.00).
    ranks = [item.topic for item in revision_list]
    assert ranks.index("Weak Topic") < ranks.index("Developing Topic")
    assert revision_list[0].rank == 1
    assert revision_list[1].rank == 2


def test_revision_list_reason_is_skipped_when_skips_dominate():
    from tests.fixtures.insight_fixture import _row

    rows = [
        _row(301, "Mixed Topic", "skipped", "0.00"),
        _row(302, "Mixed Topic", "skipped", "0.00"),
        _row(303, "Mixed Topic", "incorrect", "-1.00"),
    ]
    revision_list = build_revision_list(rows)
    item = next(i for i in revision_list if i.topic == "Mixed Topic")
    assert item.reason == "skipped"  # skipped(2) >= incorrect(1)


def test_revision_list_capped_at_ten():
    from tests.fixtures.insight_fixture import _row

    rows = []
    for i in range(15):
        rows.append(_row(400 + i, f"Topic {i}", "incorrect", "-1.00"))
    revision_list = build_revision_list(rows)
    assert len(revision_list) == 10
    assert revision_list[0].rank == 1
    assert revision_list[-1].rank == 10
