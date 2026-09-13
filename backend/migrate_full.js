/**
 * migrate_full.js — Full migration script
 * 
 * READS from (never modifies):
 *   1. Old Remote DB (cluster0.m3rxujk) — backup, read-only
 *   2. Local Mock DB  (localhost:27017/cognitest_test) — read-only
 * 
 * WRITES to:
 *   3. New Remote DB (cluster0.vs7flpi) — destination
 * 
 * Creates two separate institutes so old and new data don't clash.
 */

const mongoose = require('mongoose');

// ─── Connection strings ───────────────────────────────────────────
const OLD_REMOTE_URI = 'mongodb+srv://abhineetanandat28_db_user:G4OppfbgWFrEVmTw@cluster0.m3rxujk.mongodb.net/cognitest?retryWrites=true&w=majority';
const LOCAL_URI      = 'mongodb://localhost:27017/cognitest_test';
const NEW_REMOTE_URI = 'mongodb+srv://anandabhineet66_db_user:1gURGSM6NFd4aLvM@cluster0.vs7flpi.mongodb.net/cognitest?retryWrites=true&w=majority';

// ─── Institute IDs (kept identical to originals so foreign keys work) ──
const OLD_INSTITUTE_ID        = new mongoose.Types.ObjectId('6a8a24a2dc736a46251dfa75'); // "Newton" from old remote
const OLD_QUESTION_INST_ID    = new mongoose.Types.ObjectId('64a1b2c3d4e5f6a7b8c9d0e1'); // What questions/students actually reference
const DEMO_INSTITUTE_ID       = new mongoose.Types.ObjectId('60c72b2f9b1e8a001c8e4a5d'); // "CogniTest Demo" from local

// ─── Helper: read all docs from a collection ──────────────────────
async function readAll(conn, collectionName) {
  try {
    const docs = await conn.collection(collectionName).find({}).toArray();
    return docs;
  } catch (e) {
    // Collection may not exist
    return [];
  }
}

// ─── Helper: rewrite instituteId on an array of docs ──────────────
function rewriteInstituteId(docs, fromId, toId) {
  return docs.map(doc => {
    if (doc.instituteId && doc.instituteId.toString() === fromId.toString()) {
      return { ...doc, instituteId: toId };
    }
    return doc;
  });
}

// ─── Helper: safe insert (skip if empty) ──────────────────────────
async function safeInsert(conn, collectionName, docs) {
  if (docs.length === 0) {
    console.log(`  ⏭  ${collectionName}: 0 docs, skipping`);
    return 0;
  }
  await conn.collection(collectionName).insertMany(docs);
  console.log(`  ✅ ${collectionName}: inserted ${docs.length} docs`);
  return docs.length;
}

// ─── Main migration ───────────────────────────────────────────────
async function migrate() {
  console.log('═══════════════════════════════════════════════');
  console.log('  FULL DATABASE MIGRATION');
  console.log('  Old remote → New remote (Institute A: Newton)');
  console.log('  Local mock → New remote (Institute B: CogniTest Demo)');
  console.log('  Old remote is READ-ONLY (backup)');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Connect to all three databases
  console.log('[1/7] Connecting to databases...');
  const oldConn   = await mongoose.createConnection(OLD_REMOTE_URI).asPromise();
  console.log('  ✅ Old remote connected');
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('  ✅ Local connected');
  const newConn   = await mongoose.createConnection(NEW_REMOTE_URI).asPromise();
  console.log('  ✅ New remote connected\n');

  // 2. Wipe the new database completely
  console.log('[2/7] Wiping new database...');
  const collectionsToWipe = [
    'institutes', 'students', 'tests', 'evaluationreports', 'studentanalytics',
    'physics_questions', 'chemistry_questions', 'biology_questions', 'mathematics_questions',
    'questions', 'templates', 'ingestionjobs'
  ];
  for (const name of collectionsToWipe) {
    try {
      await newConn.collection(name).drop();
      console.log(`  🗑  Dropped ${name}`);
    } catch (e) {
      // Collection doesn't exist yet, that's fine
    }
  }
  console.log('');

  // 3. Create TWO institute documents
  console.log('[3/7] Creating two institute documents...');
  await newConn.collection('institutes').insertMany([
    {
      _id: OLD_INSTITUTE_ID,
      name: 'Newton',
      subscriptionPlan: 'Enterprise Plus',
      themeColor: '#2563EB',
      supportEmail: 'support@allen.ac.in',
      supportPhone: '+91 9876543210',
      createdAt: new Date()
    },
    {
      _id: DEMO_INSTITUTE_ID,
      name: 'CogniTest Demo',
      subscriptionPlan: 'Enterprise Plus',
      themeColor: '#10B981',
      supportEmail: 'demo@cognitest.ai',
      createdAt: new Date()
    }
  ]);
  console.log('  ✅ Institute A: Newton (_id: 6a8a24a2dc736a46251dfa75)');
  console.log('  ✅ Institute B: CogniTest Demo (_id: 60c72b2f9b1e8a001c8e4a5d)\n');

  // 4. READ all data from old remote (never modifying old remote)
  console.log('[4/7] Reading data from old remote (read-only)...');
  const oldPhysics    = await readAll(oldConn, 'physics_questions');
  const oldChemistry  = await readAll(oldConn, 'chemistry_questions');
  const oldBiology    = await readAll(oldConn, 'biology_questions');
  const oldQuestions   = await readAll(oldConn, 'questions');
  const oldStudents    = await readAll(oldConn, 'students');
  const oldTests       = await readAll(oldConn, 'tests');
  const oldReports     = await readAll(oldConn, 'evaluationreports');
  const oldAnalytics   = await readAll(oldConn, 'studentanalytics');
  const oldTemplates   = await readAll(oldConn, 'templates');
  const oldIngestion   = await readAll(oldConn, 'ingestionjobs');
  console.log(`  Read: ${oldPhysics.length} physics, ${oldChemistry.length} chem, ${oldBiology.length} bio`);
  console.log(`  Read: ${oldQuestions.length} base questions, ${oldStudents.length} students`);
  console.log(`  Read: ${oldTests.length} tests, ${oldReports.length} reports, ${oldAnalytics.length} analytics`);
  console.log(`  Read: ${oldTemplates.length} templates, ${oldIngestion.length} ingestion jobs\n`);

  // 5. READ all data from local mock DB (never modifying local)
  console.log('[5/7] Reading data from local mock DB (read-only)...');
  const localStudents    = await readAll(localConn, 'students');
  const localPhysics     = await readAll(localConn, 'physics_questions');
  const localChemistry   = await readAll(localConn, 'chemistry_questions');
  const localMath        = await readAll(localConn, 'mathematics_questions');
  const localTests       = await readAll(localConn, 'tests');
  const localReports     = await readAll(localConn, 'evaluationreports');
  console.log(`  Read: ${localStudents.length} students, ${localPhysics.length} physics`);
  console.log(`  Read: ${localChemistry.length} chem, ${localMath.length} math`);
  console.log(`  Read: ${localTests.length} tests, ${localReports.length} reports\n`);

  // 6. Write everything to the new database
  console.log('[6/7] Writing to new database...');

  // 6a. Old remote data → Institute A (Newton)
  // Fix instituteId: 64a1b2c3d4e5f6a7b8c9d0e1 → 6a8a24a2dc736a46251dfa75
  console.log('\n  --- Institute A (Newton) data ---');
  await safeInsert(newConn, 'physics_questions',    rewriteInstituteId(oldPhysics, OLD_QUESTION_INST_ID, OLD_INSTITUTE_ID));
  await safeInsert(newConn, 'chemistry_questions',  rewriteInstituteId(oldChemistry, OLD_QUESTION_INST_ID, OLD_INSTITUTE_ID));
  await safeInsert(newConn, 'biology_questions',    rewriteInstituteId(oldBiology, OLD_QUESTION_INST_ID, OLD_INSTITUTE_ID));
  await safeInsert(newConn, 'questions',            oldQuestions);
  await safeInsert(newConn, 'students',             rewriteInstituteId(oldStudents, OLD_QUESTION_INST_ID, OLD_INSTITUTE_ID));
  await safeInsert(newConn, 'tests',                rewriteInstituteId(oldTests, OLD_QUESTION_INST_ID, OLD_INSTITUTE_ID));
  await safeInsert(newConn, 'evaluationreports',    oldReports);
  await safeInsert(newConn, 'studentanalytics',     oldAnalytics);
  await safeInsert(newConn, 'templates',            rewriteInstituteId(oldTemplates, OLD_QUESTION_INST_ID, OLD_INSTITUTE_ID));
  await safeInsert(newConn, 'ingestionjobs',        oldIngestion);

  // 6b. Local mock data → Institute B (CogniTest Demo)
  // instituteId is already 60c72b2f9b1e8a001c8e4a5d, no rewrite needed
  console.log('\n  --- Institute B (CogniTest Demo) data ---');
  // Use insertMany to APPEND (not replace) — collections already have Institute A data
  await safeInsert(newConn, 'students',             localStudents);
  await safeInsert(newConn, 'physics_questions',    localPhysics);
  await safeInsert(newConn, 'chemistry_questions',  localChemistry);
  await safeInsert(newConn, 'mathematics_questions', localMath);
  await safeInsert(newConn, 'tests',                localTests);
  await safeInsert(newConn, 'evaluationreports',    localReports);

  // 7. Verify counts
  console.log('\n[7/7] Verifying final counts in new database...');
  const finalCollections = [
    'institutes', 'students', 'physics_questions', 'chemistry_questions',
    'biology_questions', 'mathematics_questions', 'questions',
    'tests', 'evaluationreports', 'studentanalytics', 'templates', 'ingestionjobs'
  ];
  console.log('');
  console.log('  Collection               | Count');
  console.log('  ─────────────────────────┼──────');
  for (const name of finalCollections) {
    try {
      const count = await newConn.collection(name).countDocuments();
      console.log(`  ${name.padEnd(25)} | ${count}`);
    } catch (e) {
      console.log(`  ${name.padEnd(25)} | 0 (not created)`);
    }
  }

  // Verify foreign key integrity
  console.log('\n  Foreign key integrity check:');
  const studentsByInst = await newConn.collection('students').aggregate([
    { $group: { _id: '$instituteId', count: { $sum: 1 } } }
  ]).toArray();
  for (const g of studentsByInst) {
    const instName = g._id.toString() === OLD_INSTITUTE_ID.toString() ? 'Newton' : 'CogniTest Demo';
    console.log(`  Students under ${instName}: ${g.count}`);
  }

  const questionsByInst = await newConn.collection('physics_questions').aggregate([
    { $group: { _id: '$instituteId', count: { $sum: 1 } } }
  ]).toArray();
  for (const g of questionsByInst) {
    const instName = g._id.toString() === OLD_INSTITUTE_ID.toString() ? 'Newton' : 'CogniTest Demo';
    console.log(`  Physics questions under ${instName}: ${g.count}`);
  }

  console.log('\n══════════════════════════════════════');
  console.log('  ✅ MIGRATION COMPLETE');
  console.log('  Old remote was NOT modified (backup safe)');
  console.log('  Local DB was NOT modified');
  console.log('══════════════════════════════════════');

  // Close all connections
  await oldConn.close();
  await localConn.close();
  await newConn.close();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
