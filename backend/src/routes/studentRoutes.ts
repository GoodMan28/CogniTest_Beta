import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getStudents, getStudentById, updateStudentSettings, uploadProfilePicture } from '../controllers/studentController';
import { adminAuth } from '../middleware/adminAuth';
import { tenantAuth } from '../middleware/tenantAuth';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', adminAuth as any, getStudents);
router.get('/:id', tenantAuth as any, getStudentById);
router.put('/:id/settings', adminAuth as any, updateStudentSettings);
router.put('/:id/profile-picture', adminAuth as any, upload.single('profilePic'), uploadProfilePicture);

export default router;
