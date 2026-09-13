import { Router } from 'express';
import { createTemplate, getTemplates, getTemplateById } from '../controllers/templateController';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

router.get('/', adminAuth as any, getTemplates);
router.get('/:id', adminAuth as any, getTemplateById);
router.post('/', adminAuth as any, createTemplate);

export default router;
