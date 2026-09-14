import { Response } from 'express';
import { Test } from '../models/Test';
import { Student } from '../models/Student';
import { AdminRequest } from '../middleware/adminAuth';
import { TenantRequest } from '../middleware/tenantAuth';

export const createTest = async (req: AdminRequest, res: Response) => {
  try {
    const { title, date, examType, sourceExam, templateId, totalQuestions, marksPerQuestion, negativeMarking, questions, sections, batches } = req.body;

    const newTest = new Test({
      instituteId: req.admin!.instituteId, // Always use the admin's institute
      title,
      date,
      examType,
      sourceExam,
      templateId,
      totalQuestions,
      marksPerQuestion,
      negativeMarking,
      questions,
      sections,
      batches: batches || []
    });

    const savedTest = await newTest.save();
    res.status(201).json(savedTest);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Resolves the calling student's batch, or null if the caller is an admin
 * (admins see every test in their institute regardless of batch).
 */
const getCallerBatch = async (req: TenantRequest): Promise<string | null> => {
  if (req.tenant?.role !== 'student') return null;
  const student = await Student.findById(req.tenant.userId).select('batch');
  return student?.batch || null;
};

/** A test is visible to a batch if it has no batch restriction, or the batch is listed. */
const batchVisibilityFilter = (batch: string | null) => {
  if (!batch) return {}; // admin — no restriction
  return { $or: [{ batches: batch }, { batches: { $size: 0 } }, { batches: { $exists: false } }] };
};

export const getTests = async (req: TenantRequest, res: Response) => {
  try {
    const instituteId = req.admin!.instituteId;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
    const batch = await getCallerBatch(req);

    let query = Test.find({ instituteId, ...batchVisibilityFilter(batch) }).sort({ date: -1 });
    if (limit > 0) {
      query = query.limit(limit);
    }
    const tests = await query;
    res.status(200).json(tests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTestById = async (req: TenantRequest, res: Response) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    if (test.instituteId.toString() !== req.admin!.instituteId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const batch = await getCallerBatch(req);
    if (batch && test.batches && test.batches.length > 0 && !test.batches.includes(batch)) {
      return res.status(403).json({ message: 'This test is not available for your batch' });
    }

    res.status(200).json(test);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
