import { Request, Response, NextFunction } from 'express';
import * as jsonwebtoken from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_me_in_prod';

// Extend Express Request to carry admin info
export interface AdminRequest extends Request {
  admin?: {
    id: string;
    instituteId: string;
  };
}

/**
 * Middleware that verifies the admin JWT from the Authorization header
 * and injects req.admin = { id, instituteId } into the request.
 */
export const adminAuth = (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No admin token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jsonwebtoken.verify(token, JWT_SECRET) as {
      id: string;
      instituteId: string;
      role: string;
    };

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Not an admin token' });
    }

    req.admin = {
      id: decoded.id,
      instituteId: decoded.instituteId
    };

    next();
  } catch (error: any) {
    return res.status(401).json({ message: 'Invalid or expired admin token' });
  }
};
