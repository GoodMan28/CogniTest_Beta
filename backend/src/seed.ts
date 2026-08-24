import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Institute } from './models/Institute';
import { Student } from './models/Student';
import { Test } from './models/Test';
import { PhysicsQuestion, ChemistryQuestion, BiologyQuestion } from './models/Question';
import { StudentAnalytics } from './models/StudentAnalytics';
import { EvaluationReport } from './models/EvaluationReport';

dotenv.config();

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cognitest');
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    await Institute.deleteMany({});
    await Student.deleteMany({});
    await Test.deleteMany({});
    await PhysicsQuestion.deleteMany({});
    await ChemistryQuestion.deleteMany({});
    await BiologyQuestion.deleteMany({});
    await StudentAnalytics.deleteMany({});
    await EvaluationReport.deleteMany({});

    // 1. Seed Institute
    const institute = new Institute({
      name: 'Allen Career Institute',
      subscriptionPlan: 'Enterprise Plus'
    });
    await institute.save();
    console.log('Seeded Institute.');

    // 2. Seed Students
    const batches = ['NEET-2027 Alpha', 'JEE-2027 Beta', 'Foundation Class 10'];
    const students = [];
    for (let i = 1; i <= 15; i++) {
      students.push({
        instituteId: institute._id,
        enrollmentNo: `ENR-2027-${1000 + i}`,
        name: `Student ${i}`,
        batch: batches[i % 3]
      });
    }
    const savedStudents = await Student.insertMany(students);
    console.log(`Seeded ${savedStudents.length} Students.`);

    // 3. Seed Questions
    const subjects = ['Physics', 'Chemistry', 'Biology'];
    const topics = ['Thermodynamics', 'Genetics', 'Organic Chemistry', 'Kinematics', 'Cell Cycle'];
    
    const physicsQs = [];
    const chemistryQs = [];
    const biologyQs = [];
    
    for (let i = 1; i <= 50; i++) {
      const subj = subjects[i % 3];
      const q = {
        instituteId: institute._id,
        subject: subj as any,
        unit: `Unit ${i % 5 + 1}`,
        chapter: `Chapter ${i % 10 + 1}`,
        topic: [topics[i % 5]],
        questionText: `Sample question ${i} with LaTeX: $$F=ma$$`,
        options: ['10', '20', '30', '40'],
        correctOption: ['10', '20', '30', '40'][i % 4],
        solutionText: 'This is the detailed solution.',
        questionIntent: 'Testing concept ' + topics[i % 5],
        difficulty: ['Easy', 'Medium', 'Hard'][i % 3]
      };
      
      if (subj === 'Physics') physicsQs.push(q);
      else if (subj === 'Chemistry') chemistryQs.push(q);
      else biologyQs.push(q);
    }
    
    const savedPhysics = await PhysicsQuestion.insertMany(physicsQs);
    const savedChemistry = await ChemistryQuestion.insertMany(chemistryQs);
    const savedBiology = await BiologyQuestion.insertMany(biologyQs);
    
    const allQuestions = [...savedPhysics, ...savedChemistry, ...savedBiology];
    console.log(`Seeded ${allQuestions.length} Questions.`);

    // 4. Seed Tests
    const tests = [];
    for (let i = 1; i <= 5; i++) {
      tests.push({
        instituteId: institute._id,
        title: `Mock Test ${i} (${batches[i % 3]})`,
        date: new Date(Date.now() - i * 86400000 * 7), // Past weeks
        examType: 'JEE Mains',
        totalQuestions: 10,
        marksPerQuestion: 4,
        negativeMarking: -1,
        questions: allQuestions.slice(0, 10).map((q: any, idx: number) => ({
          questionId: q._id,
          questionNo: idx + 1
        }))
      });
    }
    const savedTests = await Test.insertMany(tests);
    console.log(`Seeded ${savedTests.length} Tests.`);

    // 5. Seed Reports & Analytics
    const reports = [];
    const analyticsDocs = [];
    
    for (const student of savedStudents) {
      // Pick a random test for them to have taken
      const test = savedTests[Math.floor(Math.random() * savedTests.length)];
      
      const correct = [allQuestions[0]._id, allQuestions[1]._id];
      const incorrect = [allQuestions[2]._id];
      const unanswered = [allQuestions[3]._id];
      
      reports.push({
        studentId: student._id,
        testId: test._id,
        score: 7, // 2*4 - 1
        totalMarks: 40,
        performance: { correct, incorrect, unanswered },
        omrImageUrl: 'https://mock-s3.url/omr.jpg'
      });

      analyticsDocs.push({
        studentId: student._id,
        chapterMastery: [
          { chapter: 'Chapter 1', accuracyPercentage: 80, totalAttempted: 20 },
          { chapter: 'Chapter 2', accuracyPercentage: 40, totalAttempted: 15 } // Weakness
        ],
        swotProfile: {
          criticalWeaknesses: ['Chapter 2', 'Thermodynamics'],
          strengths: ['Chapter 1', 'Genetics']
        }
      });
    }

    await EvaluationReport.insertMany(reports);
    await StudentAnalytics.insertMany(analyticsDocs);
    console.log('Seeded Reports and Analytics.');

    console.log('Done seeding!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding DB:', error);
    process.exit(1);
  }
};

seedDB();
