import { Response } from 'express';
import { Student } from '../models/Student';
import { AdminRequest } from '../middleware/adminAuth';

export const getStudents = async (req: AdminRequest, res: Response) => {
  try {
    const { search, batch } = req.query;
    const instituteId = req.admin!.instituteId;
    
    let query: any = { instituteId };
    
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

export const getStudentById = async (req: AdminRequest, res: Response) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    // Verify the student belongs to this admin's institute
    if (student.instituteId.toString() !== req.admin!.instituteId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.status(200).json(student);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStudentSettings = async (req: AdminRequest, res: Response) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student || student.instituteId.toString() !== req.admin!.instituteId) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const updated = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadProfilePicture = async (req: AdminRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const profilePictureUrl = `data:${mimeType};base64,${base64Image}`;
    
    const student = await Student.findById(req.params.id);
    if (!student || student.instituteId.toString() !== req.admin!.instituteId) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      { profilePictureUrl },
      { new: true }
    );

    res.status(200).json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
