import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getStudents, getStudentById, updateStudentSettings, uploadProfilePicture } from '../controllers/studentController';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', getStudents);
router.get('/:id', getStudentById);
router.put('/:id/settings', updateStudentSettings);
router.put('/:id/profile-picture', upload.single('profilePic'), uploadProfilePicture);

export default router;
