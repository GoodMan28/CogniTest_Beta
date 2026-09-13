/**
 * seed_admins.js — Creates two admin accounts in the new database.
 * 
 * Run once: node seed_admins.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const NEW_URI = 'mongodb+srv://anandabhineet66_db_user:1gURGSM6NFd4aLvM@cluster0.vs7flpi.mongodb.net/cognitest?retryWrites=true&w=majority';

async function seed() {
  console.log('Connecting to new database...');
  const conn = await mongoose.createConnection(NEW_URI).asPromise();
  console.log('Connected.\n');

  const salt = await bcrypt.genSalt(10);

  const admins = [
    {
      _id: new mongoose.Types.ObjectId(),
      email: 'admin@newton.com',
      password: await bcrypt.hash('password123', salt),
      name: 'Newton Admin',
      instituteId: new mongoose.Types.ObjectId('6a8a24a2dc736a46251dfa75'), // Newton
    },
    {
      _id: new mongoose.Types.ObjectId(),
      email: 'demo@cognitest.ai',
      password: await bcrypt.hash('password123', salt),
      name: 'CogniTest Demo Admin',
      instituteId: new mongoose.Types.ObjectId('60c72b2f9b1e8a001c8e4a5d'), // CogniTest Demo
    }
  ];

  // Drop existing admins collection to avoid duplicates on re-run
  try {
    await conn.collection('admins').drop();
    console.log('Dropped existing admins collection.');
  } catch (e) {
    // Collection doesn't exist, fine
  }

  await conn.collection('admins').insertMany(admins);
  console.log('Created admin accounts:\n');
  console.log('┌──────────────────────────┬─────────────────────┬──────────────┐');
  console.log('│ Institute                │ Email               │ Password     │');
  console.log('├──────────────────────────┼─────────────────────┼──────────────┤');
  console.log('│ Newton (old coaching)    │ admin@newton.com    │ password123  │');
  console.log('│ CogniTest Demo (mock)   │ demo@cognitest.ai   │ password123  │');
  console.log('└──────────────────────────┴─────────────────────┴──────────────┘');

  await conn.close();
  console.log('\nDone.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
