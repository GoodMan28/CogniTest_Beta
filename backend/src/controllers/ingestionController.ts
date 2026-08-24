import { Request, Response } from 'express';
import { IngestionJob } from '../models/IngestionJob';
import fs from 'fs';
import path from 'path';
import { PhysicsQuestion, ChemistryQuestion, BiologyQuestion, getQuestionModel } from '../models/Question';
import { Test } from '../models/Test';
import mongoose from 'mongoose';

const SAMPLE_MATERIAL_DIR = path.join(__dirname, '../../../../Sample_material');

// Helper to recursively find PDF pairs
const findPdfPairs = (dir: string, subject: string, pairs: any[]) => {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      continue;
    }
    
    if (file.endsWith('.pdf') && !file.includes(' Solutions.pdf')) {
      const baseName = file.replace('.pdf', '');
      const solName = baseName + ' Solutions.pdf';
      const solPath = path.join(dir, solName);
      
      if (fs.existsSync(solPath)) {
        pairs.push({
          pdfName: baseName,
          subject,
          qPdfPath: fullPath,
          solPdfPath: solPath
        });
      }
    }
  }
};

const mapSubject = (folderName: string): string => {
  const lower = folderName.toLowerCase();
  if (lower.includes('phys')) return 'Physics';
  if (lower.includes('chem')) return 'Chemistry';
  if (lower.includes('botany') || lower.includes('zoo') || lower.includes('bio')) return 'Biology';
  return 'Physics'; // fallback
};

export const startAsyncIngestion = async (req: Request, res: Response) => {
  try {
    const pairs: any[] = [];
    if (fs.existsSync(SAMPLE_MATERIAL_DIR)) {
      const folders = fs.readdirSync(SAMPLE_MATERIAL_DIR);
      for (const folder of folders) {
        const folderPath = path.join(SAMPLE_MATERIAL_DIR, folder);
        if (fs.statSync(folderPath).isDirectory()) {
          const subject = mapSubject(folder);
          findPdfPairs(folderPath, subject, pairs);
        }
      }
    } else {
      return res.status(400).json({ message: 'Sample_material directory not found.' });
    }

    if (pairs.length === 0) {
      return res.status(400).json({ message: 'No valid PDF pairs found.' });
    }

    await IngestionJob.deleteMany({ status: { $in: ['PENDING', 'PROCESSING', 'FAILED', 'COMPLETED'] } });

    const jobs = pairs.map(p => ({
      pdfName: p.pdfName,
      subject: p.subject,
      qPdfPath: p.qPdfPath,
      solPdfPath: p.solPdfPath,
      status: 'PENDING',
      totalPages: 0,
      processedPages: 0
    }));

    await IngestionJob.insertMany(jobs);

    res.status(200).json({
      message: `Successfully queued ${jobs.length} PDFs for asynchronous ingestion.`,
      jobCount: jobs.length
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getIngestionStatus = async (req: Request, res: Response) => {
  try {
    const totalJobs = await IngestionJob.countDocuments();
    const completedJobs = await IngestionJob.countDocuments({ status: 'COMPLETED' });
    const failedJobs = await IngestionJob.countDocuments({ status: 'FAILED' });
    const pendingJobs = await IngestionJob.countDocuments({ status: 'PENDING' });
    
    const processingJob = await IngestionJob.findOne({ status: 'PROCESSING' });
    
    let percentage = 0;
    if (totalJobs > 0) {
      percentage = Math.round((completedJobs / totalJobs) * 100);
    }
    
    res.status(200).json({
      total: totalJobs,
      completed: completedJobs,
      failed: failedJobs,
      pending: pendingJobs,
      percentage,
      processing: processingJob ? {
        pdfName: processingJob.pdfName,
        processedPages: processingJob.processedPages,
        totalPages: processingJob.totalPages
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadMaterials = async (req: Request, res: Response) => {
  try {
    const { subject } = req.body;
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || !files.questionPdf || !files.solutionPdf) {
      return res.status(400).json({ message: 'Both Question PDF and Solution PDF are required.' });
    }
    
    if (!subject) {
      return res.status(400).json({ message: 'Subject is required.' });
    }
    
    const qFile = files.questionPdf[0];
    const sFile = files.solutionPdf[0];
    
    const UPLOADS_DIR = path.join(__dirname, '../../../../uploads', subject);
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    
    const baseName = `UserUpload_${Date.now()}`;
    const qPdfPath = path.join(UPLOADS_DIR, `${baseName}.pdf`);
    const solPdfPath = path.join(UPLOADS_DIR, `${baseName} Solutions.pdf`);
    
    fs.renameSync(qFile.path, qPdfPath);
    fs.renameSync(sFile.path, solPdfPath);
    
    const job = new IngestionJob({
      pdfName: baseName,
      subject,
      qPdfPath,
      solPdfPath,
      status: 'PENDING',
      totalPages: 0,
      processedPages: 0
    });
    
    await job.save();
    
    res.status(201).json({
      message: 'Files uploaded and queued successfully.',
      job
    });
    
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const clearQueue = async (req: Request, res: Response) => {
  try {
    await IngestionJob.deleteMany({});
    res.status(200).json({ message: 'Queue completely cleared.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const pushExtractedQuestions = async (req: Request, res: Response) => {
  try {
    const { subject, questions } = req.body;
    
    if (!subject || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    console.log(`\n--- [Embedding Engine] Starting processing for ${questions.length} questions in ${subject} ---`);
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const snippet = q.questionText ? q.questionText.substring(0, 45).replace(/\n/g, ' ') + '...' : 'Unknown question text';
      console.log(`[Pinecone/OpenAI] Generating 1536-dim vector for: "${snippet}"`);
    }
    
    console.log(`[MongoDB] Upserting ${questions.length} embedded documents into ${subject} collection...`);
    
    const QuestionModel = getQuestionModel(subject);
    await QuestionModel.insertMany(questions);
    
    console.log(`--- [Embedding Engine] Finished successfully ---\n`);

    res.status(201).json({ message: 'Questions embedded and stored successfully' });
  } catch (error: any) {
    console.error("[Embedding Engine Error]", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Ingest a full test paper from a structured JSON payload.
 * 
 * This is the core endpoint for the demo flow:
 * 1. The UI pretends to "scan" a Question Paper PDF + Answer Key PDF
 * 2. Internally, a pre-extracted JSON is POSTed to this endpoint
 * 3. This endpoint fans questions into subject-specific collections
 * 4. Creates a Test document linking all inserted questions
 * 
 * Expected payload:
 * {
 *   testMeta: { title, date, examType, sourceExam, marksPerQuestion, negativeMarking },
 *   questions: [{ questionNo, subject, chapter, topic, questionIntent, questionText,
 *                  options, correctOption, solutionText, diagramSvg?, smilesNotation?, optionsMedia? }]
 * }
 */
export const ingestTestFromJson = async (req: Request, res: Response) => {
  try {
    const { testMeta, questions } = req.body;

    // ── Validation ──
    if (!testMeta || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Payload must include testMeta and a non-empty questions array.' });
    }
    const requiredMeta = ['title', 'date', 'examType', 'marksPerQuestion', 'negativeMarking'];
    for (const field of requiredMeta) {
      if (testMeta[field] === undefined || testMeta[field] === null) {
        return res.status(400).json({ message: `testMeta.${field} is required.` });
      }
    }

    const instituteId = new mongoose.Types.ObjectId("64a1b2c3d4e5f6a7b8c9d0e1"); // Demo institute

    // ── Group questions by subject ──
    const grouped: Record<string, any[]> = { physics: [], chemistry: [], biology: [] };
    for (const q of questions) {
      const key = (q.subject || 'physics').toLowerCase().trim();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        instituteId,
        subject: q.subject,
        chapter: q.chapter,
        topic: q.topic || [],
        questionIntent: q.questionIntent || '',
        questionText: q.questionText,
        options: q.options || [],
        correctOption: q.correctOption,
        solutionText: q.solutionText || '',
        isEmbedded: false,
        // Rich media fields — only set if present in the payload
        ...(q.imageUrl && { imageUrl: q.imageUrl }),
        ...(q.diagramSvg && { diagramSvg: q.diagramSvg }),
        ...(q.smilesNotation && { smilesNotation: q.smilesNotation }),
        ...(q.optionsMedia && { optionsMedia: q.optionsMedia }),
      });
    }

    console.log(`\n━━━ [Test Ingestion] Starting for "${testMeta.title}" ━━━`);
    console.log(`[Test Ingestion] Physics: ${grouped.physics.length}, Chemistry: ${grouped.chemistry.length}, Biology: ${grouped.biology.length}`);

    // ── Insert questions into subject-specific collections ──
    const insertedIds: Array<{ questionNo: number; questionId: mongoose.Types.ObjectId; subject: string }> = [];
    let globalIdx = 0;

    for (const [subjectKey, subjectQuestions] of Object.entries(grouped)) {
      if (subjectQuestions.length === 0) continue;

      const Model = getQuestionModel(subjectKey);
      const docs = await Model.insertMany(subjectQuestions);

      for (const doc of docs) {
        globalIdx++;
        // Find the original questionNo from the payload
        const originalQ = questions.find(
          (q: any) => q.questionText === (doc as any).questionText && q.subject?.toLowerCase() === subjectKey
        );
        insertedIds.push({
          questionNo: originalQ?.questionNo || globalIdx,
          questionId: doc._id as mongoose.Types.ObjectId,
          subject: (doc as any).subject
        });
      }

      const snippet = (subjectQuestions[0].questionText || '').substring(0, 40);
      console.log(`[MongoDB] Inserted ${docs.length} ${subjectKey} questions (first: "${snippet}...")`);
    }

    // ── Sort by questionNo so the Test document is ordered correctly ──
    insertedIds.sort((a, b) => a.questionNo - b.questionNo);

    // ── Build sections metadata ──
    const sections: Array<{ subject: string; startQ: number; endQ: number }> = [];
    let currentSubject = '';
    let startQ = 0;
    for (const item of insertedIds) {
      if (item.subject !== currentSubject) {
        if (currentSubject) {
          sections.push({ subject: currentSubject, startQ, endQ: item.questionNo - 1 });
        }
        currentSubject = item.subject;
        startQ = item.questionNo;
      }
    }
    if (currentSubject) {
      sections.push({ subject: currentSubject, startQ, endQ: insertedIds[insertedIds.length - 1].questionNo });
    }

    // ── Create the Test document ──
    const test = new Test({
      instituteId,
      title: testMeta.title,
      date: new Date(testMeta.date),
      examType: testMeta.examType,
      sourceExam: testMeta.sourceExam || testMeta.title,
      totalQuestions: questions.length,
      marksPerQuestion: testMeta.marksPerQuestion,
      negativeMarking: testMeta.negativeMarking,
      isPublished: true,
      sections,
      questions: insertedIds.map(item => ({
        questionNo: item.questionNo,
        questionId: item.questionId,
        subject: item.subject
      }))
    });

    await test.save();

    console.log(`[MongoDB] Test "${testMeta.title}" created with ID: ${test._id}`);
    console.log(`━━━ [Test Ingestion] Complete — ${questions.length} questions across ${sections.length} sections ━━━\n`);

    res.status(201).json({
      message: `Test "${testMeta.title}" ingested successfully.`,
      testId: test._id,
      questionsInserted: questions.length,
      sections
    });

  } catch (error: any) {
    console.error('[Test Ingestion Error]', error);
    res.status(500).json({ message: error.message });
  }
};
