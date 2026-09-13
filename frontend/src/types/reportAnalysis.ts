// Contract for GET /api/v1/reports/:reportId/analysis
// (backend/src/controllers/reportAnalysisController.ts). Everything is derived
// on the fly from EvaluationReport + Test + Question docs — no separate store.

export type AnalysisQuestionStatus = 'correct' | 'incorrect' | 'unanswered';

export interface AnalysisBucket {
  key: string;
  label: string;
  subject?: string;
  questionCount: number;
  correct: number;
  incorrect: number;
  skipped: number;
  attempted: number;
  score: number;
  maxMarks: number;
  positiveMarks: number;
  negativeMarks: number; // <= 0
  accuracyPct: number | null; // null when nothing attempted
  attemptPct: number | null;  // null when bucket is empty
}

export interface AnalysisChapter extends AnalysisBucket {
  topics: AnalysisBucket[];
}

export interface AnalysisQuestion {
  questionNo: number;
  questionId: string;
  subject: string;
  chapter: string[];
  topic: string[];
  difficulty: string;   // Easy | Medium | Tough | Unrated
  questionType: string; // Single Correct | Numerical
  status: AnalysisQuestionStatus;
  awardedMarks: number;
  maxMarks: number;
  pctStudentsCorrect: number; // % of the whole batch who got this right
  reason: string | null;      // student's Fix-It tag, if any
  hasLinkedPractice: boolean;
}

export interface AnalysisCohort {
  size: number;
  rank: number;
  percentile: number;
  classAverage: number;
  topperScore: number;
  topperCount: number;
  scores: number[]; // all batch scores, descending
  subjects: Array<{ subject: string; classAverage: number; topperScore: number }>;
}

export interface AnalysisInsights {
  strengths: string[];
  improvements: string[];
  strongChapters: Array<{ subject: string; chapters: string[] }>;
  weakChapters: Array<{ subject: string; chapters: string[] }>;
}

export interface ReportAnalysis {
  reportId: string;
  generatedAt: string;
  test: { _id: string; title: string; examType: string; date: string; totalQuestions: number };
  student: { name: string; enrollmentNo: string; batch: string } | null;
  summary: AnalysisBucket;
  subjects: AnalysisBucket[];
  difficulty: { overall: AnalysisBucket[]; bySubject: Record<string, AnalysisBucket[]> };
  questionTypes: {
    types: string[];
    overall: AnalysisBucket[];
    bySubject: Array<{ subject: string; cells: AnalysisBucket[] }>;
  };
  chapters: Record<string, AnalysisChapter[]>;
  questions: AnalysisQuestion[];
  cohort: AnalysisCohort;
  insights: AnalysisInsights;
}

// GET /api/v1/reports/:reportId/questions/:questionNo/practice
export interface PracticeQuestion {
  questionId: string;
  subject: string;
  chapter: string[];
  topic: string[];
  difficulty: string;
  questionType: 'multiple_choice' | 'numerical';
  questionText: string;
  options: string[];
  correctOption: string; // option letter, or the numerical answer as a string
  solutionText: string;
  diagramSvg?: string;
  imageUrl?: string;
}

export const FIX_IT_REASONS = [
  'Calculation Mistake',
  'Formula/Concept Wrong Applied',
  'Formula / Concept Forgotten',
  "Didn't understand Q",
  'Tukka but Wrong',
  'Time Ran Out',
  'Silly Mistake / Misread',
] as const;

export const SUBJECT_PALETTE: Record<string, string> = {
  Physics: '#6366f1',
  Chemistry: '#3b82f6',
  Biology: '#10b981',
  Mathematics: '#f97316',
};

export const subjectColor = (subject: string, index = 0) =>
  SUBJECT_PALETTE[subject] || ['#8b5cf6', '#ec4899', '#14b8a6', '#eab308'][index % 4];

export const STATUS_COLORS = {
  correct: '#15803d',
  incorrect: '#dc2626',
  unanswered: '#d1d5db',
};
