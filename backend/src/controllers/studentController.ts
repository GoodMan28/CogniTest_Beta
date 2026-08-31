import { Request, Response } from 'express';
import { Student } from '../models/Student';

export const getStudents = async (req: Request, res: Response) => {
  try {
    const { search, batch } = req.query;
    
    let query: any = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (batch && batch !== 'All Batches') {
      query.batch = batch;
    }
    
    const students = await Student.find(query).sort({ name: 1 });
    res.status(200).json(students);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentById = async (req: Request, res: Response) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(200).json(student);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStudentSettings = async (req: Request, res: Response) => {
  try {
    // For MVP, just update basic fields if passed
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(200).json(student);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;
    
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { profilePictureUrl },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json(student);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
