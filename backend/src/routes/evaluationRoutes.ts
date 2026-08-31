import { Router } from 'express';
import { uploadBatchOMR, evaluateJsonBatch, clearDemo } from '../controllers/evaluationController';
import multer from 'multer';

const router = Router();
import os from 'os';
const upload = multer({ dest: os.tmpdir() });

router.post('/upload-batch', upload.single('file'), uploadBatchOMR);
router.post('/evaluate-json', evaluateJsonBatch);
router.post('/clear-demo', clearDemo);

export default router;
