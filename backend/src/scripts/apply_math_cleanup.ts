/**
 * Applies a Gemini-generated LaTeX cleanup patch to the Mathematics questions
 * of the Newton Tutorial Private Limited tenant (PINNACLE-27 / PINNACLE-28).
 *
 * The patch is a partial diff (only changed fields, only changed questions) —
 * see data/pinnacle/gemini_math_cleanup_patch.json. Each entry is matched
 * against the ORIGINAL (pre-cleanup) questionText recorded in
 * data/pinnacle/mathematics_for_gemini_cleanup.json (keyed by sourceTest +
 * questionNo there), because the live DB documents do not persist a
 * questionNo field — a separate, pre-existing ingestion gap. Only
 * questionText/markdownBody and options/optionsMarkdown are updated.
 * correctOption/numericalAnswer are never touched — if a patch entry tries to
 * include either, the script aborts.
 *
 * Strictly scoped: instituteId = NEWTON_INSTITUTE_ID, sourceTest in
 * ['PINNACLE-27','PINNACLE-28']. Never touches CogniTest Demo's Mathematics
 * questions or any other tenant's data.
 *
 * Usage:
 *   npx tsc && node dist/scripts/apply_math_cleanup.js [--dry-run]
 */
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { MathematicsQuestion } from '../models/Question';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set — refusing to run.');
  process.exit(1);
}

const NEWTON_INSTITUTE_ID = '6aa70c122d7b8807b8d82e35';
const ALLOWED_SOURCE_TESTS = ['PINNACLE-27', 'PINNACLE-28'];
const PATCH_FILE = path.join(__dirname, '../../../data/pinnacle/gemini_math_cleanup_patch.json');
const ORIGINAL_FILE = path.join(__dirname, '../../../data/pinnacle/mathematics_for_gemini_cleanup.json');

interface PatchEntry {
  sourceTest: string;
  questionNo: number;
  reason?: string;
  questionText: string;
  options?: string[];
  correctOption?: unknown;
  numericalAnswer?: unknown;
}

interface OriginalEntry {
  sourceTest: string;
  questionNo: number;
  questionText: string;
}

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  const raw = fs.readFileSync(PATCH_FILE, 'utf8');
  const patch: PatchEntry[] = JSON.parse(raw);
  const originals: OriginalEntry[] = JSON.parse(fs.readFileSync(ORIGINAL_FILE, 'utf8'));

  for (const p of patch) {
    if (!ALLOWED_SOURCE_TESTS.includes(p.sourceTest)) {
      console.error(`Refusing to run: patch entry has unexpected sourceTest "${p.sourceTest}"`);
      process.exit(1);
    }
    if ('correctOption' in p || 'numericalAnswer' in p) {
      console.error(`Refusing to run: patch entry ${p.sourceTest} Q${p.questionNo} tries to modify the answer key.`);
      process.exit(1);
    }
  }

  await mongoose.connect(MONGO_URI as string);
  console.log(`Connected to MongoDB${isDryRun ? ' (DRY RUN — no writes will be made)' : ''}`);

  let updated = 0;
  let notFound = 0;

  for (const p of patch) {
    const original = originals.find(
      (o) => o.sourceTest === p.sourceTest && o.questionNo === p.questionNo
    );
    if (!original) {
      console.warn(`NO ORIGINAL RECORD for ${p.sourceTest} Q${p.questionNo} — skipping`);
      notFound++;
      continue;
    }

    const doc = await MathematicsQuestion.findOne({
      instituteId: new mongoose.Types.ObjectId(NEWTON_INSTITUTE_ID),
      sourceTest: p.sourceTest,
      questionText: original.questionText,
    });

    if (!doc) {
      console.warn(`NOT FOUND IN DB: ${p.sourceTest} Q${p.questionNo} — skipping`);
      notFound++;
      continue;
    }

    console.log(`\n${p.sourceTest} Q${p.questionNo} (${p.reason || 'no reason given'})`);
    console.log(`  OLD: ${doc.questionText.slice(0, 100)}${doc.questionText.length > 100 ? '…' : ''}`);
    console.log(`  NEW: ${p.questionText.slice(0, 100)}${p.questionText.length > 100 ? '…' : ''}`);

    if (!isDryRun) {
      doc.questionText = p.questionText;
      doc.markdownBody = p.questionText;
      if (p.options && p.options.length) {
        doc.options = p.options;
        doc.optionsMarkdown = p.options;
      }
      await doc.save();
    }
    updated++;
  }

  console.log(`\n${isDryRun ? 'Would update' : 'Updated'}: ${updated} | Not found: ${notFound} | Total in patch: ${patch.length}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
