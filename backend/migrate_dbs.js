const mongoose = require('mongoose');

async function migrate() {
  const localUri = 'mongodb://localhost:27017/cognitest_test';
  const oldRemoteUri = 'mongodb+srv://abhineetanandat28_db_user:G4OppfbgWFrEVmTw@cluster0.m3rxujk.mongodb.net/cognitest?retryWrites=true&w=majority';
  const newRemoteUri = 'mongodb+srv://anandabhineet66_db_user:1gURGSM6NFd4aLvM@cluster0.vs7flpi.mongodb.net/cognitest'; // Assumed DB name is cognitest

  console.log('Connecting to databases...');
  const localConn = await mongoose.createConnection(localUri).asPromise();
  const oldRemoteConn = await mongoose.createConnection(oldRemoteUri).asPromise();
  const newRemoteConn = await mongoose.createConnection(newRemoteUri).asPromise();

  console.log('Connected to all databases.');

  // 1. Migrate Institutes (Needed for foreign key integrity)
  console.log('Migrating institutes...');
  const institutes = await oldRemoteConn.collection('institutes').find({}).toArray();
  if (institutes.length > 0) {
    await newRemoteConn.collection('institutes').deleteMany({});
    await newRemoteConn.collection('institutes').insertMany(institutes);
    console.log(`Migrated ${institutes.length} institutes from old remote.`);
  }

  // 2. Migrate Students from LOCAL db
  console.log('Migrating students from local DB...');
  const students = await localConn.collection('students').find({}).toArray();
  if (students.length > 0) {
    await newRemoteConn.collection('students').deleteMany({});
    await newRemoteConn.collection('students').insertMany(students);
    console.log(`Migrated ${students.length} students from local DB.`);
  }

  // 3. Migrate Questions from OLD REMOTE db
  console.log('Migrating questions from old remote DB...');
  const questions = await oldRemoteConn.collection('questions').find({}).toArray();
  if (questions.length > 0) {
    await newRemoteConn.collection('questions').deleteMany({});
    await newRemoteConn.collection('questions').insertMany(questions);
    console.log(`Migrated ${questions.length} questions from old remote.`);
  }
  
  // 4. Update the .env file in the backend to point to the new remote URI
  console.log('Migration complete. You may also want to update the .env files in both backend and analysis_service to use the new URI.');

  await localConn.close();
  await oldRemoteConn.close();
  await newRemoteConn.close();
}

migrate().catch(console.error);
