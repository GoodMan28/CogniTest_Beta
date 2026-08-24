import { Router } from 'express';
import { uploadBatchOMR } from '../controllers/evaluationController';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload-batch', upload.single('file'), uploadBatchOMR);

export default router;
