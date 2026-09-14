/**
 * Deterministic, regex-based ingestion of a Markdown exam paper (75 questions:
 * 3 subjects x 20 MCQ + 5 numerical) into the per-subject question collections,
 * plus creation/update of the corresponding Test document.
 *
 * No LLM involved — every field either comes straight out of the markdown or
 * from the supplied difficulty/answer-key/taxonomy JSON files.
 *
 * Usage:
 *   npx tsc && node dist/scripts/ingest_markdown_paper.js \
 *     --md ../data/pinnacle/PINNACLE_27_Combined.md \
 *     --difficulty ../data/pinnacle/final_question_27_difficulty.json \
 *     --answers ../data/pinnacle/answer_key_27.json \
 *     --test "PINNACLE-27 Periodic Test" \
 *     --batch "Pinnacle-27" \
 *     --source-test "PINNACLE-27" \
 *     --institute "Newton Tutorial Private Limited" \
 *     [--taxonomy ../data/pinnacle/taxonomy_map_27.json] \
 *     [--template-id <templateObjectId>] \
 *     --dry-run
 *
 * Without --dry-run, this COMMITS to the database: it deletes any existing
 * questions/test for this (instituteId, sourceTest) and re-inserts, so it is
 * safe to re-run (idempotent) but destructive to manual edits made in between.
 *
 * --retag mode: only updates unit/chapter/topic on existing questions from a
 * taxonomy map file, without touching anything else. Use once a taxonomy
 * lands after an already-committed ingest.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Institute } from '../models/Institute';
import { Test } from '../models/Test';
import { getQuestionModel } from '../models/Question';

dotenv.config({ path: path.join(__dirname, '../../.env') });

type Subject = 'Physics' | 'Chemistry' | 'Mathematics';
type SectionLetter = 'A' | 'B';

interface ParsedQuestion {
  questionNo: number;
  subject: Subject;
  section: SectionLetter;
  questionType: 'multiple_choice' | 'numerical';
  stem: string;
  options: string[];
}

interface TaxonomyEntry {
  unit: string;
  chapter: string[];
  topic: string[];
}

interface Args {
  md: string;
  difficulty: string;
  answers: string;
  test: string;
  batch: string;
  sourceTest: string;
  institute: string;
  taxonomy?: string;
  templateId?: string;
  dryRun: boolean;
  retag: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (name: string): string | undefined => {
    const idx = argv.indexOf(`--${name}`);
    return idx !== -1 ? argv[idx + 1] : undefined;
  };
  const has = (name: string): boolean => argv.includes(`--${name}`);

  return {
    md: get('md') as string,
    difficulty: get('difficulty') as string,
    answers: get('answers') as string,
    test: get('test') as string,
    batch: get('batch') as string,
    sourceTest: get('source-test') as string,
    institute: get('institute') as string,
    taxonomy: get('taxonomy'),
    templateId: get('template-id'),
    dryRun: has('dry-run'),
    retag: has('retag'),
  };
}

const subjectFromPartLabel = (label: string): Subject => {
  if (label === 'PHYSICS') return 'Physics';
  if (label === 'CHEMISTRY') return 'Chemistry';
  return 'Mathematics';
};

/**
 * Splits `text` on every match of `regex` (which must be a global regex
 * anchored to line start) into [{ index, groups }, body] segments running
 * from one match to the next (or end of string).
 */
function splitOnHeadings(text: string, regex: RegExp): Array<{ match: RegExpExecArray; body: string }> {
  const matches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  while ((m = re.exec(text))) {
    matches.push(m);
  }
  return matches.map((match, i) => {
    const start = match.index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    return { match, body: text.slice(start, end) };
  });
}

function parseMarkdownPaper(mdText: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];

  const partRegex = /^##\s*PART\s*-\s*([ABC])\s*\((PHYSICS|CHEMISTRY|MATHEMATICS)\)/m;
  const parts = splitOnHeadings(mdText, partRegex);

  for (const { match: partMatch, body: partBody } of parts) {
    const subject = subjectFromPartLabel(partMatch[2]);

    const sectionRegex = /^###\s*SECTION\s*-\s*([AB])\b/m;
    const sections = splitOnHeadings(partBody, sectionRegex);

    for (const { match: sectionMatch, body: sectionBody } of sections) {
      const section = sectionMatch[1] as SectionLetter;
      const questionType: 'multiple_choice' | 'numerical' = section === 'A' ? 'multiple_choice' : 'numerical';

      const qRegex = /^(\d+)\.\s/m;
      const qBlocks = splitOnHeadings(sectionBody, qRegex);

      for (const { match: qMatch, body: qBody } of qBlocks) {
        const questionNo = parseInt(qMatch[1], 10);
        let block = qBody.replace(/^\d+\.\s*/, '');

        const lines = block.split('\n');
        const stemLines: string[] = [];
        const options: string[] = [];
        let inOptions = false;

        for (const line of lines) {
          const optMatch = line.match(/^\(([a-d])\)\s?(.*)$/);
          if (optMatch) {
            options.push(optMatch[2]);
            inOptions = true;
          } else if (inOptions && options.length > 0 && line.trim().length > 0) {
            options[options.length - 1] += ' ' + line.trim();
          } else if (!inOptions) {
            stemLines.push(line);
          }
        }

        let stem = stemLines.join('\n').trim();
        stem = stem.replace(/_{3,}\.?\s*$/, '').trim();

        questions.push({
          questionNo,
          subject,
          section,
          questionType,
          stem,
          options: options.map(o => o.trim()),
        });
      }
    }
  }

  return questions.sort((a, b) => a.questionNo - b.questionNo);
}

function runAssertions(questions: ParsedQuestion[], difficulty: Record<string, string>, answers: Record<string, string>) {
  const errors: string[] = [];

  if (questions.length !== 75) {
    errors.push(`Expected 75 questions, found ${questions.length}`);
  }

  const numbers = questions.map(q => q.questionNo);
  for (let i = 1; i <= 75; i++) {
    if (!numbers.includes(i)) errors.push(`Missing question number ${i}`);
  }
  const dupes = numbers.filter((n, i) => numbers.indexOf(n) !== i);
  if (dupes.length > 0) errors.push(`Duplicate question numbers: ${Array.from(new Set(dupes)).join(', ')}`);

  const subjectRanges: Array<[Subject, number, number]> = [
    ['Physics', 1, 25],
    ['Chemistry', 26, 50],
    ['Mathematics', 51, 75],
  ];

  for (const [subject, lo, hi] of subjectRanges) {
    const inRange = questions.filter(q => q.questionNo >= lo && q.questionNo <= hi);
    const wrongSubject = inRange.filter(q => q.subject !== subject);
    if (wrongSubject.length > 0) {
      errors.push(`Questions ${wrongSubject.map(q => q.questionNo).join(',')} in range ${lo}-${hi} are tagged subject=${wrongSubject[0].subject}, expected ${subject}`);
    }

    const mcqs = inRange.filter(q => q.questionType === 'multiple_choice');
    const numericals = inRange.filter(q => q.questionType === 'numerical');
    if (mcqs.length !== 20) errors.push(`${subject}: expected 20 multiple_choice questions, found ${mcqs.length}`);
    if (numericals.length !== 5) errors.push(`${subject}: expected 5 numerical questions, found ${numericals.length}`);

    for (const q of mcqs) {
      if (q.options.length !== 4) errors.push(`${subject} Q${q.questionNo}: expected 4 options, found ${q.options.length}`);
    }
    for (const q of numericals) {
      if (q.options.length !== 0) errors.push(`${subject} Q${q.questionNo}: numerical question has ${q.options.length} options, expected 0`);
    }
  }

  for (const q of questions) {
    if (!difficulty[`Question ${q.questionNo}`]) {
      errors.push(`Q${q.questionNo}: missing difficulty entry`);
    }
    const answer = answers[String(q.questionNo)];
    if (answer === undefined) {
      errors.push(`Q${q.questionNo}: missing answer-key entry`);
    } else if (q.questionType === 'multiple_choice') {
      if (!['A', 'B', 'C', 'D'].includes(answer.toUpperCase())) {
        errors.push(`Q${q.questionNo}: MCQ answer key value "${answer}" is not one of A/B/C/D`);
      }
    } else {
      if (Number.isNaN(parseFloat(answer))) {
        errors.push(`Q${q.questionNo}: numerical answer key value "${answer}" does not parse as a number`);
      }
    }
  }

  return errors;
}

function buildQuestionIntent(subject: Subject, taxonomy: TaxonomyEntry | undefined, questionNo: number): string {
  if (taxonomy && taxonomy.topic && taxonomy.topic.length > 0) {
    return `Assesses ${taxonomy.topic.join(', ')} within ${taxonomy.chapter.join(', ') || taxonomy.unit}.`;
  }
  return `Assesses ${subject} problem-solving (Q${questionNo}).`;
}

async function main() {
  const args = parseArgs();
  const required: Array<keyof Args> = ['md', 'difficulty', 'answers', 'test', 'batch', 'sourceTest', 'institute'];
  for (const key of required) {
    if (!args[key]) {
      console.error(`Missing required --${key.replace(/([A-Z])/g, '-$1').toLowerCase()} argument`);
      process.exit(1);
    }
  }

  const mdText = fs.readFileSync(path.resolve(args.md), 'utf-8');
  const difficulty = JSON.parse(fs.readFileSync(path.resolve(args.difficulty), 'utf-8'));
  const answers = JSON.parse(fs.readFileSync(path.resolve(args.answers), 'utf-8'));
  const taxonomyMap: Record<string, TaxonomyEntry> = args.taxonomy
    ? JSON.parse(fs.readFileSync(path.resolve(args.taxonomy), 'utf-8'))
    : {};

  const questions = parseMarkdownPaper(mdText);
  const errors = runAssertions(questions, difficulty, answers);

  if (errors.length > 0) {
    console.error(`\n${errors.length} validation error(s) found — nothing was written:\n`);
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`Parsed ${questions.length} questions OK (25 Physics / 25 Chemistry / 25 Mathematics, 20 MCQ + 5 numerical each).`);

  const enriched = questions.map(q => {
    const taxonomy = taxonomyMap[String(q.questionNo)];
    const difficultyRaw = (difficulty[`Question ${q.questionNo}`] || '').toLowerCase();
    const answer = answers[String(q.questionNo)];

    return {
      questionNo: q.questionNo,
      subject: q.subject,
      section: q.section,
      questionType: q.questionType,
      unit: taxonomy?.unit || '',
      chapter: taxonomy?.chapter || [],
      topic: taxonomy?.topic || [],
      difficulty: ['easy', 'medium', 'hard'].includes(difficultyRaw) ? difficultyRaw : undefined,
      questionIntent: buildQuestionIntent(q.subject, taxonomy, q.questionNo),
      questionText: q.stem,
      markdownBody: q.stem,
      options: q.questionType === 'multiple_choice' ? q.options : [],
      optionsMarkdown: q.questionType === 'multiple_choice' ? q.options : [],
      correctOption: q.questionType === 'multiple_choice' ? String(answer).toUpperCase() : undefined,
      numericalAnswer: q.questionType === 'numerical' ? parseFloat(answer) : undefined,
      solutionText: '',
      isEmbedded: false,
      sourceTest: args.sourceTest,
    };
  });

  if (args.dryRun) {
    const outPath = path.resolve(__dirname, `../../../data/pinnacle/parsed_${args.sourceTest}.json`);
    fs.writeFileSync(outPath, JSON.stringify(enriched, null, 2));
    console.log(`\nDry run — wrote full parse to ${outPath}`);
    console.log('Summary:');
    for (const subject of ['Physics', 'Chemistry', 'Mathematics'] as Subject[]) {
      const subset = enriched.filter(q => q.subject === subject);
      const withTaxonomy = subset.filter(q => q.unit).length;
      console.log(`  ${subject}: ${subset.length} questions, ${withTaxonomy}/${subset.length} tagged with taxonomy`);
    }
    console.log('\nReview the file above, then re-run without --dry-run to commit.');
    return;
  }

  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('MONGO_URI is not set.');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const institute = await Institute.findOne({ name: args.institute });
  if (!institute) {
    console.error(`Institute "${args.institute}" not found — run the seed script first.`);
    process.exit(1);
  }
  const instituteId = institute._id;

  if (args.retag) {
    let updated = 0;
    for (const q of enriched) {
      const Model = getQuestionModel(q.subject);
      const res = await Model.updateOne(
        { instituteId, sourceTest: args.sourceTest, questionNo: q.questionNo },
        { $set: { unit: q.unit, chapter: q.chapter, topic: q.topic } }
      );
      if (res.matchedCount > 0) updated++;
    }
    console.log(`Retagged ${updated}/${enriched.length} questions for sourceTest=${args.sourceTest}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // Idempotent: wipe any prior ingest for this (institute, sourceTest) before inserting.
  const subjects: Subject[] = ['Physics', 'Chemistry', 'Mathematics'];
  for (const subject of subjects) {
    const Model = getQuestionModel(subject);
    const del = await Model.deleteMany({ instituteId, sourceTest: args.sourceTest });
    if (del.deletedCount > 0) console.log(`Deleted ${del.deletedCount} existing ${subject} questions for sourceTest=${args.sourceTest}`);
  }
  await Test.deleteOne({ instituteId, title: args.test });

  const insertedByQuestionNo = new Map<number, { id: mongoose.Types.ObjectId; subject: Subject }>();
  for (const subject of subjects) {
    const Model = getQuestionModel(subject);
    const docs = enriched.filter(q => q.subject === subject).map((doc) => ({
      ...doc,
      instituteId,
    }));
    const subjectQuestionNos = enriched.filter(q => q.subject === subject).map(q => q.questionNo);
    const inserted = await Model.insertMany(docs, { ordered: true });
    inserted.forEach((doc, i) => {
      insertedByQuestionNo.set(subjectQuestionNos[i], { id: doc._id as mongoose.Types.ObjectId, subject });
    });
    console.log(`Inserted ${inserted.length} ${subject} questions`);
  }

  const testQuestions = Array.from({ length: 75 }, (_, i) => i + 1).map(no => {
    const entry = insertedByQuestionNo.get(no)!;
    return { questionNo: no, questionId: entry.id, subject: entry.subject };
  });

  const test = await Test.create({
    instituteId,
    templateId: args.templateId || undefined,
    title: args.test,
    date: new Date(),
    examType: 'JEE Main Full Length',
    sourceExam: args.sourceTest,
    batches: [args.batch],
    totalQuestions: 75,
    marksPerQuestion: 4,
    negativeMarking: 1,
    isPublished: true,
    sections: [
      { subject: 'Physics', startQ: 1, endQ: 25 },
      { subject: 'Chemistry', startQ: 26, endQ: 50 },
      { subject: 'Mathematics', startQ: 51, endQ: 75 },
    ],
    questions: testQuestions,
  });

  console.log(`\nCreated test "${test.title}" (${test._id}) with ${test.questions.length} questions, batch=${args.batch}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
