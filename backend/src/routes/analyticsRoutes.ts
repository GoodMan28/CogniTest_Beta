import { Router } from 'express';
import { getStudentAnalytics, getDashboardStats } from '../controllers/analyticsController';

const router = Router();

router.get('/dashboard', getDashboardStats);
router.get('/student/:studentId', getStudentAnalytics);

export default router;
