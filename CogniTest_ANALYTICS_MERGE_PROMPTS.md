# CogniTest — Student Analytics Merge: Implementation Prompts

**Suggested filename:** `CogniTest_ANALYTICS_MERGE_PROMPTS.md`

These prompts finish merging the "Quiz Analysis Report" layout (the reference PDF: Scoreboard → Subject-Wise → Hit Rate → Difficulty → Marks by Question Type → Question-by-Question → Fix It Zone → Drill Down → Strengths & Improvements) into the **existing** student report page at `frontend/src/pages/Reports.tsx`, backed by the **existing** Express backend and MongoDB models.

They are written for an implementation model with repository and terminal access. Every number, field name, file path and heading in this document was taken from the actual repository and the live database — treat them as facts, not suggestions.

**Execution rule:** Give the model the Master Prompt (Section 2) plus Sections 3–5 as permanent context, then **one phase at a time** (Sections 6–9). Do not ask it to do every phase in one response. Carry the "Implementation notes" it produces forward between phases.

---

# 1. What is already done and what is not

## 1.1 Starting state (already in the working tree — do NOT redo)

| Area | File | Status |
|---|---|---|
| Model | `backend/src/models/EvaluationReport.ts` | `mistakeReasons?: Array<{ questionNo: number; reason: string }>` added to the interface and schema. |
| Controller | `backend/src/controllers/reportAnalysisController.ts` | **Complete and verified** against live data (JEE + NEET tests). Exports `getReportAnalysis`, `getPracticeQuestions`, `saveMistakeReason`. |
| Routes | `backend/src/routes/reportRoutes.ts` | Three routes registered (see Section 4). The existing `GET /:reportId/review` now also loads `mathematics_questions`, returns `difficulty` + `questionType` per question, and normalises `correctOption` to a letter. |
| Types | `frontend/src/types/reportAnalysis.ts` | **Complete.** `ReportAnalysis`, `AnalysisBucket`, `AnalysisChapter`, `AnalysisQuestion`, `AnalysisCohort`, `AnalysisInsights`, `PracticeQuestion`, `FIX_IT_REASONS`, `SUBJECT_PALETTE`, `subjectColor()`, `STATUS_COLORS`. |
| Charts | `frontend/src/components/charts/DonutChart.tsx`, `GroupedBarChart.tsx` | Moved here from `components/demo/charts/` (demo imports already updated). Pure SVG, no dependencies. |
| Sections | `frontend/src/components/analysis/` | **Done:** `SectionCard.tsx` (shell + helpers), `ScoreboardSection.tsx`, `SubjectWiseSection.tsx`, `HitRateSection.tsx`, `BatchComparisonSection.tsx`. |

## 1.2 Remaining work (this document)

1. Six more section components in `frontend/src/components/analysis/` (Phase 1).
2. Wire everything into `frontend/src/pages/Reports.tsx` — fetch, layout merge, dynamic subject tabs, real practice questions, print view (Phase 2).
3. Verify: typecheck, lint, manual run on both live tests, print preview (Phase 3).

## 1.3 Explicitly excluded (no data exists for these)

The PDF's **Time Utilization Report**, **Subject Flow (road diagram)**, the **Total Time** tile and the **Time Taken / Avg. Time** column cannot be implemented: reports are OMR-derived and `EvaluationReport` stores no timing. **Do not fake these.** Do not render a "locked" placeholder for them either — simply omit them.

---

# 2. MASTER PROMPT — give this to the implementation model first

## Your role

You are finishing a feature in an existing React 18 + TypeScript + Tailwind v4 frontend that talks to an Express 5 + Mongoose backend. The backend part is finished. You are writing React components and editing one large page file. Work carefully, in small verified steps, and never rewrite what already works.

## Sources of truth, in priority order

1. The actual code in the repository (read it before editing it).
2. Section 4 of this document (API contract) — it matches `backend/src/controllers/reportAnalysisController.ts` exactly.
3. Section 5 of this document (target layout).
4. The reference PDF headings/copy quoted in Section 5.

## Mandatory working rules

- **Do not rewrite `Reports.tsx`.** It is ~1900 lines with an admin view, a student list view, a student review view (Overview + per-subject tabs), a practice modal and a print block. You are *inserting* into the student review view. Every existing section listed in Section 5.2 as "keep" must still render exactly as before.
- **Never use `any` for the new analysis data.** Import the types from `frontend/src/types/reportAnalysis.ts`. (The existing page uses `any` for `reviewData` — leave that alone.)
- **Use the existing visual language:** white cards `bg-white rounded-xl shadow-sm border border-gray-200 p-6`, headings `font-black text-gray-900 tracking-tight`, small uppercase labels `text-[10px]/text-xs font-bold text-gray-500 uppercase tracking-wider/widest`, Material Symbols icons via `<span className="material-symbols-outlined">name</span>`, LaTeX via `<LatexText text={...} />` from `frontend/src/components/LatexText.tsx`. Do not add UI libraries. `recharts` is installed but unused on this page — keep using the pure-SVG charts in `components/charts/`.
- **Every new section is a self-contained component** in `frontend/src/components/analysis/` that takes `analysis: ReportAnalysis` (plus callbacks where stated) and renders through `SectionCard`. No fetching inside section components.
- **Subjects are dynamic.** Never hardcode `['Physics','Chemistry','Biology']` in new code. The JEE test in the database has `Mathematics`. Iterate `analysis.subjects` (already in section order) and colour with `subjectColor(label, index)`.
- **Percent values are numbers or `null`.** `null` means "no attempts" — render `N/A` via `fmtPct()` from `SectionCard.tsx`. Never divide by zero in the UI; the server already did the maths.
- **Print:** the page uses `print:hidden` / `hidden print:block`. New sections must work inside the print block too (they are plain DOM + inline SVG). Add `print:break-inside-avoid` on rows/blocks that must not split.
- After each phase run, from `frontend/`: `npx tsc -b --noEmit` (or `npx tsc --noEmit -p tsconfig.app.json` if `-b` refuses `--noEmit`) and `npm run lint`. Both must pass with no new errors before you report the phase done.
- If something in this document contradicts the code, the code wins — say so in your implementation notes and adapt.

## Required response after every phase

1. Files created / modified (paths).
2. Commands run and their results (paste the last lines of tsc/lint output).
3. Any deviation from this document and why.
4. "Implementation notes" — 5–15 bullets the next phase needs (state names you introduced, helper signatures, gotchas).

---

# 3. Ground truth about the data (from the live database)

Read this before writing any rendering logic; it explains every edge case the components must handle.

## 3.1 Collections in use

`tests` (2), `evaluationreports` (36), `students` (37), `physics_questions` (385), `chemistry_questions` (415), `biology_questions` (330), `mathematics_questions` (100). A legacy `questions` collection (50 docs) is **not** used by any test — ignore it.

## 3.2 The two tests

| | NEET test | JEE test |
|---|---|---|
| title | `AITS NEET 2027 TEST - 01` | `JEE Mock Test 01` |
| examType | `NEET` | `JEE` |
| subjects | Physics, Chemistry, Biology | Physics, Chemistry, **Mathematics** |
| `sections[]` | present (1–45, 46–90, 91–180) | absent |
| `totalQuestions` | 180 — **but `questions[]` has 208 entries** (28 extra with `marks: 4` and no `subject`; the subject is resolved from the question doc) | 75 |
| marks | test-level `marksPerQuestion: 4`, `negativeMarking: 1` | test-level values are **0**; every `questions[i].demoMarking = { correctMarks: 4, incorrectPenalty: 1 }` |
| `report.totalMarks` | 720 (= 180 × 4, inconsistent with the 208 real rows → server `summary.maxMarks` = 832) | 300 |
| `difficulty` on questions | **absent on ~80 %** → server labels them `Unrated` | all set (`easy/medium/hard` → `Easy/Medium/Tough`) |
| `questionType` | absent → treated as `Single Correct` | `multiple_choice` / `numerical` → `Single Correct` / `Numerical` |
| `questions[i].recommendations` | none | 3 per question → practice endpoint returns them |
| reports | 5 (batch `NEET-2027 Alpha`) | 31 (batches Alpha / Beta / Gamma; one report has no `responses[]`) |

Consequences for the UI:

- Show `analysis.summary.maxMarks` in the new sections (the truthful sum), while the existing hero keeps showing `report.totalMarks`. Do not try to reconcile them in the UI.
- Difficulty charts must cope with a single `Unrated` bucket (NEET) and with the full Easy/Medium/Tough set (JEE). `Unrated` is always last.
- Question type tables must cope with one type (NEET) or two (JEE). Column list = `analysis.questionTypes.types`.
- `chapter` is an **array** on every question; a question can belong to several chapters and several topics, so chapter/topic counts **overlap** and must never be summed to reproduce the subject total. Chapter label `Uncategorized` exists in NEET data.
- Some `topic[]` arrays are empty → the server groups those under a topic named `General`.

## 3.3 Existing report shapes used by the page

`GET /api/v1/reports/:reportId/review` (unchanged contract, now with Mathematics + `difficulty` + `questionType` per question) returns `{ report, test, questions[], batchScores[] }`. `questions[i].status` is `'correct' | 'incorrect' | 'unanswered'`, `studentChoice` is a letter or `'unanswered'`, `correctOption` is now always a letter (or the numerical answer string).

## 3.4 Auth

Student requests use plain `axios` with `axios.defaults.headers.common['Authorization']` set by `AuthContext` after login; admin requests use `adminApi` (`frontend/src/api/adminApi.ts`). `Reports.tsx` already picks `api = isAdmin ? adminApi : axios`. The three new backend routes use `tenantAuth`, which accepts both token kinds, and the controller refuses a student who is not the report's owner (403) and unpublished tests (403).

---

# 4. API contract (implemented — do not change the backend)

All three routes are mounted under `/api/v1/reports` in `backend/src/routes/reportRoutes.ts`.

## 4.1 `GET /api/v1/reports/:reportId/analysis` → `ReportAnalysis`

```ts
{
  reportId: string;
  generatedAt: string;                       // ISO
  test: { _id: string; title: string; examType: string; date: string; totalQuestions: number };
  student: { name: string; enrollmentNo: string; batch: string } | null;

  summary: AnalysisBucket;                   // key "overall"
  subjects: AnalysisBucket[];                // section order, then first-appearance order
  difficulty: {
    overall: AnalysisBucket[];               // labels ⊆ ["Easy","Medium","Tough","Unrated"], in that order, only present ones
    bySubject: Record<string, AnalysisBucket[]>;   // same rule per subject; bucket.subject is set
  };
  questionTypes: {
    types: string[];                         // e.g. ["Single Correct","Numerical"] or ["Single Correct"]
    overall: AnalysisBucket[];               // one per type
    bySubject: Array<{ subject: string; cells: AnalysisBucket[] }>;  // cells aligned with `types`
  };
  chapters: Record<string, AnalysisChapter[]>;   // subject -> chapters (each with `topics: AnalysisBucket[]`)
  questions: AnalysisQuestion[];             // ordered by questionNo
  cohort: AnalysisCohort;
  insights: AnalysisInsights;
}

AnalysisBucket = {
  key: string; label: string; subject?: string;
  questionCount: number; correct: number; incorrect: number; skipped: number; attempted: number;
  score: number; maxMarks: number; positiveMarks: number; negativeMarks: number;   // negativeMarks <= 0
  accuracyPct: number | null;   // 1 decimal; null if attempted == 0
  attemptPct: number | null;    // 1 decimal; null if questionCount == 0
}

AnalysisQuestion = {
  questionNo: number; questionId: string; subject: string;
  chapter: string[]; topic: string[];
  difficulty: string; questionType: string;
  status: 'correct' | 'incorrect' | 'unanswered';
  awardedMarks: number; maxMarks: number;
  pctStudentsCorrect: number;   // integer 0–100, over ALL reports of this test
  reason: string | null;        // saved Fix-It reason
  hasLinkedPractice: boolean;   // test.questions[i].recommendations non-empty
}

AnalysisCohort = {
  size: number; rank: number; percentile: number;          // same formulas the page already uses
  classAverage: number; topperScore: number; topperCount: number;
  scores: number[];                                        // all scores, descending
  subjects: Array<{ subject: string; classAverage: number; topperScore: number }>;
}

AnalysisInsights = {
  strengths: string[];      // ready-to-render sentences
  improvements: string[];
  strongChapters: Array<{ subject: string; chapters: string[] }>;   // strings like "Rotation Motion (7 C / 1 In / 1 Un)"
  weakChapters:   Array<{ subject: string; chapters: string[] }>;
}
```

Real sample (JEE, weakest student): `summary = { questionCount: 75, correct: 0, incorrect: 75, skipped: 0, attempted: 75, score: -60, maxMarks: 300, positiveMarks: 0, negativeMarks: -60, accuracyPct: 0, attemptPct: 100 }`. Note `score` **can be negative** and the marks donut must skip negative slices (already handled in `SubjectWiseSection`).

Real sample (NEET): `difficulty.overall = [ { label: "Unrated", correct: 102, incorrect: 73, skipped: 33, ... } ]`, `questionTypes.types = ["Single Correct"]`.

Response time: ~1.6 s for the 31-report test (it re-scores every report for cohort stats). Show a loading state; do not call it more than once per report view.

## 4.2 `GET /api/v1/reports/:reportId/questions/:questionNo/practice` → `PracticeQuestion[]` (0–3 items)

```ts
PracticeQuestion = {
  questionId: string; subject: string; chapter: string[]; topic: string[];
  difficulty: string;                       // Easy | Medium | Tough | Unrated
  questionType: 'multiple_choice' | 'numerical';
  questionText: string; options: string[];  // options may be [] for numerical
  correctOption: string;                    // letter "A".."D", or numerical answer as string
  solutionText: string; diagramSvg?: string; imageUrl?: string;
}
```

Source: authored `recommendations` first, else same-subject questions sharing a topic, else sharing a chapter (excluding questions that are in the test). Empty array is a valid response → show "No practice questions available for this concept yet."

## 4.3 `PUT /api/v1/reports/:reportId/questions/:questionNo/reason` body `{ reason: string }` → `{ questionNo, reason: string | null }`

Student-only (admin gets 403). Empty string clears the tag. Max 120 chars. The next `/analysis` call returns it in `questions[i].reason`.

---

# 5. Target layout of the student review view

## 5.1 Where things live in `Reports.tsx` today (line numbers are approximate; search for the quoted strings)

| Anchor (search string) | What it is |
|---|---|
| `const [reviewData, setReviewData] = useState<any \| null>(null);` | student review state block (≈ line 175) |
| `const [practiceModalData, setPracticeModalData] = useState<any[] \| null>(null);` | practice modal state |
| `const fetchReviewDetails = async (reportId: string) => {` | loads `/review`; **add the `/analysis` fetch here** |
| `if (!isAdmin && selectedReportId && reviewData) {` | start of the student review render (≈ line 290) |
| `const subjects = ['Physics', 'Chemistry', 'Biology'] as const;` | hardcoded subjects for `subjectStats` (≈ line 300) |
| `{/* === PRINTABLE PDF VIEW (HIDDEN IN UI, VISIBLE IN PDF) === */}` | print block start |
| `<h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Complete Question Collection</h3>` | print block: full question list (keep it last) |
| `{/* === INTERACTIVE UI (HIDDEN IN PDF) === */}` | interactive start |
| `{['Overview', 'Physics', 'Chemistry', 'Biology'].map(tab => (` | hardcoded tab list |
| `{activeTab === 'Overview' ? (` | Overview tab content start |
| `{/* Hero Stats */}` | keep |
| `{/* Quick Stats Strip */}` | replaced by Scoreboard (see 5.2) |
| `{/* Subject Performance */}` | keep |
| `{/* Batch Standing */}` | keep |
| `{/* Topic Mastery */}` / `{/* AI Performance Insight */}` | keep (2-column grid) |
| `{/* Filter Controls (All, Correct, Incorrect, Unanswered) */}` | per-subject tab content |
| `{q.status === 'incorrect' && (mockRecommendations as any)[q.questionId] && (` | the mock "View Recommended Practice" button → replace with real endpoint |
| `{/* Practice Modal Overlay */}` | existing modal; reuse |
| `const SUBJECT_THEMES = {` | Tailwind theme per subject — **add `Mathematics`** |

## 5.2 Final Overview tab order (top → bottom)

| # | Section | Source | Action |
|---|---|---|---|
| 1 | Hero Stats (title, date, Total Score, Accuracy) | existing | keep unchanged |
| 2 | **💪 Scoreboard: Where You Stand Right Now** | `ScoreboardSection` (done) | **replaces** the existing "Quick Stats Strip" (its four numbers are all inside the Scoreboard) |
| 3 | Subject Performance cards | existing | keep; make it iterate dynamic subjects (5.4) |
| 4 | **📊 Subject-Wise Performance Analysis** | `SubjectWiseSection` (done) | insert |
| 5 | **⚡ Hit Rate vs. Hustle Rate** | `HitRateSection` (done) | insert |
| 6 | Your Batch Standing (rank, percentile, bell curve) | existing | keep; feed `rank/percentile/totalBatchStudents` from `analysis.cohort` when available, else the current computation |
| 7 | **🏁 You vs. the Batch** | `BatchComparisonSection` (done) | insert directly under Batch Standing |
| 8 | **📈 Difficulty Level Analysis** | `DifficultySection` (Phase 1) | insert |
| 9 | **💯 Marks by Question Type: Where You Earn the Most** | `QuestionTypeSection` (Phase 1) | insert |
| 10 | Topic Mastery + AI Performance Insight (2-col grid) | existing | keep; make the `<select>` list dynamic subjects |
| 11 | **🔍 Question-by-Question Breakdown: Learn from Every Move** | `QuestionBreakdownSection` (Phase 1) | insert |
| 12 | **🔧 Fix It Zone: Because Every Mistake Has a Comeback** | `FixItZoneSection` (Phase 1) | insert |
| 13 | **🔍 Drill Down Mode: Track Every Concept You Touched** | `DrillDownSection` (Phase 1) | insert |
| 14 | **Strength and Improvement Areas** | `StrengthsSection` (Phase 1) | insert (last) |

While `analysis` is still loading (or failed), sections 2, 4, 5, 7, 8, 9, 11–14 render a small inline placeholder card ("Preparing deep analysis…" / "Deep analysis unavailable") and the **existing** Quick Stats Strip is shown in place of the Scoreboard so the page never looks empty.

## 5.3 Per-subject tabs

Unchanged behaviour (filters + expandable question rows with options and solution), with three edits:

1. Tab list = `['Overview', ...subjectList]` where `subjectList` is derived in 5.4.
2. The "View Recommended Practice" button appears for `incorrect` **and** `unanswered` rows and calls the real practice endpoint (5.5) instead of `mockRecommendations`. Remove the `mockRecommendations` import once nothing references it.
3. A row can be opened programmatically: `QuestionBreakdownSection` and `FixItZoneSection` call `onOpenQuestion(subject, questionId)` → the page sets `activeTab = subject`, `statusFilter = 'all'`, `expandedQuestionId = questionId` and scrolls to top.

## 5.4 Dynamic subjects

```ts
const subjectList: string[] = analysis
  ? analysis.subjects.map(s => s.label)
  : Array.from(new Set<string>(questions.map((q: any) => q.subject))).filter(Boolean);
```

`activeTab` / `masterySubject` / `selectedSubject` state types become `string`. `SUBJECT_THEMES` gains a `Mathematics` entry (orange: `text-orange-600 / bg-orange-500 / border-orange-200 / border-orange-100 / hover:bg-orange-50 / fill-orange-500/20 / stroke-orange-600`) and a `getTheme(subject)` helper that falls back to a neutral gray theme for unknown subjects. `subjectStats` iterates `subjectList` and, when `analysis` exists, takes `score`, `maxMarks`, `correct`, `incorrect`, `skipped`, `accuracyPct` from the matching `analysis.subjects` bucket (so JEE per-question marking is correct) — otherwise keep the current `+4 / −1` fallback.

## 5.5 Practice modal (reuse the existing overlay)

State already exists: `practiceModalData: any[] | null`, `practiceModalAnswers: Record<number,string>`. Change `practiceModalData` to `PracticeQuestion[] | null`, add `practiceModalTitle: string` and `practiceLoading: boolean`. Add:

```ts
const openPractice = async (questionNo: number, label: string) => {
  setPracticeLoading(true); setPracticeModalTitle(label); setPracticeModalAnswers({});
  try {
    const res = await api.get<PracticeQuestion[]>(`/api/v1/reports/${selectedReportId}/questions/${questionNo}/practice`);
    setPracticeModalData(res.data);
  } catch { setPracticeModalData([]); }
  finally { setPracticeLoading(false); }
};
```

Modal edits: show `practiceModalTitle` under the heading; when `practiceModalData.length === 0` show the empty-state sentence; for `questionType === 'numerical'` (or `options.length === 0`) render a "Reveal answer" button instead of options — clicking it sets `practiceModalAnswers[idx] = mq.correctOption` so the existing solution block appears; render `diagramSvg` (already-sanitised server side, use `dangerouslySetInnerHTML` inside a bordered box like the review rows do) above the options when present.

## 5.6 Print block

Directly **after** the existing "Topic Mastery (Print Version)" block and **before** "Complete Question Collection", render, when `analysis` exists: `ScoreboardSection`, `SubjectWiseSection`, `HitRateSection`, `BatchComparisonSection`, `DifficultySection`, `QuestionTypeSection`, `QuestionBreakdownSection` (with `onOpenQuestion` undefined → rows not clickable), `DrillDownSection` (with `defaultExpanded` so topics print), `StrengthsSection`. Skip `FixItZoneSection` in print (its dropdowns are interactive). Wrap them in `<div className="space-y-6 mb-8">`. The page already triggers `window.print()` from the "Download PDF" button and from `?printReportId=…`; both must include the new sections, which they will because they render from state.

---

# 6. PHASE 0 PROMPT — Verify the baseline

## Objective

Confirm the starting state in Section 1.1 is real and both toolchains are green before touching anything.

## Tasks

1. From `backend/`: `npx tsc --noEmit -p tsconfig.json` → must print nothing.
2. From `frontend/`: `npx tsc -b --noEmit` and `npm run lint`. **Known pre-existing failures (verified at hand-off, not yours to fix):** tsc reports 6 unused-variable errors (`TS6133`/`TS6196`) in `src/components/demo/FixItZone.tsx` and `src/components/demo/StrengthsAndImprovements.tsx`; lint reports 6 `react`/`react-hooks` **warnings** in `src/pages/Reports.tsx` (lines ≈ 21, 197, 198, 210, 218). Your bar is: no *new* tsc errors and no *new* lint warnings. Filter with `npx tsc -b --noEmit 2>&1 | grep -v "components/demo/"` when checking your own work.
3. Read, fully: `frontend/src/types/reportAnalysis.ts`, every file in `frontend/src/components/analysis/`, `frontend/src/components/charts/*.tsx`, and `frontend/src/pages/Reports.tsx` lines 1–330 and the student review render (from `if (!isAdmin && selectedReportId && reviewData)` to the end of that `return`).
4. Read `backend/src/controllers/reportAnalysisController.ts` once, top to bottom, so the response shape in Section 4 is concrete to you.
5. Confirm the props of the four finished sections: each is `({ analysis }: { analysis: ReportAnalysis })`. Confirm `SectionCard` exports `fmtPct`, `pctTone`, `marksTone`, `thClass`, `tdClass` and accepts `emoji, title, description?, tips?, action?, id?, children`.

## Deliverables

Implementation notes listing: the exact tsc/lint commands that work in this repo, any pre-existing lint/tsc errors, and the exact line numbers of every anchor in Section 5.1.

## Exit criteria

Both toolchains run; anchors located; no files modified.

---

# 7. PHASE 1 PROMPT — Remaining section components

## Objective

Create six components in `frontend/src/components/analysis/`. Each: default export, typed props, renders through `SectionCard`, no fetching, no `any`.

## 7.1 `DifficultySection.tsx`

Props: `{ analysis: ReportAnalysis }`.

- `SectionCard` emoji `📈`, title **Difficulty Level Analysis**, description *"Every question has a level — Easy, Medium, or Tough. These charts show how you handled each zone across all subjects."*, tips `['Easy ones you missed = free marks lost.', 'Tough ones you cracked = real strength.']`.
- Build `groups` for `GroupedBarChart` from `analysis.difficulty.overall`: one group per bucket, `label = bucket.label`, `values = [ {value: correct, color: STATUS_COLORS.correct, label:'Correct'}, {value: incorrect, color: STATUS_COLORS.incorrect, label:'Incorrect'}, {value: skipped, color: STATUS_COLORS.unanswered, label:'Unattempted'} ]`.
- Layout: centred sub-heading "Overall difficulty analysis" + chart; then a responsive grid `grid-cols-1 md:grid-cols-2 gap-6` with one chart per subject from `analysis.difficulty.bySubject` titled `"{subject} difficulty analysis"` (`height={180} barWidth={22}`). Iterate `analysis.subjects.map(s => s.label)` for order, skip subjects with an empty array.
- Under the overall chart add a compact table (`thClass`/`tdClass`): Level | Correct | Incorrect | Unattempted | Accuracy % | Attempt % | Marks — one row per overall bucket; Accuracy/Attempt via `fmtPct` + `pctTone`; Marks as `score/maxMarks` with `marksTone`.
- If every overall bucket is `Unrated` (NEET), render a one-line note above the charts: *"Difficulty tags aren't available for this paper yet, so all questions are shown as Unrated."* (`text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2`).
- If `analysis.difficulty.overall` is empty, return `null`.

## 7.2 `QuestionTypeSection.tsx`

Props: `{ analysis: ReportAnalysis }`.

- Emoji `💯`, title **Marks by Question Type: Where You Earn the Most**, description *"This section shows how many marks you scored from each question type in every subject — like Single Correct or Numerical."*, tip *"Use it to find your high-yield question types and identify where marks are slipping away. Focusing your practice on low-scoring types can give a big boost in the next test."*
- Table: first column Subject (coloured with `subjectColor`), then one column per `analysis.questionTypes.types`; cell = `<b class marksTone(score)>{score}</b><span text-gray-400 text-xs>/{maxMarks}</span>` from `bySubject[i].cells[j]`; last row **Total** (`bg-gray-50 font-bold`) from `analysis.questionTypes.overall` matched by label.
- Under each cell add a muted second line `"{correct}C · {incorrect}I · {skipped}U"` (`text-[10px] text-gray-400`).
- If only one type exists, still render (single column) — do not return `null`; the section is meaningful for NEET too.

## 7.3 `QuestionBreakdownSection.tsx`

Props: `{ analysis: ReportAnalysis; onOpenQuestion?: (subject: string, questionId: string) => void }`.

- Emoji `🔍`, title **Question-by-Question Breakdown: Learn from Every Move**, description *"This section takes you inside your paper — one question at a time. See your status (correct, incorrect, or unattempted), the chapter it belongs to, and how others performed on the same question."*, tip *"Use it to spot your concept gaps. If most students got it right but you missed it — revise that concept. If few students got it right and you did — that's a genuine strength."*
- One block per subject (heading `text-base font-black text-gray-800` with the subject colour dot), each a table: Q.No. | Status | Chapter | Difficulty | % Student Correct | Marks.
  - Status pill: reuse the exact pill markup/classes the page uses (`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold` + green/red/gray variants, icons `check_circle` / `cancel` / `hourglass_empty`; label the last one **Skipped** like the PDF).
  - Chapter: `q.chapter.join(', ')`.
  - Difficulty: small neutral badge; `Unrated` rendered as `—`.
  - % Student Correct: the number plus a 64-px inline bar; **highlight the row** (`bg-amber-50/60`) when `q.status !== 'correct' && q.pctStudentsCorrect >= 70` (the "most got it right but you missed it" case) and tint the percentage `text-amber-700`; when `q.status === 'correct' && q.pctStudentsCorrect < 40` tint it `text-green-700` with a `★` suffix.
  - Marks: `awardedMarks` with `marksTone`, e.g. `+4`, `-1`, `0` (prefix `+` for positives).
  - Row `onClick={() => onOpenQuestion?.(q.subject, q.questionId)}`; add `cursor-pointer hover:bg-gray-50` only when the callback is provided; `title="Open in {subject} tab"`.
- Per-subject legend line under the heading: `"{n} questions · {correct} correct · {incorrect} incorrect · {skipped} skipped"`.
- `SectionCard` `action` slot: a `<div className="text-xs text-gray-500 font-medium">Batch size: {analysis.cohort.size}</div>`.

## 7.4 `FixItZoneSection.tsx`

Props:
```ts
{
  analysis: ReportAnalysis;
  onSaveReason: (questionNo: number, reason: string) => Promise<void>;
  onFixIt: (questionNo: number, label: string) => void;
  onOpenQuestion?: (subject: string, questionId: string) => void;
  onPracticeAll?: () => void;
}
```

- Emoji `🔧`, title **Fix It Zone: Because Every Mistake Has a Comeback**, description *"Here's your repair shop for marks. See every question you missed or skipped, pick the reason, and hit Fix It — you'll instantly get a similar question to practice."*
- `action` slot: button **Practice Your Incorrect & Skipped Questions** (`px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100`) calling `onPracticeAll` (hidden when the prop is absent).
- `fixable = analysis.questions.filter(q => q.status !== 'correct')`. If empty: render a green success card *"Nothing to fix — every question you attempted was correct. 🎉"* and return.
- Group by subject in `analysis.subjects` order. Table columns: Q.No. | Status | Chapter | Reason | Action.
  - Reason: `<select>` with `<option value="">Select reason...</option>` + `FIX_IT_REASONS`. Local state `reasons: Record<number, string>` **initialised from `analysis.questions[i].reason`** (use `useState(() => …)` and a `useEffect` keyed on `analysis.reportId` to re-seed when the report changes). On change: optimistic update, call `onSaveReason`, on rejection revert and show a tiny red "Couldn't save" text under the select for 3 s. Add `saving: Record<number, boolean>` to disable the select while saving.
  - Action: link-style button `✏️ Fix it` (`text-indigo-700 text-xs font-bold hover:underline`) → `onFixIt(q.questionNo, \`Q${q.questionNo} · ${q.subject} · ${q.chapter.join(', ')}\`)`. If `q.hasLinkedPractice` show a tiny `bookmark` icon before the label (`title="Has authored practice questions"`).
  - Q.No. cell is a button that calls `onOpenQuestion?.(q.subject, q.questionId)` when provided.
- Footer line: `"{count} questions to fix · {tagged} tagged with a reason"`.

## 7.5 `DrillDownSection.tsx`

Props: `{ analysis: ReportAnalysis; defaultExpanded?: boolean }`.

- Emoji `🔍`, title **Drill Down Mode: Track Every Concept You Touched**, description *"This section shows how you performed in each chapter — with counts of correct, incorrect, and skipped questions."*, tip *"Click on any chapter to open its subtopics and see where you're truly mastering concepts and where small gaps remain. Use it to focus your revision smartly — chapter by chapter, concept by concept."*
- One block per subject (order from `analysis.subjects`), table: Chapter | Correct | Incorrect | Skipped | Accuracy.
  - Chapter cell: chevron (`expand_more` / `chevron_right` material icon) + label; row is clickable and toggles a `Set<string>` of expanded chapter keys. When `defaultExpanded` is true, initialise the set with every chapter key.
  - Counts coloured green / red / amber (`text-green-600 / text-red-500 / text-amber-500`, `font-black`).
  - Accuracy via `fmtPct` + `pctTone`.
  - Expanded: one sub-row per `chapter.topics` entry (`bg-gray-50`, label prefixed `↳`, `pl-10`, smaller text) with the same four numbers. If `topics.length === 0` show a single muted sub-row *"No topic tags on these questions."*
- Because chapters overlap, add a footnote under each subject table: *"A question tagged with several chapters is counted in each — chapter totals can exceed the subject total."* (`text-[10px] text-gray-400`).
- Use a React `Fragment` with a key for chapter row + sub-rows (the demo version mis-keys this — do not copy it).

## 7.6 `StrengthsSection.tsx`

Props: `{ analysis: ReportAnalysis }`.

- Outer `SectionCard` emoji `🧭`, title **Strength and Improvement Areas** (no description).
- Four sub-blocks, each with a sub-heading (`text-base font-black text-gray-800 flex items-center gap-2`) and a list of cards. Skip a sub-block entirely when its array is empty.
  1. `🚀 Your Strengths` — `analysis.insights.strengths`, cards `bg-white border border-green-200 rounded-lg px-4 py-3 text-sm text-gray-800 flex items-start gap-2` with a green `check_box` icon.
  2. `🎯 Areas to Improve` — `analysis.insights.improvements`, `border-amber-200`, purple `psychology` icon (matches the PDF's purple marker).
  3. `⭐ Your Strong Chapters` — one card per `strongChapters[i]`, prefixed `#{i+1}` in `font-black`, text `"{subject}: {chapters.join(', ')}."`; after the **last** card append the sentence *"These areas show concept clarity, steady accuracy, and confidence in application."*
  4. `📖 Your Chapters to Improve` — one card per `weakChapters[i]`, `border-yellow-200`, orange `bolt` icon, text `"{subject}: {chapters.join(', ')} — fix conceptual and practice gaps. Increasing attempt coverage here will convert current accuracy into much higher total marks."`
- If all four arrays are empty render *"Not enough attempted questions to generate insights yet."*

## Tests / checks

- Typecheck + lint green.
- Temporarily render each component in `DemoReportDetail`? **No** — that page uses a different DTO. Instead, verify visually in Phase 2. For now, confirm each file compiles in isolation by importing all six into `Reports.tsx` at the top (imports only) and running tsc.

## Exit criteria

Six new files; tsc + lint green; implementation notes list each component's exact prop signature.

---

# 8. PHASE 2 PROMPT — Wire into `Reports.tsx`

## Objective

Make the student review view fetch the analysis and render the merged layout from Section 5, without regressing any existing behaviour.

## Tasks, in order

1. **Imports.** Add the ten section components, `type { ReportAnalysis, PracticeQuestion }` from `../types/reportAnalysis`, and `subjectColor` if needed. Remove `import mockRecommendations from '../data/mockRecommendations.json';` at the end of this phase (after step 8) if unused.

2. **State.** Next to `reviewData`:
   ```ts
   const [analysis, setAnalysis] = useState<ReportAnalysis | null>(null);
   const [analysisLoading, setAnalysisLoading] = useState(false);
   const [analysisError, setAnalysisError] = useState<string | null>(null);
   ```
   Change `practiceModalData` to `useState<PracticeQuestion[] | null>(null)`; add `practiceModalTitle` and `practiceLoading` (Section 5.5). Change `activeTab`, `masterySubject` and `selectedSubject` to `string`.

3. **Fetch.** In `fetchReviewDetails`, after `setSelectedReportId(reportId)`, fire the analysis request **without awaiting it inside the try** (so the review renders immediately):
   ```ts
   setAnalysis(null); setAnalysisError(null); setAnalysisLoading(true);
   api.get<ReportAnalysis>(`/api/v1/reports/${reportId}/analysis`)
     .then(r => setAnalysis(r.data))
     .catch(e => setAnalysisError(e?.response?.data?.message || 'Deep analysis unavailable'))
     .finally(() => setAnalysisLoading(false));
   ```
   For the print flows (`printReportId` and `autoPrintReportId`), the existing code calls `window.print()` on a timer after `fetchReviewDetails` resolves. Change both so printing waits for the analysis: store a `pendingPrint` ref/state set to `true` in those code paths, and add a `useEffect` on `[analysis, analysisError, analysisLoading]` that, when `pendingPrint && !analysisLoading`, waits `300 ms`, calls `window.print()`, closes the window if `closeAfterPrint` was set, and clears `pendingPrint`. Keep the original timers as a fallback only if the analysis request has not settled within 8 s.

4. **Back button.** In the "Back to Reports" `onClick`, also reset `analysis`, `analysisError`, `practiceModalData`.

5. **Dynamic subjects & themes.** Implement Section 5.4: `subjectList`, `getTheme()`, `Mathematics` theme, dynamic tab array, dynamic `masterySubject` `<select>` options, `subjectStats` from analysis buckets when available.

6. **Handlers.** Add `openPractice` (5.5), plus:
   ```ts
   const saveReason = async (questionNo: number, reason: string) => {
     await api.put(`/api/v1/reports/${selectedReportId}/questions/${questionNo}/reason`, { reason });
     setAnalysis(prev => prev ? { ...prev, questions: prev.questions.map(q => q.questionNo === questionNo ? { ...q, reason: reason || null } : q) } : prev);
   };
   const openQuestionInTab = (subject: string, questionId: string) => {
     setActiveTab(subject); setStatusFilter('all'); setExpandedQuestionId(questionId);
     window.scrollTo({ top: 0, behavior: 'smooth' });
   };
   const practiceAll = () => navigate('/student/custom-tests');
   ```
   (`navigate` already exists in the component.) `saveReason` must be student-only in effect: when `isAdmin`, pass a no-op that resolves and render the select disabled — simplest is to pass `onSaveReason={isAdmin ? async () => {} : saveReason}` and let the section disable the select when `analysis.student` is null **or** a new prop `readOnly` is true; add `readOnly?: boolean` to `FixItZoneSection` for this.

7. **Overview layout.** Apply the exact order in Section 5.2. Concretely:
   - Replace the `{/* Quick Stats Strip */}` block with:
     ```tsx
     {analysis ? <ScoreboardSection analysis={analysis} /> : (<existing Quick Stats Strip JSX unchanged>)}
     ```
   - After `{/* Subject Performance */}` block insert `<SubjectWiseSection>` and `<HitRateSection>` (guarded by `analysis &&`).
   - In `{/* Batch Standing */}`, keep the JSX; compute `rank/percentile/totalBatchStudents` as `analysis?.cohort.rank ?? rank` etc. (the existing computation from `batchScores` stays as the fallback). Insert `<BatchComparisonSection>` after the block.
   - Insert `<DifficultySection>` and `<QuestionTypeSection>` before the Topic Mastery grid.
   - After the Topic Mastery grid insert `<QuestionBreakdownSection onOpenQuestion={openQuestionInTab}>`, `<FixItZoneSection onSaveReason={…} onFixIt={openPractice} onOpenQuestion={openQuestionInTab} onPracticeAll={isAdmin ? undefined : practiceAll} readOnly={isAdmin}>`, `<DrillDownSection>`, `<StrengthsSection>`.
   - Where `analysis` is null, render one shared placeholder component (define inline above the return, e.g. `const AnalysisPlaceholder = () => (…)`) showing a spinner + "Preparing deep analysis…" while `analysisLoading`, or the `analysisError` text with a "Retry" button that re-runs the fetch. Render it **once**, right after the Subject Performance cards — not once per missing section.

8. **Per-subject tabs.** Implement Section 5.3 items 2–3. The button markup stays the same amber pill; label it `💡 Practice Similar Questions`; `onClick={() => openPractice(q.questionNo, \`Q${q.questionNo} · ${q.subject} · ${q.chapter}\`)}`. Show it when `q.status !== 'correct'`.

9. **Practice modal.** Implement Section 5.5 edits (title line, loading spinner, empty state, numerical reveal, diagram).

10. **Print block.** Implement Section 5.6.

11. **Run** typecheck + lint. Then `npm run dev` from `frontend/` (backend must be running on :5000 — start it from `backend/` with `npm run dev` if `curl http://localhost:5000/` fails; note `npm run dev` there compiles with `tsc` first and then runs `dist/index.js`, so the new controller is included).

## Manual verification script (do all of it; record results)

Log in as a JEE student (any `students` doc with `enrollmentNo` starting `JEE-` — if you do not know a password, run `node backend/resetPasswords.js` and read what it sets, or use the admin UI). Open **My Reports → Review Answers** on `JEE Mock Test 01`:

- [ ] Tabs are `Overview · Physics · Chemistry · Mathematics`.
- [ ] Scoreboard shows `score/300`, three C/I/U cards, donut with three legend entries.
- [ ] Subject-Wise: Pos(+)/Neg(-) columns are non-zero for a student with mistakes; marks pie has three slices; three attempt pies.
- [ ] Hit Rate rows show a verdict sentence.
- [ ] Batch: rank/percentile identical to the pre-change values for the same student (compare with `git stash` if unsure); "You vs. the Batch" shows 31 students and `Joint toppers' avg (3)` (three students share 300).
- [ ] Difficulty: Easy / Medium / Tough groups overall and per subject.
- [ ] Question Type: columns `Single Correct` and `Numerical`, Total row present.
- [ ] Question Breakdown: `% Student Correct` populated; clicking a row jumps to the subject tab with that question expanded.
- [ ] Fix It Zone: choose a reason → reload the page → the reason is still selected. Click **Fix it** → modal opens with up to 3 practice questions titled `Q… · Physics · …`; answering reveals the solution; a numerical practice question shows **Reveal answer**.
- [ ] Drill Down: expanding a chapter shows topic sub-rows.
- [ ] Strengths: at least one card in "Areas to Improve" for a non-perfect student.
- [ ] **Download PDF** → print preview contains the new sections between "Topic Mastery" and "Complete Question Collection"; no section is cut awkwardly in half at a page break (adjust `print:break-inside-avoid` if it is).

Then as a NEET student on `AITS NEET 2027 TEST - 01`:

- [ ] Tabs are `Overview · Physics · Chemistry · Biology`.
- [ ] Difficulty section shows the amber "Unrated" note and a single Unrated group per chart.
- [ ] Question Type table has one column.
- [ ] Nothing crashes on questions whose `chapter` is `Uncategorized` or whose `topic` is empty.

Then as **admin** (`/admin/reports` → any test → this page is not used; but `/admin/students/:id` opens the print URL `…/student/reports?printReportId=…` in a new tab): confirm that tab prints with the new sections and that the Fix It reason selects are disabled (`readOnly`).

## Exit criteria

All checklist items pass; tsc + lint green; the diff to `Reports.tsx` consists of additions plus the edits named in Section 5.1 only — no existing section removed except the Quick Stats Strip fallback logic described in step 7.

---

# 9. PHASE 3 PROMPT — Hardening and hand-off

## Objective

Close the small gaps that make this shippable and leave the repo tidy.

## Tasks

1. **Error paths.** Kill the backend and open a report: the review view must still render (old behaviour), the placeholder must show the error with a working Retry. Restart the backend, click Retry → sections appear.
2. **Empty cohort.** With only one report for a test (`cohort.size === 1`), `BatchComparisonSection` shows its "Comparison unavailable" card and `QuestionBreakdownSection` still shows `% Student Correct` (100 or 0).
3. **Negative total.** For the JEE student with `score: -60`, the Overall marks donut shows the "No positive marks to distribute yet." text and nothing throws.
4. **Long chapters.** NEET Biology has 30+ chapters; the Drill Down table must not overflow horizontally at 1024 px width — wrap the chapter label (`whitespace-normal`), keep numeric columns `whitespace-nowrap`.
5. **Mobile.** At 400 px width no horizontal page scroll; tables are inside `overflow-x-auto` wrappers (they already are in the finished sections — match that).
6. **Cleanup.** Delete `frontend/src/data/mockRecommendations.json` only if `grep -rn mockRecommendations frontend/src` returns nothing. Remove the `components/demo/charts` directory if it still exists (it should already be gone).
7. **Tests.** `cd frontend && npm test` — the existing demo component tests must still pass (they import charts from the new path).
8. **Commit message suggestion** (do not commit unless asked): `feat(reports): merge Quiz Analysis Report sections into student review with on-the-fly analysis API`.

## Deliverables

Final implementation notes: list of every file touched, the three API routes, a two-line summary of what the PDF's excluded time-based sections would need (per-question timestamps in `EvaluationReport.responses[]`) so the product team can plan it.

---

# 10. Quick reference — copy exactly

## Section copy (from the reference PDF)

| Section | Emoji | Title | Description / tips |
|---|---|---|---|
| Scoreboard | 💪 | Scoreboard: Where You Stand Right Now | done |
| Subject-wise | 📊 | Subject-Wise Performance Analysis | done |
| Hit rate | ⚡ | Hit Rate vs. Hustle Rate | done |
| Difficulty | 📈 | Difficulty Level Analysis | "Every question has a level — Easy, Medium, or Tough. These charts show how you handled each zone across all subjects." / "Easy ones you missed = free marks lost." / "Tough ones you cracked = real strength." |
| Question type | 💯 | Marks by Question Type: Where You Earn the Most | "This section shows how many marks you scored from each question type in every subject — like Single Correct or Numerical." / "Use it to find your high-yield question types and identify where marks are slipping away. Focusing your practice on low-scoring types can give a big boost in the next test." |
| Breakdown | 🔍 | Question-by-Question Breakdown: Learn from Every Move | see 7.3 |
| Fix It | 🔧 | Fix It Zone: Because Every Mistake Has a Comeback | see 7.4 |
| Drill down | 🔍 | Drill Down Mode: Track Every Concept You Touched | see 7.5 |
| Strengths | 🧭 | Strength and Improvement Areas | sub-headings: 🚀 Your Strengths · 🎯 Areas to Improve · ⭐ Your Strong Chapters · 📖 Your Chapters to Improve |

## Colours

- Status: `STATUS_COLORS.correct = #15803d`, `.incorrect = #dc2626`, `.unanswered = #d1d5db`.
- Subjects: `subjectColor(label, index)` → Physics `#6366f1`, Chemistry `#3b82f6`, Biology `#10b981`, Mathematics `#f97316`, unknown → rotating fallback.
- Percent tone: `pctTone(v)` → ≥80 green, ≥50 amber, else red, `null` gray.

## Helper signatures (already exported from `SectionCard.tsx`)

```ts
fmtPct(v: number | null): string          // "87.5%" | "N/A"
pctTone(v: number | null): string         // tailwind text colour class
marksTone(v: number): string              // red for negatives
thClass, tdClass: string                  // table cell classes
```

## Existing status pill markup to reuse (from `Reports.tsx`)

```tsx
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
  <span className="material-symbols-outlined text-[14px]">check_circle</span> Correct
</span>
// incorrect: bg-red-50 text-red-700 border-red-200, icon cancel
// skipped:   bg-gray-50 text-gray-600 border-gray-200, icon hourglass_empty
```
