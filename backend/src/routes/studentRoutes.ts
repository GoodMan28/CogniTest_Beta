import { Router } from 'express';
import { getStudents, getStudentById, updateStudentSettings } from '../controllers/studentController';

const router = Router();

router.get('/', getStudents);
router.get('/:id', getStudentById);
router.put('/:id/settings', updateStudentSettings);

export default router;
