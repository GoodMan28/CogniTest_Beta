// Authoritative snapshot/API contract for the demo analysis feature.
// This file must stay field-for-field identical to:
//   analysis_service/app/schemas/reports.py        (StudentSnapshot, CohortAggregates)
//   analysis_service/app/api/schemas/reports.py     (ReportDetailDTO, etc.)
// per CogniTest_REMEDIATION_PROMPTS.md Section 1 (updated through Phase R1).
// Do not add a field here without adding it on the Python side too, and
// vice versa. Do not use `any` for any of these shapes.

export type DecimalText = string;
export type QuestionStatus = 'correct' | 'incorrect' | 'skipped';
export type QuestionType = 'multiple_choice' | 'numerical';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type BreakdownScope =
  | 'subject'
  | 'difficulty'
  | 'subjectDifficulty'
  | 'questionType'
  | 'unit'
  | 'chapter'
  | 'topic';
export type InsightLabel = 'Strength' | 'Developing' | 'Needs improvement' | 'Limited evidence';
export type RevisionReason = 'inaccurate' | 'skipped';
export type ComparisonScope = 'overall' | 'subject' | 'difficulty' | 'questionType';
export type TopperLabel = 'Topper' | "Joint toppers' average";

// --- Domain / stored shapes (app/schemas/reports.py) ---

export interface MetricBucket {
  key: string;
  label: string;
  subject?: string;
  questionCount: number;
  correct: number;
  incorrect: number;
  skipped: number;
  attempted: number;
  score: DecimalText;
  maximumMarks: DecimalText;
  accuracyPct: DecimalText | null;
  coveragePct: DecimalText | null;
  overlapping: boolean;
}

export interface Breakdown {
  scope: BreakdownScope;
  label: string;
  overlapping: boolean;
  buckets: MetricBucket[];
}

export interface QuestionMedia {
  imageUrl?: string;
  diagramSvg?: string; // already sanitized server-side at import time
}

export interface QuestionResult {
  questionNo: number;
  questionId: string;
  contentHash: string;
  subject: string;
  unit: string;
  chapter: string[];
  topic: string[];
  questionType: QuestionType;
  difficulty: Difficulty;
  questionIntent: string;
  questionText: string;
  options: string[];
  studentAnswer: string | null; // MCQ letter or normalized integer string; null = skipped
  correctAnswer: string; // MCQ letter or normalized integer string
  status: QuestionStatus;
  awardedMarks: DecimalText;
  maximumMarks: DecimalText;
  solutionText: string;
  selectedOptionExplanation?: string;
  practiceCount: number;
  media?: QuestionMedia;
}

export interface Insight {
  key: string; // "<subject>::<topic>"
  subject: string;
  topic: string;
  label: InsightLabel;
  questionCount: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracyPct: DecimalText | null;
  questionNos: number[];
}

export interface RevisionItem {
  rank: number; // 1-based
  subject: string;
  topic: string;
  marksLost: DecimalText; // maximumMarks - score for that topic; topics with 0 marksLost are excluded
  reason: RevisionReason; // 'skipped' when skipped >= incorrect, else 'inaccurate'
  questionNos: number[];
  practiceCount: number; // sum of practiceCount of those questions
}

export interface StudentSnapshot {
  schemaVersion: '1.0';
  summary: MetricBucket; // key "overall", overlapping false
  breakdowns: Breakdown[]; // exactly 7 entries, one per BreakdownScope, in the documented order
  insights: Insight[]; // one per (subject, topic) present in the paper
  revisionList: RevisionItem[]; // sorted by marksLost desc, then subject, then topic; max 10
  questions: QuestionResult[]; // ordered by questionNo
}

export interface CohortCategoryStat {
  scope: 'overall' | 'subject' | 'difficulty' | 'questionType';
  key: string; // same keys as MetricBucket.key
  label: string;
  maximumMarks: DecimalText;
  classAverage: DecimalText; // mean of category score over all cohort students
  topperScore: DecimalText; // topper's category score, or mean of tied toppers' category scores
}

export interface CohortAggregates {
  policy: string; // manifest.comparisonPolicy
  cohortLabel: string; // batch name
  cohortSize: number;
  computedAt: string; // ISO UTC
  available: boolean; // false when cohortSize < 2
  unavailableReason: string | null; // "Comparison unavailable: only one evaluated student." when cohortSize == 1
  topperCount: number; // number of students tied at the highest overall score
  topperLabel: TopperLabel;
  categories: CohortCategoryStat[]; // empty when available == false
}

// --- API DTOs (app/api/schemas/reports.py) ---

export interface ReportSummaryDTO {
  reportId: string;
  testId: string;
  testTitle: string;
  testDate: string;
  score: DecimalText;
  maximumMarks: DecimalText;
  correct: number;
  incorrect: number;
  skipped: number;
  questionCount: number;
  computedAt: string;
}

export interface ComparisonRow {
  scope: ComparisonScope;
  key: string;
  label: string;
  maximumMarks: DecimalText;
  yourScore: DecimalText; // from the viewer's own buckets
  classAverage: DecimalText;
  topperScore: DecimalText;
}

export interface Comparisons {
  policy: string;
  cohortLabel: string;
  cohortSize: number;
  computedAt: string;
  available: boolean;
  unavailableReason: string | null;
  topperCount: number;
  topperLabel: TopperLabel;
  rows: ComparisonRow[];
}

export interface ReflectionItemDTO {
  text: string;
  updatedAt: string;
  questionContentHash: string;
  stale: boolean; // true when questionContentHash no longer matches the current QuestionResult
}

export interface TestInfoDTO {
  testId: string;
  title: string;
  date: string;
  examType: string;
  questionCount: number;
  computedAt: string;
  publishedAt: string;
}

export interface ReportDetailDTO {
  schemaVersion: '1.0';
  reportId: string;
  buildId: string;
  test: TestInfoDTO;
  summary: MetricBucket;
  breakdowns: Breakdown[];
  comparisons: Comparisons;
  insights: Insight[];
  revisionList: RevisionItem[];
  questions: QuestionResult[];
  reflections: Record<string, ReflectionItemDTO>; // keyed by questionNo as string
}

export interface PracticeQuestionDTO {
  sourceKey: string;
  subject: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  questionText: string;
  options: string[];
  correctAnswer: string; // letter or integer string — practice is self-study, not an exam
  solutionText: string;
  media?: QuestionMedia;
}

export interface ReflectionUpdateDTO {
  text: string;
  buildId: string;
  questionContentHash: string;
}

export interface StudentMeDTO {
  id: string;
  instituteId: string;
  enrollmentNo: string;
  name: string;
  batch: string;
}
