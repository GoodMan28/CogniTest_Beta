import { Router } from 'express';
import { createTest, getTests, getTestById } from '../controllers/testController';

const router = Router();

router.get('/', getTests);
router.get('/:id', getTestById);
router.post('/', createTest);

export default router;
