import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getInstitute, updateInstituteSettings, updateBranding } from '../controllers/instituteController';
import { adminAuth } from '../middleware/adminAuth';
import { tenantAuth } from '../middleware/tenantAuth';

const router = Router();

// Configure Multer for logo uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', tenantAuth as any, getInstitute);
router.put('/settings', adminAuth as any, updateInstituteSettings);
router.put('/branding', adminAuth as any, upload.single('logoFile'), updateBranding);

export default router;
