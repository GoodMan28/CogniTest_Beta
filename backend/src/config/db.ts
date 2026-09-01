import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cognitest?retryWrites=false';
    const finalUri = mongoUri.includes('?') ? (mongoUri.includes('retryWrites') ? mongoUri : `${mongoUri}&retryWrites=false`) : `${mongoUri}?retryWrites=false`;
    
    mongoose.set('strictQuery', true);
    
    cached.promise = mongoose.connect(finalUri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000
    }).then((mongoose) => {
      console.log(`MongoDB Connected: ${mongoose.connection.host}`);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error: any) {
    cached.promise = null;
    console.error(`Error: ${error.message}`);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
  
  return cached.conn;
};
