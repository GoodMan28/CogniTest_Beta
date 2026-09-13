import { Request, Response, NextFunction } from 'express';
import * as jsonwebtoken from 'jsonwebtoken';
import { Student } from '../models/Student';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_me_in_prod';

// Extend Express Request to carry tenant info (either admin or student)
export interface TenantRequest extends Request {
  tenant?: {
    instituteId: string;
    role: 'admin' | 'student';
    userId: string;
  };
  admin?: {
    id: string;
    instituteId: string;
  };
}

/**
 * Middleware that verifies the JWT from the Authorization header.
 * It accepts BOTH admin and student tokens.
 * Injects req.tenant = { instituteId, role, userId } into the request.
 * Also preserves req.admin for backwards compatibility if role is admin.
 */
export const tenantAuth = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jsonwebtoken.verify(token, JWT_SECRET) as any;

    if (decoded.role === 'admin') {
      req.tenant = {
        instituteId: decoded.instituteId,
        role: 'admin',
        userId: decoded.id
      };
      req.admin = {
        id: decoded.id,
        instituteId: decoded.instituteId
      };
      return next();
    } 
    
    if (decoded.role === 'student') {
      const student = await Student.findById(decoded.id).select('instituteId');
      if (!student) {
        return res.status(401).json({ message: 'Student not found' });
      }
      req.tenant = {
        instituteId: student.instituteId.toString(),
        role: 'student',
        userId: decoded.id
      };
      // We also patch req.admin.instituteId so that the existing controllers don't crash
      // Since they all read req.admin!.instituteId for filtering.
      // We don't set req.admin.id so we don't accidentally treat them as an admin elsewhere.
      req.admin = {
        id: 'student_dummy_id',
        instituteId: student.instituteId.toString()
      };
      return next();
    }

    return res.status(403).json({ message: 'Invalid role in token' });
  } catch (error: any) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
