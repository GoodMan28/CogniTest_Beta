"""
Domain-layer result shapes: what app/domain/* functions produce, and what
gets stored under evaluationreports.analysisDemo.snapshot /
.batchSnapshot. These mirror CogniTest_REMEDIATION_PROMPTS.md Section 1.3
(StudentSnapshot) and Section 1.4 (CohortAggregates) field-for-field.

app/api/schemas/reports.py holds the separate (but related) HTTP response
DTOs — see that module's docstring for how the two connect.
"""
from typing import List, Literal, Optional

from pydantic import BaseModel

BreakdownScope = Literal[
    "subject", "difficulty", "subjectDifficulty", "questionType", "unit", "chapter", "topic"
]
InsightLabel = Literal["Strength", "Developing", "Needs improvement", "Limited evidence"]
RevisionReason = Literal["inaccurate", "skipped"]


class MetricBucket(BaseModel):
    key: str
    label: str
    subject: Optional[str] = None
    questionCount: int
    correct: int
    incorrect: int
    skipped: int
    attempted: int
    score: str
    maximumMarks: str
    accuracyPct: Optional[str] = None
    coveragePct: Optional[str] = None
    overlapping: bool


class Breakdown(BaseModel):
    scope: BreakdownScope
    label: str
    overlapping: bool
    buckets: List[MetricBucket]


class QuestionMedia(BaseModel):
    imageUrl: Optional[str] = None
    diagramSvg: Optional[str] = None  # already sanitized at import time (app/services/validation.sanitize_svg)


class QuestionResult(BaseModel):
    questionNo: int
    questionId: str
    contentHash: str
    subject: str
    unit: str
    chapter: List[str]
    topic: List[str]
    questionType: Literal["multiple_choice", "numerical"]
    difficulty: Literal["easy", "medium", "hard"]
    questionIntent: str
    questionText: str
    options: List[str]
    studentAnswer: Optional[str] = None
    correctAnswer: str
    status: Literal["correct", "incorrect", "skipped"]
    awardedMarks: str
    maximumMarks: str
    solutionText: str
    selectedOptionExplanation: Optional[str] = None
    practiceCount: int
    media: Optional[QuestionMedia] = None


class Insight(BaseModel):
    key: str  # "<subject>::<topic>"
    subject: str
    topic: str
    label: InsightLabel
    questionCount: int
    attempted: int
    correct: int
    incorrect: int
    skipped: int
    accuracyPct: Optional[str] = None
    questionNos: List[int]


class RevisionItem(BaseModel):
    rank: int
    subject: str
    topic: str
    marksLost: str
    reason: RevisionReason
    questionNos: List[int]
    practiceCount: int


class StudentSnapshot(BaseModel):
    schemaVersion: Literal["1.0"] = "1.0"
    summary: MetricBucket
    breakdowns: List[Breakdown]
    insights: List[Insight]
    revisionList: List[RevisionItem]
    questions: List[QuestionResult]


class CohortCategoryStat(BaseModel):
    scope: Literal["overall", "subject", "difficulty", "questionType"]
    key: str
    label: str
    maximumMarks: str
    classAverage: str
    topperScore: str


class CohortAggregates(BaseModel):
    policy: str
    cohortLabel: str
    cohortSize: int
    computedAt: str  # ISO UTC
    available: bool
    unavailableReason: Optional[str] = None
    topperCount: int
    topperLabel: Literal["Topper", "Joint toppers' average"]
    categories: List[CohortCategoryStat]
