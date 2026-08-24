import { Request, Response } from 'express';
import { PhysicsQuestion, ChemistryQuestion, BiologyQuestion, getQuestionModel } from '../models/Question';
import { EvaluationReport } from '../models/EvaluationReport';

import { Pinecone } from '@pinecone-database/pinecone';

export const generateCustomTest = async (req: Request, res: Response) => {
  try {
    const { studentId, mode, filters } = req.body;

    if (mode === 'dynamic') {
      const reports = await EvaluationReport.find({ studentId }).sort({ createdAt: -1 }).limit(5);
      const failedQuestionIds = reports.flatMap(r => r.performance.incorrect);
      
      let questions: any[] = [];

      if (failedQuestionIds.length > 0) {
        const targetId = failedQuestionIds[0].toString();
        // Find the actual failed question in MongoDB to get its metadata
        let failedQ = await PhysicsQuestion.findById(targetId) || 
                      await ChemistryQuestion.findById(targetId) || 
                      await BiologyQuestion.findById(targetId);

        if (failedQ) {
          try {
            const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
            const indexName = process.env.PINECONE_INDEX || 'cognitest-embeddings';
            const index = pc.Index(indexName);

            // Query Pinecone for 5 similar questions using metadata filters!
            const queryResponse = await index.query({
              id: targetId,
              topK: 6, // Ask for 6 in case it returns itself
              includeMetadata: false,
              filter: {
                subject: failedQ.subject,
                chapter: failedQ.chapter
              }
            });

            // Filter out the failed question itself, take top 5
            const similarIds = queryResponse.matches
                .map(m => m.id)
                .filter(id => id !== targetId)
                .slice(0, 5);

            const QuestionModel = getQuestionModel(failedQ.subject);
            const similarQs = await QuestionModel.find({ _id: { $in: similarIds } });
            questions.push(...similarQs);

            // Fill the remaining questions (to make a perfect 10) randomly from the exact same chapter!
            const remainingCount = 10 - similarQs.length;
            if (remainingCount > 0) {
              const randomQs = await QuestionModel.aggregate([
                { $match: { 
                    subject: failedQ.subject, 
                    chapter: failedQ.chapter, 
                    _id: { $nin: [...similarQs.map(q => q._id), failedQ._id] } 
                }},
                { $sample: { size: remainingCount } }
              ]);
              questions.push(...randomQs);
            }
          } catch (pcError) {
            console.error("Pinecone query failed, falling back:", pcError);
          }
        }
      }

      // Fallback if no failures, or if Pinecone failed completely
      if (questions.length < 10) {
        const fallbackPhysics = await PhysicsQuestion.aggregate([{ $sample: { size: 4 } }]);
        const fallbackChemistry = await ChemistryQuestion.aggregate([{ $sample: { size: 3 } }]);
        const fallbackBiology = await BiologyQuestion.aggregate([{ $sample: { size: 3 } }]);
        questions = [...fallbackPhysics, ...fallbackChemistry, ...fallbackBiology];
      }
      
      return res.status(200).json(questions.slice(0, 10));
    } else if (mode === 'static') {
      const matchFilters: any = {};
      if (filters?.subject) matchFilters.subject = filters.subject;
      if (filters?.unit) matchFilters.unit = filters.unit;
      if (filters?.chapter) matchFilters.chapter = filters.chapter;

      let questions: any[] = [];
      
      if (filters?.subject) {
        // Query specific collection
        try {
          const QuestionModel = getQuestionModel(filters.subject);
          questions = await QuestionModel.aggregate([
            { $match: matchFilters },
            { $sample: { size: 10 } }
          ]);
        } catch (e) {
          return res.status(400).json({ message: 'Invalid subject filter' });
        }
      } else {
        // Query all collections
        const physics = await PhysicsQuestion.aggregate([{ $match: matchFilters }, { $sample: { size: 4 } }]);
        const chemistry = await ChemistryQuestion.aggregate([{ $match: matchFilters }, { $sample: { size: 3 } }]);
        const biology = await BiologyQuestion.aggregate([{ $match: matchFilters }, { $sample: { size: 3 } }]);
        questions = [...physics, ...chemistry, ...biology];
      }
      
      return res.status(200).json(questions);
    } else {
      return res.status(400).json({ message: 'Invalid mode. Must be "dynamic" or "static".' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
