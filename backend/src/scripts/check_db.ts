import mongoose from 'mongoose';
import { PhysicsQuestion } from '../models/Question';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  
  // Find the specific question from the screenshot or any WPE question
  const q = await PhysicsQuestion.findOne({ chapter: "Work, Energy and Power" }).lean();
  
  console.log(JSON.stringify(q, null, 2));
  process.exit(0);
};

run();
