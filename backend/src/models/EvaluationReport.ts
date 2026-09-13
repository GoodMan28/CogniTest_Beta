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
  omrImageUrl?: string;
  createdAt: Date;
  responses?: Array<{
    questionNo: number;
    selectedOption: string;
  }>;
  // Student-tagged reason for each incorrect/skipped question (Fix It Zone)
  mistakeReasons?: Array<{
    questionNo: number;
    reason: string;
  }>;
  analysisDemo?: {
    managed?: boolean;
    buildId?: string;
    sourceHash?: string;
    batchSnapshot?: any;
    computedAt?: Date;
    schemaVersion?: string;
    snapshot?: any;
    reflections?: Map<string, {
      text: string;
      updatedAt: Date;
      questionContentHash: string;
    }>;
  };
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
  omrImageUrl: { type: String },
  responses: [{
    questionNo: { type: Number, required: true },
    selectedOption: { type: String, required: true }
  }],
  mistakeReasons: [{
    questionNo: { type: Number, required: true },
    reason: { type: String, required: true },
    _id: false
  }],
  createdAt: { type: Date, default: Date.now },
  analysisDemo: {
    managed: { type: Boolean },
    buildId: { type: String },
    sourceHash: { type: String },
    batchSnapshot: { type: Schema.Types.Mixed },
    computedAt: { type: Date },
    schemaVersion: { type: String },
    snapshot: { type: Schema.Types.Mixed },
    reflections: { type: Map, of: new Schema({
      text: { type: String },
      updatedAt: { type: Date },
      questionContentHash: { type: String }
    }, { _id: false }) }
  }
});

export const EvaluationReport = model<IEvaluationReport>('EvaluationReport', EvaluationReportSchema);
