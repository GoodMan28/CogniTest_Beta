from dataclasses import dataclass
from decimal import Decimal
import re
from typing import Literal

INTEGER_PATTERN = re.compile(r"^[+-]?[0-9]+$")
MAX_SAFE_INTEGER = 9_007_199_254_740_991
Status = Literal["correct", "incorrect", "skipped"]

@dataclass(frozen=True)
class GradeResult:
    status: Status
    normalized_answer: str | None
    awarded_marks: Decimal

def normalize_integer(value: object) -> str:
    if type(value) is int:
        number = value
    elif isinstance(value, str):
        text = value.strip()
        if len(text) > 32 or not INTEGER_PATTERN.fullmatch(text):
            raise ValueError("Expected an integer answer")
        number = int(text)
    else:
        raise ValueError("Expected an integer or integer string")

    if abs(number) > MAX_SAFE_INTEGER:
        raise ValueError("Integer exceeds supported range")
    return str(number)

def normalize_mcq(value: object, option_count: int) -> str:
    if not 2 <= option_count <= 26:
        raise ValueError("Unsupported number of options")
    if not isinstance(value, str):
        raise ValueError("Expected an option letter")
    letter = value.strip().upper()
    allowed = {chr(65 + index) for index in range(option_count)}
    if letter not in allowed:
        raise ValueError("Option is outside the available choices")
    return letter

def grade_one(
    *,
    kind: str,
    answer: object,
    key: object,
    option_count: int,
    correct_marks: Decimal,
    incorrect_penalty: Decimal,
) -> GradeResult:
    if not correct_marks.is_finite() or not incorrect_penalty.is_finite():
        raise ValueError("Marking values must be finite")
    if correct_marks <= 0 or incorrect_penalty < 0:
        raise ValueError("Invalid marking scheme")

    if kind == "multiple_choice":
        normalize = lambda value: normalize_mcq(value, option_count)
    elif kind == "numerical":
        normalize = normalize_integer
    else:
        raise ValueError("Unsupported question type")

    normalized_key = normalize(key)
    if answer is None:
        return GradeResult("skipped", None, Decimal("0"))

    normalized_answer = normalize(answer)
    if normalized_answer == normalized_key:
        return GradeResult("correct", normalized_answer, correct_marks)
    return GradeResult("incorrect", normalized_answer, -incorrect_penalty)

