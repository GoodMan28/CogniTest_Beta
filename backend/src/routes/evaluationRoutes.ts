import { Router } from 'express';
import { uploadBatchOMR, evaluateJsonBatch, clearDemo } from '../controllers/evaluationController';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload-batch', upload.single('file'), uploadBatchOMR);
router.post('/evaluate-json', evaluateJsonBatch);
router.post('/clear-demo', clearDemo);

export default router;
