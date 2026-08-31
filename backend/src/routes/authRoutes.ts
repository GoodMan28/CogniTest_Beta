import { Router } from 'express';
import { signup, login, getMe } from '../controllers/authController';

const router = Router();

router.post('/student/signup', signup);
router.post('/student/login', login);
router.get('/student/me', getMe);

export default router;
