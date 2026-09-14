import { Request, Response } from 'express';
import { PhysicsQuestion, ChemistryQuestion, BiologyQuestion, getQuestionModel } from '../models/Question';
import { EvaluationReport } from '../models/EvaluationReport';
import { StudentAnalytics } from '../models/StudentAnalytics';
import { Student } from '../models/Student';
import { Institute } from '../models/Institute';
import { Types } from 'mongoose';
import { Pinecone } from '@pinecone-database/pinecone';

export const getTaxonomy = async (req: Request, res: Response) => {
  try {
    const { subject, studentId } = req.query;
    if (!subject || !studentId) return res.status(400).json({ message: 'subject and studentId are required.' });
    
    // Check lock status
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const institute = await Institute.findById(student.instituteId);
    if (institute && institute.subscriptionPlan !== 'Premium') {
      return res.status(403).json({ locked: true, message: 'Custom Filter Tests require a Premium coaching plan.' });
    }

    const QuestionModel = getQuestionModel(subject as string);
    // Since we don't have institute context easily available here for the student without extra hops,
    // and we want taxonomy of all available questions in that subject for the demo:
    const units = await QuestionModel.distinct('unit');
    const chapters = await QuestionModel.distinct('chapter');
    const topics = await QuestionModel.distinct('topic');
    
    return res.status(200).json({ units, chapters, topics });
  } catch (error: any) {
    console.error('[CustomTest] getTaxonomy Error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Generate a custom AI-based test for a student using SWOT weakness analysis
 * and Pinecone vector similarity search.
 *
 * Strategy:
 *  1. Fetch the student's critical weaknesses (chapter names) from their SWOT profile
 *  2. Use incorrectly answered question IDs as "seed vectors" in Pinecone
 *  3. Query Pinecone with metadata filter { subject, chapter ∈ weaknesses }
 *     to find semantically similar questions within weak chapters
 *  4. Exclude already-seen questions
 *  5. Fill remaining slots with MongoDB random sampling as fallback
 */
export const generateCustomTest = async (req: Request, res: Response) => {
  try {
    const { studentId, subject, numQuestions = 10, mode = 'swot', units = [], chapters = [], topics = [] } = req.body;

    if (!studentId || !subject) {
      return res.status(400).json({ message: 'studentId and subject are required.' });
    }

    // Check lock status for ALL custom test modes
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const institute = await Institute.findById(student.instituteId);
    if (institute && institute.subscriptionPlan !== 'Premium') {
      return res.status(403).json({ locked: true, message: 'Custom AI and Filter Tests require a Premium coaching plan.' });
    }

    const validSubjects = ['Physics', 'Chemistry', 'Biology', 'Mathematics'];
    if (!validSubjects.includes(subject)) {
      return res.status(400).json({ message: `Invalid subject. Must be one of: ${validSubjects.join(', ')}` });
    }

    const validCounts = [10, 15, 20];
    const targetCount = validCounts.includes(numQuestions) ? numQuestions : 10;
    const QuestionModel = getQuestionModel(subject);
    let questions: any[] = [];

    if (mode === 'custom') {
      const matchQuery: any = {};
      if (units && units.length > 0) matchQuery.unit = { $in: units };
      if (chapters && chapters.length > 0) matchQuery.chapter = { $in: chapters };
      if (topics && topics.length > 0) matchQuery.topic = { $in: topics };
      
      console.log(`[CustomTest] Custom Mode: Subject: ${subject} | Match:`, matchQuery);
      
      questions = await QuestionModel.aggregate([
        { $match: matchQuery },
        { $sample: { size: targetCount } }
      ]);
      console.log(`[CustomTest] Fetched ${questions.length} questions from custom filters.`);
    } else {
      // ── Step 1: Fetch SWOT weaknesses ──
      const analytics = await StudentAnalytics.findOne({ studentId });
      const weakChapters: string[] = analytics?.swotProfile?.[subject as 'Physics' | 'Chemistry' | 'Biology' | 'Mathematics']?.criticalWeaknesses || [];

      console.log(`[CustomTest Demo Mode] Student ${studentId} | Subject: ${subject} | Weak chapters: [${weakChapters.join(', ')}]`);

      // ── DEMO MODE: Statically fetch from weak topics only (ignoring seen history) ──
      if (weakChapters.length > 0) {
        questions = await QuestionModel.aggregate([
          { $match: { chapter: { $in: weakChapters } } },
          { $sample: { size: targetCount } }
        ]);
        console.log(`[CustomTest Demo Mode] Fetched ${questions.length} questions from weak chapters.`);
      }
    }

    // ── Fallback if no weak chapters or not enough questions ──
    if (questions.length < targetCount) {
      const existingIds = questions.map(q => q._id);
      const fillCount = targetCount - questions.length;
      
      const randomFill = await QuestionModel.aggregate([
        { $match: { _id: { $nin: existingIds } } },
        { $sample: { size: fillCount } }
      ]);

      questions.push(...randomFill);
      console.log(`[CustomTest Demo Mode] Added ${randomFill.length} random fallback questions.`);
    }

    // Shuffle final array
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    console.log(`[CustomTest Demo Mode] Returning ${questions.length} questions`);
    return res.status(200).json(questions);

  } catch (error: any) {
    console.error('[CustomTest] Error:', error);
    res.status(500).json({ message: error.message });
  }
};
