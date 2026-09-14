/**
 * Backfills the `questionNo` field on already-ingested PINNACLE-27/28 question
 * documents for the Newton Tutorial Private Limited tenant.
 *
 * Root cause: ingest_markdown_paper.ts used to destructure `questionNo` out of
 * the enriched object before insertMany (`({ questionNo, ...doc }) => ...`),
 * so it was silently never persisted on the Question documents themselves —
 * even though it exists on the schema and in the dry-run JSON, and even
 * though the Test document's embedded `questions[]` array had it correctly
 * all along (that's a separate code path). That destructuring bug is now
 * fixed; this script repairs the data already sitting in the DB.
 *
 * Matches each DB document by (instituteId, sourceTest, subject, questionText)
 * against data/pinnacle/parsed_PINNACLE-27.json / parsed_PINNACLE-28.json,
 * which have the correct 1-75 questionNo per paper. Mathematics questionText
 * has since been cleaned up by data/pinnacle/gemini_math_cleanup_patch.json,
 * so for Mathematics the patched text is used as the match key where a patch
 * entry exists, falling back to the original parsed text otherwise.
 *
 * Idempotent: only sets questionNo where it is currently missing/undefined.
 * Strictly scoped to instituteId = NEWTON_INSTITUTE_ID and
 * sourceTest in ['PINNACLE-27','PINNACLE-28'] — never touches any other
 * tenant's data.
 *
 * Usage:
 *   npx tsc && node dist/scripts/backfill_question_no.js [--dry-run]
 */
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { getQuestionModel } from '../models/Question';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set — refusing to run.');
  process.exit(1);
}

const NEWTON_INSTITUTE_ID = '6aa70c122d7b8807b8d82e35';
const SOURCE_TESTS = ['PINNACLE-27', 'PINNACLE-28'] as const;
const DATA_DIR = path.join(__dirname, '../../../data/pinnacle');

interface ParsedEntry {
  questionNo: number;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  sourceTest: string;
  questionText: string;
}

interface PatchEntry {
  sourceTest: string;
  questionNo: number;
  questionText: string;
}

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  const mathPatch: PatchEntry[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'gemini_math_cleanup_patch.json'), 'utf8')
  );

  const expected: ParsedEntry[] = [];
  for (const sourceTest of SOURCE_TESTS) {
    const parsed: ParsedEntry[] = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, `parsed_${sourceTest}.json`), 'utf8')
    );
    for (const q of parsed) {
      const patched = mathPatch.find(
        (p) => p.sourceTest === sourceTest && p.questionNo === q.questionNo
      );
      expected.push({
        questionNo: q.questionNo,
        subject: q.subject,
        sourceTest,
        questionText: patched ? patched.questionText : q.questionText,
      });
    }
  }

  console.log(`Loaded ${expected.length} expected (sourceTest, subject, questionNo, questionText) records.`);

  await mongoose.connect(MONGO_URI as string);
  console.log(`Connected to MongoDB${isDryRun ? ' (DRY RUN — no writes will be made)' : ''}`);

  let updated = 0;
  let alreadySet = 0;
  let notFound = 0;

  for (const e of expected) {
    const Model = getQuestionModel(e.subject);
    const doc = await Model.findOne({
      instituteId: new mongoose.Types.ObjectId(NEWTON_INSTITUTE_ID),
      sourceTest: e.sourceTest,
      questionText: e.questionText,
    });

    if (!doc) {
      console.warn(`NOT FOUND: ${e.sourceTest} ${e.subject} Q${e.questionNo}`);
      notFound++;
      continue;
    }

    if (doc.questionNo === e.questionNo) {
      alreadySet++;
      continue;
    }

    if (doc.questionNo !== undefined && doc.questionNo !== null) {
      console.warn(
        `CONFLICT: ${e.sourceTest} ${e.subject} matched doc already has questionNo=${doc.questionNo}, expected ${e.questionNo} — skipping`
      );
      continue;
    }

    if (!isDryRun) {
      doc.questionNo = e.questionNo;
      await doc.save();
    }
    updated++;
  }

  console.log(
    `\n${isDryRun ? 'Would set' : 'Set'} questionNo on ${updated} docs | already correct: ${alreadySet} | not found: ${notFound} | total expected: ${expected.length}`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
