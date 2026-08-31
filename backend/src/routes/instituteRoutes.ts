import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getInstitute, updateInstituteSettings, updateBranding } from '../controllers/instituteController';

const router = Router();

// Configure Multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

router.get('/', getInstitute);
router.put('/settings', updateInstituteSettings);
router.put('/branding', upload.single('logoFile'), updateBranding);

export default router;
