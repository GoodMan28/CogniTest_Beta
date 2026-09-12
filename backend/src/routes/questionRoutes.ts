import { Router } from 'express';
import { getQuestions, getQuestionStats, getUnits, getChapters, getTopics } from '../controllers/questionController';

const router = Router();

router.get('/', getQuestions);
router.get('/stats', getQuestionStats);
router.get('/units', getUnits);
router.get('/chapters', getChapters);
router.get('/topics', getTopics);

export default router;
