"""
Pydantic models for the six files in a prepared-data bundle
(private_data/<test-key>/{manifest,questions,answer_key,students,responses,
recommendations}.json).

These models enforce every WITHIN-FILE rule from
CogniTest_REMEDIATION_PROMPTS.md Section 1.1. Rules that require comparing
two different files against each other (e.g. "exactly one answer-key entry
per question in questions.json", "every response enrollment number exists
in students.json", "recommendation count matches manifest.recommendationsPerQuestion")
are cross-file checks and are implemented in app/services/bundle.py
(remediation Phase R3), not here.
"""
import math
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.config import settings


class MarkingSchema(BaseModel):
    """One question type's marking rule, e.g. manifest.markingByType.multiple_choice."""

    model_config = ConfigDict(extra="forbid")
    correctMarks: Decimal
    incorrectPenalty: Decimal

    @field_validator("correctMarks", "incorrectPenalty", mode="before")
    @classmethod
    def _coerce_finite_decimal(cls, v: object) -> Decimal:
        # Parse via str(x) rather than Decimal(x) directly on a float, so we
        # get the decimal the JSON author *typed* (e.g. 4 -> Decimal("4"))
        # rather than a binary-float artifact (e.g. Decimal("4.00000000000000...")).
        if isinstance(v, bool):
            raise ValueError("Boolean is not a valid marking value")
        if isinstance(v, Decimal):
            parsed = v
        elif isinstance(v, (int, float, str)):
            if isinstance(v, float) and not math.isfinite(v):
                raise ValueError("Marking value must be finite")
            try:
                parsed = Decimal(str(v))
            except Exception as exc:
                raise ValueError(f"Marking value must be a valid number: {v!r}") from exc
        else:
            raise ValueError(f"Marking value must be a number, got {type(v).__name__}")
        if not parsed.is_finite():
            raise ValueError("Marking value must be finite")
        return parsed

    @field_validator("correctMarks")
    @classmethod
    def _correct_marks_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("correctMarks must be a positive, nonzero value")
        return v

    @field_validator("incorrectPenalty")
    @classmethod
    def _penalty_nonnegative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError(
                "incorrectPenalty must be a nonnegative magnitude "
                "(the grader subtracts it; do not encode it as already-negative)"
            )
        return v


class ManifestSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schemaVersion: str = Field(..., max_length=settings.max_string_length)
    instituteId: str = Field(..., max_length=settings.max_string_length)
    testKey: str = Field(..., min_length=1, max_length=settings.max_string_length)
    title: str = Field(..., min_length=1, max_length=settings.max_string_length)
    date: datetime
    examType: str = Field(..., min_length=1, max_length=settings.max_string_length)
    expectedQuestionCount: int = Field(..., ge=1, le=settings.max_array_size)
    expectedStudentCount: int = Field(..., ge=0)
    markingByType: Dict[Literal["multiple_choice", "numerical"], MarkingSchema] = Field(
        ..., min_length=1
    )
    comparisonPolicy: str = Field(..., min_length=1, max_length=settings.max_string_length)
    recommendationsPerQuestion: int = Field(..., ge=0, le=5)

    @field_validator("instituteId")
    @classmethod
    def _institute_id_is_valid_object_id(cls, v: str) -> str:
        if not ObjectId.is_valid(v):
            raise ValueError("instituteId must be a valid 24-character hex ObjectId")
        return v

    @field_validator("date")
    @classmethod
    def _date_is_timezone_aware(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError(
                "date must be timezone-aware (include a UTC offset, e.g. "
                "'2026-09-12T00:00:00Z' or '2026-09-12T00:00:00+00:00')"
            )
        return v

    @model_validator(mode="after")
    def _institute_id_matches_configured_deployment(self) -> "ManifestSchema":
        # Institution identity comes from operator configuration, never from
        # a request/file value alone (shared contract 3.1) — but a manifest
        # prepared for a different institute must still be rejected loudly
        # rather than silently imported under the wrong one.
        if self.instituteId != settings.institute_id:
            raise ValueError(
                f"manifest instituteId {self.instituteId!r} does not match "
                f"the configured INSTITUTE_ID {settings.institute_id!r}"
            )
        return self


class QuestionContentBase(BaseModel):
    """
    Fields shared by an original paper question (QuestionSchema) and a
    practice question (PracticeQuestionSchema). Split out so the two never
    drift apart by accident. PracticeQuestionSchema intentionally does NOT
    inherit `questionNo` — practice questions are identified by `sourceKey`,
    never by a position in the original paper (remediation R1: this
    corrects an ambiguity in CogniTest_REMEDIATION_PROMPTS.md Section 1.1,
    which described PracticeQuestionSchema as "same fields as QuestionSchema
    plus sourceKey" — literally including questionNo would have been wrong,
    since recommendations.json's practice entries never carry one; see
    CogniTest_DEMO_IMPLEMENTATION_BLUEPRINT.md Section 6.5).
    """

    model_config = ConfigDict(extra="forbid")
    subject: Literal["Physics", "Chemistry", "Biology", "Mathematics"]
    unit: str = Field(..., min_length=1, max_length=settings.max_string_length)
    chapter: List[str] = Field(..., min_length=1, max_length=settings.max_array_size)
    topic: List[str] = Field(..., min_length=1, max_length=settings.max_array_size)
    questionType: Literal["multiple_choice", "numerical"]
    difficulty: Literal["easy", "medium", "hard"]
    questionIntent: str = Field(..., min_length=1, max_length=settings.max_string_length)
    questionText: str = Field(..., min_length=1, max_length=settings.max_string_length)
    options: Optional[List[str]] = Field(default=None, max_length=26)
    solutionText: str = Field(..., min_length=1, max_length=settings.max_string_length)
    # Supported media extension fields.
    imageUrl: Optional[str] = None
    diagramSvg: Optional[str] = None
    smilesNotation: Optional[str] = None
    optionsMedia: Optional[List[Any]] = None
    # Optional authored explanation for why a specific wrong option is
    # wrong, keyed by option letter (e.g. {"C": "This ignores friction."}).
    # Blueprint 5.3/9.4: shown only when explicitly supplied by the content
    # author; never inferred from an incorrect answer alone. R1 omitted
    # this field from the input contract even though it is a documented
    # part of the storage contract (Test.questions[].authoredDistractorExplanations)
    # and app.domain.results reads it — added here in R2 as a direct,
    # necessary correction to that omission, not a new feature.
    distractorExplanations: Optional[Dict[str, str]] = None

    @field_validator("options")
    @classmethod
    def _validate_options_match_type(cls, v, info):
        if info.data.get("questionType") == "multiple_choice":
            if not v or len(v) < 2:
                raise ValueError("MCQ must have at least 2 options")
        elif info.data.get("questionType") == "numerical":
            if v and len(v) > 0:
                raise ValueError("Numerical questions cannot have options")
        return v

    @field_validator("chapter", "topic")
    @classmethod
    def _validate_unique_tags(cls, v):
        if len(set(v)) != len(v):
            raise ValueError("Values must be unique")
        return v


class QuestionSchema(QuestionContentBase):
    """An original paper question, from questions.json."""

    questionNo: int = Field(..., gt=0)


def _validate_single_letter_option(v: Optional[str]) -> Optional[str]:
    if v is not None:
        v = v.strip().upper()
        if not (len(v) == 1 and "A" <= v <= "Z"):
            raise ValueError("Option must be a single letter A-Z")
    return v


def _reject_boolean(v: object) -> object:
    if isinstance(v, bool):
        raise ValueError("Booleans are not valid answers")
    return v


class PracticeQuestionSchema(QuestionContentBase):
    """One practice question, from recommendations.json."""

    sourceKey: str = Field(..., min_length=1, max_length=200)
    correctOption: Optional[str] = None
    numericalAnswer: Optional[int] = None

    @field_validator("correctOption")
    @classmethod
    def _validate_correct_option(cls, v):
        return _validate_single_letter_option(v)

    @field_validator("numericalAnswer", mode="before")
    @classmethod
    def _no_boolean_numerical_answer(cls, v):
        return _reject_boolean(v)

    @model_validator(mode="after")
    def _validate_exactly_one_answer_matching_type(self) -> "PracticeQuestionSchema":
        has_option = self.correctOption is not None
        has_numerical = self.numericalAnswer is not None

        if self.questionType == "multiple_choice":
            if has_numerical:
                raise ValueError(
                    "multiple_choice practice question must not set numericalAnswer"
                )
            if not has_option:
                raise ValueError("multiple_choice practice question requires correctOption")
            allowed = {chr(65 + i) for i in range(len(self.options or []))}
            if self.correctOption not in allowed:
                raise ValueError(
                    f"correctOption {self.correctOption!r} is outside this "
                    f"question's {len(self.options or [])} options"
                )
        elif self.questionType == "numerical":
            if has_option:
                raise ValueError(
                    "numerical practice question must not set correctOption"
                )
            if not has_numerical:
                raise ValueError("numerical practice question requires numericalAnswer")
        return self


class AnswerKeySchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    questionNo: int = Field(..., gt=0)
    correctOption: Optional[str] = None
    numericalAnswer: Optional[int] = None

    @field_validator("correctOption")
    @classmethod
    def _validate_correct_option(cls, v):
        return _validate_single_letter_option(v)

    @field_validator("numericalAnswer", mode="before")
    @classmethod
    def _no_boolean_numerical_answer(cls, v):
        return _reject_boolean(v)

    @model_validator(mode="after")
    def _validate_exactly_one_answer_present(self) -> "AnswerKeySchema":
        # Which one is *correct* for this question's type is a cross-file
        # check (the type lives in questions.json) — see
        # app/services/bundle.py. Here we only reject the schema-level
        # nonsense of both-set or neither-set.
        has_option = self.correctOption is not None
        has_numerical = self.numericalAnswer is not None
        if has_option == has_numerical:
            raise ValueError(
                "Exactly one of correctOption or numericalAnswer must be set "
                f"(questionNo {self.questionNo})"
            )
        return self


class AnswerSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    questionNo: int = Field(..., gt=0)
    answer: Optional[Any] = None

    @field_validator("answer", mode="before")
    @classmethod
    def _no_boolean_answer(cls, v):
        return _reject_boolean(v)


class StudentResponseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    enrollmentNo: str = Field(..., min_length=1, max_length=settings.max_string_length)
    answers: List[AnswerSchema] = Field(..., min_length=1, max_length=settings.max_array_size)


class RosterEntrySchema(BaseModel):
    """One student, from students.json. Roster-only students (no responses)
    are legitimate — they simply receive no evaluated report."""

    model_config = ConfigDict(extra="forbid")
    enrollmentNo: str = Field(..., min_length=1, max_length=settings.max_string_length)
    name: str = Field(..., min_length=1, max_length=settings.max_string_length)
    batch: str = Field(..., min_length=1, max_length=settings.max_string_length)
    email: Optional[str] = None

    @field_validator("enrollmentNo", "name", "batch")
    @classmethod
    def _strip_and_require_nonempty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank or whitespace-only")
        return v


def validate_roster_uniqueness(entries: List[RosterEntrySchema]) -> None:
    """
    Raises ValueError naming both colliding enrollment numbers if two roster
    entries share the same enrollmentNo case-insensitively (this covers
    exact duplicates too, since two identical strings are trivially equal
    case-insensitively). Called directly by tests/unit/test_schemas.py and
    by app/services/bundle.py's cross-file validation (Phase R3).
    """
    seen: Dict[str, str] = {}
    for entry in entries:
        key = entry.enrollmentNo.lower()
        if key in seen:
            raise ValueError(
                "Ambiguous case-insensitive roster enrollmentNo: "
                f"{seen[key]!r} and {entry.enrollmentNo!r}"
            )
        seen[key] = entry.enrollmentNo


class RecommendationSchema(BaseModel):
    """recommendations.json is a list of these: one per original question."""

    model_config = ConfigDict(extra="forbid")
    originalQuestionNo: int = Field(..., gt=0)
    recommendations: List[PracticeQuestionSchema] = Field(
        ..., min_length=1, max_length=settings.max_array_size
    )

    @field_validator("recommendations")
    @classmethod
    def _validate_unique_source_keys_within_entry(cls, v: List[PracticeQuestionSchema]):
        # Uniqueness of sourceKey *across the whole recommendations.json
        # file* (not just within one original question's three practice
        # items) is a cross-file check — see app/services/bundle.py.
        keys = [p.sourceKey for p in v]
        if len(set(keys)) != len(keys):
            raise ValueError(
                "Duplicate practice sourceKey within one recommendation entry"
            )
        return v
