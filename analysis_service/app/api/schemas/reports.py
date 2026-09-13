"""
HTTP response DTOs for /api/v2/demo/reports/*. These are deliberately
separate from app/schemas/reports.py's StudentSnapshot/CohortAggregates
(the stored domain shapes): a DTO reshapes stored data for one specific
endpoint (e.g. Comparisons folds the viewer's own score into each cohort
category row) and must never leak a raw Mongo field. See
CogniTest_REMEDIATION_PROMPTS.md Section 1.5.
"""
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.reports import Breakdown, Insight, MetricBucket, QuestionMedia, QuestionResult, RevisionItem


class ReportSummaryDTO(BaseModel):
    reportId: str
    testId: str
    testTitle: str
    testDate: str
    score: str
    maximumMarks: str
    correct: int
    incorrect: int
    skipped: int
    questionCount: int
    computedAt: str


class ComparisonRow(BaseModel):
    scope: Literal["overall", "subject", "difficulty", "questionType"]
    key: str
    label: str
    maximumMarks: str
    yourScore: str
    classAverage: str
    topperScore: str


class Comparisons(BaseModel):
    policy: str
    cohortLabel: str
    cohortSize: int
    computedAt: str
    available: bool
    unavailableReason: Optional[str] = None
    topperCount: int
    topperLabel: Literal["Topper", "Joint toppers' average"]
    rows: List[ComparisonRow]


class ReflectionItemDTO(BaseModel):
    text: str
    updatedAt: str
    questionContentHash: str
    stale: bool


class TestInfoDTO(BaseModel):
    testId: str
    title: str
    date: str
    examType: str
    questionCount: int
    computedAt: str
    publishedAt: str


class ReportDetailDTO(BaseModel):
    schemaVersion: Literal["1.0"] = "1.0"
    reportId: str
    buildId: str
    test: TestInfoDTO
    summary: MetricBucket
    breakdowns: List[Breakdown]
    comparisons: Comparisons
    insights: List[Insight]
    revisionList: List[RevisionItem]
    questions: List[QuestionResult]
    reflections: Dict[str, ReflectionItemDTO] = {}


class PracticeQuestionDTO(BaseModel):
    """
    Note: `media` was present in CogniTest_REMEDIATION_PROMPTS.md Section 1.5
    but was accidentally omitted here in Phase R1 — added now (Phase R4)
    while wiring app.services.reports.get_practice_questions, which needs
    somewhere to put a practice question's imageUrl/diagramSvg.
    """
    sourceKey: str
    subject: str
    questionType: Literal["multiple_choice", "numerical"]
    difficulty: Literal["easy", "medium", "hard"]
    questionText: str
    options: List[str] = []
    correctAnswer: str
    solutionText: str
    media: Optional[QuestionMedia] = None


class ReflectionUpdateDTO(BaseModel):
    text: str = Field(..., max_length=1000)
    buildId: str
    questionContentHash: str
