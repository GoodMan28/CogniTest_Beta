import mongoose from 'mongoose';
import { generateStudentAnalytics } from './controllers/evaluationController';
import { Student } from './models/Student';
import { EvaluationReport } from './models/EvaluationReport';

const MONGODB_URI = 'mongodb+srv://anandabhineet66_db_user:1gURGSM6NFd4aLvM@cluster0.vs7flpi.mongodb.net/cognitest?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const studentIds = await EvaluationReport.distinct('studentId');
  console.log(`Found ${studentIds.length} students with reports.`);

  for (const studentId of studentIds) {
    try {
      await generateStudentAnalytics(studentId.toString());
      console.log(`Generated analytics for student ${studentId}`);
    } catch (e) {
      console.error(`Error generating for ${studentId}:`, e);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
