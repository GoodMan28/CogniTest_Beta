import { Schema, model, Document } from 'mongoose';

export interface IInstitute extends Document {
  name: string;
  subscriptionPlan: string;
  createdAt: Date;
}

const InstituteSchema = new Schema<IInstitute>({
  name: { type: String, required: true },
  subscriptionPlan: { type: String, default: 'Basic' },
  createdAt: { type: Date, default: Date.now }
});

export const Institute = model<IInstitute>('Institute', InstituteSchema);
