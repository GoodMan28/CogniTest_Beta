import { Schema, model, Document, Types } from 'mongoose';

export interface ITemplate extends Document {
  instituteId: Types.ObjectId;
  title: string;
  course: string;
  sections: Array<{
    id: string; // React local ID for mapping
    subject: string;
    questionType: string;
    totalQuestions: number;
    marksPerQuestion: number;
  }>;
}

const TemplateSchema = new Schema<ITemplate>({
  instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
  title: { type: String, required: true },
  course: { type: String, required: true },
  sections: [{
    id: { type: String, required: true },
    subject: { type: String, required: true },
    questionType: { type: String, required: true },
    totalQuestions: { type: Number, required: true },
    marksPerQuestion: { type: Number, required: true }
  }]
}, { timestamps: true });

export const Template = model<ITemplate>('Template', TemplateSchema);
