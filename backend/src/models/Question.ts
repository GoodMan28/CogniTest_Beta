import { Schema, model, Document, Types } from 'mongoose';

export interface IQuestion extends Document {
  instituteId: Types.ObjectId;
  subject: string;
  unit: string;
  chapter: string[];
  topic: string[];
  questionType: 'multiple_choice' | 'numerical';
  difficulty?: 'easy' | 'medium' | 'hard';
  questionIntent: string;
  questionText: string;
  options?: string[];
  correctOption?: string;
  numericalAnswer?: number;
  solutionText?: string;
  isEmbedded: boolean;
  questionNo?: number;         // 1..75 position in the source paper — used for report joins
  sourceTest?: string;         // e.g. 'PINNACLE-27' | 'PINNACLE-28'
  section?: 'A' | 'B';
  markdownBody?: string;       // canonical raw markdown stem
  optionsMarkdown?: string[];  // canonical raw markdown options
  // Rich media fields for diagrams and molecular structures
  imageUrl?: string;          // General image URL for the question if hosted externally
  diagramSvg?: string;        // SVG XML string for question-level diagrams (physics circuits, graphs, etc.)
  smilesNotation?: string;    // SMILES string for chemistry molecular structures in the question body
  optionsMedia?: Array<{      // Visual content for individual options (parallel to options[])
    type: 'svg' | 'smiles';   // Discriminator: 'svg' for inline SVG, 'smiles' for molecular notation
    content: string;           // The actual SVG XML or SMILES string
  } | null>;
  analysisDemo?: {
    managed?: boolean;
    sourceKey?: string;
    contentHash?: string;
  };
}

const OptionMediaSchema = new Schema({
  type: { type: String, enum: ['svg', 'smiles'], required: true },
  content: { type: String, required: true }
}, { _id: false });

const QuestionSchema = new Schema<IQuestion>({
  instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
  subject: { type: String, required: true },
  unit: { type: String, index: true },
  chapter: { type: [String], index: true },
  topic: { type: [String] },
  questionType: { type: String, enum: ['multiple_choice', 'numerical'], default: 'multiple_choice' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
  questionIntent: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{ type: String }],
  correctOption: { type: String },
  numericalAnswer: { type: Number },
  solutionText: { type: String, required: false, default: '' },
  isEmbedded: { type: Boolean, default: false },
  questionNo: { type: Number },
  sourceTest: { type: String, index: true },
  section: { type: String, enum: ['A', 'B'] },
  markdownBody: { type: String },
  optionsMarkdown: [{ type: String }],
  // Rich media (all optional — text-only questions work as before)
  imageUrl: { type: String },
  diagramSvg: { type: String },
  smilesNotation: { type: String },
  optionsMedia: [{ type: OptionMediaSchema }],
  analysisDemo: {
    managed: { type: Boolean },
    sourceKey: { type: String },
    contentHash: { type: String }
  }
}, { timestamps: true });

QuestionSchema.index({ instituteId: 1, subject: 1 });
QuestionSchema.index({ instituteId: 1, sourceTest: 1, questionNo: 1 });

export const PhysicsQuestion = model<IQuestion>('PhysicsQuestion', QuestionSchema, 'physics_questions');
export const ChemistryQuestion = model<IQuestion>('ChemistryQuestion', QuestionSchema, 'chemistry_questions');
export const BiologyQuestion = model<IQuestion>('BiologyQuestion', QuestionSchema, 'biology_questions');
export const MathematicsQuestion = model<IQuestion>('MathematicsQuestion', QuestionSchema, 'mathematics_questions');

export const ALL_QUESTION_MODELS = [
  { model: PhysicsQuestion, subject: 'Physics' },
  { model: ChemistryQuestion, subject: 'Chemistry' },
  { model: BiologyQuestion, subject: 'Biology' },
  { model: MathematicsQuestion, subject: 'Mathematics' },
] as const;

export const getQuestionModel = (subject: string) => {
  const normalized = subject.toLowerCase().trim();
  if (normalized === 'physics') return PhysicsQuestion;
  if (normalized === 'chemistry') return ChemistryQuestion;
  if (normalized === 'biology') return BiologyQuestion;
  if (normalized === 'mathematics' || normalized === 'maths' || normalized === 'math') return MathematicsQuestion;
  throw new Error(`Invalid subject: ${subject}`);
};

/** Looks up a question by _id across all four subject collections. */
export const findQuestionByIdAnySubject = async (id: any) => {
  for (const { model: QuestionModel } of ALL_QUESTION_MODELS) {
    const doc = await QuestionModel.findById(id);
    if (doc) return doc;
  }
  return null;
};
