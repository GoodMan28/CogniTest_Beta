import { Schema, model, Document, Types } from 'mongoose';

export interface IQuestion extends Document {
  instituteId: Types.ObjectId;
  subject: string;
  chapter: string;
  topic: string[];
  questionIntent: string;
  questionText: string;
  options: string[];
  correctOption: string;
  solutionText: string;
  isEmbedded: boolean;
  // Rich media fields for diagrams and molecular structures
  imageUrl?: string;          // General image URL for the question if hosted externally
  diagramSvg?: string;        // SVG XML string for question-level diagrams (physics circuits, graphs, etc.)
  smilesNotation?: string;    // SMILES string for chemistry molecular structures in the question body
  optionsMedia?: Array<{      // Visual content for individual options (parallel to options[])
    type: 'svg' | 'smiles';   // Discriminator: 'svg' for inline SVG, 'smiles' for molecular notation
    content: string;           // The actual SVG XML or SMILES string
  } | null>;
}

const OptionMediaSchema = new Schema({
  type: { type: String, enum: ['svg', 'smiles'], required: true },
  content: { type: String, required: true }
}, { _id: false });

const QuestionSchema = new Schema<IQuestion>({
  instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
  subject: { type: String, required: true },
  chapter: { type: String, required: true },
  topic: [{ type: String }],
  questionIntent: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{ type: String }],
  correctOption: { type: String, required: true },
  solutionText: { type: String, required: true },
  isEmbedded: { type: Boolean, default: false },
  // Rich media (all optional — text-only questions work as before)
  imageUrl: { type: String },
  diagramSvg: { type: String },
  smilesNotation: { type: String },
  optionsMedia: [{ type: OptionMediaSchema }]
}, { timestamps: true });

QuestionSchema.index({ instituteId: 1, subject: 1, chapter: 1 });

export const PhysicsQuestion = model<IQuestion>('PhysicsQuestion', QuestionSchema, 'physics_questions');
export const ChemistryQuestion = model<IQuestion>('ChemistryQuestion', QuestionSchema, 'chemistry_questions');
export const BiologyQuestion = model<IQuestion>('BiologyQuestion', QuestionSchema, 'biology_questions');

export const getQuestionModel = (subject: string) => {
  const normalized = subject.toLowerCase().trim();
  if (normalized === 'physics') return PhysicsQuestion;
  if (normalized === 'chemistry') return ChemistryQuestion;
  if (normalized === 'biology') return BiologyQuestion;
  throw new Error(`Invalid subject: ${subject}`);
};
