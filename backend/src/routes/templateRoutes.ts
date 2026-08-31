import { Router } from 'express';
import { createTemplate, getTemplates, getTemplateById } from '../controllers/templateController';

const router = Router();

router.get('/', getTemplates);
router.get('/:id', getTemplateById);
router.post('/', createTemplate);

export default router;
