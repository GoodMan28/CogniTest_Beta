import mongoose, { Schema, Document } from 'mongoose';

export interface IIngestionJob extends Document {
  pdfName: string;
  subject: string;
  qPdfPath: string;
  solPdfPath: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalPages: number;
  processedPages: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IngestionJobSchema: Schema = new Schema(
  {
    pdfName: { type: String, required: true },
    subject: { type: String, required: true },
    qPdfPath: { type: String, required: true },
    solPdfPath: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], 
      default: 'PENDING' 
    },
    totalPages: { type: Number, default: 0 },
    processedPages: { type: Number, default: 0 },
    errorMessage: { type: String }
  },
  { timestamps: true }
);

export const IngestionJob = mongoose.model<IIngestionJob>('IngestionJob', IngestionJobSchema);
