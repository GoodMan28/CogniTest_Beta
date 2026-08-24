import { Request, Response } from 'express';
import { PhysicsQuestion, ChemistryQuestion, BiologyQuestion, getQuestionModel } from '../models/Question';

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
    const chapter = (req.query.chapter as string) || '';
    const topic = (req.query.topic as string) || '';
    const skip = (page - 1) * limit;

    const Model = getQuestionModel(subject);

    // Build filter
    const filter: any = {};
    if (search) {
      filter.questionText = { $regex: search, $options: 'i' };
    }
    if (chapter) {
      filter.chapter = chapter;
    }
    if (topic) {
      filter.topic = topic;
    }

    const [questions, total] = await Promise.all([
      Model.find(filter)
        .select('subject chapter topic questionIntent questionText options correctOption solutionText diagramSvg smilesNotation optionsMedia createdAt')
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

    // Chapter breakdowns
    const [physicsChapters, chemistryChapters, biologyChapters] = await Promise.all([
      PhysicsQuestion.aggregate([
        { $group: { _id: '$chapter', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      ChemistryQuestion.aggregate([
        { $group: { _id: '$chapter', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      BiologyQuestion.aggregate([
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
 * GET /api/v1/questions/chapters
 * 
 * Returns distinct chapters for a given subject. Used for filter dropdowns.
 */
export const getChapters = async (req: Request, res: Response) => {
  try {
    const subject = (req.query.subject as string) || 'Physics';
    const Model = getQuestionModel(subject);
    const chapters = await Model.distinct('chapter');
    res.status(200).json(chapters.filter(Boolean).sort());
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
