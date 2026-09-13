import { Router } from 'express';
import { getStudentAnalytics, getDashboardStats } from '../controllers/analyticsController';
import { adminAuth } from '../middleware/adminAuth';
import { tenantAuth } from '../middleware/tenantAuth';

const router = Router();

router.get('/dashboard', adminAuth as any, getDashboardStats);
router.get('/student/:studentId', tenantAuth as any, getStudentAnalytics);

export default router;
