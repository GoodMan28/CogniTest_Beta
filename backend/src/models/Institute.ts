import { Schema, model, Document } from 'mongoose';

export interface IInstitute extends Document {
  name: string;
  supportEmail?: string;
  supportPhone?: string;
  subscriptionPlan: string;
  logoUrl?: string;
  themeColor?: string;
  createdAt: Date;
}

const InstituteSchema = new Schema<IInstitute>({
  name: { type: String, required: true },
  supportEmail: { type: String },
  supportPhone: { type: String },
  subscriptionPlan: { type: String, default: 'Basic' },
  logoUrl: { type: String },
  themeColor: { type: String, default: '#2563EB' },
  createdAt: { type: Date, default: Date.now }
});

export const Institute = model<IInstitute>('Institute', InstituteSchema);
