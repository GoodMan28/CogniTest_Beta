"""
Loads and validates a prepared-data bundle (private_data/<test-key>/*.json)
with zero database access. This is the only thing `python -m app.cli
validate` runs, and the first thing `python -m app.cli prepare` runs before
writing anything.

Two layers of validation:
1. Per-file Pydantic parsing (app.schemas.inputs) — already enforces every
   within-file rule.
2. Cross-file checks below — everything that requires comparing two files
   against each other (counts matching the manifest, every response
   enrollment number existing in the roster, answer-key types matching
   question types, etc.), per CogniTest_REMEDIATION_PROMPTS.md Section 1.1.

All errors found are collected and raised together as one
BundleValidationError, so an operator sees every problem in one pass
instead of fixing them one at a time.
"""
import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List

from pydantic import ValidationError

from app.domain.results import build_question_results
from app.schemas.inputs import (
    AnswerKeySchema,
    ManifestSchema,
    QuestionSchema,
    RecommendationSchema,
    RosterEntrySchema,
    StudentResponseSchema,
    validate_roster_uniqueness,
)

REQUIRED_FILES = [
    "manifest.json",
    "questions.json",
    "answer_key.json",
    "students.json",
    "responses.json",
    "recommendations.json",
]


class BundleValidationError(ValueError):
    """Carries every validation error found, not just the first."""

    def __init__(self, errors: List[str]):
        self.errors = errors
        super().__init__("; ".join(errors) if errors else "unknown validation error")


@dataclass
class RawBundle:
    manifest: Dict[str, Any]
    questions: List[Dict[str, Any]]
    answer_key: List[Dict[str, Any]]
    roster: List[Dict[str, Any]]
    responses: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]


@dataclass
class ValidatedBundle:
    manifest: ManifestSchema
    questions: List[QuestionSchema]
    answer_key: List[AnswerKeySchema]
    roster: List[RosterEntrySchema]
    responses: List[StudentResponseSchema]
    recommendations: List[RecommendationSchema]


def load_bundle(directory: str) -> RawBundle:
    """Reads and JSON-parses all six files. Raises BundleValidationError
    (not a bare exception) for a missing file or invalid JSON, naming the
    file, so `validate`/`prepare` fail the same clear way either kind of
    problem happens."""

    def _load(filename: str) -> Any:
        path = os.path.join(directory, filename)
        if not os.path.isfile(path):
            raise BundleValidationError([f"{filename}: file not found at {path}"])
        with open(path, "r", encoding="utf-8") as fh:
            try:
                return json.load(fh)
            except json.JSONDecodeError as exc:
                raise BundleValidationError([f"{filename}: invalid JSON ({exc})"]) from exc

    return RawBundle(
        manifest=_load("manifest.json"),
        questions=_load("questions.json"),
        answer_key=_load("answer_key.json"),
        roster=_load("students.json"),
        responses=_load("responses.json"),
        recommendations=_load("recommendations.json"),
    )


def _short(model_errors: ValidationError) -> str:
    # Pydantic's default str() is multi-line and verbose; collapse to one
    # line per bundle-level error entry for readable CLI/operator output.
    return "; ".join(
        f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in model_errors.errors()
    )


def validate_bundle(raw: RawBundle) -> ValidatedBundle:
    errors: List[str] = []

    manifest: ManifestSchema | None = None
    try:
        manifest = ManifestSchema(**raw.manifest)
    except ValidationError as exc:
        errors.append(f"manifest.json: {_short(exc)}")

    questions: List[QuestionSchema] = []
    for i, q in enumerate(raw.questions):
        try:
            questions.append(QuestionSchema(**q))
        except ValidationError as exc:
            errors.append(f"questions.json[{i}] questionNo={q.get('questionNo')}: {_short(exc)}")

    answer_key: List[AnswerKeySchema] = []
    for i, a in enumerate(raw.answer_key):
        try:
            answer_key.append(AnswerKeySchema(**a))
        except ValidationError as exc:
            errors.append(f"answer_key.json[{i}] questionNo={a.get('questionNo')}: {_short(exc)}")

    roster: List[RosterEntrySchema] = []
    for i, s in enumerate(raw.roster):
        try:
            roster.append(RosterEntrySchema(**s))
        except ValidationError as exc:
            errors.append(f"students.json[{i}] enrollmentNo={s.get('enrollmentNo')!r}: {_short(exc)}")

    responses: List[StudentResponseSchema] = []
    for i, r in enumerate(raw.responses):
        try:
            responses.append(StudentResponseSchema(**r))
        except ValidationError as exc:
            errors.append(f"responses.json[{i}] enrollmentNo={r.get('enrollmentNo')!r}: {_short(exc)}")

    recommendations: List[RecommendationSchema] = []
    for i, rec in enumerate(raw.recommendations):
        try:
            recommendations.append(RecommendationSchema(**rec))
        except ValidationError as exc:
            errors.append(
                f"recommendations.json[{i}] originalQuestionNo={rec.get('originalQuestionNo')}: {_short(exc)}"
            )

    if errors:
        # Cross-file checks below assume every item already parsed; a
        # partially-invalid file makes those checks meaningless (e.g. we
        # cannot check "one answer-key entry per question" against a
        # questions list that itself failed to parse).
        raise BundleValidationError(errors)

    assert manifest is not None  # every per-file parse above succeeded

    try:
        validate_roster_uniqueness(roster)
    except ValueError as exc:
        errors.append(f"students.json: {exc}")

    # --- Question count and numbering ---
    if len(questions) != manifest.expectedQuestionCount:
        errors.append(
            f"questions.json: expected {manifest.expectedQuestionCount} questions "
            f"(manifest.expectedQuestionCount), found {len(questions)}"
        )
    question_nos = [q.questionNo for q in questions]
    if len(set(question_nos)) != len(question_nos):
        dupes = sorted({n for n in question_nos if question_nos.count(n) > 1})
        errors.append(f"questions.json: duplicate questionNo values: {dupes}")

    expected_range = set(range(1, len(questions) + 1))
    if len(set(question_nos)) == len(question_nos) and set(question_nos) != expected_range:
        missing = sorted(expected_range - set(question_nos))
        extra = sorted(set(question_nos) - expected_range)
        errors.append(
            f"questions.json: questionNo values must be exactly 1..{len(questions)} "
            f"with no gaps; missing={missing} extra={extra}"
        )

    questions_by_no = {q.questionNo: q for q in questions}

    # --- Marking must cover every question type actually present ---
    types_present = {q.questionType for q in questions}
    missing_marking = types_present - set(manifest.markingByType.keys())
    if missing_marking:
        errors.append(
            "manifest.json: markingByType is missing marking rules for "
            f"question types present in the paper: {sorted(missing_marking)}"
        )

    # --- Answer key: exactly one entry per question, type match, option range ---
    ak_by_no: Dict[int, AnswerKeySchema] = {}
    for ak in answer_key:
        if ak.questionNo in ak_by_no:
            errors.append(f"answer_key.json: duplicate questionNo {ak.questionNo}")
        ak_by_no[ak.questionNo] = ak

    for no in question_nos:
        if no not in ak_by_no:
            errors.append(f"answer_key.json: missing entry for questionNo {no}")

    extra_ak = set(ak_by_no.keys()) - set(question_nos)
    if extra_ak:
        errors.append(f"answer_key.json: entries for unknown questionNo values: {sorted(extra_ak)}")

    for no, ak in ak_by_no.items():
        q = questions_by_no.get(no)
        if q is None:
            continue
        if q.questionType == "multiple_choice":
            if ak.correctOption is None:
                errors.append(
                    f"answer_key.json questionNo={no}: question is multiple_choice "
                    "but the key has no correctOption"
                )
            elif ak.numericalAnswer is not None:
                errors.append(
                    f"answer_key.json questionNo={no}: question is multiple_choice "
                    "but the key also sets numericalAnswer"
                )
            else:
                allowed = {chr(65 + i) for i in range(len(q.options or []))}
                if ak.correctOption not in allowed:
                    errors.append(
                        f"answer_key.json questionNo={no}: correctOption "
                        f"{ak.correctOption!r} is outside this question's "
                        f"{len(q.options or [])} options"
                    )
        elif q.questionType == "numerical":
            if ak.numericalAnswer is None:
                errors.append(
                    f"answer_key.json questionNo={no}: question is numerical "
                    "but the key has no numericalAnswer"
                )
            elif ak.correctOption is not None:
                errors.append(
                    f"answer_key.json questionNo={no}: question is numerical "
                    "but the key also sets correctOption"
                )

    # --- Roster / responses cross-check ---
    roster_by_enrollment_lower = {s.enrollmentNo.lower() for s in roster}
    if len(responses) != manifest.expectedStudentCount:
        errors.append(
            f"responses.json: expected {manifest.expectedStudentCount} evaluated "
            f"students (manifest.expectedStudentCount), found {len(responses)}"
        )

    seen_response_enrollments: set = set()
    for resp in responses:
        key = resp.enrollmentNo.lower()
        if key in seen_response_enrollments:
            errors.append(f"responses.json: duplicate response entry for enrollmentNo {resp.enrollmentNo!r}")
        seen_response_enrollments.add(key)

        if key not in roster_by_enrollment_lower:
            errors.append(
                f"responses.json: enrollmentNo {resp.enrollmentNo!r} has a response "
                "but does not appear in students.json"
            )

        answer_nos = [a.questionNo for a in resp.answers]
        if len(set(answer_nos)) != len(answer_nos):
            errors.append(
                f"responses.json enrollmentNo={resp.enrollmentNo!r}: duplicate "
                "answer rows for the same questionNo"
            )
        missing_answers = expected_range - set(answer_nos)
        if missing_answers:
            errors.append(
                f"responses.json enrollmentNo={resp.enrollmentNo!r}: missing answer "
                f"rows for questionNo {sorted(missing_answers)}"
            )
        extra_answers = set(answer_nos) - expected_range
        if extra_answers:
            errors.append(
                f"responses.json enrollmentNo={resp.enrollmentNo!r}: answer rows for "
                f"unknown questionNo values {sorted(extra_answers)}"
            )

    # --- Recommendations: one entry per original question, exact count, unique keys ---
    rec_by_no: Dict[int, RecommendationSchema] = {}
    for rec in recommendations:
        if rec.originalQuestionNo in rec_by_no:
            errors.append(f"recommendations.json: duplicate originalQuestionNo {rec.originalQuestionNo}")
        rec_by_no[rec.originalQuestionNo] = rec

    for no in question_nos:
        if no not in rec_by_no:
            errors.append(f"recommendations.json: missing recommendations for original questionNo {no}")

    extra_rec = set(rec_by_no.keys()) - set(question_nos)
    if extra_rec:
        errors.append(
            f"recommendations.json: recommendations reference unknown original "
            f"questionNo values: {sorted(extra_rec)}"
        )

    for no, rec in rec_by_no.items():
        if len(rec.recommendations) != manifest.recommendationsPerQuestion:
            errors.append(
                f"recommendations.json originalQuestionNo={no}: expected exactly "
                f"{manifest.recommendationsPerQuestion} practice questions "
                f"(manifest.recommendationsPerQuestion), found {len(rec.recommendations)}"
            )
        for pq in rec.recommendations:
            if pq.sourceKey == str(no):
                errors.append(
                    f"recommendations.json originalQuestionNo={no}: a practice "
                    "question's sourceKey must not equal its own original questionNo"
                )

    all_source_keys = [pq.sourceKey for rec in recommendations for pq in rec.recommendations]
    if len(set(all_source_keys)) != len(all_source_keys):
        dupes = sorted({k for k in all_source_keys if all_source_keys.count(k) > 1})
        errors.append(f"recommendations.json: duplicate practice sourceKey across the file: {dupes}")

    # --- Full grading feasibility: every response must actually be gradable ---
    # Reuses app.domain.results.build_question_results (the same function
    # preparation calls) with placeholder id/hash/practice-count maps, so
    # validation and preparation can never disagree about what "gradable"
    # means. Only run once every check above passed, since it assumes a
    # fully consistent question/answer-key/response set.
    if not errors:
        questions_as_dicts = [q.model_dump() for q in questions]
        answer_key_as_dicts = [ak.model_dump() for ak in answer_key]
        marking_by_type = {
            kind: {"correctMarks": rule.correctMarks, "incorrectPenalty": rule.incorrectPenalty}
            for kind, rule in manifest.markingByType.items()
        }
        placeholder_ids = {no: "placeholder" for no in question_nos}
        placeholder_hashes = {no: "placeholder" for no in question_nos}
        placeholder_practice_counts = {
            no: len(rec_by_no[no].recommendations) if no in rec_by_no else 0 for no in question_nos
        }

        for resp in responses:
            try:
                build_question_results(
                    questions=questions_as_dicts,
                    answer_key=answer_key_as_dicts,
                    response=resp.model_dump(),
                    marking_by_type=marking_by_type,
                    question_ids=placeholder_ids,
                    content_hashes=placeholder_hashes,
                    practice_counts=placeholder_practice_counts,
                )
            except ValueError as exc:
                errors.append(f"responses.json enrollmentNo={resp.enrollmentNo!r}: {exc}")

    if errors:
        raise BundleValidationError(errors)

    return ValidatedBundle(
        manifest=manifest,
        questions=questions,
        answer_key=answer_key,
        roster=roster,
        responses=responses,
        recommendations=recommendations,
    )
