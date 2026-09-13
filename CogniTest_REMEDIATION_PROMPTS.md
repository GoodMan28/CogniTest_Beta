# CogniTest — Remediation Execution Prompts (Post-Audit)

**Suggested filename:** `CogniTest_REMEDIATION_PROMPTS.md`

These prompts repair the demo implementation that was produced under `CogniTest_PHASEWISE_EXECUTION_PROMPTS.md`. An audit on 2026-09-13 found that `implementation/PHASE_STATUS.md` claims all nine phases are complete, but the code does not deliver the analysis feature. This document lists the verified defects with exact file locations, fixes the contracts once, and sequences the repair into seven phases.

**Execution rule:** Give the implementation model Section 0 (master remediation prompt) and Section 1 (authoritative contracts) together with **one remediation phase at a time**. Do not ask for all phases in one response. Every phase ends with the required report and an honest update to `implementation/PHASE_STATUS.md`.

**Precedence:** Where this document conflicts with `CogniTest_PHASEWISE_EXECUTION_PROMPTS.md` or `CogniTest_DEMO_IMPLEMENTATION_BLUEPRINT.md`, this document wins, because it was written against the real checkout. Where this document is silent, the master-prompt rules and shared contracts (Sections 2 and 3) of `CogniTest_PHASEWISE_EXECUTION_PROMPTS.md` still apply in full.

---

# 0. MASTER REMEDIATION PROMPT — Give this to the implementation model first

## Your role

You are repairing a partially implemented feature inside an existing repository. Much of the scaffolding is correct and must be preserved. Your job is to close the specific, verified gaps listed below, one phase at a time, without rewriting working code, without inventing new fields, and without marking anything complete that you did not run.

## Sources of truth, in order

1. The current repository files. Always open a file before editing it. Line numbers in this document were correct on 2026-09-13; re-verify them.
2. Section 1 of this document (authoritative contracts).
3. The phase you were given from this document.
4. `CogniTest_PHASEWISE_EXECUTION_PROMPTS.md` Sections 2–3 (master rules and shared contracts).
5. `CogniTest_DEMO_IMPLEMENTATION_BLUEPRINT.md` for product intent only.

`implementation/PHASE_STATUS.md`, `implementation/HANDOFF.md`, and `implementation/RUNBOOK.md` currently contain **false claims**. Do not treat them as facts. They are corrected in Phase R6.

## Verified repository facts (do not rediscover; do verify before editing)

Runtime and tooling, as found:

- Python service: `analysis_service/`, virtualenv at `analysis_service/venv/` (Windows: `analysis_service/venv/Scripts/python.exe`). Local interpreter is CPython 3.14; CI uses 3.10. Both must keep working — do not use syntax newer than 3.10.
- Dependencies are pinned in `analysis_service/requirements.txt` (FastAPI 0.141.1, Pydantic 2.13.5, PyMongo 4.18.1, PyJWT 2.8.0, bcrypt 4.1.2, defusedxml 0.7.1, pytest 9.1.1). Do not add packages except where a phase explicitly says so.
- Test command that works today: `cd analysis_service && venv\Scripts\python.exe -m pytest -q` → 30 passed.
- Settings: `analysis_service/app/config.py` uses `pydantic_settings.BaseSettings` reading `.env` in `analysis_service/`. Environment variables override the file.
- Frontend: `frontend/` is React 18 + TypeScript + Vite + Tailwind. `npx tsc --noEmit -p tsconfig.app.json` passes. There is **no** test framework, **no** `dompurify`, and **no** `.env` file in `frontend/`. Scripts: `dev`, `build` (`tsc -b && vite build`), `lint` (`oxlint`), `preview`.
- Vite proxy in `frontend/vite.config.ts` maps only `/api` → `http://localhost:5000` (Express). Nothing routes `/api/v2/demo` to FastAPI.
- Legacy Express backend in `backend/` uses Mongoose. Collections: `students`, `tests`, `evaluationreports`, `physics_questions`, `chemistry_questions`, `biology_questions`, `mathematics_questions` (the last added in the working tree, uncommitted).
- Mongoose model edits already made (uncommitted, correct, keep): `backend/src/models/Student.ts`, `Question.ts`, `Test.ts`, `EvaluationReport.ts` gained optional `analysisDemo` sub-documents; `omrImageUrl` is now optional.
- Frontend edits already made (uncommitted, keep the approach): `frontend/src/App.tsx` switches the `/student` subtree on `import.meta.env.VITE_USE_DEMO === 'true'`; `frontend/src/context/AuthContext.tsx` has a demo branch that lazy-imports `frontend/src/api/demoClient.ts`.
- FastAPI routers: `analysis_service/app/api/routers/auth.py` (prefix `/api/v2/demo/auth`: `activate`, `login`, `logout`, `me`) and `analysis_service/app/api/routers/reports.py` (prefix `/api/v2/demo/reports`: list, detail, practice, reflection). Cookie name `demo_token`, path `/api/v2/demo`, HttpOnly, SameSite=Lax, Secure.
- Domain modules that are correct and reused as-is: `analysis_service/app/domain/grading.py` (`GradeResult`, `normalize_integer`, `normalize_mcq`, `grade_one(kind, answer, key, option_count, correct_marks, incorrect_penalty)`), `analysis_service/app/domain/analytics.py` (`format_decimal`, `compute_metrics(key, label, results, max_marks, subject=None, overlapping=False) -> MetricBucket`, `evaluate_insight`), `analysis_service/app/schemas/reports.py` (`MetricBucket`, `QuestionResult`).
- Synthetic fixture: `analysis_service/tests/fixtures/synthetic_fixture.py` exports `MANIFEST`, `QUESTIONS`, `ANSWER_KEY`, `RESPONSES`. It currently has **no** roster and **no** recommendations; practice references are wrongly embedded in `QUESTIONS[*].recommendationRefs`.

## Verified defects (the audit findings this document fixes)

| ID | Location | Defect | Fixed in |
|---|---|---|---|
| D1 | `frontend/src/components/demo/BreakdownTable.tsx:8`, `ComparisonTable.tsx:8-9`, `RevisionPriorities.tsx:8` | Read `report.batchSnapshot.student_analysis.*`, `cohort_statistics.*`, `analysis.rank` — fields the backend never produces. All three components render `null`. | R1, R5 |
| D2 | `analysis_service/app/services/preparation.py:12-13` | `compute_metrics` and `evaluate_insight` are imported but never called. No breakdowns, insights, revision list, or per-question `QuestionResult` rows are computed or stored. `analysisDemo.snapshot` is never written. | R2, R3 |
| D3 | `analysis_service/app/services/preparation.py:49-55` and `app/repositories/students.py:26-31` | `students.json` is never loaded; names are fabricated as `"Student {enrollmentNo}"`, batch as `"DemoBatch"`, and `$set` overwrites `name`, `batch`, `email: None`, `profilePictureUrl: None` on existing records. Running `prepare` against a real database destroys student data. | R3 |
| D4 | `analysis_service/app/domain/comparisons.py:37-42` and `app/services/reports.py:97-98` | `batchSnapshot.toppers` is a list of other students' enrollment numbers, stored in every report and returned to every student. Cohort ignores batch entirely. Only the total mean is computed; no per-subject/difficulty/type class averages. | R2, R3, R4 |
| D5 | `analysis_service/app/cli.py:75-78` | `validate` is `pass`. Pydantic input schemas in `app/schemas/inputs.py` are only imported by `tests/unit/test_schemas.py`; `prepare` writes unvalidated JSON. | R3 |
| D6 | `analysis_service/app/cli.py:80-92`, `app/services/verification.py:50` | `recommendations.json` is never loaded; practice questions are never upserted; `verify` demands three refs per question so it can never pass on a real bundle. | R3 |
| D7 | `analysis_service/app/repositories/tests.py:78-95` | `publish_test` only checks `status == READY`; it does not require a passed verification. `rehearsal.py` publishes without verifying. | R3 |
| D8 | `analysis_service/app/repositories/reports.py:19-27` | `$set: {"analysisDemo": {...}}` replaces the whole sub-document, wiping `analysisDemo.reflections` on every rebuild. Comment says the opposite. | R3 |
| D9 | `analysis_service/app/services/preparation.py:180`, `app/services/verification.py:18` | `expectedStudents` is written at the top level of the test document; Mongoose schema defines it under `analysisDemo.expectedStudents`. | R3 |
| D10 | `analysis_service/app/services/auth.py:39-45` vs `backend/src/models/Student.ts` | Python stores `analysisDemo.activation.{digest,expiresAt,claimed}`; Mongoose declares `analysisDemo.{claimDigest,claimExpiresAt,claimedAt}`. | R3 |
| D11 | `analysis_service/app/services/reports.py:60-84` | Report detail loops every test question across four collections (N×4 queries). Practice does the same. Response omits `numericalAnswer`, `difficulty`, `unit`, `chapter`, `topic`, `solutionText`, and per-question status. | R4 |
| D12 | `frontend/src/components/demo/QuestionReview.tsx:24-37` | Client re-grades by comparing `selectedOption === correctOption`; `correctOption` is `null` for numerical questions, so every attempted numerical shows as incorrect. Violates "browser does not regrade". | R5 |
| D13 | `frontend/src/components/demo/PracticePanel.tsx:10`, `ReflectionInput.tsx:14` | Each instance calls `useDemoReport(reportId)`, which issues its own `GET /reports/{id}`; a 75-question report triggers ~150 redundant fetches. | R5 |
| D14 | `frontend/src/pages/StudentSignup.tsx:23`, `frontend/src/context/AuthContext.tsx` demo `signup` | Signup posts `{name, enrollmentNo, batch, email, password}` to `/auth/activate`, which requires `{enrollmentNo, code, password}` → 422. No activation form exists. | R5 |
| D15 | `frontend/vite.config.ts:12-17` | No proxy for `/api/v2/demo`; RUNBOOK §3 claims one exists. | R5 |
| D16 | `analysis_service/app/api/routers/auth.py:66-70` vs `frontend/src/context/AuthContext.tsx:5-13` | `/auth/me` returns `{id, enrollmentNo, name}`; the frontend `Student` type expects `_id`, `instituteId`, `batch`. `studentId` in context is always `null` in demo mode. | R4, R5 |
| D17 | `analysis_service/app/config.py:5` | Fallback `jwt_secret = "super-secret-default-key-for-dev"`. Blueprint forbids any fallback secret. Also `institute_id` and `mongodb_uri` have defaults that could silently point at the wrong data. | R0 |
| D18 | `analysis_service/app/services/rate_limiter.py` | Window relies solely on the TTL index; code never checks `expiresAt`, so a stale counter blocks logins until Mongo's TTL sweep. | R0 |
| D19 | `analysis_service/tests/integration/*.py` | Fixtures `delete_many({})` on `students`, `tests`, question collections using whatever `MONGODB_URI` is in `.env`. No guard that the database is a test database. `test_scenario_e2e.py` seeds `student_test_reports`, a collection the app never reads. | R0, R6 |
| D20 | `.gitignore` | `analysis_service/venv/` is not ignored. `backend/check.js` and `backend/check_subj.js` contain a hardcoded Atlas connection string with credentials and are untracked (would be committed by `git add .`). | R0 |
| D21 | `implementation/RUNBOOK.md`, `HANDOFF.md`, `PHASE_STATUS.md` | Claim a `check-indexes` CLI command (real: `indexes --check`), a Vite proxy that does not exist, DOMPurify sanitization that does not exist, and "Project is finished". | R6 |
| D22 | `analysis_service/rehearsal.py` | Bypasses `validate`/`verify`, fabricates 100 students into whatever DB `.env` points at, and its `delete_many` filter (`analysisDemo.sourceKey` on reports) matches nothing. Reported "10 ms report latency" measured a report with no analysis in it. | R6 |
| D23 | `analysis_service/app/api/dependencies/auth.py:17-35` | `get_current_student` does not check the student's `instituteId` against `settings.institute_id`. | R4 |
| D24 | `analysis_service/app/repositories/tests.py:43-63` | New demo tests get `title: f"Test {source_key}"`, `examType: "Demo"`, `date: now` instead of manifest values. | R3 |

## Working rules carried forward (in addition to the master prompt rules)

1. **Never run `prepare`, `publish`, `rehearsal.py`, or any integration test against a database whose name does not end in `_test`.** Phase R0 adds a guard; until then, check `analysis_service/.env` by hand before running anything that writes.
2. Preserve every symbol listed under "correct and reused as-is". Extend, do not rewrite.
3. When a fix changes a stored field name, update **both** the Python writer/reader and the Mongoose schema in `backend/src/models/` so they agree. Never leave the two describing different paths.
4. The snapshot in Section 1 is the single contract. Python Pydantic models, MongoDB storage, and TypeScript interfaces must match it field-for-field. Do not add a field to one side without adding it to the others.
5. Do not use `Any` in Python DTOs or `any` in TypeScript for snapshot data. If a field is not in Section 1, do not emit it.
6. Do not use `if not value` to detect skipped answers. Numerical `"0"` is a valid answer.
7. Every phase adds or updates tests that would have caught the defects it fixes. Name them in the phase report.
8. If a phase step is impossible in your environment (for example, no MongoDB running), mark it `NOT RUN`, give the exact command, and do not advance.
9. Do not edit `frontend/src/pages/Reports.tsx`, `StudentSignup.tsx`, `StudentLogin.tsx`, or any file under `backend/src/controllers/` or `backend/src/routes/`. Demo behavior is added through new files and the existing feature flag.
10. Do not commit. Leave changes in the working tree for the operator to review.

## Required response after every phase

```text
PHASE: R<number> — <name>
STATUS: COMPLETE | BLOCKED

Defects addressed: D<ids>

Repository facts verified:
- <path> — <what you confirmed before editing>

Files changed:
- <path> — <purpose>

Behavior implemented:
- ...

Checks actually run:
- <exact command> — <result with counts>

Checks not run:
- <exact command> — <reason>

Contract drift check:
- Python schema ↔ Mongo storage ↔ TypeScript: MATCH | MISMATCH (<detail>)

Remaining blockers:
- ...

Next permitted phase:
- R<n+1> | NONE
```

Also replace the contents of `implementation/PHASE_STATUS.md` with the current remediation status table (R0–R6, each `NOT STARTED | COMPLETE | BLOCKED`) and the latest phase report. Remove the sentence "Project is finished" in Phase R0 and do not reintroduce it until R6's exit criteria pass.

---

# 1. AUTHORITATIVE CONTRACTS — Apply in every remediation phase

This section replaces §3.5 of `CogniTest_PHASEWISE_EXECUTION_PROMPTS.md` with a complete shape. Everything below is a *target*; Phase R1 makes the code match it.

## 1.1 Prepared bundle files

```text
private_data/<test-key>/
  manifest.json          object   (ManifestSchema)
  questions.json         array    (QuestionSchema[])
  answer_key.json        array    (AnswerKeySchema[])
  students.json          array    (RosterEntrySchema[])   ← currently missing from ingestion
  responses.json         array    (StudentResponseSchema[])
  recommendations.json   array    (RecommendationSchema[]) ← currently missing from ingestion
```

`RosterEntrySchema` (new, `extra='forbid'`):

```text
enrollmentNo: str  (1..max_string_length, trimmed, must be unique case-insensitively within the file)
name: str          (1..max_string_length)
batch: str         (1..max_string_length)
email: str | None  (optional)
```

`RecommendationSchema` (replace the current stub in `app/schemas/inputs.py`, `extra='forbid'`):

```text
originalQuestionNo: int > 0
recommendations: list[PracticeQuestionSchema]   (length must equal manifest.recommendationsPerQuestion)
```

`PracticeQuestionSchema` (`extra='forbid'`): same fields as `QuestionSchema` **plus** `sourceKey: str` (1..200, unique across the file) and the answer, expressed as exactly one of `correctOption` (MCQ) or `numericalAnswer` (numerical), validated the same way as `AnswerKeySchema`.

`QuestionSchema` change: **remove** any acceptance of `recommendationRefs`. `extra='forbid'` already rejects it once the fixture stops sending it.

`ManifestSchema` change: `markingByType` becomes `Dict[Literal["multiple_choice","numerical"], MarkingSchema]` where `MarkingSchema` is `{correctMarks: Decimal > 0, incorrectPenalty: Decimal >= 0}` (parse from JSON numbers via `Decimal(str(x))`; reject non-finite). `date` must parse as a timezone-aware ISO-8601 datetime. `instituteId` must be a valid 24-hex ObjectId string and must equal `settings.institute_id`.

Cross-file validation (in `app/services/validation.py`, pure, no DB):

- `len(questions) == manifest.expectedQuestionCount`; question numbers are exactly `1..N` with no gaps or duplicates.
- Exactly one answer-key entry per question number, no extras; key type matches question type; MCQ key letter within `len(options)`.
- Every roster `enrollmentNo` unique (case-insensitive). Every response `enrollmentNo` exists in the roster. No duplicate response entries. `len(responses) == manifest.expectedStudentCount`.
- Every response has exactly one answer row per question number `1..N`; no extras.
- Every answer value is `null`, a string, or an int; MCQ answers normalize via `normalize_mcq`; numerical via `normalize_integer`. Failures name the file, enrollment number, question number, and reason.
- Recommendations: exactly one entry per original question number; each has exactly `recommendationsPerQuestion` items; practice `sourceKey`s unique across the file; practice subject in the registry; practice answers valid for their type.
- Result of validation is a typed `ValidatedBundle` dataclass holding the parsed models. `prepare` accepts only a `ValidatedBundle`.

## 1.2 Storage contract (MongoDB, additive, dotted paths only)

Use dotted `$set` paths for every write under `analysisDemo`. Never `$set` the `analysisDemo` object as a whole.

**`tests` document (demo-managed):**

```text
title, date, examType                  ← from manifest (D24)
totalQuestions                         ← len(questions)
marksPerQuestion, negativeMarking      ← 0 (legacy compat; never used for grading)
isPublished                            ← false, always
questions[]: {
  questionNo, questionId (ObjectId), subject,
  demoMarking: { correctMarks: number, incorrectPenalty: number },
  recommendations: [ { questionId: ObjectId, subject: str, sourceKey: str } ],   ← replaces recommendationRefs
  authoredDistractorExplanations?: { <letter>: str }
}
analysisDemo.managed: true
analysisDemo.sourceKey
analysisDemo.status: DRAFT | BUILDING | FAILED | READY | PUBLISHED
analysisDemo.buildId
analysisDemo.sourceHash
analysisDemo.expectedStudents          ← move here (D9)
analysisDemo.policy                    ← manifest.comparisonPolicy
analysisDemo.computedAt
analysisDemo.verifiedBuildId           ← NEW: set by `verify` on success; publish requires == buildId (D7)
analysisDemo.publishedAt
analysisDemo.lastError?                ← NEW: bounded (≤ 2000 chars) failure summary on FAILED
```

Update `backend/src/models/Test.ts`: rename `recommendationRefs: [String]` to `recommendations: [{ questionId: ObjectId, subject: String, sourceKey: String }]`; add `verifiedBuildId?: string` and `lastError?: string` under `analysisDemo`.

**`students` document:**

```text
instituteId, enrollmentNo, name, batch, email?    ← roster values
password?                                          ← NEVER touched by prepare
analysisDemo.claimDigest, claimExpiresAt, claimedAt ← align Python to these names (D10)
```

Roster upsert semantics (D3): match on `{instituteId, enrollmentNo}`; on **insert** set all roster fields; on **update** `$set` only `name` and `batch` **and only if the roster value is non-empty**; never write `email: null` or `profilePictureUrl: null`; never touch `password` or `analysisDemo.*`. Before writing, query for case-insensitive collisions (`enrollmentNo` regex `^<escaped>$` with `i`) and abort with an actionable error if a different-cased record exists.

**question collections (`<subject>_questions`):** unchanged shape; `analysisDemo.managed: true`, `analysisDemo.sourceKey`, `analysisDemo.contentHash`. Source keys: original `"<testKey>:original:<questionNo>"`, practice `"<testKey>:practice:<providedSourceKey>"`. Practice docs also store `correctOption` / `numericalAnswer` and `solutionText`.

**`evaluationreports` document (demo-managed):**

```text
studentId, testId, score (number), totalMarks (number)
performance.correct[] / incorrect[] / unanswered[]   ← question ObjectIds (legacy compat)
responses[]: { questionNo, selectedOption: str }      ← attempted answers only (legacy compat)
createdAt
analysisDemo.managed: true
analysisDemo.buildId
analysisDemo.sourceHash
analysisDemo.computedAt
analysisDemo.schemaVersion: "1.0"
analysisDemo.batchSnapshot                             ← CohortAggregates (1.4) — NO identities
analysisDemo.snapshot                                  ← StudentSnapshot (1.3)
analysisDemo.reflections.<questionNo>: { text, updatedAt, questionContentHash }  ← preserved across rebuilds (D8)
```

## 1.3 `StudentSnapshot` (stored in `analysisDemo.snapshot`; Python in `app/schemas/reports.py`; TS in `frontend/src/types/demoAnalysis.ts`)

All marks/percentages are decimal strings with two places (`format_decimal`). `null` means "not enough data".

```typescript
type DecimalText = string;
type QuestionStatus = 'correct' | 'incorrect' | 'skipped';
type QuestionType = 'multiple_choice' | 'numerical';
type Difficulty = 'easy' | 'medium' | 'hard';
type BreakdownScope = 'subject' | 'difficulty' | 'subjectDifficulty' | 'questionType' | 'unit' | 'chapter' | 'topic';
type InsightLabel = 'Strength' | 'Developing' | 'Needs improvement' | 'Limited evidence';

interface MetricBucket {                 // EXISTS in app/schemas/reports.py — keep as is
  key: string; label: string; subject?: string;
  questionCount: number; correct: number; incorrect: number; skipped: number; attempted: number;
  score: DecimalText; maximumMarks: DecimalText;
  accuracyPct: DecimalText | null; coveragePct: DecimalText | null;
  overlapping: boolean;
}

interface Breakdown {
  scope: BreakdownScope;
  label: string;                          // e.g. "By subject", "By topic"
  overlapping: boolean;                   // true for unit/chapter/topic
  buckets: MetricBucket[];                // ordered by first questionNo in which the key appears
}

interface QuestionMedia {
  imageUrl?: string;
  diagramSvg?: string;                    // ALREADY sanitized by app/services/validation.sanitize_svg at import
}

interface QuestionResult {               // EXISTS — add `media` and `questionNos` are not needed; add only `media?`
  questionNo: number; questionId: string; contentHash: string;
  subject: string; unit: string; chapter: string[]; topic: string[];
  questionType: QuestionType; difficulty: Difficulty; questionIntent: string;
  questionText: string; options: string[];
  studentAnswer: string | null;           // MCQ letter or normalized integer string; null = skipped
  correctAnswer: string;                  // MCQ letter or normalized integer string
  status: QuestionStatus;
  awardedMarks: DecimalText; maximumMarks: DecimalText;
  solutionText: string;
  selectedOptionExplanation?: string;
  practiceCount: number;
  media?: QuestionMedia;
}

interface Insight {
  key: string;                            // "<subject>::<topic>"
  subject: string; topic: string;
  label: InsightLabel;
  questionCount: number; attempted: number; correct: number; incorrect: number; skipped: number;
  accuracyPct: DecimalText | null;
  questionNos: number[];
}

interface RevisionItem {
  rank: number;                           // 1-based
  subject: string; topic: string;
  marksLost: DecimalText;                 // maximumMarks - score for that topic
  reason: 'inaccurate' | 'skipped';       // 'skipped' when skipped >= incorrect, else 'inaccurate'
  questionNos: number[];
  practiceCount: number;                  // sum of practiceCount of those questions
}

interface StudentSnapshot {
  schemaVersion: '1.0';
  summary: MetricBucket;                  // key "overall", overlapping false
  breakdowns: Breakdown[];                // exactly 7 entries, one per BreakdownScope, in the order listed above
  insights: Insight[];                    // one per (subject, topic) present in the paper
  revisionList: RevisionItem[];           // topics with marksLost > 0 only; sorted by marksLost desc, then subject, then topic; max 10
  questions: QuestionResult[];            // ordered by questionNo
}
```

Grouping keys (mandatory, prevents "Equilibrium" in two subjects merging):

| scope | key | label |
|---|---|---|
| subject | `subject` | subject |
| difficulty | `difficulty` | `Easy` / `Medium` / `Hard` |
| subjectDifficulty | `<subject>::<difficulty>` | `<subject> · <Difficulty>` |
| questionType | `multiple_choice` / `numerical` | `Multiple choice` / `Numerical` |
| unit | `<subject>::<unit>` | `<unit>` (bucket.subject = subject) |
| chapter | `<subject>::<chapter>` | `<chapter>` |
| topic | `<subject>::<topic>` | `<topic>` |

Insight thresholds (put in `app/domain/insights.py` as module constants, documented as heuristics): `MIN_ATTEMPTS_FOR_LABEL = 3`, `STRENGTH_ACCURACY = Decimal("80")`, `WEAK_ACCURACY = Decimal("50")`. `attempted < 3` → `Limited evidence`; accuracy ≥ 80 → `Strength`; < 50 → `Needs improvement`; otherwise `Developing`.

## 1.4 `CohortAggregates` (stored in `analysisDemo.batchSnapshot`; identical for all reports in the same cohort)

Cohort = all evaluated students with the same `batch` (from the roster) for this test build. Contains **no** enrollment numbers, names, ids, or per-student arrays.

```typescript
interface CohortCategoryStat {
  scope: 'overall' | 'subject' | 'difficulty' | 'questionType';
  key: string;                            // same keys as MetricBucket.key
  label: string;
  maximumMarks: DecimalText;
  classAverage: DecimalText;              // mean of category score over all cohort students
  topperScore: DecimalText;               // topper's category score, or mean of tied toppers' category scores
}

interface CohortAggregates {
  policy: string;                         // manifest.comparisonPolicy
  cohortLabel: string;                    // batch name
  cohortSize: number;
  computedAt: string;                     // ISO UTC
  available: boolean;                     // false when cohortSize < 2
  unavailableReason: string | null;       // "Comparison unavailable: only one evaluated student." when cohortSize == 1
  topperCount: number;                    // number of students tied at the highest overall score
  topperLabel: 'Topper' | "Joint toppers' average";
  categories: CohortCategoryStat[];       // empty when available == false
}
```

## 1.5 API DTOs (Python in `app/api/schemas/reports.py`; TS in `frontend/src/types/demoAnalysis.ts`)

```typescript
interface ReportSummaryDTO {
  reportId: string; testId: string; testTitle: string; testDate: string;
  score: DecimalText; maximumMarks: DecimalText;
  correct: number; incorrect: number; skipped: number; questionCount: number;
  computedAt: string;
}

interface ComparisonRow {
  scope: 'overall' | 'subject' | 'difficulty' | 'questionType';
  key: string; label: string;
  maximumMarks: DecimalText;
  yourScore: DecimalText;                 // from the viewer's own buckets
  classAverage: DecimalText;
  topperScore: DecimalText;
}

interface Comparisons {
  policy: string; cohortLabel: string; cohortSize: number; computedAt: string;
  available: boolean; unavailableReason: string | null;
  topperCount: number; topperLabel: 'Topper' | "Joint toppers' average";
  rows: ComparisonRow[];
}

interface ReflectionItemDTO { text: string; updatedAt: string; questionContentHash: string; stale: boolean; }

interface ReportDetailDTO {
  schemaVersion: '1.0';
  reportId: string;
  buildId: string;
  test: { testId: string; title: string; date: string; examType: string; questionCount: number; computedAt: string; publishedAt: string; };
  summary: MetricBucket;
  breakdowns: Breakdown[];
  comparisons: Comparisons;
  insights: Insight[];
  revisionList: RevisionItem[];
  questions: QuestionResult[];
  reflections: Record<string, ReflectionItemDTO>;   // keyed by questionNo as string
}

interface PracticeQuestionDTO {
  sourceKey: string; subject: string; questionType: QuestionType; difficulty: Difficulty;
  questionText: string; options: string[];
  correctAnswer: string;                  // letter or integer string — practice is self-study, not an exam
  solutionText: string;
  media?: QuestionMedia;
}

interface StudentMeDTO { id: string; instituteId: string; enrollmentNo: string; name: string; batch: string; }

interface ReflectionUpdateDTO { text: string; buildId: string; questionContentHash: string; }   // EXISTS
```

`reflections[*].stale` is `true` when the stored `questionContentHash` differs from the current `QuestionResult.contentHash` for that question number.

## 1.6 Fixture expectations (write these into `implementation/FIXTURE_EXPECTATIONS.md` in R1; tests assert them in R2/R3)

Fixture as extended in R1: questions and keys unchanged from `synthetic_fixture.py`; roster A/B/C in batch `Alpha`, D in batch `Beta`; A and C share the display name `"Rahul Sharma"`, B is `"Priya Nair"`, D is `"Arjun Mehta"`; marking +4/−1 for both types; 12 practice questions with source keys `p1..p3` (Physics, for Q1), `m1..m3` (Mathematics, Q2), `c1..c3` (Chemistry, Q3), `m4..m6` (Mathematics, Q4).

Per-student totals: A = 12, B = 12, C = 2, D = 16. Maximum = 16.

Student A summary: questionCount 4, correct 3, incorrect 0, skipped 1, attempted 3, score `"12.00"`, maximumMarks `"16.00"`, accuracyPct `"100.00"`, coveragePct `"75.00"`.

Student A subject buckets: Physics `4.00/4.00` acc `100.00` cov `100.00`; Mathematics `8.00/8.00` acc `100.00` cov `100.00`; Chemistry `0.00/4.00` acc `null` cov `0.00`.

Student A difficulty: Easy `4.00/4.00`; Medium `4.00/4.00`; Hard `4.00/8.00` acc `100.00` cov `50.00`.

Student A questionType: multiple_choice `4.00/8.00` (c1 i0 s1); numerical `8.00/8.00` (c2).

Student C summary: correct 1, incorrect 2, skipped 1, score `"2.00"`, accuracyPct `"33.33"`, coveragePct `"75.00"`.

Student C revisionList (exactly three items; Mathematics/Linear is excluded because its marksLost is `0.00`):

| rank | subject | topic | marksLost | reason | questionNos |
|---|---|---|---|---|---|
| 1 | Chemistry | Heat | `5.00` | inaccurate | `[3]` |
| 2 | Physics | 1D Motion | `5.00` | inaccurate | `[1]` |
| 3 | Mathematics | Power rule | `4.00` | skipped | `[4]` |

(Chemistry precedes Physics because ties on `marksLost` sort by subject name, then topic name.)

After the R6 answer-key correction (Q1 key `B` → `D`): totals become A = 7, B = 7, C = 7, D = 11; Alpha `overall` classAverage `7.00`, topperScore `7.00`, topperCount 3, topperLabel `"Joint toppers' average"`.

Insights for every student in this fixture: all `Limited evidence` (each topic has one question). A second, DB-free fixture in R2 (`tests/fixtures/insight_fixture.py`) must have a topic with ≥ 3 attempts to exercise `Strength` / `Developing` / `Needs improvement`.

Cohort Alpha (A, B, C): cohortSize 3, available true, topperCount 2, topperLabel `"Joint toppers' average"`.

| scope | key | classAverage | topperScore |
|---|---|---|---|
| overall | overall | `8.67` | `12.00` |
| subject | Physics | `2.33` | `4.00` |
| subject | Chemistry | `1.00` | `2.00` |
| subject | Mathematics | `5.33` | `6.00` |
| difficulty | easy | `2.33` | `4.00` |
| difficulty | medium | `2.67` | `2.00` |
| difficulty | hard | `3.67` | `6.00` |
| questionType | multiple_choice | `3.33` | `6.00` |
| questionType | numerical | `5.33` | `6.00` |

Cohort Beta (D only): cohortSize 1, available false, unavailableReason `"Comparison unavailable: only one evaluated student."`, categories `[]`.

Rounding: `ROUND_HALF_UP` to two places at serialization; e.g. 26/3 → `8.67`, 7/3 → `2.33`, 8/3 → `2.67`, 11/3 → `3.67`, 10/3 → `3.33`, 16/3 → `5.33`.

---

# 2. PHASE R0 PROMPT — Safety, secrets, and test isolation

## Objective

Make it impossible for the remaining phases to damage a real database or leak credentials. No feature work.

## Tasks

1. **`.gitignore`** (repository root): add `analysis_service/venv/`, `analysis_service/.pytest_cache/`, `**/__pycache__/`, `private_data/`, `backend/check.js`, `backend/check_subj.js`. Verify with `git check-ignore -v analysis_service/venv backend/check.js`.
2. **Credential files**: do not delete `backend/check.js` / `backend/check_subj.js` (they are the operator's). Instead, create `backend/SECRETS_WARNING.md` stating that these two files contain a live connection string, must never be committed, and that the operator should rotate the Atlas password. Report this in the phase output as a blocker for the operator.
3. **`analysis_service/app/config.py`** (D17): remove the defaults for `jwt_secret`, `institute_id`, and `mongodb_uri` so pydantic-settings raises at import when they are absent. Add `cookie_secure: bool = True`, `allowed_origins: list[str]` with no default, and `trusted_proxy_count: int = 0`. Keep the existing `max_*` limits. Add a `model_validator` that rejects `jwt_secret` shorter than 32 bytes.
4. **`analysis_service/.env.example`**: list every setting from step 3 with placeholder values and one comment each; add `ALLOWED_ORIGINS=["http://localhost:5173"]` as the documented local value (pydantic-settings parses JSON for list fields — verify this with a one-line Python check and record the result).
5. **Test database guard**: create `analysis_service/tests/conftest.py` that, **before any `app.*` import**, does `os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017/cognitest_test")`, sets `JWT_SECRET`, `INSTITUTE_ID`, `ALLOWED_ORIGINS` if absent, then imports `app.config.settings` and asserts the database name (parse with `pymongo.uri_parser.parse_uri`) ends with `_test`; otherwise `pytest.exit("Refusing to run integration tests against a non-test database")`. Move the repeated `delete_many` setup from each integration test module into a shared `clean_db` fixture in `conftest.py` and make the test modules use it. Remove the `student_test_reports` seeding from `test_scenario_e2e.py` (D19).
6. **Rate limiter** (D18): in `app/services/rate_limiter.py`, after the `find_one_and_update`, if `res["expiresAt"] < now`, atomically reset the document to `{count: 1, expiresAt: now + window}` and return `True`. Add `tests/unit/test_rate_limiter.py` (integration, uses `clean_db`) asserting: 10 allowed, 11th refused, and after manually setting `expiresAt` in the past the next call is allowed.
7. **Forwarded IP**: in `app/api/routers/auth.py::check_login_rate_limit`, if `settings.trusted_proxy_count > 0`, take the client IP from `X-Forwarded-For` (the entry `trusted_proxy_count` from the right); otherwise use `request.client.host`. Put this in a small helper in `app/api/dependencies/auth.py`.
8. **CI**: in `.github/workflows/ci.yml`, change `MONGODB_URI` to `mongodb://localhost:27017/cognitest_test`, set `JWT_SECRET` to a 40+ character placeholder, and add `ALLOWED_ORIGINS: '["http://localhost:5173"]'`.
9. Run `venv\Scripts\python.exe -m pytest -q` from `analysis_service/`. Expect the same 30 tests plus the new rate-limiter tests to pass. If `test_auth.py` fails because of the removed JWT default, fix the test environment via `conftest.py`, not by restoring the default.
10. Update `implementation/PHASE_STATUS.md` per the master prompt.

## Forbidden in this phase

- Changing any grading, analysis, ingestion, or frontend logic.
- Deleting the operator's helper scripts.
- Weakening `secure=True` on the cookie.

## Exit criteria

- `git status` shows `venv/` and the two credential files as ignored.
- Importing `app.config` without `JWT_SECRET` raises a clear error.
- Integration tests refuse to run against a database not named `*_test`.
- All tests pass with the new guard active.

---

# 3. PHASE R1 PROMPT — Contracts and fixture

## Objective

Make the Python schemas, TypeScript types, and fixture match Section 1 exactly. No ingestion or UI behavior changes yet; the UI may temporarily fail type-checks against the old field names — that is expected and is fixed in R5. Keep `npx tsc --noEmit -p tsconfig.app.json` passing by leaving the old components untouched and only *adding* the new types in this phase.

## Tasks

1. **`analysis_service/app/schemas/inputs.py`**: implement `RosterEntrySchema`, `MarkingSchema`, the `ManifestSchema` changes, `PracticeQuestionSchema`, and `RecommendationSchema` exactly as in §1.1. Keep `extra='forbid'` everywhere except where §1.1 says otherwise. Validators must raise `ValueError` with messages that include the offending `questionNo` / `enrollmentNo` / `sourceKey`.
2. **`analysis_service/app/schemas/reports.py`**: keep `MetricBucket` and `QuestionResult` (add `media: Optional[QuestionMedia] = None` to `QuestionResult`); add `QuestionMedia`, `Breakdown`, `Insight`, `RevisionItem`, `StudentSnapshot`, `CohortCategoryStat`, `CohortAggregates` per §1.3–1.4. Delete `SnapshotResponse` (unused). Use `Literal` types for every enumerated field.
3. **`analysis_service/app/api/schemas/reports.py`**: replace the DTOs with `ReportSummaryDTO`, `ComparisonRow`, `Comparisons`, `ReflectionItemDTO` (with `stale`), `ReportDetailDTO`, `PracticeQuestionDTO`, and keep `ReflectionUpdateDTO` per §1.5. Add `StudentMeDTO` to `app/api/routers/auth.py` (or `app/schemas/auth.py`) per §1.5. Do **not** wire them into services yet (R4).
4. **`frontend/src/types/demoAnalysis.ts`**: replace the file contents with the TypeScript from §1.3–1.5 verbatim (types, not classes). Export everything. Do not touch the components in this phase.
5. **Fixture** `analysis_service/tests/fixtures/synthetic_fixture.py`:
   - Remove `recommendationRefs` from every `QUESTIONS` entry.
   - Add `STUDENTS` (roster per §1.6, four entries, two with the same `name`).
   - Add `RECOMMENDATIONS` (four entries, three practice questions each, per §1.6; every practice question has full metadata, `sourceKey`, an answer, and `solutionText`; use the same subject as its original question).
   - Set `MANIFEST["instituteId"]` to `"60c72b2f9b1e8a001c8e4a5d"` (the CI/test institute id) and `MANIFEST["date"]` to `"2026-09-12T00:00:00+00:00"`.
   - Add `EXPECTED` — a dict literal transcribing §1.6 (totals, A's summary and buckets, C's summary and first revision item, Alpha and Beta cohort tables). Tests in R2/R3 import this instead of hardcoding numbers.
6. **`implementation/FIXTURE_EXPECTATIONS.md`**: rewrite with the §1.6 tables and the rounding rule.
7. **`implementation/CONTRACTS.md`**: rewrite to point at §1 of this document and list the three files that must stay in sync (`app/schemas/reports.py`, `app/api/schemas/reports.py`, `frontend/src/types/demoAnalysis.ts`).
8. **Tests** — extend `tests/unit/test_schemas.py`:
   - Manifest with negative penalty fails; with `markingByType` missing `numerical` when the paper has a numerical question is checked in R3 (cross-file), not here.
   - Roster with `"a1"` and `"A1"` fails (case-insensitive duplicate).
   - Recommendation with 2 practice questions when manifest says 3 fails (cross-file — implement in R3; here only test that `RecommendationSchema` parses the fixture).
   - `QuestionSchema` rejects `recommendationRefs`.
   - `PracticeQuestionSchema` rejects an entry with both `correctOption` and `numericalAnswer`, and one with neither.
   - Round-trip: every fixture list parses into its schema without error.
9. Run `pytest -q` (all pass) and `npx tsc --noEmit -p tsconfig.app.json` (passes because nothing imports the new names yet).

## Exit criteria

- Section 1 shapes exist in Python and TypeScript with identical field names.
- Fixture contains roster, recommendations, and `EXPECTED`.
- `FIXTURE_EXPECTATIONS.md` matches `EXPECTED`.

---

# 4. PHASE R2 PROMPT — Pure analysis domain (no DB, no HTTP)

## Objective

Produce a complete `StudentSnapshot` and `CohortAggregates` from validated inputs using pure functions. Fixes D2 and the computation half of D4.

## Tasks

1. **`analysis_service/app/domain/results.py`** (new): `build_question_results(questions, answer_key, response, marking_by_type, question_ids, content_hashes, practice_counts) -> list[QuestionResult]`. Inputs are plain validated models/dicts plus lookup maps (`questionNo -> str(ObjectId)`, `questionNo -> contentHash`, `questionNo -> int`). For each question in `questionNo` order call `grade_one` from `app/domain/grading.py`; fill every `QuestionResult` field; `correctAnswer` is the normalized key (`normalize_mcq` / `normalize_integer`); `studentAnswer` is `GradeResult.normalized_answer`; `maximumMarks` is the type's `correctMarks`; populate `media` from `imageUrl` / `diagramSvg` if present. Keep `Decimal` internally and format only when building the model.
2. **`analysis_service/app/domain/analytics.py`**: keep `compute_metrics`; add `build_summary(results) -> MetricBucket` (key `overall`) and `build_breakdowns(results) -> list[Breakdown]` producing the seven scopes with the keys/labels from §1.3. `results` here is `list[tuple[QuestionResult, GradeResult]]` or the `QuestionResult` list with `Decimal` re-parsed — choose one and document it in the docstring. Buckets keep insertion order of first appearance by `questionNo`. Unit/chapter/topic breakdowns set `overlapping=True` and count a question once per matching tag. Do not derive any total from overlapping scopes.
3. **`analysis_service/app/domain/insights.py`** (new): constants per §1.3; `build_insights(results) -> list[Insight]` grouped by `(subject, topic)`; `build_revision_list(results, practice_counts) -> list[RevisionItem]` ranked by `marksLost` desc, then subject, then topic, capped at 10, `reason` per §1.3. Delete `evaluate_insight` from `analytics.py` only after nothing imports it (grep first).
4. **`analysis_service/app/domain/comparisons.py`**: replace `compute_cohort_stats` with `build_cohort_aggregates(policy, batch_label, per_student_buckets, computed_at) -> CohortAggregates`, where `per_student_buckets: dict[str, dict[str, MetricBucket]]` maps an *opaque* student key to `{bucket_key: MetricBucket}` for the overall, subject, difficulty, and questionType scopes. Rules: `cohortSize < 2` → `available=False` with the exact reason string, `categories=[]`, `topperCount=cohortSize`. Otherwise: toppers = students whose overall score equals the max; `topperCount = len(toppers)`; `topperLabel = "Topper"` if 1 else `"Joint toppers' average"`; each category's `classAverage` = mean of that category's score over all cohort students; `topperScore` = mean over toppers. Output must not contain the student keys.
5. **`analysis_service/app/domain/snapshot.py`** (new): `build_student_snapshot(results, practice_counts) -> StudentSnapshot` composing summary, breakdowns, insights, revision list, and questions. This is the only function `prepare` calls for the per-student snapshot.
6. **Tests** (all DB-free, under `tests/unit/`):
   - `test_results.py`: fixture student A/B/C/D rows match `EXPECTED` statuses and awarded marks; numerical `"0"` and `-2` correct; `"+04"` normalizes; `false`, `"4.0"`, `"1e2"` raise.
   - `test_analytics.py` (extend): `build_summary` and `build_breakdowns` for A and C match `EXPECTED`; overlapping breakdown never changes the summary; a question tagged with two topics appears in both topic buckets but once in summary; same topic name in two subjects yields two keys; input order shuffled gives identical output.
   - `test_insights.py`: uses `tests/fixtures/insight_fixture.py` (new; ≥ 3 attempts per topic) to assert all four labels; revision ranking, tie-break, `reason`, and the cap of 10.
   - `test_comparisons.py` (rewrite): Alpha and Beta tables from `EXPECTED`; output JSON (`model_dump()`) contains no enrollment numbers or names; batches never mix.
   - `test_snapshot.py`: `build_student_snapshot` for A has 7 breakdowns in the required order and `questions` sorted by `questionNo`.
7. Run `pytest tests/unit -q`. Report the count.

## Forbidden in this phase

- Importing `app.db`, `pymongo`, or `fastapi` in any `app/domain/*` module.
- Calling any LLM or external service.

## Exit criteria

- Every number in `EXPECTED` is produced by domain functions.
- No domain module imports database or HTTP code.

---

# 5. PHASE R3 PROMPT — Validation, ingestion, verification, publication

## Objective

Make `validate`, `prepare`, `verify`, `publish` real, safe, idempotent, and reflection-preserving. Fixes D3, D5, D6, D7, D8, D9, D10, D24 and the storage half of D4.

## Tasks

1. **Bundle loading** — `analysis_service/app/services/bundle.py` (new): `load_bundle(dir) -> RawBundle` reads the six files (missing file → error naming the file); `validate_bundle(raw, settings) -> ValidatedBundle` runs the per-file Pydantic schemas and the cross-file checks from §1.1 and returns typed models. Errors are collected into a list and raised together as `BundleValidationError(errors: list[str])` so the operator sees everything at once. Never print answer values or codes in errors beyond question/enrollment identifiers.
2. **CLI `validate`** (`app/cli.py`): call `load_bundle` + `validate_bundle`; print each error on its own line; exit 1 on any error; print `Bundle valid: N questions, M students, K practice questions` on success. No DB access.
3. **CLI `prepare`**: require a successful `validate_bundle` first (same process), then call `run_preparation_algorithm(bundle)`. Remove `--instituteId` from `prepare`, `verify`, `publish`, `unpublish`, `issue-claims`; use `settings.institute_id` and assert `manifest.instituteId == settings.institute_id`. Print the target database name (from `parse_uri`, never the URI) before writing.
4. **Roster upsert** (`app/repositories/students.py`, D3): implement §1.2 semantics — case-insensitive collision check first, `$setOnInsert` for `instituteId`, `enrollmentNo`, `email`; `$set` only `name`/`batch` when non-empty; never write `password`, `profilePictureUrl`, or `analysisDemo.*`. Return `enrollmentNo -> ObjectId`.
5. **Practice upsert** (`app/repositories/questions.py`): add `upsert_practice_questions(institute_id, test_key, recommendations) -> dict[str, ObjectId]` keyed by provided `sourceKey`, using stored key `"<testKey>:practice:<sourceKey>"`, storing `correctOption`/`numericalAnswer`, `solutionText`, `analysisDemo.{managed, sourceKey, contentHash}`. Sanitize `diagramSvg` with `sanitize_svg` before storing (both original and practice).
6. **Preparation** (`app/services/preparation.py`) — rewrite the body to:
   1. Canonicalize and hash the validated bundle (all six files, sorted by their natural keys).
   2. `acquire_build_lock` (existing) → `test_id` or abort.
   3. In `try`: upsert roster; upsert original questions; upsert practice questions; build `Test.questions[]` with `demoMarking` and `recommendations: [{questionId, subject, sourceKey}]`.
   4. For each response: `build_question_results` → `build_student_snapshot`; legacy `score`/`totalMarks`/`performance`/`responses`.
   5. Group students by roster `batch`; `build_cohort_aggregates` per batch using each student's overall/subject/difficulty/questionType buckets.
   6. `check_bson_size` on each report; upsert reports with **dotted paths** (`analysisDemo.managed`, `analysisDemo.buildId`, `analysisDemo.sourceHash`, `analysisDemo.computedAt`, `analysisDemo.schemaVersion`, `analysisDemo.snapshot`, `analysisDemo.batchSnapshot`) so `analysisDemo.reflections` is preserved (D8). Fix `app/repositories/reports.py` accordingly.
   7. `update_test` with `title`, `date`, `examType` from the manifest (D24), `totalQuestions`, `questions`, `analysisDemo.expectedStudents` (D9), `analysisDemo.policy`, `analysisDemo.status: "READY"`, and `$unset analysisDemo.verifiedBuildId` and `analysisDemo.lastError`.
   8. On exception: set `analysisDemo.status: "FAILED"` and `analysisDemo.lastError` (truncate to 2000 chars), re-raise.
   Delete the now-unused imports. `run_preparation_algorithm` must accept only a `ValidatedBundle`.
7. **Verification** (`app/services/verification.py`): recompute from the bundle directory (add `--dir` to `verify`) — re-run `validate_bundle`, rebuild every student's snapshot in memory, and compare `summary.score`, `summary.correct/incorrect/skipped`, and the subject/difficulty/questionType bucket scores against the stored snapshot; compare stored `batchSnapshot` against a recomputed `CohortAggregates`; check `expectedStudents` under `analysisDemo`; one report per student; all `buildId`s equal; every `Test.questions[].recommendations` has exactly `recommendationsPerQuestion` entries whose `questionId`s exist in the named subject collection; student and test `instituteId` match settings; each stored `contentHash` matches a recomputed hash. On success `$set analysisDemo.verifiedBuildId = buildId` **only if** `analysisDemo.buildId` still equals it (conditional update). On failure print every mismatch and exit 1.
8. **Publication** (`app/repositories/tests.py::publish_test`, D7): the update filter must include `analysisDemo.status: "READY"` **and** `$expr: {$eq: ["$analysisDemo.verifiedBuildId", "$analysisDemo.buildId"]}`. Return a distinct error message when the test is READY but unverified. Add the same message to the CLI.
9. **Activation field names** (`app/services/auth.py`, D10): store/read `analysisDemo.claimDigest`, `analysisDemo.claimExpiresAt`, `analysisDemo.claimedAt` (set `claimedAt` on success instead of a `claimed` boolean; "already used" means `claimedAt` exists). Update the atomic filter accordingly (`claimedAt: {$exists: false}`). Update `tests/integration/test_auth.py`.
10. **Mongoose parity** (`backend/src/models/Test.ts`): apply the §1.2 changes (`recommendations`, `verifiedBuildId`, `lastError`). Run `cd backend && npx tsc --noEmit` and report.
11. **Indexes** (`app/repositories/indexes.py`): add a partial unique index on `students` `(instituteId, enrollmentNo)` only if one does not already exist (inspect `list_indexes` first; legacy has a global unique on `enrollmentNo` — do not drop it). Add `(instituteId, analysisDemo.status)` on `tests`.
12. **Tests** (integration, using `clean_db`):
   - `test_validation.py` (new): missing file, count mismatch, missing response row, unknown enrollment, duplicate case-insensitive enrollment, recommendation count mismatch, key/type mismatch — each produces an error mentioning the identifier.
   - `test_preparation.py` (rewrite): prepare twice → identical counts for tests, students, reports, original and practice questions (12 practice docs); pre-existing student with a `password` and `profilePictureUrl` keeps both and keeps `email`; two students named `Rahul Sharma` remain two `_id`s; a stored reflection survives a rebuild; stored snapshot for A equals `EXPECTED`; `batchSnapshot` for A/B/C equals the Alpha table and for D the Beta table; `batchSnapshot` JSON contains no enrollment numbers; test document has manifest `title`; injected failure (monkeypatch `upsert_student_reports` to raise) → status `FAILED`, `lastError` set, no PUBLISHED.
   - `test_publication.py` (rewrite): publish before verify → error; verify → `verifiedBuildId` set; publish → PUBLISHED; re-prepare with a changed key while PUBLISHED → lock refused; unpublish → READY; corrected key + prepare + verify + publish → all four reports rebuilt, C's score changes; a recommendation removed from `RECOMMENDATIONS` → `validate` fails before any write.
   - `test_scenario_e2e.py`: switch to the fixture bundle (write it to a temp dir as JSON and run through `load_bundle`), remove `student_test_reports`, keep the auth/isolation assertions, and assert `detail["summary"]["score"] == "12.00"` and `detail["comparisons"]["rows"][0]["classAverage"] == "8.67"` once R4 lands (mark those two asserts `xfail(strict=True)` until then, then un-mark in R4).
13. Run the whole suite and report counts.

## Forbidden in this phase

- Any write to a collection without `instituteId` in the filter.
- `$set` of `analysisDemo` as an object.
- Touching `password`, `profilePictureUrl`, or `analysisDemo.claim*` inside `prepare`.
- Automatic lock stealing.

## Exit criteria

- `validate` → `prepare` → `verify` → `publish` works on the fixture bundle written to disk, via the CLI, against the `_test` database, and prints no credentials.
- All R3 tests pass; reflections survive rebuilds; no identities in `batchSnapshot`.

---

# 6. PHASE R4 PROMPT — API delivery from the stored snapshot

## Objective

Serve `ReportDetailDTO`, practice, and reflections from stored data with bounded queries. Fixes D11, D16, D23 and the delivery half of D4.

## Tasks

1. **`app/api/dependencies/auth.py::get_current_student`** (D23): add `"instituteId": ObjectId(settings.institute_id)` to the `find_one` filter; project only `_id, instituteId, enrollmentNo, name, batch`.
2. **`/auth/me`** (D16): return `StudentMeDTO` with `id`, `instituteId`, `enrollmentNo`, `name`, `batch`.
3. **`app/services/reports.py`** — rewrite:
   - `get_student_reports`: keep the aggregation but add `$match` on `test.instituteId`, project `test.title`, `test.date`, `analysisDemo.snapshot.summary`, `analysisDemo.computedAt`; map to `ReportSummaryDTO` (score/maximumMarks from the snapshot summary strings, not the legacy floats).
   - `get_report_detail`: one `find_one` on `evaluationreports` with projection `{analysisDemo, testId}`, one `find_one` on `tests` with projection `{title, date, examType, totalQuestions, instituteId, analysisDemo.status, analysisDemo.buildId, analysisDemo.publishedAt, analysisDemo.computedAt}`; enforce the six authorization checks from Phase 6 of the original prompts; **no per-question queries**; build `Comparisons` by joining `batchSnapshot.categories` with the viewer's own buckets (`summary` for `overall`, else the matching bucket in the `subject`/`difficulty`/`questionType` breakdown) to fill `yourScore`; compute `reflections[*].stale` against `snapshot.questions[*].contentHash`; return `ReportDetailDTO`.
   - `get_practice_questions`: after authorization, read `Test.questions[questionNo].recommendations`, group `questionId`s by `subject`, run one `find({"_id": {"$in": ids}})` per subject with a projection of the fields in `PracticeQuestionDTO`, map `correctOption`/`numericalAnswer` to `correctAnswer` via the normalizers, preserve the stored recommendation order.
   - `update_reflection`: keep the existing logic, but take the current `contentHash` from `snapshot.questions` instead of querying the question collection; treat empty `text` as `$unset`; return the stored item so the router can echo it.
4. **Routers**: map `ValueError` subclasses to 404/409 as today; add `Cache-Control: private, no-store` to the reflection `PUT` response as well; keep `response_model=` on every route so undeclared fields cannot leak.
5. **CORS**: do not add `CORSMiddleware`. Document in `RUNBOOK.md` (R6) that the API must be same-origin via proxy; `verify_origin` remains the CSRF guard.
6. **Tests** (`tests/integration/test_reports.py`, rewrite; `test_scenario_e2e.py`, un-xfail):
   - Detail for A: `summary`, `breakdowns[0]` (subject), `comparisons.rows` match `EXPECTED`; `comparisons.topperLabel == "Joint toppers' average"`.
   - Detail for D: `comparisons.available is False`, `rows == []`, reason string exact.
   - Response JSON contains no key named `enrollmentNo`, `name`, `toppers`, or `password` outside `test.title`-style fields (assert by walking the dict).
   - A cannot read B's report (404); anonymous → 401; unpublished → 404; stale build → 404.
   - Practice for Q1 returns 3 items with `correctAnswer` and `solutionText`; practice for Q99 → 404.
   - Reflection save → detail shows it with `stale: false`; after a rebuild that changes Q1's `questionText`, the same reflection shows `stale: true`.
   - Query-count guard: monkeypatch `pymongo.collection.Collection.find_one` and `find` to count calls; detail must issue ≤ 2 queries after authentication.
7. Run the whole suite; report counts.

## Exit criteria

- All report endpoints serve Section 1 DTOs with no grading on the request path and no per-question loops.
- No other student's identity appears in any response.

---

# 7. PHASE R5 PROMPT — Frontend integration against the real contract

## Objective

Make the React demo render the snapshot, stop client-side grading, add the activation form, and route dev traffic to FastAPI. Fixes D1, D12, D13, D14, D15, D16.

## Tasks

1. **Dev proxy** (`frontend/vite.config.ts`, D15): add `'/api/v2/demo': { target: 'http://localhost:8000', changeOrigin: false }` **before** the existing `'/api'` entry (Vite matches in declaration order). Add `frontend/.env.example` with `VITE_USE_DEMO=true` and a comment. Do not add `.env` itself.
2. **Auth adapter** (`frontend/src/context/AuthContext.tsx`, D16): in the demo branch, map `StudentMeDTO` to the existing `Student` shape (`_id: id`, `instituteId`, `name`, `enrollmentNo`, `batch`). Change `signup`'s demo branch to accept `{ enrollmentNo, code, password }` and post exactly that. Keep the legacy branch byte-identical. Change `logout`'s type in `AuthContextType` to `() => void | Promise<void>` if TypeScript complains — otherwise leave the interface untouched.
3. **Activation page** (D14): create `frontend/src/pages/DemoActivate.tsx` with fields enrollment number, activation code, password, confirm password; on submit call `signup({ enrollmentNo, code, password })` then `navigate('/student/reports')`; show the server's `detail` message on 400 and a generic message otherwise. In `frontend/src/App.tsx`, when `VITE_USE_DEMO === 'true'`, route `/student/signup` to `DemoActivate` and keep `StudentSignup` for the legacy branch. Also make the demo login redirect land on `/student/reports` (the existing `index` `Navigate` already does this — verify, do not edit `StudentLogin.tsx`).
4. **Hooks** (D13): `useDemoReport` stays the single fetcher and is called **once** in `DemoReportDetail.tsx`. `PracticePanel` and `ReflectionInput` receive `getPracticeQuestions` / `updateReflection` as props and must not call `useDemoReport`. `updateReflection` returns the saved `ReflectionItemDTO` and updates local state instead of re-fetching the whole report. `useDemoReports` maps the new `ReportSummaryDTO`.
5. **Components** — rewrite against `frontend/src/types/demoAnalysis.ts`; no `any`:
   - `ScoreSummary`: from `report.summary` and `report.test` (title, date, computedAt).
   - `BreakdownTable`: render each `Breakdown`; show `Not enough data` for `null` percentages; `No questions in this category` for an empty bucket list; the caption `Overlapping categories; do not sum rows` when `overlapping`. Subject/difficulty first, then the remaining five in a collapsible section.
   - `ComparisonTable`: from `report.comparisons`; when `available === false` render only `unavailableReason`; header for the topper column uses `topperLabel`; footer shows `cohortLabel`, `cohortSize`, `computedAt`. Remove the rank row entirely (rank is out of scope).
   - `RevisionPriorities`: from `report.revisionList` (subject, topic, marksLost, reason, question numbers) and `report.insights` grouped by label.
   - `QuestionReview` (D12): use `q.status`, `q.studentAnswer`, `q.correctAnswer` from the snapshot; never compare answers in the client; numerical questions render values (`Your answer: 0`, `Correct answer: −2`) and no options list; skipped renders `Skipped`; filters count by `q.status`; pass `report.buildId` and `q.contentHash` to `ReflectionInput`; render `q.media.imageUrl` as `<img>`; render `q.media.diagramSvg` **only** through `dompurify` (`DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })`) — add `dompurify` and `@types/dompurify` as dependencies in this phase and record the versions.
   - `PracticePanel`: render `correctAnswer` and `solutionText` only after the student clicks reveal; label the panel "Self-study practice — not scored".
   - `LockedFeatureCard`: unchanged; confirm it makes no request.
   - `DemoStudentLayout`: unchanged except the `logout` typing if needed.
6. **Legacy call audit**: `frontend/src/App.tsx` calls `axios.get('/api/v1/institute')` on load. In demo mode this hits a private legacy route. Guard it: skip the call when `VITE_USE_DEMO === 'true'` and fall back to a static title. This is the only permitted edit outside the demo files.
7. **Frontend tests**: add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` as devDependencies; add `"test": "vitest run"` to `package.json`; create `frontend/src/components/demo/__tests__/` with: `QuestionReview` shows `0` for a numerical answer of `"0"` and `Skipped` for `null`; filter counts equal snapshot status counts; `ComparisonTable` renders the unavailable reason when `available` is false; `LockedFeatureCard` triggers no `fetch`/axios call (spy). Use a fixture JSON literal typed as `ReportDetailDTO` matching `EXPECTED` for student A. If installation fails in your environment, report `NOT RUN` with the exact command; do not fake results.
8. Run `npx tsc --noEmit -p tsconfig.app.json`, `npm run build` with `VITE_USE_DEMO=true`, and `npm test`. Report results.

## Forbidden in this phase

- Editing `Reports.tsx`, `StudentSignup.tsx`, `StudentLogin.tsx`, `ProtectedRoute.tsx`.
- Any `any` on snapshot data; any `dangerouslySetInnerHTML` without DOMPurify.
- Storing the report in `localStorage`.

## Exit criteria

- With FastAPI on :8000, `npm run dev`, and the fixture published to the `_test` database, an activated fixture student sees summary, seven breakdowns, comparisons (Alpha) or the unavailable notice (Beta), revision list, ordered question review with correct numerical rendering, practice reveal, and a saved reflection — and the network panel shows only `/api/v2/demo/*` requests.

---

# 8. PHASE R6 PROMPT — Tests, CI, rehearsal, and truthful documentation

## Objective

Prove the repaired flow end to end and replace every false claim in the implementation records. Fixes D19 (remainder), D21, D22.

## Tasks

1. **End-to-end integration test** (`tests/integration/test_scenario_e2e.py`, final form): write the fixture bundle to a temp directory; run `validate`, `prepare`, `verify`, `publish` through the CLI functions; `issue-claims` to a temp file; activate A; login; list; detail (assert `EXPECTED`); practice; reflection; logout; login as B; assert A's report is 404 for B; unpublish → list empty; correct Q1 key to `D`, prepare, verify, publish → A, B, C all become `"7.00"`, D becomes `"11.00"`, Alpha `overall` classAverage `"7.00"`, topperCount 3 (values pinned in §1.6); A's reflection persists with `stale: false` (text unchanged) — then change Q1's `questionText` and rebuild → `stale: true`.
2. **Rehearsal** (`analysis_service/rehearsal.py`, D22): rewrite to (a) refuse to run unless the database name ends with `_test` or `--i-know-this-is-staging` is passed together with an explicit `--database-name` that matches; (b) accept `--dir` for a real or generated bundle; (c) run `validate → prepare → verify → publish` via the same functions the CLI uses; (d) time each stage; (e) measure `get_report_detail` latency over 50 calls on a *complete* snapshot; (f) print BSON size of the largest report. Generating a synthetic bundle (`--generate N_STUDENTS N_QUESTIONS`) must produce roster, recommendations, and a manifest that passes `validate`.
3. **CI** (`.github/workflows/ci.yml`): add `npm test` to the frontend job; keep both jobs; ensure the Python job's env matches `conftest.py` requirements.
4. **`implementation/RUNBOOK.md`** (D21): rewrite every command so it matches `app/cli.py` exactly (`indexes --check`, `indexes --apply`, `validate --dir`, `prepare --dir`, `verify --test-key --dir`, `publish --test-key`, `unpublish --test-key`, `issue-claims --test-key --out`). Include the Vite proxy entry added in R5, the `_test` database rule, the correction flow (backup → unpublish → fix JSON → prepare → verify → publish), the failed-build recovery (`unlock` only if you add such a command; otherwise document the manual `$set` with the precondition that the old process is confirmed stopped), backup/restore commands (`mongodump --db … --collection …` with the four collections), and readiness checks (`GET /health`).
5. **`implementation/HANDOFF.md`**: remove the DOMPurify-on-server claim and the "meets the definition of done" sentence; list real limitations: single-correct answers only, exact-integer numericals, no rank/percentile, comparisons per batch only, practice not scored, media limited to `imageUrl`/sanitized `diagramSvg`, legacy Express exposure must be blocked at the proxy (unchanged blocker).
6. **`implementation/DEPLOYMENT_PLAN.md`**: keep; add the FastAPI `trusted_proxy_count` setting and `X-Forwarded-For` requirement from R0.
7. **`implementation/PHASE_STATUS.md`**: final table R0–R6 with the last test counts, plus the honest remaining blockers: operator must rotate the leaked Atlas password, block legacy `/api/v1` publicly, supply real marking scheme and 225 practice questions.
8. **`implementation/REPO_FACTS.md`**: update the models section (Mathematics exists; `analysisDemo` fields; `omrImageUrl` optional) and the proxy section.
9. Run everything: `pytest -q` (all), `npx tsc --noEmit -p tsconfig.app.json`, `npm run build` (`VITE_USE_DEMO=true`), `npm test`, `cd backend && npx tsc --noEmit`. Report exact counts and any failure verbatim.

## Exit criteria

- Every command in `RUNBOOK.md` has been executed at least once in this phase and its output recorded.
- No document under `implementation/` claims anything that was not run.
- All suites pass, or the failures are listed with commands.

---

# 9. Phase-to-phase handoff wrapper

Use this wrapper when starting each remediation phase:

> Read `CogniTest_REMEDIATION_PROMPTS.md` Section 0 and Section 1, then `implementation/PHASE_STATUS.md`, `CONTRACTS.md`, and `FIXTURE_EXPECTATIONS.md`. Open every file named in the phase before editing it and confirm the line numbers still match; if they do not, say so and proceed from the current content. Execute only Phase R`<N>`. Do not re-implement earlier remediation phases, do not touch files the phase forbids, and do not add fields absent from Section 1. Run the phase's checks against a database whose name ends in `_test`. Finish with the required phase report and update `implementation/PHASE_STATUS.md`. If any exit criterion is unmet, report `BLOCKED` with the exact command and output.

---

# 10. Definition of done for the remediation

The remediation is complete when all of the following are true and were observed, not assumed:

- `validate` rejects every malformed fixture variant in `test_validation.py` before any write.
- `prepare` on the fixture stores a complete `StudentSnapshot` and identity-free `CohortAggregates`, twice, without changing counts, and without altering an existing student's password, email, or profile picture.
- `verify` recomputes and reconciles; `publish` refuses an unverified build.
- `GET /api/v2/demo/reports/{id}` returns `EXPECTED` for student A with ≤ 2 database queries after authentication and no other student's identity.
- The React demo renders all seven breakdowns, comparisons or the unavailable notice, the revision list, correct numerical answers including `0`, practice reveal, and persisted reflections, using only `/api/v2/demo/*` requests.
- The activation form works against `/auth/activate`.
- `implementation/*.md` describe only commands and results that were executed.
- The leaked credential files are ignored and the operator has been told to rotate the password.
