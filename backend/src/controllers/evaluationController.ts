import { Request, Response } from 'express';
import { Test } from '../models/Test';
import { PhysicsQuestion, ChemistryQuestion, BiologyQuestion } from '../models/Question';
import { EvaluationReport } from '../models/EvaluationReport';
import { StudentAnalytics } from '../models/StudentAnalytics';
import { Student } from '../models/Student';
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

      let mappedCorrect = questionDoc.correctOption;
      if (!['A', 'B', 'C', 'D'].includes(mappedCorrect)) {
        const idx = questionDoc.options ? questionDoc.options.indexOf(mappedCorrect) : -1;
        if (idx !== -1) mappedCorrect = ['A', 'B', 'C', 'D'][idx];
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
      const questions: Array<{ id: string; chapter: string; subject: 'Physics' | 'Chemistry' | 'Biology' }> = [];
      
      const fetchFromModel = async (Model: any, subjectName: 'Physics' | 'Chemistry' | 'Biology') => {
        const docs = await Model.find({ _id: { $in: ids } }).select('chapter');
        for (const doc of docs) {
          questions.push({ id: doc._id.toString(), chapter: doc.chapter, subject: subjectName });
        }
      };
      
      await Promise.all([
        fetchFromModel(PhysicsQuestion, 'Physics'),
        fetchFromModel(ChemistryQuestion, 'Chemistry'),
        fetchFromModel(BiologyQuestion, 'Biology')
      ]);
      
      return questions;
    };
    
    const [correctQuestions, incorrectQuestions] = await Promise.all([
      getChaptersForIds(allCorrectIds),
      getChaptersForIds(allIncorrectIds)
    ]);
    
    // Group stats by chapter
    const chapterStats: Record<string, { correct: number; incorrect: number; subject: 'Physics' | 'Chemistry' | 'Biology' }> = {};
    
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
    
    const chapterMastery = {
      Physics: [] as any[],
      Chemistry: [] as any[],
      Biology: [] as any[]
    };

    const swotProfile = {
      Physics: { criticalWeaknesses: [] as string[], strengths: [] as string[] },
      Chemistry: { criticalWeaknesses: [] as string[], strengths: [] as string[] },
      Biology: { criticalWeaknesses: [] as string[], strengths: [] as string[] }
    };
    
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
    chapterMastery.Physics.sort((a, b) => b.accuracyPercentage - a.accuracyPercentage);
    chapterMastery.Chemistry.sort((a, b) => b.accuracyPercentage - a.accuracyPercentage);
    chapterMastery.Biology.sort((a, b) => b.accuracyPercentage - a.accuracyPercentage);
    
    // Save to StudentAnalytics
    let analytics = await StudentAnalytics.findOne({ studentId });
    if (!analytics) {
      analytics = new StudentAnalytics({
        studentId: new Types.ObjectId(studentId)
      });
    }
    
    analytics.chapterMastery = chapterMastery;
    analytics.swotProfile = swotProfile;
    analytics.lastUpdated = new Date();
    await analytics.save();
    
    console.log('Successfully generated live subject-wise analytics for student:', studentId);
  } catch (error) {
    console.error('Failed to generate student analytics:', error);
  }
};

export const evaluateJsonBatch = async (req: Request, res: Response) => {
  try {
    const { testId } = req.body;
    let targetTest;
    if (testId) {
      targetTest = await Test.findById(testId);
    } else {
      // Find the latest test
      targetTest = await Test.findOne().sort({ createdAt: -1 });
    }

    if (!targetTest) {
      return res.status(404).json({ message: 'No test found for evaluation' });
    }

    // 1. Read response_sheet.json directly from filesystem
    const filePath = 'c:\\Users\\Abhineet Anand\\Desktop\\CogniTest\\response_sheet.json';
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'response_sheet.json not found' });
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const studentResponses = JSON.parse(fileContent);

    const studentNames = Object.keys(studentResponses);
    const results: any[] = [];

    // Extract target year from test title or default to 27
    let testYear = '27';
    const match = targetTest.title.match(/20(\d{2})/);
    if (match && match[1]) {
      testYear = match[1];
    }

    // Map answer digits to option letters
    const optionMap: Record<string, string> = {
      '1': 'A',
      '2': 'B',
      '3': 'C',
      '4': 'D',
      'unanswered': 'unanswered'
    };

    let studentIndex = 0;
    for (const name of studentNames) {
      studentIndex++;
      // Batch code: '01' for Alpha (default)
      const batchCode = '01';

      // Look up student by name and instituteId first to prevent duplication
      let student = await Student.findOne({ name, instituteId: targetTest.instituteId });
      
      if (!student) {
        // Serial number: unique auto-incrementing serial number based on count of existing students
        const currentCount = await Student.countDocuments({ instituteId: targetTest.instituteId });
        const serialNo = (1016 + currentCount).toString();
        const enrollmentNo = `${testYear}${batchCode}${serialNo}`;

        student = new Student({
          instituteId: targetTest.instituteId,
          enrollmentNo,
          name,
          batch: 'NEET-2027 Alpha'
        });
        await student.save();
      }

      // Delete any existing report to prevent duplicates for this student
      await EvaluationReport.deleteMany({ studentId: student._id, testId: targetTest._id });

      const responses = studentResponses[name];
      let score = 0;
      const correct: Types.ObjectId[] = [];
      const incorrect: Types.ObjectId[] = [];
      const unanswered: Types.ObjectId[] = [];
      const formattedResponses: Array<{ questionNo: number; selectedOption: string }> = [];

      for (const q of targetTest.questions) {
        // Look up across all 3 collections
        let questionDoc = await PhysicsQuestion.findById(q.questionId);
        if (!questionDoc) questionDoc = await ChemistryQuestion.findById(q.questionId);
        if (!questionDoc) questionDoc = await BiologyQuestion.findById(q.questionId);

        if (!questionDoc) continue;

        let mappedCorrect = questionDoc.correctOption;
        if (!['A', 'B', 'C', 'D'].includes(mappedCorrect)) {
          const idx = questionDoc.options ? questionDoc.options.indexOf(mappedCorrect) : -1;
          if (idx !== -1) mappedCorrect = ['A', 'B', 'C', 'D'][idx];
        }

        const rawChoice = responses[q.questionNo.toString()];
        const mappedChoice = optionMap[rawChoice] || 'unanswered';

        formattedResponses.push({
          questionNo: q.questionNo,
          selectedOption: mappedChoice
        });

        if (mappedChoice === 'unanswered') {
          unanswered.push(questionDoc._id as Types.ObjectId);
        } else if (mappedChoice === mappedCorrect) {
          correct.push(questionDoc._id as Types.ObjectId);
          score += targetTest.marksPerQuestion;
        } else {
          incorrect.push(questionDoc._id as Types.ObjectId);
          score -= targetTest.negativeMarking; // Subtract negative marking!
        }
      }

      // Save Evaluation Report
      const report = new EvaluationReport({
        studentId: student._id,
        testId: targetTest._id,
        score,
        totalMarks: targetTest.totalQuestions * targetTest.marksPerQuestion,
        performance: { correct, incorrect, unanswered },
        responses: formattedResponses,
        omrImageUrl: 'https://mock-s3-bucket.url/omr-image.jpg'
      });
      await report.save();

      // Trigger analytics generation
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
      message: 'OMR JSON Batch evaluated successfully',
      testTitle: targetTest.title,
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

