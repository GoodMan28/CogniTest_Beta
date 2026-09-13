import { Router } from 'express';
import { getQuestions, getQuestionStats, getUnits, getChapters, getTopics } from '../controllers/questionController';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

router.get('/', adminAuth as any, getQuestions);
router.get('/stats', adminAuth as any, getQuestionStats);
router.get('/units', adminAuth as any, getUnits);
router.get('/chapters', adminAuth as any, getChapters);
router.get('/topics', adminAuth as any, getTopics);

export default router;
