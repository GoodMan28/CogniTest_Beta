const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cognitest?retryWrites=false';

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');
    
    // We can define a simplified Student model just to fetch data
    const studentSchema = new mongoose.Schema({}, { strict: false });
    const Student = mongoose.model('Student', studentSchema, 'students');

    const students = await Student.find({}, { name: 1, enrollmentNo: 1, batch: 1, email: 1 }).lean();
    
    console.log('\n--- Existing Students ---');
    if (students.length === 0) {
      console.log('No students found.');
    } else {
      students.forEach(s => {
        console.log(`Name: ${s.name} | Enrollment No: ${s.enrollmentNo} | Batch: ${s.batch} | Email: ${s.email || 'N/A'}`);
      });
    }
    console.log('-------------------------');
    console.log('\nNote: Passwords are encrypted with bcrypt, so they cannot be retrieved in plain text.');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
