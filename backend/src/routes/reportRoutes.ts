import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { EvaluationReport } from '../models/EvaluationReport';
import { Test } from '../models/Test';
import { PhysicsQuestion, ChemistryQuestion, BiologyQuestion } from '../models/Question';

const router = Router();

// Endpoint for students to get their reports
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // We only want reports where the test is published
    const reports = await EvaluationReport.find({ studentId }).populate('testId');
    
    // Filter out unpublished tests (since populate gives us the test document)
    const publishedReports = reports.filter((r: any) => r.testId && r.testId.isPublished);
    
    res.status(200).json(publishedReports);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint for admin to publish reports for a test
router.post('/publish/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    
    test.isPublished = true;
    await test.save();
    
    res.status(200).json({ message: 'Reports published successfully', test });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint for students to pull their PDF report on demand
router.get('/download/:studentId/:testId', async (req, res) => {
  try {
    const { studentId, testId } = req.params;

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Diagnostic_Report_${studentId}_${testId}.pdf`);

    // Create a new PDF document and pipe it directly to the response
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Build the PDF content dynamically
    doc.fontSize(24).font('Helvetica-Bold').text('Diagnostic Report', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(14).font('Helvetica').text(`Student ID: ${studentId}`);
    doc.text(`Test ID: ${testId}`);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`);
    doc.moveDown(2);

    doc.fontSize(18).font('Helvetica-Bold').text('Performance Summary');
    doc.fontSize(12).font('Helvetica').text('Score: 85%');
    doc.text('Rank: 12 / 1205');
    doc.moveDown(2);

    doc.fontSize(18).font('Helvetica-Bold').text('SWOT Analysis');
    doc.fontSize(14).font('Helvetica-Bold').fillColor('green').text('Strengths:');
    doc.fontSize(12).font('Helvetica').fillColor('black').text('- Organic Chemistry');
    doc.text('- Cell Biology');
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').fillColor('red').text('Weaknesses:');
    doc.fontSize(12).font('Helvetica').fillColor('black').text('- Rotational Dynamics');
    doc.text('- Thermodynamics');
    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Oblique').text('Note: This is an automatically generated document triggered on-demand by the Student Portal.', { align: 'center' });

    // Finalize the PDF and end the stream
    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Endpoint for students/admin to get question-by-question review data for a report
router.get('/:reportId/review', async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await EvaluationReport.findById(reportId).populate('testId');
    if (!report) {
      return res.status(404).json({ message: 'Evaluation report not found' });
    }

    const test = report.testId as any;
    if (!test) {
      return res.status(404).json({ message: 'Test details not found' });
    }

    const reviewQuestions: any[] = [];
    const responsesMap = new Map();
    if (report.responses) {
      for (const resp of report.responses) {
        responsesMap.set(resp.questionNo, resp.selectedOption);
      }
    }

    const questionIds = test.questions.map((q: any) => q.questionId);
    const [physicsQuestions, chemistryQuestions, biologyQuestions] = await Promise.all([
      PhysicsQuestion.find({ _id: { $in: questionIds } }),
      ChemistryQuestion.find({ _id: { $in: questionIds } }),
      BiologyQuestion.find({ _id: { $in: questionIds } })
    ]);

    const questionsMap = new Map();
    physicsQuestions.forEach(q => questionsMap.set(q._id.toString(), q));
    chemistryQuestions.forEach(q => questionsMap.set(q._id.toString(), q));
    biologyQuestions.forEach(q => questionsMap.set(q._id.toString(), q));

    for (const q of test.questions) {
      const questionDoc = questionsMap.get(q.questionId.toString());
      if (!questionDoc) continue;

      const studentChoice = responsesMap.get(q.questionNo) || 'unanswered';
      
      let status: 'correct' | 'incorrect' | 'unanswered' = 'unanswered';
      if (report.performance.correct.some((id: any) => id.toString() === questionDoc!._id.toString())) {
        status = 'correct';
      } else if (report.performance.incorrect.some((id: any) => id.toString() === questionDoc!._id.toString())) {
        status = 'incorrect';
      }

      reviewQuestions.push({
        questionNo: q.questionNo,
        questionId: questionDoc._id,
        subject: questionDoc.subject,
        chapter: questionDoc.chapter,
        topic: questionDoc.topic,
        questionText: questionDoc.questionText,
        options: questionDoc.options,
        correctOption: questionDoc.correctOption,
        solutionText: questionDoc.solutionText,
        diagramSvg: questionDoc.diagramSvg,
        smilesNotation: questionDoc.smilesNotation,
        optionsMedia: questionDoc.optionsMedia,
        studentChoice,
        status
      });
    }

    // Sort by questionNo
    reviewQuestions.sort((a, b) => a.questionNo - b.questionNo);

    // Fetch batch scores
    const allReportsForTest = await EvaluationReport.find({ testId: test._id }).select('score');
    const batchScores = allReportsForTest.map(r => r.score).sort((a, b) => b - a);

    res.status(200).json({
      report: {
        _id: report._id,
        score: report.score,
        totalMarks: report.totalMarks,
        createdAt: report.createdAt,
        performance: report.performance
      },
      test: {
        _id: test._id,
        title: test.title,
        examType: test.examType,
        totalQuestions: test.totalQuestions,
        marksPerQuestion: test.marksPerQuestion,
        negativeMarking: test.negativeMarking
      },
      questions: reviewQuestions,
      batchScores
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/v1/reports/test/:testId/analytics
router.get('/test/:testId/analytics', async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: 'Test details not found' });
    }

    const reports = await EvaluationReport.find({ testId });
    if (reports.length === 0) {
      return res.status(200).json({
        totalReports: 0,
        testTitle: test.title,
        message: 'No reports graded yet for this test'
      });
    }

    const totalMarks = test.totalQuestions * test.marksPerQuestion;
    const scores = reports.map(r => r.score);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / reports.length);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const passCount = scores.filter(s => s >= totalMarks * 0.5).length;
    const passRate = Math.round((passCount / reports.length) * 100);

    // Resolve question details and count aggregate results
    const questionIds = test.questions.map((q: any) => q.questionId);
    const [physicsQuestions, chemistryQuestions, biologyQuestions] = await Promise.all([
      PhysicsQuestion.find({ _id: { $in: questionIds } }).select('subject chapter topic correctOption'),
      ChemistryQuestion.find({ _id: { $in: questionIds } }).select('subject chapter topic correctOption'),
      BiologyQuestion.find({ _id: { $in: questionIds } }).select('subject chapter topic correctOption')
    ]);

    const questionDetailsMap = new Map();
    physicsQuestions.forEach(q => questionDetailsMap.set(q._id.toString(), q));
    chemistryQuestions.forEach(q => questionDetailsMap.set(q._id.toString(), q));
    biologyQuestions.forEach(q => questionDetailsMap.set(q._id.toString(), q));

    // chapterStats: { [subject]: { [chapter]: { correct: 0, total: 0 } } }
    const chapterStats: Record<string, Record<string, { correct: number; total: number }>> = {
      Physics: {},
      Chemistry: {},
      Biology: {}
    };

    // Calculate aggregated results
    for (const r of reports) {
      for (const qId of r.performance.correct) {
        const qDetails = questionDetailsMap.get(qId.toString());
        if (qDetails) {
          const { subject, chapter } = qDetails;
          if (!chapterStats[subject][chapter]) {
            chapterStats[subject][chapter] = { correct: 0, total: 0 };
          }
          chapterStats[subject][chapter].correct++;
          chapterStats[subject][chapter].total++;
        }
      }
      for (const qId of r.performance.incorrect) {
        const qDetails = questionDetailsMap.get(qId.toString());
        if (qDetails) {
          const { subject, chapter } = qDetails;
          if (!chapterStats[subject][chapter]) {
            chapterStats[subject][chapter] = { correct: 0, total: 0 };
          }
          chapterStats[subject][chapter].total++;
        }
      }
    }

    // chapterMastery: { Physics: [], Chemistry: [], Biology: [] }
    // swotProfile: { Physics: { strengths: [], criticalWeaknesses: [] }, ... }
    const chapterMastery: Record<string, Array<{ chapter: string; accuracyPercentage: number; totalAttempted: number }>> = {
      Physics: [],
      Chemistry: [],
      Biology: []
    };
    
    const swotProfile: Record<string, { strengths: string[]; criticalWeaknesses: string[] }> = {
      Physics: { strengths: [], criticalWeaknesses: [] },
      Chemistry: { strengths: [], criticalWeaknesses: [] },
      Biology: { strengths: [], criticalWeaknesses: [] }
    };

    for (const subject of ['Physics', 'Chemistry', 'Biology']) {
      const subChapters = chapterStats[subject];
      for (const chapter of Object.keys(subChapters)) {
        const stats = subChapters[chapter];
        if (stats.total > 0) {
          const accuracyPercentage = Math.round((stats.correct / stats.total) * 100);
          chapterMastery[subject].push({
            chapter,
            accuracyPercentage,
            totalAttempted: stats.total
          });

          if (accuracyPercentage >= 70) {
            swotProfile[subject].strengths.push(chapter);
          } else if (accuracyPercentage < 50) {
            swotProfile[subject].criticalWeaknesses.push(chapter);
          }
        }
      }
      chapterMastery[subject].sort((a, b) => b.accuracyPercentage - a.accuracyPercentage);
    }

    res.status(200).json({
      testId,
      testTitle: test.title,
      examType: test.examType,
      totalReports: reports.length,
      averageScore,
      highestScore,
      lowestScore,
      totalMarks,
      passRate,
      chapterMastery,
      swotProfile
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/v1/reports/test/:testId/questions — Returns full question data for a test (Admin Sample PDF)
router.get('/test/:testId/questions', async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const questionIds = test.questions.map((q: any) => q.questionId);
    const [physicsQuestions, chemistryQuestions, biologyQuestions] = await Promise.all([
      PhysicsQuestion.find({ _id: { $in: questionIds } }),
      ChemistryQuestion.find({ _id: { $in: questionIds } }),
      BiologyQuestion.find({ _id: { $in: questionIds } })
    ]);

    const questionsMap = new Map();
    physicsQuestions.forEach(q => questionsMap.set(q._id.toString(), q));
    chemistryQuestions.forEach(q => questionsMap.set(q._id.toString(), q));
    biologyQuestions.forEach(q => questionsMap.set(q._id.toString(), q));

    const questions: any[] = [];
    for (const q of test.questions) {
      const doc = questionsMap.get(q.questionId.toString());
      if (!doc) continue;

      questions.push({
        questionNo: q.questionNo,
        questionId: doc._id,
        subject: doc.subject,
        chapter: doc.chapter,
        topic: doc.topic,
        questionText: doc.questionText,
        options: doc.options,
        correctOption: doc.correctOption,
        solutionText: doc.solutionText,
        diagramSvg: doc.diagramSvg,
      });
    }
    questions.sort((a, b) => a.questionNo - b.questionNo);

    res.status(200).json({
      test: {
        _id: test._id,
        title: test.title,
        examType: test.examType,
        totalQuestions: test.totalQuestions,
        marksPerQuestion: test.marksPerQuestion,
        negativeMarking: test.negativeMarking,
        date: test.date,
      },
      questions,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
