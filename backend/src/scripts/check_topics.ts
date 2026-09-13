import mongoose from 'mongoose';
import { PhysicsQuestion } from '../models/Question';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  
  const qs = await PhysicsQuestion.find({ chapter: "Work, Energy and Power" }).select('topic').lean();
  
  const allTopics = new Set<string>();
  qs.forEach(q => {
    q.topic.forEach(t => allTopics.add(t));
  });
  console.log("Topics in DB for WPE:", Array.from(allTopics));
  process.exit(0);
};

run();
