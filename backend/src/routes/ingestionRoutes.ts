import express from 'express';
import multer from 'multer';
import os from 'os';
import { startAsyncIngestion, getIngestionStatus, uploadMaterials, clearQueue, pushExtractedQuestions, ingestTestFromJson } from '../controllers/ingestionController';

const router = express.Router();
const upload = multer({ dest: os.tmpdir() });

router.post('/start', startAsyncIngestion);
router.get('/status', getIngestionStatus);
router.delete('/clear', clearQueue);
router.post('/push', pushExtractedQuestions);
router.post('/ingest-test', ingestTestFromJson);
router.post('/upload', upload.fields([
  { name: 'questionPdf', maxCount: 1 },
  { name: 'solutionPdf', maxCount: 1 }
]), uploadMaterials);

export default router;
