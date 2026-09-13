"""
Builds the ordered list of QuestionResult rows for one student's attempt at
one test. This is the single place that turns (questions, answer key,
marking, one student's response) into typed, graded rows — every other
domain function (analytics, insights, comparisons, snapshot) consumes this
output and never re-grades anything itself.

Pure: no database, no HTTP, no I/O. Callers pass in plain dicts/objects
already produced by app.schemas.inputs parsing (or, for tests, plain dicts
shaped the same way) plus small lookup maps that only the caller (the
ingestion service, in Phase R3) can know: each question's MongoDB id,
canonical content hash, and how many practice questions map to it.
"""
from decimal import Decimal
from typing import Any, Dict, List, Optional

from app.domain.analytics import format_decimal
from app.domain.grading import grade_one, normalize_integer, normalize_mcq
from app.schemas.reports import QuestionMedia, QuestionResult


def _normalized_key(kind: str, key: object, option_count: int) -> str:
    if kind == "multiple_choice":
        return normalize_mcq(key, option_count)
    if kind == "numerical":
        return normalize_integer(key)
    raise ValueError(f"Unsupported question type: {kind!r}")


def _media_for(question: Dict[str, Any]) -> Optional[QuestionMedia]:
    image_url = question.get("imageUrl")
    diagram_svg = question.get("diagramSvg")
    if image_url is None and diagram_svg is None:
        return None
    return QuestionMedia(imageUrl=image_url, diagramSvg=diagram_svg)


def build_question_results(
    *,
    questions: List[Dict[str, Any]],
    answer_key: List[Dict[str, Any]],
    response: Dict[str, Any],
    marking_by_type: Dict[str, Dict[str, Decimal]],
    question_ids: Dict[int, str],
    content_hashes: Dict[int, str],
    practice_counts: Dict[int, int],
) -> List[QuestionResult]:
    """
    questions: the paper's QuestionSchema-shaped dicts (any order; sorted
        here by questionNo).
    answer_key: AnswerKeySchema-shaped dicts, one per question.
    response: one StudentResponseSchema-shaped dict — {"enrollmentNo": ...,
        "answers": [{"questionNo": ..., "answer": ...}, ...]}.
    marking_by_type: {"multiple_choice": {"correctMarks": Decimal,
        "incorrectPenalty": Decimal}, "numerical": {...}}.
    question_ids: questionNo -> stringified MongoDB ObjectId (the caller
        resolves these via app.repositories.questions upserts; this
        function never talks to a database).
    content_hashes: questionNo -> stable content hash string.
    practice_counts: questionNo -> number of practice questions mapped to
        it (used to fill QuestionResult.practiceCount).

    Returns QuestionResult rows ordered by questionNo. Raises ValueError
    (naming the offending questionNo) for any malformed key or answer —
    grading never silently treats a bad value as skipped or incorrect.
    """
    answer_key_by_no = {ak["questionNo"]: ak for ak in answer_key}
    answers_by_no = {a["questionNo"]: a.get("answer") for a in response["answers"]}

    results: List[QuestionResult] = []
    for question in sorted(questions, key=lambda q: q["questionNo"]):
        q_no = question["questionNo"]
        kind = question["questionType"]
        options = question.get("options") or []

        if q_no not in answer_key_by_no:
            raise ValueError(f"questionNo {q_no}: missing answer-key entry")
        if q_no not in answers_by_no:
            raise ValueError(
                f"questionNo {q_no}: missing response row for "
                f"enrollmentNo {response.get('enrollmentNo')!r}"
            )

        ak = answer_key_by_no[q_no]
        key_value = ak.get("correctOption") if kind == "multiple_choice" else ak.get("numericalAnswer")

        marking = marking_by_type[kind]
        correct_marks = marking["correctMarks"]
        incorrect_penalty = marking["incorrectPenalty"]

        try:
            graded = grade_one(
                kind=kind,
                answer=answers_by_no[q_no],
                key=key_value,
                option_count=len(options),
                correct_marks=correct_marks,
                incorrect_penalty=incorrect_penalty,
            )
        except ValueError as exc:
            raise ValueError(f"questionNo {q_no}: {exc}") from exc

        correct_answer = _normalized_key(kind, key_value, len(options))
        max_marks = correct_marks

        results.append(
            QuestionResult(
                questionNo=q_no,
                questionId=question_ids[q_no],
                contentHash=content_hashes[q_no],
                subject=question["subject"],
                unit=question["unit"],
                chapter=list(question["chapter"]),
                topic=list(question["topic"]),
                questionType=kind,
                difficulty=question["difficulty"],
                questionIntent=question["questionIntent"],
                questionText=question["questionText"],
                options=list(options),
                studentAnswer=graded.normalized_answer,
                correctAnswer=correct_answer,
                status=graded.status,
                awardedMarks=format_decimal(graded.awarded_marks),
                maximumMarks=format_decimal(max_marks),
                solutionText=question["solutionText"],
                selectedOptionExplanation=(question.get("distractorExplanations") or {}).get(
                    graded.normalized_answer
                )
                if graded.status == "incorrect"
                else None,
                practiceCount=practice_counts.get(q_no, 0),
                media=_media_for(question),
            )
        )

    return results
