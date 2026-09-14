import { Router } from 'express';
import { uploadBatchOMR, evaluateSheet, clearDemo } from '../controllers/evaluationController';
import { adminAuth } from '../middleware/adminAuth';
import multer from 'multer';

const router = Router();
import os from 'os';
const upload = multer({ dest: os.tmpdir() });

router.post('/upload-batch', adminAuth as any, upload.single('file'), uploadBatchOMR);
router.post('/evaluate-sheet', adminAuth as any, evaluateSheet);
router.post('/clear-demo', adminAuth as any, clearDemo);

export default router;
