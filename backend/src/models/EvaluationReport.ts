import { Schema, model, Document, Types } from 'mongoose';

export interface IEvaluationReport extends Document {
  studentId: Types.ObjectId;
  testId: Types.ObjectId;
  score: number;
  totalMarks: number;
  performance: {
    correct: Types.ObjectId[];
    incorrect: Types.ObjectId[];
    unanswered: Types.ObjectId[];
  };
  omrImageUrl: string;
  createdAt: Date;
}

const EvaluationReportSchema = new Schema<IEvaluationReport>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  testId: { type: Schema.Types.ObjectId, ref: 'Test', required: true },
  score: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  performance: {
    correct: [{ type: Schema.Types.ObjectId }],
    incorrect: [{ type: Schema.Types.ObjectId }],
    unanswered: [{ type: Schema.Types.ObjectId }]
  },
  omrImageUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const EvaluationReport = model<IEvaluationReport>('EvaluationReport', EvaluationReportSchema);
