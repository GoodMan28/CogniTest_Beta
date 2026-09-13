import type { ReportDetailDTO } from '../../../types/demoAnalysis';

// Mirrors analysis_service/tests/fixtures/synthetic_fixture.py's Student A,
// transcribed from implementation/FIXTURE_EXPECTATIONS.md, so frontend
// component tests assert against the same independently-verified numbers
// the backend tests do.
export const studentAReportDetail: ReportDetailDTO = {
  schemaVersion: '1.0',
  reportId: 'report-a',
  buildId: 'build-1',
  test: {
    testId: 'test-1',
    title: 'Phase 1 Test',
    date: '2026-09-12T00:00:00+00:00',
    examType: 'Demo',
    questionCount: 4,
    computedAt: '2026-09-12T12:00:00+00:00',
    publishedAt: '2026-09-12T12:05:00+00:00',
  },
  summary: {
    key: 'overall',
    label: 'Overall',
    questionCount: 4,
    correct: 3,
    incorrect: 0,
    skipped: 1,
    attempted: 3,
    score: '12.00',
    maximumMarks: '16.00',
    accuracyPct: '100.00',
    coveragePct: '75.00',
    overlapping: false,
  },
  breakdowns: [
    {
      scope: 'subject', label: 'By subject', overlapping: false,
      buckets: [
        { key: 'Physics', label: 'Physics', subject: undefined, questionCount: 1, correct: 1, incorrect: 0, skipped: 0, attempted: 1, score: '4.00', maximumMarks: '4.00', accuracyPct: '100.00', coveragePct: '100.00', overlapping: false },
        { key: 'Mathematics', label: 'Mathematics', questionCount: 2, correct: 2, incorrect: 0, skipped: 0, attempted: 2, score: '8.00', maximumMarks: '8.00', accuracyPct: '100.00', coveragePct: '100.00', overlapping: false },
        { key: 'Chemistry', label: 'Chemistry', questionCount: 1, correct: 0, incorrect: 0, skipped: 1, attempted: 0, score: '0.00', maximumMarks: '4.00', accuracyPct: null, coveragePct: '0.00', overlapping: false },
      ],
    },
    {
      scope: 'difficulty', label: 'By difficulty', overlapping: false,
      buckets: [
        { key: 'easy', label: 'Easy', questionCount: 1, correct: 1, incorrect: 0, skipped: 0, attempted: 1, score: '4.00', maximumMarks: '4.00', accuracyPct: '100.00', coveragePct: '100.00', overlapping: false },
        { key: 'medium', label: 'Medium', questionCount: 1, correct: 1, incorrect: 0, skipped: 0, attempted: 1, score: '4.00', maximumMarks: '4.00', accuracyPct: '100.00', coveragePct: '100.00', overlapping: false },
        { key: 'hard', label: 'Hard', questionCount: 2, correct: 1, incorrect: 0, skipped: 1, attempted: 1, score: '4.00', maximumMarks: '8.00', accuracyPct: '100.00', coveragePct: '50.00', overlapping: false },
      ],
    },
    { scope: 'subjectDifficulty', label: 'By subject and difficulty', overlapping: false, buckets: [] },
    {
      scope: 'questionType', label: 'By question type', overlapping: false,
      buckets: [
        { key: 'multiple_choice', label: 'Multiple choice', questionCount: 2, correct: 1, incorrect: 0, skipped: 1, attempted: 1, score: '4.00', maximumMarks: '8.00', accuracyPct: '100.00', coveragePct: '50.00', overlapping: false },
        { key: 'numerical', label: 'Numerical', questionCount: 2, correct: 2, incorrect: 0, skipped: 0, attempted: 2, score: '8.00', maximumMarks: '8.00', accuracyPct: '100.00', coveragePct: '100.00', overlapping: false },
      ],
    },
    { scope: 'unit', label: 'By unit', overlapping: true, buckets: [] },
    { scope: 'chapter', label: 'By chapter (overlapping)', overlapping: true, buckets: [] },
    { scope: 'topic', label: 'By topic (overlapping)', overlapping: true, buckets: [] },
  ],
  comparisons: {
    policy: 'default',
    cohortLabel: 'Alpha',
    cohortSize: 3,
    computedAt: '2026-09-12T12:00:00+00:00',
    available: true,
    unavailableReason: null,
    topperCount: 2,
    topperLabel: "Joint toppers' average",
    rows: [
      { scope: 'overall', key: 'overall', label: 'Overall', maximumMarks: '16.00', yourScore: '12.00', classAverage: '8.67', topperScore: '12.00' },
    ],
  },
  insights: [],
  revisionList: [],
  questions: [
    {
      questionNo: 1, questionId: 'q1', contentHash: 'hash1', subject: 'Physics', unit: 'Mechanics',
      chapter: ['Kinematics'], topic: ['1D Motion'], questionType: 'multiple_choice', difficulty: 'easy',
      questionIntent: 'Basic recall', questionText: 'What is speed?', options: ['A', 'B', 'C', 'D'],
      studentAnswer: 'B', correctAnswer: 'B', status: 'correct', awardedMarks: '4.00', maximumMarks: '4.00',
      solutionText: 'Distance over time', practiceCount: 3,
    },
    {
      questionNo: 2, questionId: 'q2', contentHash: 'hash2', subject: 'Mathematics', unit: 'Algebra',
      chapter: ['Equations'], topic: ['Linear'], questionType: 'numerical', difficulty: 'medium',
      questionIntent: 'Solve for x', questionText: 'Solve x = 0', options: [],
      studentAnswer: '0', correctAnswer: '0', status: 'correct', awardedMarks: '4.00', maximumMarks: '4.00',
      solutionText: 'x is 0', practiceCount: 3,
    },
    {
      questionNo: 3, questionId: 'q3', contentHash: 'hash3', subject: 'Chemistry', unit: 'Physical',
      chapter: ['Thermodynamics'], topic: ['Heat'], questionType: 'multiple_choice', difficulty: 'hard',
      questionIntent: 'Application', questionText: 'Define enthalpy', options: ['A', 'B', 'C', 'D'],
      studentAnswer: null, correctAnswer: 'A', status: 'skipped', awardedMarks: '0.00', maximumMarks: '4.00',
      solutionText: 'H = U + PV', practiceCount: 3,
    },
    {
      questionNo: 4, questionId: 'q4', contentHash: 'hash4', subject: 'Mathematics', unit: 'Calculus',
      chapter: ['Derivatives'], topic: ['Power rule'], questionType: 'numerical', difficulty: 'hard',
      questionIntent: 'Find slope', questionText: 'Derivative of 2x', options: [],
      studentAnswer: '-2', correctAnswer: '-2', status: 'correct', awardedMarks: '4.00', maximumMarks: '4.00',
      solutionText: '2', practiceCount: 3,
    },
  ],
  reflections: {},
};

export const studentDReportDetail: ReportDetailDTO = {
  ...studentAReportDetail,
  reportId: 'report-d',
  comparisons: {
    policy: 'default',
    cohortLabel: 'Beta',
    cohortSize: 1,
    computedAt: '2026-09-12T12:00:00+00:00',
    available: false,
    unavailableReason: 'Comparison unavailable: only one evaluated student.',
    topperCount: 1,
    topperLabel: 'Topper',
    rows: [],
  },
};
