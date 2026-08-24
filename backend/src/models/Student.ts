import { Schema, model, Document, Types } from 'mongoose';

export interface IStudent extends Document {
  instituteId: Types.ObjectId;
  enrollmentNo: string;
  name: string;
  batch: string;
}

const StudentSchema = new Schema<IStudent>({
  instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
  enrollmentNo: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  batch: { type: String, required: true }
});

export const Student = model<IStudent>('Student', StudentSchema);
