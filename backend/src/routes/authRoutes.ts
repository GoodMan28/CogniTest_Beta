import { Router } from 'express';
import { signup, login, getMe, adminLogin, adminGetMe, changeStudentPassword, changeAdminPassword } from '../controllers/authController';

const router = Router();

// Student auth
router.post('/student/signup', signup);
router.post('/student/login', login);
router.get('/student/me', getMe);
router.put('/student/:studentId/change-password', changeStudentPassword);

// Admin auth
router.post('/admin/login', adminLogin);
router.get('/admin/me', adminGetMe);
router.put('/admin/:adminId/change-password', changeAdminPassword);

export default router;

