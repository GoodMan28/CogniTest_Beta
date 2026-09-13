import { Router } from 'express';
import { signup, login, getMe, adminLogin, adminGetMe } from '../controllers/authController';

const router = Router();

// Student auth
router.post('/student/signup', signup);
router.post('/student/login', login);
router.get('/student/me', getMe);

// Admin auth
router.post('/admin/login', adminLogin);
router.get('/admin/me', adminGetMe);

export default router;
