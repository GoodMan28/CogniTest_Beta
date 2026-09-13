import { Response } from 'express';
import { StudentAnalytics } from '../models/StudentAnalytics';
import { Student } from '../models/Student';
import { Test } from '../models/Test';
import { EvaluationReport } from '../models/EvaluationReport';
import { AdminRequest } from '../middleware/adminAuth';

export const getStudentAnalytics = async (req: AdminRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    
    // Verify the student belongs to this admin's institute
    const student = await Student.findById(studentId);
    if (!student || student.instituteId.toString() !== req.admin!.instituteId) {
      return res.status(404).json({ message: 'Analytics not found for this student.' });
    }

    const analytics = await StudentAnalytics.findOne({ studentId });
    
    if (!analytics) {
      return res.status(404).json({ message: 'Analytics not found for this student.' });
    }

    res.status(200).json(analytics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getDashboardStats = async (req: AdminRequest, res: Response) => {
  try {
    const instituteId = req.admin!.instituteId;

    // Only count students belonging to this institute
    const studentCount = await Student.countDocuments({ instituteId });
    const testCount = await Test.countDocuments({ instituteId });
    
    // Get tests for this institute to scope reports
    const instituteTests = await Test.find({ instituteId }).select('_id');
    const testIds = instituteTests.map(t => t._id);

    // Only get reports for tests belonging to this institute
    const reports = await EvaluationReport.find({ testId: { $in: testIds } });
    const avgScore = reports.length > 0 
      ? Math.round(reports.reduce((acc, r) => acc + ((r.score / r.totalMarks) * 100), 0) / reports.length) 
      : 0;

    // For "Needs Attention", find students with low scores in this institute's tests
    const lowReports = await EvaluationReport.find({ testId: { $in: testIds } })
      .sort({ score: 1 })
      .limit(5)
      .populate('studentId');
    const needsAttention = lowReports.map(r => ({
      studentId: (r.studentId as any)?._id,
      name: (r.studentId as any)?.name,
      batch: (r.studentId as any)?.batch,
      issue: `Scored ${Math.round((r.score / r.totalMarks) * 100)}% on recent test`
    })).filter(x => x.name);

    // Generate performanceData from this institute's tests only
    const allTests = await Test.find({ instituteId }).sort({ date: 1 });
    const performanceData = [];
    for (const t of allTests) {
      const testReports = reports.filter(r => r.testId.toString() === t._id.toString());
      if (testReports.length > 0) {
        const testAvg = Math.round(testReports.reduce((acc, r) => acc + ((r.score / r.totalMarks) * 100), 0) / testReports.length);
        performanceData.push({
          name: t.title,
          score: testAvg
        });
      }
    }

    res.status(200).json({
      activeStudents: studentCount,
      testsConducted: testCount,
      averageScore: avgScore,
      needsAttention,
      performanceData
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
