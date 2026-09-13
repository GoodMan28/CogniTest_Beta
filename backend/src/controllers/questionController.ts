import { Response } from 'express';
import { PhysicsQuestion, ChemistryQuestion, BiologyQuestion, MathematicsQuestion, getQuestionModel } from '../models/Question';
import { physicsTaxonomy, chemistryTaxonomy, biologyTaxonomy } from '../utils/taxonomy';
import { AdminRequest } from '../middleware/adminAuth';

const getTaxonomy = (subject: string) => {
  if (subject === 'Physics') return physicsTaxonomy;
  if (subject === 'Chemistry') return chemistryTaxonomy;
  return biologyTaxonomy;
};

/**
 * GET /api/v1/questions
 * 
 * Server-side paginated question bank endpoint.
 * Scoped to admin's institute.
 */
export const getQuestions = async (req: AdminRequest, res: Response) => {
  try {
    const instituteId = req.admin!.instituteId;
    const subject = (req.query.subject as string) || 'Physics';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string) || '';
    const unit = (req.query.unit as string) || '';
    const chapter = (req.query.chapter as string) || '';
    const topic = (req.query.topic as string) || '';
    const skip = (page - 1) * limit;

    const Model = getQuestionModel(subject);

    // Build filter — always scoped to this institute
    const filter: any = { instituteId };
    if (search) {
      filter.questionText = { $regex: search, $options: 'i' };
    }
    if (unit) {
      filter.unit = unit;
    }
    if (chapter) {
      filter.chapter = chapter;
    }
    if (topic) {
      filter.topic = topic;
    }

    const [questions, total] = await Promise.all([
      Model.find(filter)
        .select('subject unit chapter topic questionIntent questionText options correctOption solutionText diagramSvg smilesNotation optionsMedia createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Model.countDocuments(filter)
    ]);

    res.status(200).json({
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/v1/questions/stats
 * 
 * Returns counts and chapter breakdowns for admin's institute only.
 */
export const getQuestionStats = async (req: AdminRequest, res: Response) => {
  try {
    const instituteId = req.admin!.instituteId;
    const instFilter = { instituteId };

    const [physicsCount, chemistryCount, biologyCount] = await Promise.all([
      PhysicsQuestion.countDocuments(instFilter),
      ChemistryQuestion.countDocuments(instFilter),
      BiologyQuestion.countDocuments(instFilter)
    ]);

    // Chapter breakdowns scoped to institute
    const [physicsChapters, chemistryChapters, biologyChapters] = await Promise.all([
      PhysicsQuestion.aggregate([
        { $match: instFilter },
        { $unwind: '$chapter' },
        { $group: { _id: '$chapter', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      ChemistryQuestion.aggregate([
        { $match: instFilter },
        { $unwind: '$chapter' },
        { $group: { _id: '$chapter', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      BiologyQuestion.aggregate([
        { $match: instFilter },
        { $unwind: '$chapter' },
        { $group: { _id: '$chapter', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.status(200).json({
      counts: {
        Physics: physicsCount,
        Chemistry: chemistryCount,
        Biology: biologyCount,
        total: physicsCount + chemistryCount + biologyCount
      },
      chapters: {
        Physics: physicsChapters.map(c => ({ chapter: c._id || 'Uncategorized', count: c.count })),
        Chemistry: chemistryChapters.map(c => ({ chapter: c._id || 'Uncategorized', count: c.count })),
        Biology: biologyChapters.map(c => ({ chapter: c._id || 'Uncategorized', count: c.count }))
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/v1/questions/units — scoped to admin's institute
 */
export const getUnits = async (req: AdminRequest, res: Response) => {
  try {
    const instituteId = req.admin!.instituteId;
    const subject = (req.query.subject as string) || 'Physics';
    const Model = getQuestionModel(subject);
    const units = await Model.distinct('unit', { instituteId });
    res.status(200).json(units.filter(Boolean).sort());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/v1/questions/chapters — scoped to admin's institute
 */
export const getChapters = async (req: AdminRequest, res: Response) => {
  try {
    const instituteId = req.admin!.instituteId;
    const subject = (req.query.subject as string) || 'Physics';
    const unit = req.query.unit as string;
    const Model = getQuestionModel(subject);
    
    const filter: any = { instituteId };
    if (unit) filter.unit = unit;
    let chapters = await Model.distinct('chapter', filter);
    chapters = chapters.filter(Boolean);

    // Strictly enforce taxonomy filtering if a unit is provided
    if (unit) {
      const taxonomy = getTaxonomy(subject);
      const allowedChapters = taxonomy[unit] || [];
      chapters = chapters.filter(c => allowedChapters.includes(c));
    }
    
    res.status(200).json(chapters.sort());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/v1/questions/topics — scoped to admin's institute
 */
export const getTopics = async (req: AdminRequest, res: Response) => {
  try {
    const instituteId = req.admin!.instituteId;
    const subject = (req.query.subject as string) || 'Physics';
    const chapter = req.query.chapter as string;
    
    if (!chapter) {
      return res.status(400).json({ message: 'Chapter is required to fetch topics' });
    }

    const Model = getQuestionModel(subject);
    const topics = await Model.distinct('topic', { instituteId, chapter });
    res.status(200).json(topics.filter(Boolean).sort());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
