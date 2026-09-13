import { Response } from 'express';
import { Types } from 'mongoose';
import { EvaluationReport, IEvaluationReport } from '../models/EvaluationReport';
import { Test, ITest } from '../models/Test';
import { Student } from '../models/Student';
import {
  PhysicsQuestion,
  ChemistryQuestion,
  BiologyQuestion,
  MathematicsQuestion,
  IQuestion
} from '../models/Question';
import { TenantRequest } from '../middleware/tenantAuth';

/**
 * Deep per-report analysis for the student "Quiz Analysis Report" view.
 *
 * Everything here is derived on the fly from the existing data model:
 *   EvaluationReport.performance (+ responses) -> per-question status
 *   Test.questions (+ demoMarking / marks)     -> per-question marks
 *   Question docs                              -> subject / chapter / topic / difficulty / type
 *   All EvaluationReports of the same test     -> cohort stats + "% students correct"
 * Nothing is persisted except the Fix-It reason a student picks.
 */

// ---------- Shared shapes ----------

type QuestionStatus = 'correct' | 'incorrect' | 'unanswered';

interface QuestionRow {
  questionNo: number;
  questionId: string;
  subject: string;
  unit: string;
  chapter: string[];
  topic: string[];
  difficulty: string;      // Easy | Medium | Tough | Unrated
  questionType: string;    // Single Correct | Numerical
  status: QuestionStatus;
  correctMarks: number;
  incorrectPenalty: number;
  awardedMarks: number;
  maxMarks: number;
}

export interface MetricBucket {
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
  negativeMarks: number;
  accuracyPct: number | null;
  attemptPct: number | null;
}

const DIFFICULTY_LABELS: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Tough' };
const DIFFICULTY_ORDER = ['Easy', 'Medium', 'Tough', 'Unrated'];
const TYPE_LABELS: Record<string, string> = { multiple_choice: 'Single Correct', numerical: 'Numerical' };
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- Question loading ----------

const QUESTION_MODELS = [PhysicsQuestion, ChemistryQuestion, BiologyQuestion, MathematicsQuestion];

/** Loads every question referenced by a test from all subject collections, keyed by id string. */
const loadQuestionMap = async (questionIds: Types.ObjectId[]) => {
  const map = new Map<string, IQuestion>();
  const results = await Promise.all(
    QUESTION_MODELS.map(Model =>
      Model.find({ _id: { $in: questionIds } })
        .select('subject unit chapter topic difficulty questionType options correctOption numericalAnswer')
        .lean()
    )
  );
  for (const docs of results) {
    for (const doc of docs as any[]) map.set(doc._id.toString(), doc);
  }
  return map;
};

const getQuestionModelSafe = (subject: string | undefined) => {
  const normalized = (subject || '').toLowerCase().trim();
  if (normalized === 'physics') return PhysicsQuestion;
  if (normalized === 'chemistry') return ChemistryQuestion;
  if (normalized === 'biology') return BiologyQuestion;
  if (normalized === 'mathematics') return MathematicsQuestion;
  return null;
};

/** Normalises a stored correct answer to an option letter (some seeds store the option text instead). */
const toCorrectLetter = (q: Pick<IQuestion, 'questionType' | 'correctOption' | 'options' | 'numericalAnswer'>) => {
  if (q.questionType === 'numerical') {
    return q.numericalAnswer !== undefined && q.numericalAnswer !== null ? String(q.numericalAnswer) : '';
  }
  const raw = q.correctOption || '';
  if (OPTION_LETTERS.includes(raw)) return raw;
  const idx = q.options ? q.options.indexOf(raw) : -1;
  return idx >= 0 ? OPTION_LETTERS[idx] : raw;
};

// ---------- Per-question rows ----------

const buildQuestionRows = (test: ITest, report: IEvaluationReport, questionMap: Map<string, IQuestion>): QuestionRow[] => {
  const correctIds = new Set(report.performance.correct.map(id => id.toString()));
  const incorrectIds = new Set(report.performance.incorrect.map(id => id.toString()));
  const rows: QuestionRow[] = [];

  for (const tq of test.questions as any[]) {
    const idStr = tq.questionId.toString();
    const doc = questionMap.get(idStr);
    if (!doc) continue;

    // Marks: per-question override (demoMarking / legacy `marks`) beats the test-level default
    const correctMarks = tq.demoMarking?.correctMarks ?? tq.marks ?? test.marksPerQuestion ?? 0;
    const incorrectPenalty = tq.demoMarking?.incorrectPenalty ?? test.negativeMarking ?? 0;

    let status: QuestionStatus = 'unanswered';
    if (correctIds.has(idStr)) status = 'correct';
    else if (incorrectIds.has(idStr)) status = 'incorrect';

    const awardedMarks = status === 'correct' ? correctMarks : status === 'incorrect' ? -incorrectPenalty : 0;
    const chapters = Array.isArray(doc.chapter) ? doc.chapter : doc.chapter ? [doc.chapter as any] : [];
    const topics = Array.isArray(doc.topic) ? doc.topic : [];

    rows.push({
      questionNo: tq.questionNo,
      questionId: idStr,
      subject: tq.subject || doc.subject || 'Unknown',
      unit: doc.unit || 'Uncategorized',
      chapter: chapters.length ? chapters : ['Uncategorized'],
      topic: topics,
      difficulty: doc.difficulty ? DIFFICULTY_LABELS[doc.difficulty] || 'Unrated' : 'Unrated',
      questionType: TYPE_LABELS[doc.questionType || 'multiple_choice'] || 'Single Correct',
      status,
      correctMarks,
      incorrectPenalty,
      awardedMarks,
      maxMarks: correctMarks
    });
  }

  rows.sort((a, b) => a.questionNo - b.questionNo);
  return rows;
};

// ---------- Bucketing ----------

const bucketOf = (key: string, label: string, rows: QuestionRow[], subject?: string): MetricBucket => {
  const correct = rows.filter(r => r.status === 'correct').length;
  const incorrect = rows.filter(r => r.status === 'incorrect').length;
  const skipped = rows.length - correct - incorrect;
  const attempted = correct + incorrect;
  const positiveMarks = rows.reduce((s, r) => s + (r.awardedMarks > 0 ? r.awardedMarks : 0), 0);
  const negativeMarks = rows.reduce((s, r) => s + (r.awardedMarks < 0 ? r.awardedMarks : 0), 0);
  return {
    key,
    label,
    subject,
    questionCount: rows.length,
    correct,
    incorrect,
    skipped,
    attempted,
    score: round2(positiveMarks + negativeMarks),
    maxMarks: round2(rows.reduce((s, r) => s + r.maxMarks, 0)),
    positiveMarks: round2(positiveMarks),
    negativeMarks: round2(negativeMarks),
    accuracyPct: attempted > 0 ? round1((correct / attempted) * 100) : null,
    attemptPct: rows.length > 0 ? round1((attempted / rows.length) * 100) : null
  };
};

/** Groups rows by a key while preserving first-appearance order (rows are questionNo-ordered). */
const groupBy = (rows: QuestionRow[], keyFn: (r: QuestionRow) => string[]) => {
  const groups = new Map<string, QuestionRow[]>();
  for (const r of rows) {
    for (const k of keyFn(r)) {
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(r);
    }
  }
  return groups;
};

const sortDifficulty = (buckets: MetricBucket[]) =>
  buckets.sort((a, b) => DIFFICULTY_ORDER.indexOf(a.label) - DIFFICULTY_ORDER.indexOf(b.label));

const subjectOrder = (test: ITest, rows: QuestionRow[]): string[] => {
  const ordered: string[] = [];
  for (const s of test.sections || []) if (!ordered.includes(s.subject)) ordered.push(s.subject);
  for (const r of rows) if (!ordered.includes(r.subject)) ordered.push(r.subject);
  return ordered;
};

// ---------- Cohort ----------

interface CohortInput {
  test: ITest;
  reports: IEvaluationReport[];
  questionMap: Map<string, IQuestion>;
  self: IEvaluationReport;
  subjects: string[];
}

const buildCohort = ({ test, reports, questionMap, self, subjects }: CohortInput) => {
  const perStudent = reports.map(r => {
    const rows = buildQuestionRows(test, r, questionMap);
    const bySubject: Record<string, number> = {};
    for (const s of subjects) bySubject[s] = bucketOf(s, s, rows.filter(x => x.subject === s)).score;
    return { id: r._id.toString(), score: r.score, bySubject, correctIds: new Set(r.performance.correct.map(id => id.toString())) };
  });

  const size = perStudent.length;
  const scores = perStudent.map(p => p.score);
  const rank = scores.filter(s => s > self.score).length + 1;
  const below = scores.filter(s => s < self.score).length;
  const percentile = size > 1 ? round1((below / (size - 1)) * 100) : 100;
  const maxScore = Math.max(...scores);
  const toppers = perStudent.filter(p => p.score === maxScore);
  const avg = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);

  // Per-question "% of students who got it right" — the PDF's "% STUDENT CORRECT" column
  const pctCorrectByQuestion: Record<string, number> = {};
  for (const tq of test.questions as any[]) {
    const id = tq.questionId.toString();
    const n = perStudent.filter(p => p.correctIds.has(id)).length;
    pctCorrectByQuestion[id] = size > 0 ? Math.round((n / size) * 100) : 0;
  }

  return {
    size,
    rank,
    percentile,
    classAverage: round2(avg(scores)),
    topperScore: round2(avg(toppers.map(t => t.score))),
    topperCount: toppers.length,
    scores: scores.sort((a, b) => b - a),
    subjects: subjects.map(s => ({
      subject: s,
      classAverage: round2(avg(perStudent.map(p => p.bySubject[s] || 0))),
      topperScore: round2(avg(toppers.map(t => t.bySubject[s] || 0)))
    })),
    pctCorrectByQuestion
  };
};

// ---------- Rule-based insights ----------

interface InsightInput {
  summary: MetricBucket;
  subjects: MetricBucket[];
  difficulty: MetricBucket[];
  difficultyBySubject: Record<string, MetricBucket[]>;
  questionTypes: MetricBucket[];
  chapters: Record<string, MetricBucket[]>;
  cohort: { size: number; rank: number; percentile: number };
}

const fmtChapter = (c: MetricBucket) => `${c.label} (${c.correct} C / ${c.incorrect} In / ${c.skipped} Un)`;
// Placeholder chapter names carry no revision advice, so keep them out of named insights
const isNamedChapter = (c: MetricBucket) => !['uncategorized', 'general', 'unknown'].includes(c.label.toLowerCase());

const buildInsights = (input: InsightInput) => {
  const { summary, subjects, difficulty, difficultyBySubject, questionTypes, chapters, cohort } = input;
  const strengths: string[] = [];
  const improvements: string[] = [];

  // --- Strengths ---
  for (const s of subjects) {
    if (s.accuracyPct === 100 && s.attempted >= 3) {
      strengths.push(`You absolutely nailed ${s.label} — 100% accuracy with confidence. Truly rocked it! 🔥`);
    } else if (s.accuracyPct !== null && s.accuracyPct >= 85 && s.attempted >= 5) {
      strengths.push(`Strong accuracy in ${s.label} (${s.accuracyPct}%) — your concepts there are converting into marks.`);
    }
  }
  const withAcc = subjects.filter(s => s.accuracyPct !== null);
  if (withAcc.length > 1) {
    const spread = Math.max(...withAcc.map(s => s.accuracyPct!)) - Math.min(...withAcc.map(s => s.accuracyPct!));
    if (spread <= 15 && Math.min(...withAcc.map(s => s.accuracyPct!)) >= 70) {
      strengths.push(`Overall, your paper shows great balance and control: ${withAcc.map(s => `${s.label} ${s.accuracyPct}%`).join(', ')} accuracy.`);
    }
  }
  for (const s of subjects) {
    if (s.attemptPct !== null && s.attemptPct >= 90 && s.accuracyPct !== null && s.accuracyPct >= 50) {
      const top = (chapters[s.label] || []).filter(c => isNamedChapter(c) && c.correct > 0).sort((a, b) => b.correct - a.correct).slice(0, 2).map(c => c.label);
      strengths.push(`In ${s.label}, your coverage was excellent (${s.attemptPct}%)${top.length ? ` — solid grip on ${top.join(' and ')}` : ''}.`);
    }
  }
  const easy = difficulty.find(d => d.label === 'Easy');
  if (easy && easy.accuracyPct !== null && easy.accuracyPct >= 90 && easy.attemptPct !== null && easy.attemptPct >= 90) {
    strengths.push('You picked the Easy questions perfectly — accuracy and attempts were both high, showing sharp question selection skills.');
  }
  const tough = difficulty.find(d => d.label === 'Tough');
  if (tough && tough.correct >= 2 && tough.accuracyPct !== null && tough.accuracyPct >= 60) {
    strengths.push(`You cracked ${tough.correct} Tough question${tough.correct > 1 ? 's' : ''} with ${tough.accuracyPct}% accuracy — that's real strength, not luck.`);
  }
  if (cohort.size >= 5 && cohort.percentile >= 90) {
    strengths.push(`You're ranked #${cohort.rank} of ${cohort.size} — ahead of ${cohort.percentile}% of the batch. Keep that momentum.`);
  }

  // --- Improvements ---
  for (const s of subjects) {
    if (s.attemptPct !== null && s.attemptPct < 60) {
      const skippedByDiff = (difficultyBySubject[s.label] || []).filter(d => d.skipped > 0).sort((a, b) => b.skipped - a.skipped)[0];
      improvements.push(
        `In ${s.label}, attempt coverage was just ${s.attemptPct}% — ${s.skipped} questions were left unattempted` +
        (skippedByDiff ? `, mainly from ${skippedByDiff.label} level Qs (${skippedByDiff.skipped} Un)` : '') +
        '. Try to push your attempt % up in the next paper.'
      );
    }
  }
  for (const s of subjects) {
    if (s.accuracyPct !== null && s.accuracyPct < 60 && s.attempted >= 5) {
      improvements.push(
        `${s.label} accuracy was ${s.accuracyPct}% — ${s.incorrect} incorrect answers cost you ${Math.abs(s.negativeMarks)} marks in negatives. Slow down and aim better before marking.`
      );
    }
  }
  if (easy && (easy.incorrect + easy.skipped) >= 2) {
    const lost = easy.incorrect * (easy.questionCount ? easy.maxMarks / easy.questionCount : 0) + Math.abs(easy.negativeMarks);
    improvements.push(
      `${easy.incorrect} Easy question${easy.incorrect === 1 ? '' : 's'} went wrong and ${easy.skipped} ${easy.skipped === 1 ? 'was' : 'were'} skipped — that's free marks lost${lost > 0 ? ` (~${round1(lost)} marks)` : ''}. Easy ones must be 100%.`
    );
  }
  const numerical = questionTypes.find(t => t.label === 'Numerical');
  if (numerical && numerical.questionCount > 0 && numerical.accuracyPct !== null && numerical.accuracyPct < 50) {
    improvements.push(`You scored less in the Numerical section (${numerical.score}/${numerical.maxMarks}). Need to work on that!`);
  } else if (numerical && numerical.questionCount > 0 && numerical.attemptPct !== null && numerical.attemptPct < 40) {
    improvements.push(`Most Numerical questions were left unattempted (${numerical.skipped} of ${numerical.questionCount}) — practice them; there is no negative marking risk in skipping, but no marks either.`);
  }
  if (summary.negativeMarks < 0 && summary.score > 0 && Math.abs(summary.negativeMarks) >= summary.score * 0.1) {
    improvements.push(`Negative marking ate ${Math.abs(summary.negativeMarks)} marks — nearly ${Math.round((Math.abs(summary.negativeMarks) / summary.score) * 100)}% of your score. Guess less, verify more.`);
  }
  const worstChapters = Object.entries(chapters)
    .flatMap(([subject, list]) => list.filter(c => isNamedChapter(c) && c.incorrect >= 2).map(c => ({ subject, c })))
    .sort((a, b) => b.c.incorrect - a.c.incorrect)
    .slice(0, 3);
  if (worstChapters.length) {
    improvements.push(`Repeated errors in ${worstChapters.map(w => `${w.c.label} (${w.subject}, ${w.c.incorrect} In)`).join(', ')} — revisit these concepts before the next test.`);
  }
  if (improvements.length === 0 && summary.accuracyPct !== null && summary.attemptPct !== null) {
    improvements.push('Focus on consistent pacing and calmness under pressure — accuracy is already high, better coverage will automatically boost your score.');
  }

  // --- Strong / weak chapter lists per subject ---
  const strongChapters: Array<{ subject: string; chapters: string[] }> = [];
  const weakChapters: Array<{ subject: string; chapters: string[] }> = [];
  for (const [subject, list] of Object.entries(chapters)) {
    const strong = list
      .filter(c => isNamedChapter(c) && c.accuracyPct !== null && c.accuracyPct >= 70 && c.correct >= 2)
      .sort((a, b) => b.correct - a.correct)
      .slice(0, 4);
    if (strong.length) strongChapters.push({ subject, chapters: strong.map(fmtChapter) });

    const weak = list
      .filter(c => isNamedChapter(c) && ((c.accuracyPct !== null && c.accuracyPct < 50) || c.skipped > c.correct))
      .sort((a, b) => (b.incorrect + b.skipped) - (a.incorrect + a.skipped))
      .slice(0, 4);
    if (weak.length) weakChapters.push({ subject, chapters: weak.map(fmtChapter) });
  }

  return { strengths, improvements, strongChapters, weakChapters };
};

// ---------- Access control ----------

type LoadedReport =
  | { error: { status: number; message: string }; report?: undefined; test?: undefined }
  | { error?: undefined; report: IEvaluationReport; test: ITest };

/** Loads a report and verifies the caller (student owner, or admin of the same institute) may see it. */
const loadAuthorisedReport = async (req: TenantRequest, reportId: string): Promise<LoadedReport> => {
  if (!Types.ObjectId.isValid(reportId)) return { error: { status: 404, message: 'Evaluation report not found' } };
  const report = await EvaluationReport.findById(reportId);
  if (!report) return { error: { status: 404, message: 'Evaluation report not found' } };

  const tenant = req.tenant!;
  if (tenant.role === 'student' && report.studentId.toString() !== tenant.userId) {
    return { error: { status: 403, message: 'You can only view your own reports' } };
  }
  const test = await Test.findById(report.testId);
  if (!test) return { error: { status: 404, message: 'Test details not found' } };
  if (test.instituteId.toString() !== tenant.instituteId) {
    return { error: { status: 403, message: 'Report belongs to a different institute' } };
  }
  if (tenant.role === 'student' && !test.isPublished) {
    return { error: { status: 403, message: 'This report has not been published yet' } };
  }
  return { report, test };
};

// ---------- Controllers ----------

// GET /api/v1/reports/:reportId/analysis
export const getReportAnalysis = async (req: TenantRequest, res: Response) => {
  try {
    const loaded = await loadAuthorisedReport(req, req.params.reportId as string);
    if (loaded.error) return res.status(loaded.error.status).json({ message: loaded.error.message });
    const { report, test } = loaded;

    const questionIds = (test.questions as any[]).map(q => q.questionId);
    const [questionMap, cohortReports, student] = await Promise.all([
      loadQuestionMap(questionIds),
      EvaluationReport.find({ testId: test._id }).select('studentId score performance'),
      Student.findById(report.studentId).select('name enrollmentNo batch')
    ]);

    const rows = buildQuestionRows(test, report, questionMap);
    const subjects = subjectOrder(test, rows);

    const summary = bucketOf('overall', 'Overall', rows);
    const subjectBuckets = subjects.map(s => bucketOf(s, s, rows.filter(r => r.subject === s)));

    const difficulty = sortDifficulty(
      [...groupBy(rows, r => [r.difficulty]).entries()].map(([k, list]) => bucketOf(k, k, list))
    );
    const difficultyBySubject: Record<string, MetricBucket[]> = {};
    for (const s of subjects) {
      difficultyBySubject[s] = sortDifficulty(
        [...groupBy(rows.filter(r => r.subject === s), r => [r.difficulty]).entries()].map(([k, list]) => bucketOf(`${s}::${k}`, k, list, s))
      );
    }

    const typeLabels = [...new Set(rows.map(r => r.questionType))];
    const questionTypes = typeLabels.map(t => bucketOf(t, t, rows.filter(r => r.questionType === t)));
    const questionTypeBySubject = subjects.map(s => ({
      subject: s,
      cells: typeLabels.map(t => bucketOf(`${s}::${t}`, t, rows.filter(r => r.subject === s && r.questionType === t), s))
    }));

    // Chapter -> topic drill down (overlapping: a question may carry several chapters/topics)
    const chapters: Record<string, Array<MetricBucket & { topics: MetricBucket[] }>> = {};
    for (const s of subjects) {
      const subjectRows = rows.filter(r => r.subject === s);
      chapters[s] = [...groupBy(subjectRows, r => r.chapter).entries()].map(([chapter, list]) => ({
        ...bucketOf(`${s}::${chapter}`, chapter, list, s),
        topics: [...groupBy(list, r => (r.topic.length ? r.topic : ['General'])).entries()]
          .map(([topic, tl]) => bucketOf(`${s}::${chapter}::${topic}`, topic, tl, s))
      }));
    }

    const cohort = buildCohort({ test, reports: cohortReports, questionMap, self: report, subjects });

    const insights = buildInsights({
      summary,
      subjects: subjectBuckets,
      difficulty,
      difficultyBySubject,
      questionTypes,
      chapters: Object.fromEntries(Object.entries(chapters).map(([s, list]) => [s, list.map(({ topics, ...b }) => b)])),
      cohort
    });

    const reasonMap: Record<string, string> = {};
    for (const r of report.mistakeReasons || []) reasonMap[String(r.questionNo)] = r.reason;

    const recommendationCounts: Record<string, number> = {};
    for (const tq of test.questions as any[]) recommendationCounts[String(tq.questionNo)] = (tq.recommendations || []).length;

    res.status(200).json({
      reportId: report._id,
      generatedAt: new Date().toISOString(),
      test: {
        _id: test._id,
        title: test.title,
        examType: test.examType,
        date: test.date,
        totalQuestions: rows.length
      },
      student: student ? { name: student.name, enrollmentNo: student.enrollmentNo, batch: student.batch } : null,
      summary,
      subjects: subjectBuckets,
      difficulty: { overall: difficulty, bySubject: difficultyBySubject },
      questionTypes: { types: typeLabels, overall: questionTypes, bySubject: questionTypeBySubject },
      chapters,
      questions: rows.map(r => ({
        questionNo: r.questionNo,
        questionId: r.questionId,
        subject: r.subject,
        chapter: r.chapter,
        topic: r.topic,
        difficulty: r.difficulty,
        questionType: r.questionType,
        status: r.status,
        awardedMarks: r.awardedMarks,
        maxMarks: r.maxMarks,
        pctStudentsCorrect: cohort.pctCorrectByQuestion[r.questionId] ?? 0,
        reason: reasonMap[String(r.questionNo)] || null,
        hasLinkedPractice: (recommendationCounts[String(r.questionNo)] || 0) > 0
      })),
      cohort: {
        size: cohort.size,
        rank: cohort.rank,
        percentile: cohort.percentile,
        classAverage: cohort.classAverage,
        topperScore: cohort.topperScore,
        topperCount: cohort.topperCount,
        scores: cohort.scores,
        subjects: cohort.subjects
      },
      insights
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/v1/reports/:reportId/questions/:questionNo/practice
// Returns up to 3 practice questions for a missed/skipped question: the test's authored
// `recommendations` when present, otherwise same-subject questions sharing a chapter/topic.
export const getPracticeQuestions = async (req: TenantRequest, res: Response) => {
  try {
    const loaded = await loadAuthorisedReport(req, req.params.reportId as string);
    if (loaded.error) return res.status(loaded.error.status).json({ message: loaded.error.message });
    const { test } = loaded;

    const questionNo = Number(req.params.questionNo);
    const tq = (test.questions as any[]).find(q => q.questionNo === questionNo);
    if (!tq) return res.status(404).json({ message: 'Question not found in this test' });

    const [source] = await Promise.all([loadQuestionMap([tq.questionId])]);
    const sourceDoc = source.get(tq.questionId.toString());
    const subject = tq.subject || sourceDoc?.subject;
    const Model = getQuestionModelSafe(subject);
    if (!Model) return res.status(200).json([]);

    const projection = 'subject chapter topic difficulty questionType questionText options correctOption numericalAnswer solutionText diagramSvg imageUrl';
    let docs: any[] = [];

    if (tq.recommendations && tq.recommendations.length > 0) {
      const ids = tq.recommendations.map((r: any) => r.questionId);
      docs = await Model.find({ _id: { $in: ids } }).select(projection).lean();
    }

    if (docs.length < 3 && sourceDoc) {
      const excluded = new Set<string>([...(test.questions as any[]).map(q => q.questionId.toString()), ...docs.map(d => d._id.toString())]);
      const chapters = Array.isArray(sourceDoc.chapter) ? sourceDoc.chapter : [];
      const topics = Array.isArray(sourceDoc.topic) ? sourceDoc.topic : [];
      const filters: any[] = [];
      if (topics.length) filters.push({ topic: { $in: topics } });
      if (chapters.length) filters.push({ chapter: { $in: chapters } });

      for (const filter of filters) {
        if (docs.length >= 3) break;
        const extra = await Model.find({
          instituteId: test.instituteId,
          _id: { $nin: [...excluded].map(id => new Types.ObjectId(id)) },
          ...filter
        }).select(projection).limit(3 - docs.length).lean();
        for (const d of extra as any[]) {
          docs.push(d);
          excluded.add(d._id.toString());
        }
      }
    }

    res.status(200).json(
      docs.slice(0, 3).map((d: any) => ({
        questionId: d._id,
        subject: d.subject,
        chapter: Array.isArray(d.chapter) ? d.chapter : [],
        topic: Array.isArray(d.topic) ? d.topic : [],
        difficulty: d.difficulty ? DIFFICULTY_LABELS[d.difficulty] || 'Unrated' : 'Unrated',
        questionType: d.questionType || 'multiple_choice',
        questionText: d.questionText,
        options: d.options || [],
        correctOption: toCorrectLetter(d),
        solutionText: d.solutionText,
        diagramSvg: d.diagramSvg || undefined,
        imageUrl: d.imageUrl || undefined
      }))
    );
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/v1/reports/:reportId/questions/:questionNo/reason   body: { reason: string }
// Students tag why they missed a question (Fix It Zone). Empty reason clears the tag.
export const saveMistakeReason = async (req: TenantRequest, res: Response) => {
  try {
    if (req.tenant!.role !== 'student') {
      return res.status(403).json({ message: 'Only the student can tag their own mistakes' });
    }
    const loaded = await loadAuthorisedReport(req, req.params.reportId as string);
    if (loaded.error) return res.status(loaded.error.status).json({ message: loaded.error.message });
    const { report, test } = loaded;

    const questionNo = Number(req.params.questionNo);
    if (!(test.questions as any[]).some(q => q.questionNo === questionNo)) {
      return res.status(404).json({ message: 'Question not found in this test' });
    }
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 120) : '';

    const reasons = (report.mistakeReasons || []).filter(r => r.questionNo !== questionNo);
    if (reason) reasons.push({ questionNo, reason });
    report.mistakeReasons = reasons;
    await report.save();

    res.status(200).json({ questionNo, reason: reason || null });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
