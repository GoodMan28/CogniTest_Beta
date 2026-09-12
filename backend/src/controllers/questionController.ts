import { Request, Response } from 'express';
import { PhysicsQuestion, ChemistryQuestion, BiologyQuestion, getQuestionModel } from '../models/Question';
import { physicsTaxonomy, chemistryTaxonomy, biologyTaxonomy } from '../utils/taxonomy';

const getTaxonomy = (subject: string) => {
  if (subject === 'Physics') return physicsTaxonomy;
  if (subject === 'Chemistry') return chemistryTaxonomy;
  return biologyTaxonomy;
};

/**
 * GET /api/v1/questions
 * 
 * Server-side paginated question bank endpoint.
 * 
 * Query params:
 *   - subject:  'Physics' | 'Chemistry' | 'Biology' (required)
 *   - page:     page number (default 1)
 *   - limit:    items per page (default 20, max 50)
 *   - search:   text search on questionText (optional)
 *   - chapter:  filter by exact chapter name (optional)
 */
export const getQuestions = async (req: Request, res: Response) => {
  try {
    const subject = (req.query.subject as string) || 'Physics';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string) || '';
    const unit = (req.query.unit as string) || '';
    const chapter = (req.query.chapter as string) || '';
    const topic = (req.query.topic as string) || '';
    const skip = (page - 1) * limit;

    const Model = getQuestionModel(subject);

    // Build filter
    const filter: any = {};
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
 * Returns counts and chapter breakdowns for all three subjects.
 */
export const getQuestionStats = async (_req: Request, res: Response) => {
  try {
    const [physicsCount, chemistryCount, biologyCount] = await Promise.all([
      PhysicsQuestion.countDocuments(),
      ChemistryQuestion.countDocuments(),
      BiologyQuestion.countDocuments()
    ]);

    // Chapter breakdowns (unwind chapter arrays)
    const [physicsChapters, chemistryChapters, biologyChapters] = await Promise.all([
      PhysicsQuestion.aggregate([
        { $unwind: '$chapter' },
        { $group: { _id: '$chapter', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      ChemistryQuestion.aggregate([
        { $unwind: '$chapter' },
        { $group: { _id: '$chapter', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      BiologyQuestion.aggregate([
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
 * GET /api/v1/questions/units
 * 
 * Returns distinct units for a given subject.
 */
export const getUnits = async (req: Request, res: Response) => {
  try {
    const subject = (req.query.subject as string) || 'Physics';
    const Model = getQuestionModel(subject);
    const units = await Model.distinct('unit');
    res.status(200).json(units.filter(Boolean).sort());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/v1/questions/chapters
 * 
 * Returns distinct chapters for a given subject (and optionally unit).
 */
export const getChapters = async (req: Request, res: Response) => {
  try {
    const subject = (req.query.subject as string) || 'Physics';
    const unit = req.query.unit as string;
    const Model = getQuestionModel(subject);
    
    const filter = unit ? { unit } : {};
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
 * GET /api/v1/questions/topics
 * 
 * Returns distinct topics for a given subject and chapter.
 */
export const getTopics = async (req: Request, res: Response) => {
  try {
    const subject = (req.query.subject as string) || 'Physics';
    const chapter = req.query.chapter as string;
    
    if (!chapter) {
      return res.status(400).json({ message: 'Chapter is required to fetch topics' });
    }

    const Model = getQuestionModel(subject);
    const topics = await Model.distinct('topic', { chapter });
    res.status(200).json(topics.filter(Boolean).sort());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
