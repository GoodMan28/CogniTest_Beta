import { Router } from 'express';
import { generateCustomTest } from '../controllers/customTestController';

const router = Router();

router.post('/generate', generateCustomTest);

export default router;
