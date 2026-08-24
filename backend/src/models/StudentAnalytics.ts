import { Schema, model, Document, Types } from 'mongoose';

export interface IStudentAnalytics extends Document {
  studentId: Types.ObjectId;
  lastUpdated: Date;
  chapterMastery: Array<{
    chapter: string;
    accuracyPercentage: number;
    totalAttempted: number;
  }>;
  swotProfile: {
    criticalWeaknesses: string[];
    strengths: string[];
  };
}

const StudentAnalyticsSchema = new Schema<IStudentAnalytics>({
  studentId: { type: Schema.Types.ObjectId, required: true, unique: true },
  lastUpdated: { type: Date, default: Date.now },
  chapterMastery: [{
    chapter: { type: String, required: true },
    accuracyPercentage: { type: Number, required: true },
    totalAttempted: { type: Number, required: true }
  }],
  swotProfile: {
    criticalWeaknesses: [{ type: String }],
    strengths: [{ type: String }]
  }
}, { timestamps: true });

export const StudentAnalytics = model<IStudentAnalytics>('StudentAnalytics', StudentAnalyticsSchema);
