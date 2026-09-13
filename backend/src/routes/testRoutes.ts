import { Router } from 'express';
import { createTest, getTests, getTestById } from '../controllers/testController';
import { adminAuth } from '../middleware/adminAuth';
import { tenantAuth } from '../middleware/tenantAuth';

const router = Router();

router.get('/', tenantAuth as any, getTests);
router.get('/:id', tenantAuth as any, getTestById);
router.post('/', adminAuth as any, createTest);

export default router;
