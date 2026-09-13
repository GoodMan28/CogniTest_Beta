import { Schema, model, Document, Types } from 'mongoose';

export interface IAdmin extends Document {
  email: string;
  password: string;
  name: string;
  instituteId: Types.ObjectId;
  createdAt: Date;
}

const AdminSchema = new Schema<IAdmin>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Admin = model<IAdmin>('Admin', AdminSchema);
