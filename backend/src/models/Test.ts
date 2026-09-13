import { Schema, model, Document, Types } from 'mongoose';

export interface ITest extends Document {
  instituteId: Types.ObjectId;
  templateId?: Types.ObjectId; // Optional reference to the blueprint template
  title: string;
  date: Date;
  examType: string;
  sourceExam?: string;          // e.g. NEET BATCH 2027 MOCK TEST 1
  totalQuestions: number;
  marksPerQuestion: number;
  negativeMarking: number;
  isPublished: boolean;
  sections?: Array<{            // Subject-wise breakdown of question ranges
    subject: string;
    startQ: number;
    endQ: number;
  }>;
  questions: Array<{
    questionNo: number;
    questionId: Types.ObjectId;
    subject?: string;           // Denormalized for fast lookups without joins
    demoMarking?: {
      correctMarks: number;
      incorrectPenalty: number;
    };
    recommendations?: Array<{
      questionId: Types.ObjectId;
      subject: string;
      sourceKey: string;
    }>;
    authoredDistractorExplanations?: Record<string, string>;
  }>;
  analysisDemo?: {
    managed?: boolean;
    sourceKey?: string;
    status?: 'DRAFT' | 'BUILDING' | 'FAILED' | 'READY' | 'PUBLISHED';
    buildId?: string;
    sourceHash?: string;
    expectedStudents?: number;
    policy?: string;
    computedAt?: Date;
    publishedAt?: Date;
    verifiedBuildId?: string;
    lastError?: string;
  };
}

const TestSchema = new Schema<ITest>({
  instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
  templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
  title: { type: String, required: true },
  date: { type: Date, required: true },
  examType: { type: String, required: true },
  sourceExam: { type: String },
  totalQuestions: { type: Number, required: true },
  marksPerQuestion: { type: Number, required: true },
  negativeMarking: { type: Number, required: true },
  isPublished: { type: Boolean, default: false },
  sections: [{
    subject: { type: String, required: true },
    startQ: { type: Number, required: true },
    endQ: { type: Number, required: true }
  }],
  questions: [{
    questionNo: { type: Number, required: true },
    questionId: { type: Schema.Types.ObjectId, required: true },
    subject: { type: String },
    demoMarking: {
      correctMarks: { type: Number },
      incorrectPenalty: { type: Number }
    },
    recommendations: [{
      questionId: { type: Schema.Types.ObjectId, required: true },
      subject: { type: String, required: true },
      sourceKey: { type: String, required: true },
      _id: false
    }],
    authoredDistractorExplanations: { type: Map, of: String }
  }],
  analysisDemo: {
    managed: { type: Boolean },
    sourceKey: { type: String },
    status: { type: String, enum: ['DRAFT', 'BUILDING', 'FAILED', 'READY', 'PUBLISHED'] },
    buildId: { type: String },
    sourceHash: { type: String },
    expectedStudents: { type: Number },
    policy: { type: String },
    computedAt: { type: Date },
    publishedAt: { type: Date },
    verifiedBuildId: { type: String },
    lastError: { type: String }
  }
}, { timestamps: true });

export const Test = model<ITest>('Test', TestSchema);
