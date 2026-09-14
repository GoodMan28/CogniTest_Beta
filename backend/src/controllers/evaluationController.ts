import { Response } from 'express';
import { Request } from 'express';
import { Test } from '../models/Test';
import { findQuestionByIdAnySubject, ALL_QUESTION_MODELS } from '../models/Question';
import { EvaluationReport } from '../models/EvaluationReport';
import { StudentAnalytics } from '../models/StudentAnalytics';
import { Student } from '../models/Student';
import { AdminRequest } from '../middleware/adminAuth';
import { Types } from 'mongoose';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

export const uploadBatchOMR = async (req: Request, res: Response) => {
  try {
    const { testId, studentId } = req.body;
    const file = req.file;

    // For MVP frontend which might not send studentId yet, mock it if undefined
    const actualStudentId = studentId || '60d5ecb8b392d721c4359218';

    if (!file) {
      return res.status(400).json({ message: 'No OMR image uploaded' });
    }

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    // 1. Call Python ML Service
    const form = new FormData();
    form.append('file', fs.createReadStream(file.path));
    form.append('totalQuestions', test.totalQuestions.toString());

    let studentChoices: Record<number, string> = {};
    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      const mlRes = await axios.post(`${mlServiceUrl}/process-omr`, form, {
        headers: { ...form.getHeaders() }
      });
      studentChoices = mlRes.data.choices;
    } catch (mlErr) {
      console.error('Python ML Service failed:', mlErr);
      return res.status(500).json({ message: 'Failed to process OMR image via ML pipeline' });
    } finally {
      // Clean up multer file
      fs.unlinkSync(file.path);
    }

    // 2. Evaluate
    let score = 0;
    const correct: Types.ObjectId[] = [];
    const incorrect: Types.ObjectId[] = [];
    const unanswered: Types.ObjectId[] = [];

    for (const q of test.questions) {
      const questionDoc = await findQuestionByIdAnySubject(q.questionId);
      if (!questionDoc) continue;

      let mappedCorrect = questionDoc.correctOption;
      if (questionDoc.questionType === 'multiple_choice' && mappedCorrect) {
        if (!['A', 'B', 'C', 'D'].includes(mappedCorrect)) {
          const idx = questionDoc.options ? questionDoc.options.indexOf(mappedCorrect) : -1;
          if (idx !== -1) mappedCorrect = ['A', 'B', 'C', 'D'][idx];
        }
      } else if (questionDoc.questionType === 'numerical') {
        mappedCorrect = questionDoc.numericalAnswer !== undefined ? String(questionDoc.numericalAnswer) : undefined;
      }

      const choice = studentChoices[q.questionNo];
      if (!choice) {
        unanswered.push(questionDoc._id as Types.ObjectId);
      } else if (choice === mappedCorrect) {
        correct.push(questionDoc._id as Types.ObjectId);
        score += test.marksPerQuestion;
      } else {
        incorrect.push(questionDoc._id as Types.ObjectId);
        score -= test.negativeMarking;
      }
    }

    // 3. Save Evaluation Report
    const report = new EvaluationReport({
      studentId: actualStudentId,
      testId,
      score,
      totalMarks: test.totalQuestions * test.marksPerQuestion,
      performance: { correct, incorrect, unanswered },
      omrImageUrl: 'https://mock-s3-bucket.url/omr-image.jpg' // Simulated S3 upload
    });
    await report.save();

    // 4. Async Analytics Update
    await generateStudentAnalytics(actualStudentId.toString());

    res.status(200).json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const SUBJECTS = ALL_QUESTION_MODELS.map(m => m.subject);

export const generateStudentAnalytics = async (studentId: string) => {
  try {
    // 1. Get all reports for the student
    const reports = await EvaluationReport.find({ studentId });

    // Collect all correct and incorrect question IDs
    let allCorrectIds: Types.ObjectId[] = [];
    let allIncorrectIds: Types.ObjectId[] = [];

    for (const r of reports) {
      allCorrectIds = allCorrectIds.concat(r.performance.correct);
      allIncorrectIds = allIncorrectIds.concat(r.performance.incorrect);
    }

    // Fetch details for these questions to group them by chapter and subject
    const getChaptersForIds = async (ids: Types.ObjectId[]) => {
      const questions: Array<{ id: string; chapter: string; subject: string }> = [];

      await Promise.all(ALL_QUESTION_MODELS.map(async ({ model: QuestionModel, subject }) => {
        const docs = await QuestionModel.find({ _id: { $in: ids } }).select('chapter');
        for (const doc of docs) {
          questions.push({ id: doc._id.toString(), chapter: (doc.chapter as any)?.[0] || (doc.chapter as any), subject });
        }
      }));

      return questions;
    };

    const [correctQuestions, incorrectQuestions] = await Promise.all([
      getChaptersForIds(allCorrectIds),
      getChaptersForIds(allIncorrectIds)
    ]);

    // Group stats by chapter
    const chapterStats: Record<string, { correct: number; incorrect: number; subject: string }> = {};

    for (const q of correctQuestions) {
      if (!chapterStats[q.chapter]) {
        chapterStats[q.chapter] = { correct: 0, incorrect: 0, subject: q.subject };
      }
      chapterStats[q.chapter].correct++;
    }

    for (const q of incorrectQuestions) {
      if (!chapterStats[q.chapter]) {
        chapterStats[q.chapter] = { correct: 0, incorrect: 0, subject: q.subject };
      }
      chapterStats[q.chapter].incorrect++;
    }

    const chapterMastery: Record<string, any[]> = {};
    const swotProfile: Record<string, { criticalWeaknesses: string[]; strengths: string[] }> = {};
    for (const subject of SUBJECTS) {
      chapterMastery[subject] = [];
      swotProfile[subject] = { criticalWeaknesses: [], strengths: [] };
    }

    for (const chapter of Object.keys(chapterStats)) {
      const stats = chapterStats[chapter];
      const totalAttempted = stats.correct + stats.incorrect;
      if (totalAttempted > 0) {
        const accuracyPercentage = Math.round((stats.correct / totalAttempted) * 100);
        const entry = {
          chapter,
          accuracyPercentage,
          totalAttempted
        };

        chapterMastery[stats.subject].push(entry);

        if (accuracyPercentage >= 80) {
          swotProfile[stats.subject].strengths.push(chapter);
        } else if (accuracyPercentage < 50) {
          swotProfile[stats.subject].criticalWeaknesses.push(chapter);
        }
      }
    }

    // Sort chapterMastery lists by accuracyPercentage desc
    for (const subject of SUBJECTS) {
      chapterMastery[subject].sort((a, b) => b.accuracyPercentage - a.accuracyPercentage);
    }

    // Save to StudentAnalytics
    let analytics = await StudentAnalytics.findOne({ studentId });
    if (!analytics) {
      analytics = new StudentAnalytics({
        studentId: new Types.ObjectId(studentId)
      });
    }

    analytics.chapterMastery = chapterMastery as any;
    analytics.swotProfile = swotProfile as any;
    analytics.lastUpdated = new Date();
    await analytics.save();

    console.log('Successfully generated live subject-wise analytics for student:', studentId);
  } catch (error) {
    console.error('Failed to generate student analytics:', error);
  }
};

/**
 * POST /api/v1/evaluation/evaluate-sheet (admin-only)
 *
 * Body: { testId, responses: { "<enrollmentNo>": { "1": "2", "2": "unanswered", "71": "5.5" } } }
 * MCQ digits map 1->A, 2->B, 3->C, 4->D; anything else is treated as unattempted.
 * Numerical answers are compared with |given - expected| <= 0.01 tolerance.
 * Idempotent per (student, test): re-running replaces the prior report and re-derives analytics.
 */
export const evaluateSheet = async (req: AdminRequest, res: Response) => {
  try {
    const { testId, responses } = req.body;
    if (!testId || !responses || typeof responses !== 'object') {
      return res.status(400).json({ message: 'testId and responses are required' });
    }

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (test.instituteId.toString() !== req.admin!.instituteId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const optionMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
    const batch = test.batches && test.batches.length > 0 ? test.batches[0] : undefined;

    // Resolve question docs once for the whole test.
    const questionDocs = new Map<string, any>();
    for (const q of test.questions) {
      const doc = await findQuestionByIdAnySubject(q.questionId);
      if (doc) questionDocs.set(q.questionId.toString(), doc);
    }

    const studentKeys = Object.keys(responses);
    const results: any[] = [];

    for (const key of studentKeys) {
      // Match by enrollment number first, then by name, scoped to this institute.
      let student = await Student.findOne({ enrollmentNo: key, instituteId: test.instituteId });
      if (!student) {
        student = await Student.findOne({ name: key, instituteId: test.instituteId });
      }
      if (!student) {
        if (!batch) {
          results.push({ studentKey: key, error: 'Student not found and test has no batch to auto-enroll into' });
          continue;
        }
        const currentCount = await Student.countDocuments({ instituteId: test.instituteId });
        student = new Student({
          instituteId: test.instituteId,
          enrollmentNo: key.match(/^[A-Za-z0-9._-]+$/) ? key : `AUTO-${Date.now()}-${currentCount}`,
          name: key,
          batch
        });
        await student.save();
      }

      // Idempotent: wipe any prior report for this (student, test) before re-inserting.
      await EvaluationReport.deleteMany({ studentId: student._id, testId: test._id });

      const studentResponses = responses[key];
      let score = 0;
      const correct: Types.ObjectId[] = [];
      const incorrect: Types.ObjectId[] = [];
      const unanswered: Types.ObjectId[] = [];
      const formattedResponses: Array<{ questionNo: number; selectedOption: string }> = [];

      for (const q of test.questions) {
        const questionDoc = questionDocs.get(q.questionId.toString());
        if (!questionDoc) continue;

        const rawAnswer = studentResponses[q.questionNo.toString()];
        let isCorrect = false;
        let isAttempted = false;
        let selectedOption = 'unanswered';

        if (questionDoc.questionType === 'numerical') {
          const parsed = rawAnswer !== undefined && rawAnswer !== null && rawAnswer !== 'unanswered'
            ? parseFloat(rawAnswer)
            : NaN;
          if (!Number.isNaN(parsed)) {
            isAttempted = true;
            selectedOption = String(parsed);
            if (questionDoc.numericalAnswer !== undefined && questionDoc.numericalAnswer !== null) {
              isCorrect = Math.abs(parsed - questionDoc.numericalAnswer) <= 0.01;
            }
          }
        } else {
          const mapped = optionMap[String(rawAnswer)];
          if (mapped) {
            isAttempted = true;
            selectedOption = mapped;
            let correctLetter = questionDoc.correctOption;
            if (correctLetter && !['A', 'B', 'C', 'D'].includes(correctLetter)) {
              const idx = questionDoc.options ? questionDoc.options.indexOf(correctLetter) : -1;
              if (idx !== -1) correctLetter = ['A', 'B', 'C', 'D'][idx];
            }
            isCorrect = mapped === correctLetter;
          }
        }

        formattedResponses.push({ questionNo: q.questionNo, selectedOption });

        if (!isAttempted) {
          unanswered.push(questionDoc._id as Types.ObjectId);
        } else if (isCorrect) {
          correct.push(questionDoc._id as Types.ObjectId);
          score += test.marksPerQuestion;
        } else {
          incorrect.push(questionDoc._id as Types.ObjectId);
          score -= test.negativeMarking; // Not clamped at zero — matches JEE-style negative totals.
        }
      }

      const report = new EvaluationReport({
        studentId: student._id,
        testId: test._id,
        score,
        totalMarks: test.totalQuestions * test.marksPerQuestion,
        performance: { correct, incorrect, unanswered },
        responses: formattedResponses
      });
      await report.save();

      await generateStudentAnalytics(student._id.toString());

      results.push({
        studentId: student._id,
        studentName: student.name,
        enrollmentNo: student.enrollmentNo,
        score,
        correct: correct.length,
        incorrect: incorrect.length,
        unanswered: unanswered.length
      });
    }

    res.status(200).json({
      message: 'Response sheet evaluated successfully',
      testTitle: test.title,
      results
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const clearDemo = async (req: Request, res: Response) => {
  try {
    await StudentAnalytics.deleteMany({});
    await EvaluationReport.deleteMany({});
    res.status(200).json({ message: 'Demo data cleared successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
