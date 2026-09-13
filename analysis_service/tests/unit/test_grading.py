import pytest
from decimal import Decimal
from app.domain.grading import grade_one, normalize_mcq, normalize_integer, GradeResult

def test_mcq_correct():
    result = grade_one(
        kind="multiple_choice",
        answer="B",
        key="B",
        option_count=4,
        correct_marks=Decimal("4"),
        incorrect_penalty=Decimal("1")
    )
    assert result.status == "correct"
    assert result.awarded_marks == Decimal("4")
    assert result.normalized_answer == "B"

def test_mcq_incorrect():
    result = grade_one(
        kind="multiple_choice",
        answer="A",
        key="B",
        option_count=4,
        correct_marks=Decimal("4"),
        incorrect_penalty=Decimal("1")
    )
    assert result.status == "incorrect"
    assert result.awarded_marks == Decimal("-1")

def test_skipped():
    result = grade_one(
        kind="multiple_choice",
        answer=None,
        key="B",
        option_count=4,
        correct_marks=Decimal("4"),
        incorrect_penalty=Decimal("1")
    )
    assert result.status == "skipped"
    assert result.awarded_marks == Decimal("0")

def test_numerical_zero_correct():
    result = grade_one(
        kind="numerical",
        answer=0,
        key="0",
        option_count=0,
        correct_marks=Decimal("4"),
        incorrect_penalty=Decimal("1")
    )
    assert result.status == "correct"
    assert result.awarded_marks == Decimal("4")

def test_normalization_whitespace():
    result = grade_one(
        kind="numerical",
        answer="  -2  ",
        key="-02",
        option_count=0,
        correct_marks=Decimal("4"),
        incorrect_penalty=Decimal("1")
    )
    assert result.status == "correct"
    assert result.awarded_marks == Decimal("4")
    assert result.normalized_answer == "-2"

def test_normalization_plus_sign():
    result = grade_one(
        kind="numerical",
        answer="+04",
        key="4",
        option_count=0,
        correct_marks=Decimal("4"),
        incorrect_penalty=Decimal("1")
    )
    assert result.status == "correct"
    assert result.awarded_marks == Decimal("4")

def test_invalid_mcq_option_fails():
    with pytest.raises(ValueError, match="Option is outside the available choices"):
        grade_one(
            kind="multiple_choice",
            answer="E",
            key="B",
            option_count=4,
            correct_marks=Decimal("4"),
            incorrect_penalty=Decimal("1")
        )

def test_invalid_numerical_fails():
    with pytest.raises(ValueError):
        grade_one(
            kind="numerical",
            answer="4.0",
            key="4",
            option_count=0,
            correct_marks=Decimal("4"),
            incorrect_penalty=Decimal("1")
        )
    with pytest.raises(ValueError):
        grade_one(
            kind="numerical",
            answer="1e2",
            key="100",
            option_count=0,
            correct_marks=Decimal("4"),
            incorrect_penalty=Decimal("1")
        )
    with pytest.raises(ValueError):
        grade_one(
            kind="numerical",
            answer=False,
            key="0",
            option_count=0,
            correct_marks=Decimal("4"),
            incorrect_penalty=Decimal("1")
        )

