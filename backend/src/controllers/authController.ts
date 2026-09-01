import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as jsonwebtoken from 'jsonwebtoken';
import { Student } from '../models/Student';
import { Institute } from '../models/Institute';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_me_in_prod';

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, enrollmentNo, batch, email, password } = req.body;
    
    if (!name || !enrollmentNo || !batch || !password) {
      return res.status(400).json({ message: 'Name, enrollmentNo, batch, and password are required' });
    }

    const existingStudent = await Student.findOne({ enrollmentNo });
    if (existingStudent) {
      return res.status(400).json({ message: 'Student with this enrollment number already exists' });
    }

    const institute = await Institute.findOne();
    if (!institute) {
      return res.status(500).json({ message: 'Institute not configured. Cannot create student.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const student = new Student({
      instituteId: institute._id,
      name,
      enrollmentNo,
      batch,
      email,
      password: hashedPassword
    });

    await student.save();

    const token = jsonwebtoken.sign({ id: student._id, role: 'student' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      student: {
        _id: student._id,
        name: student.name,
        enrollmentNo: student.enrollmentNo,
        batch: student.batch,
        email: student.email,
        profilePictureUrl: student.profilePictureUrl
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { enrollmentNo, password } = req.body;

    const cleanEnrollmentNo = enrollmentNo.trim();

    if (!cleanEnrollmentNo || !password) {
      return res.status(400).json({ message: 'Enrollment number and password are required' });
    }

    const student = await Student.findOne({ 
      enrollmentNo: { $regex: new RegExp(`^${cleanEnrollmentNo}$`, 'i') } 
    });
    
    if (!student || !student.password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jsonwebtoken.sign({ id: student._id, role: 'student' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      token,
      student: {
        _id: student._id,
        name: student.name,
        enrollmentNo: student.enrollmentNo,
        batch: student.batch,
        email: student.email,
        profilePictureUrl: student.profilePictureUrl
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jsonwebtoken.verify(token, JWT_SECRET) as any;

    if (decoded.role !== 'student') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const student = await Student.findById(decoded.id).select('-password');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json(student);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};
