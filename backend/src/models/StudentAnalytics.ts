import { Schema, model, Document, Types } from 'mongoose';

interface IChapterMasteryEntry {
  chapter: string;
  accuracyPercentage: number;
  totalAttempted: number;
}

interface ISwotEntry {
  criticalWeaknesses: string[];
  strengths: string[];
}

export interface IStudentAnalytics extends Document {
  studentId: Types.ObjectId;
  lastUpdated: Date;
  chapterMastery: {
    Physics: IChapterMasteryEntry[];
    Chemistry: IChapterMasteryEntry[];
    Biology: IChapterMasteryEntry[];
  };
  swotProfile: {
    Physics: ISwotEntry;
    Chemistry: ISwotEntry;
    Biology: ISwotEntry;
  };
}

const ChapterMasterySchema = new Schema({
  chapter: { type: String, required: true },
  accuracyPercentage: { type: Number, required: true },
  totalAttempted: { type: Number, required: true }
}, { _id: false });

const SwotEntrySchema = new Schema({
  criticalWeaknesses: [{ type: String }],
  strengths: [{ type: String }]
}, { _id: false });

const StudentAnalyticsSchema = new Schema<IStudentAnalytics>({
  studentId: { type: Schema.Types.ObjectId, required: true, unique: true },
  lastUpdated: { type: Date, default: Date.now },
  chapterMastery: {
    Physics: [ChapterMasterySchema],
    Chemistry: [ChapterMasterySchema],
    Biology: [ChapterMasterySchema]
  },
  swotProfile: {
    Physics: { type: SwotEntrySchema, default: () => ({}) },
    Chemistry: { type: SwotEntrySchema, default: () => ({}) },
    Biology: { type: SwotEntrySchema, default: () => ({}) }
  }
}, { timestamps: true });

export const StudentAnalytics = model<IStudentAnalytics>('StudentAnalytics', StudentAnalyticsSchema);
