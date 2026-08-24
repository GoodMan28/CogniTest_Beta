const mongoose = require('mongoose');

async function clearDB() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cognitest?retryWrites=false';
    const finalUri = mongoUri.includes('?') ? (mongoUri.includes('retryWrites') ? mongoUri : `${mongoUri}&retryWrites=false`) : `${mongoUri}?retryWrites=false`;
    await mongoose.connect(finalUri);
    console.log('Connected to DB');
    
    // Clear tests
    const res1 = await mongoose.connection.collection('tests').deleteMany({});
    console.log(`Deleted ${res1.deletedCount} tests`);
    
    // Clear questions
    const res2 = await mongoose.connection.collection('physics_questions').deleteMany({});
    console.log(`Deleted ${res2.deletedCount} physics questions`);
    
    const res3 = await mongoose.connection.collection('chemistry_questions').deleteMany({});
    console.log(`Deleted ${res3.deletedCount} chemistry questions`);
    
    const res4 = await mongoose.connection.collection('biology_questions').deleteMany({});
    console.log(`Deleted ${res4.deletedCount} biology questions`);
    
    console.log('Database successfully cleared!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

clearDB();
