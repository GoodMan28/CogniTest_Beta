import { Request, Response } from 'express';
import { StudentAnalytics } from '../models/StudentAnalytics';

export const getStudentAnalytics = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const analytics = await StudentAnalytics.findOne({ studentId });
    
    if (!analytics) {
      return res.status(404).json({ message: 'Analytics not found for this student.' });
    }

    res.status(200).json(analytics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

import { Student } from '../models/Student';
import { Test } from '../models/Test';
import { EvaluationReport } from '../models/EvaluationReport';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const studentCount = await Student.countDocuments();
    const testCount = await Test.countDocuments();
    
    const reports = await EvaluationReport.find();
    const avgScore = reports.length > 0 
      ? Math.round(reports.reduce((acc, r) => acc + ((r.score / r.totalMarks) * 100), 0) / reports.length) 
      : 0;

    // For "Needs Attention", let's just find students with low scores in recent tests
    const lowReports = await EvaluationReport.find().sort({ score: 1 }).limit(5).populate('studentId');
    const needsAttention = lowReports.map(r => ({
      studentId: (r.studentId as any)?._id,
      name: (r.studentId as any)?.name,
      batch: (r.studentId as any)?.batch,
      issue: `Scored ${Math.round((r.score / r.totalMarks) * 100)}% on recent test`
    })).filter(x => x.name);

    res.status(200).json({
      activeStudents: studentCount,
      testsConducted: testCount,
      averageScore: avgScore,
      needsAttention
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
