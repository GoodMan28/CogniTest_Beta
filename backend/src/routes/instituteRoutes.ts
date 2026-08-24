import { Router } from 'express';
import { getInstitute, updateInstituteSettings } from '../controllers/instituteController';

const router = Router();

router.get('/', getInstitute);
router.put('/settings', updateInstituteSettings);

export default router;
