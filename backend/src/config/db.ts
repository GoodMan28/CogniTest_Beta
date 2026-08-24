import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cognitest?retryWrites=false';
    const finalUri = mongoUri.includes('?') ? (mongoUri.includes('retryWrites') ? mongoUri : `${mongoUri}&retryWrites=false`) : `${mongoUri}?retryWrites=false`;
    const conn = await mongoose.connect(finalUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};
