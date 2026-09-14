import { Router } from 'express';
import { generateCustomTest, getTaxonomy } from '../controllers/customTestController';

const router = Router();

router.get('/taxonomy', getTaxonomy as any);
router.post('/generate', generateCustomTest as any);

export default router;
