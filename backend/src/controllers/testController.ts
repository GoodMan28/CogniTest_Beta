import { Request, Response } from 'express';
import { Test } from '../models/Test';

export const createTest = async (req: Request, res: Response) => {
  try {
    const { instituteId, title, date, examType, totalQuestions, marksPerQuestion, negativeMarking, questions } = req.body;
    
    const newTest = new Test({
      instituteId,
      title,
      date,
      examType,
      totalQuestions,
      marksPerQuestion,
      negativeMarking,
      questions
    });

    const savedTest = await newTest.save();
    res.status(201).json(savedTest);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTests = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
    let query = Test.find().sort({ date: -1 });
    if (limit > 0) {
      query = query.limit(limit);
    }
    const tests = await query;
    res.status(200).json(tests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTestById = async (req: Request, res: Response) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.status(200).json(test);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
