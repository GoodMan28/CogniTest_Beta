import { Schema, model, Document, Types } from 'mongoose';

export interface ITest extends Document {
  instituteId: Types.ObjectId;
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
  }>;
}

const TestSchema = new Schema<ITest>({
  instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
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
    subject: { type: String }
  }]
}, { timestamps: true });

export const Test = model<ITest>('Test', TestSchema);
