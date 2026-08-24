import { Request, Response } from 'express';
import { Test } from '../models/Test';
import { PhysicsQuestion, ChemistryQuestion, BiologyQuestion } from '../models/Question';
import { EvaluationReport } from '../models/EvaluationReport';
import { StudentAnalytics } from '../models/StudentAnalytics';
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
      const mlRes = await axios.post('http://localhost:8000/process-omr', form, {
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
      // Look up across all 3 collections
      let questionDoc = await PhysicsQuestion.findById(q.questionId);
      if (!questionDoc) questionDoc = await ChemistryQuestion.findById(q.questionId);
      if (!questionDoc) questionDoc = await BiologyQuestion.findById(q.questionId);

      if (!questionDoc) continue;

      const choice = studentChoices[q.questionNo];
      if (!choice) {
        unanswered.push(questionDoc._id as Types.ObjectId);
      } else if (choice === questionDoc.correctOption) {
        correct.push(questionDoc._id as Types.ObjectId);
        score += test.marksPerQuestion;
      } else {
        incorrect.push(questionDoc._id as Types.ObjectId);
        score += test.negativeMarking;
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
    updateAnalytics(actualStudentId.toString(), correct, incorrect);

    res.status(200).json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const updateAnalytics = async (studentId: string, correct: Types.ObjectId[], incorrect: Types.ObjectId[]) => {
  try {
    let analytics = await StudentAnalytics.findOne({ studentId });
    if (!analytics) {
      analytics = new StudentAnalytics({
        studentId,
        chapterMastery: [],
        swotProfile: { criticalWeaknesses: [], strengths: [] }
      });
    }
    await analytics.save();
    console.log('Analytics updated for student:', studentId);
  } catch (error) {
    console.error('Failed to update analytics:', error);
  }
};
