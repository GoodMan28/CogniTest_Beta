# CogniTest — Next-Day Analysis Demo Blueprint

**Suggested filename:** `CogniTest_DEMO_IMPLEMENTATION_BLUEPRINT.md`

## 1. Product and implementation decision

**App type:** Existing web application.

**Target users:** Coaching students viewing their own results; internal operators preparing and publishing those results.

**Launch outcome:** Staff manually prepare and ingest a test, its answer key, student responses, and mapped practice questions. Students activate their accounts, log in, and immediately see a complete, precomputed analysis with relevant practice questions.

**Student flow:**

`Receive activation details → Sign up/activate → Log in → Open published test → Review analysis → Read solution → Practice mapped questions`

This is a **prepared-data reporting demo**, not an online examination platform or an automated OCR/AI pipeline.

### Three important corrections to the original direction

1. **Do not build OCR, Pinecone retrieval, or live question generation for this demo.** Your manual preparation already supplies their outputs.
2. **JEE needs a Mathematics check.** The supplied blueprint documents Physics/Chemistry/Biology collections and hardcoded subject handling, not working Mathematics support. Never put Mathematics questions into Biology to bypass this.
3. **Precreating student results is not enough for signup.** Account activation must attach credentials to the existing student record. Creating another student with the same name leaves the results attached to the wrong account.

### Source and confidence boundary

This plan is based on the two supplied Markdown documents, including the repository snapshot they describe. The implementation agent must verify the relevant files against the current checkout before editing. Proposed paths and fields below are explicitly new; they are not claims that those fields already exist.

---

## 2. Scope: build the useful demo, not the entire roadmap

### Required

- Operator-only ingestion of manually prepared JSON.
- MCQ and integer-numerical grading.
- Student activation, login, and owner-scoped report access.
- Published report list and ordered question review.
- Correct/incorrect/skipped counts and marks.
- Overall and subject-wise difficulty analysis.
- Question-type, unit, chapter, and topic breakdowns.
- Defined class-average and topper comparisons.
- Authored solutions and optional authored distractor explanations.
- Mapped practice questions, with answer/solution reveal.
- Lightweight saved mistake reflections.
- Rule-based improvement priorities and a simple revision list.
- Clearly locked chapter-wise, subject-wise, and generated-test features.

### Explicitly excluded

- PDF/image extraction and OMR processing.
- Upload dashboards, queues, or worker infrastructure.
- Live LLM explanations or question generation.
- Vector search.
- Online test-taking and persisted practice scoring.
- Calendar scheduling, notifications, payments, or email integrations.
- Rough-work analysis, growth analysis, and growth heatmaps.
- A repository-wide refactor or multi-tenant admin redesign.
- The existing placeholder PDF-download endpoint. Browser printing of the real report can be added only if time remains.

**Practice limitation:** Students may attempt a mapped question locally and reveal its solution. This does not alter their official test score or class ranking.

---

## 3. Architecture and deployment boundary

### Required stack for the new implementation

- **Frontend:** Existing React + TypeScript + Vite + Tailwind.
- **New backend:** FastAPI with Pydantic validation and PyMongo.
- **Database:** Existing MongoDB database and core collections.
- **Computation:** Deterministic Python functions, invoked by an operator CLI before launch.

### Existing-backend mismatch: make it explicit

The current repository uses Express/Mongoose. The stack constraint for this implementation plan requires FastAPI for new backend functionality.

**Proposed compromise:** Add a small FastAPI analysis service rather than migrate the existing Express application. Leave legacy business logic in place; do not build a second general-purpose platform.

This is a real tradeoff: it adds a Python service and deployment configuration. It is **not** literally a few-line Express patch. The service boundary is a proposed implementation decision, not a requirement supplied by the coaching institution.

```text
Private JSON files
      │
      ▼
Operator Python CLI ───► Existing MongoDB collections
                              ▲
                              │
Existing React student UI ─► FastAPI /api/v2/demo/*

Existing Express /api/v1/* remains legacy/internal for the demo.
```

### Crucial exposure rule

The supplied blueprint describes publicly accessible legacy report, student-update, and destructive endpoints. Protecting only the new FastAPI routes would not protect the same data through those old routes.

For the student demo:

- Expose the React demo and the allowlisted FastAPI student endpoints.
- Keep the legacy Express deployment private or deny its public API traffic at the deployment boundary.
- Check its direct hosting URL as well as the main domain; changing the frontend URL alone does not restrict access.
- Do not release real student records if that boundary cannot be enforced.
- Preserve legacy code for internal use and rollback, but do not route new demo reports through legacy handlers.

No admin web API is necessary for ingestion or publication: those operations happen through the private CLI.

---

## 4. Decisions and defaults

The institution has not supplied a marking scheme or precise comparison rules. Do not disguise these as known requirements.

| Decision | Demo treatment |
|---|---|
| Subjects | Taken from the actual paper. Support Mathematics in the new path; do not assume Biology. |
| Question count | Manifest must declare it. Expect 75 for the described workflow, but do not hardcode 75 in components. |
| Marks and penalties | Required input, explicitly confirmed by the institution. Never silently assume +4/−1. |
| Integer answers | Exact integer equality; no numerical tolerance in this version. |
| Class | Proposed default: same institute, test, and imported batch snapshot. |
| Average | Proposed default: all valid evaluated students in that cohort, including the viewer. |
| Topper | Highest overall score in that cohort, not a different category winner in each row. |
| Tied toppers | Show the tied group’s mean category score and label it “Joint toppers’ average.” |
| Attempts | One authoritative imported result per student per test. Retakes are excluded. |
| Corrections after release | Temporarily unpublish, rebuild the complete test cohort, verify, then republish. No silent live edits. |
| Practice coverage | Three mapped questions per original question required for the complete demo. |
| Report explanations | Authored solution; selected-option explanation only when explicitly supplied. |
| AI integrations | None required. Do not describe rule-based selection as live AI generation. |

Record confirmed marking and cohort rules in the manifest before ingestion. The other defaults above can be accepted for the demo or changed in configuration.

---

## 5. Reuse and extend the existing data models

Do not replace the database or introduce a parallel student/test/report system. Use additive, namespaced fields and the existing identifiers.

### 5.1 `students`

**Reuse:** `_id`, `instituteId`, `enrollmentNo`, `name`, `batch`, optional `password`.

**Proposed optional additions:**

```text
analysisDemo.claimDigest
analysisDemo.claimExpiresAt
analysisDemo.claimedAt
```

Rules:

- Use the institution’s enrollment number or an agreed stable roster identifier, never the student’s name, as the identity key.
- New records have no password until activation.
- Activation updates the existing `_id`; it does not create a second student.
- Existing students with passwords log in normally after verifying password-hash compatibility.
- Never overwrite an existing password while importing responses.
- Keep the current globally unique enrollment index. If another institute already owns the supplied identifier, stop and resolve the collision rather than silently changing identity semantics.
- Reject ambiguous case-insensitive matches during preflight. For new demo identifiers, use a documented normalization convention consistently.

### 5.2 Existing question collections

**Reuse all relevant fields:**

`instituteId`, `subject`, `unit`, `chapter[]`, `topic[]`, `questionType`, `difficulty`, `questionIntent`, `questionText`, `options`, `correctOption`, `numericalAnswer`, `solutionText`, and supported media fields.

**Proposed optional addition:**

```text
analysisDemo.sourceKey
```

Use the existing three subject collections and add `mathematics_questions` using the same document shape when the paper contains Mathematics.

In the FastAPI service, use an explicit subject-to-collection registry. Unknown subjects must fail validation, not fall through to another collection.

For this release, Mathematics works through the new analysis path. Do not claim the legacy question picker, taxonomy, custom tests, or analytics suddenly support Mathematics.

**Preservation rule:** Import test-owned question copies, not edits to unrelated shared question-bank records. Stable source keys make repeat imports reuse those copies.

### 5.3 `tests`

**Reuse:** Existing metadata, ordered `questions[]`, `sections`, marking fields, and identifiers.

**Proposed optional additions:**

```text
analysisDemo.managed: true
analysisDemo.sourceKey
analysisDemo.status: DRAFT | BUILDING | FAILED | READY | PUBLISHED
analysisDemo.buildId
analysisDemo.sourceHash
analysisDemo.expectedStudents
analysisDemo.publishedAt
analysisDemo.policy

questions[].analysisDemo.marking:
  correctMarks
  incorrectPenalty

questions[].analysisDemo.recommendations[]:
  questionId
  subject

questions[].analysisDemo.distractorExplanations:
  optional map from option letter to authored explanation
```

Important:

- The new path uses explicit per-question marking derived from the manifest.
- Keep legacy marking fields populated with documented defaults, but never use them to flatten genuinely different MCQ/numerical schemes.
- Keep `Test.isPublished = false` for demo-managed tests. Publication for the new path is controlled by `analysisDemo.status`.
- This intentionally prevents the legacy student-report list from treating new reports as fully compatible legacy reports.
- Do not reuse the old publish endpoint.

### 5.4 `evaluationreports`

**Reuse:** `studentId`, `testId`, `score`, `totalMarks`, `performance.correct[]`, `performance.incorrect[]`, `performance.unanswered[]`, `responses[]`, `createdAt`.

**Proposed optional additions:**

```text
analysisDemo.managed: true
analysisDemo.buildId
analysisDemo.sourceHash
analysisDemo.batchSnapshot
analysisDemo.computedAt
analysisDemo.schemaVersion: 1
analysisDemo.snapshot:
  test metadata
  ordered question results
  breakdowns
  comparison aggregates
  improvement priorities
  revision list
analysisDemo.reflections[]:
  questionNo
  text
  updatedAt
```

The new snapshot is the authoritative source for the demo UI. Continue populating legacy score and performance fields for consistency, but do not ask legacy routes to reconstruct the new report.

For compatibility `responses[].selectedOption` may contain canonical MCQ letters, integer strings, or `"unanswered"`. The snapshot uses a properly typed `studentAnswer` and explicit `questionType`; never infer a numerical answer’s meaning from the legacy field name.

The documented legacy model requires `omrImageUrl`. There is no OMR image in this workflow. Make that field optional as a compatibility-only schema adjustment; do not manufacture a fake image URL. Existing records remain valid.

### 5.5 `studentanalytics`

Leave it unchanged for the demo. It is a cross-test, three-subject structure and is not the right place to force a single-test Mathematics report.

Compute demo chapter/topic insights inside the report snapshot. Do not run the old analytics regeneration function on these imported reports.

### 5.6 Indexes

Create indexes deliberately; Mongoose `ref` or `required` does not create a lookup index automatically.

- Demo test identity: unique `(instituteId, analysisDemo.sourceKey)` on demo-managed tests.
- Demo question identity: unique `(instituteId, analysisDemo.sourceKey)` where that source key exists, in each subject collection.
- Demo result identity: unique `(testId, studentId)` restricted to `analysisDemo.managed: true`.
- Report listing: `(studentId, testId)`.

Dry-run existing data before creating any unique index. Never delete legacy duplicates automatically to make index creation pass.

---

## 6. Manual input contract

Keep prepared files outside `frontend/public`, outside browser bundles, and out of version control.

```text
private_data/<test-key>/
  manifest.json
  questions.json
  answer_key.json
  students.json
  responses.json
  recommendations.json
```

The roster and manifest are small supporting files, not additional product features. They remove identity and grading guesses from the four main datasets.

### 6.1 Manifest

Required fields:

```text
schemaVersion
instituteId
testKey
title
date
examType
expectedQuestionCount
expectedStudentCount
markingByType:
  multiple_choice: { correctMarks, incorrectPenalty }
  numerical: { correctMarks, incorrectPenalty }
comparisonPolicy
recommendationsPerQuestion
```

`incorrectPenalty` is a nonnegative magnitude that the grader subtracts. Reject a negative penalty value to avoid accidentally adding marks.

Support optional per-question marking overrides only when the actual paper requires them. Skipped answers receive zero in this demo.

### 6.2 Original question example

```json
{
  "questionNo": 1,
  "subject": "Mathematics",
  "unit": "Algebra",
  "chapter": ["Quadratic Equations"],
  "topic": ["Nature of roots"],
  "questionType": "multiple_choice",
  "difficulty": "easy",
  "questionIntent": "Interpret the discriminant",
  "questionText": "For a real quadratic equation, which condition gives equal real roots?",
  "options": ["D > 0", "D = 0", "D < 0", "None of these"],
  "solutionText": "Equal real roots occur when the discriminant is zero."
}
```

For a numerical question, set `questionType: "numerical"`; options are absent or empty.

Require unit, chapter, topic, difficulty, intent, and solution for new demo questions. Preserve array types for chapter/topic. Do not silently discard unfamiliar Mathematics metadata using the old taxonomy.

### 6.3 Answer key

```json
[
  { "questionNo": 1, "correctOption": "B" },
  { "questionNo": 2, "numericalAnswer": 0 }
]
```

Exactly one key entry per original question. The paper defines the type; the key must agree with it.

The join key is `questionNo`, never array position.

### 6.4 Roster and responses

```json
{
  "enrollmentNo": "JEE-DEMO-001",
  "name": "Example Student",
  "batch": "JEE Demo Batch"
}
```

```json
{
  "enrollmentNo": "JEE-DEMO-001",
  "answers": [
    { "questionNo": 1, "answer": "B" },
    { "questionNo": 2, "answer": "0" },
    { "questionNo": 3, "answer": null }
  ]
}
```

Require an explicit answer row for every question:

- `null` means skipped.
- A missing row means incomplete preparation, not automatically skipped.
- `"0"` is a valid integer response.
- A missing student response file means no evaluated attempt, not a zero-scoring attempt.
- Unknown enrollment numbers and duplicate student entries are validation errors.

### 6.5 Recommendations

```json
{
  "originalQuestionNo": 1,
  "recommendations": [
    {
      "sourceKey": "q1-practice-1",
      "subject": "Mathematics",
      "unit": "Algebra",
      "chapter": ["Quadratic Equations"],
      "topic": ["Nature of roots"],
      "questionType": "multiple_choice",
      "difficulty": "easy",
      "questionIntent": "Apply the discriminant condition",
      "questionText": "When does a real quadratic have two distinct real roots?",
      "options": ["D > 0", "D = 0", "D < 0", "Always"],
      "correctOption": "A",
      "solutionText": "Two distinct real roots require a positive discriminant."
    }
  ]
}
```

The example shows one entry for brevity; the complete demo requires three per original question.

Resolve question-number mappings to MongoDB references during import. Do not manually invent MongoDB IDs or continue using `mockRecommendations.json`.

---

## 7. Validation and ingestion: correctness before persistence

### Commands

Proposed interface:

```bash
python -m app.cli validate --dir /private_data/<test-key>
python -m app.cli prepare  --dir /private_data/<test-key>
python -m app.cli verify   --test-key <test-key>
python -m app.cli publish  --test-key <test-key>
```

Separate commands deliberately prevent an import from immediately exposing results.

### Validation must check

- Valid JSON, schema version, institute, and required metadata.
- Exact expected question count and unique ordered question numbers.
- One answer-key entry per question, with no extras.
- Supported subject and question type.
- MCQ key within the supplied option range.
- Integer-only numerical keys and responses.
- Finite, valid marking values.
- Exact response coverage for each evaluated student.
- Unique roster identity and valid batch.
- Exactly three valid mapped recommendations per original question.
- Valid solutions and practice answer keys.
- Unique source keys and no original question mapped to itself.
- Reasonable string/file sizes; no credentials or raw response files copied to public assets.
- Sanitized SVG/media before browser rendering. Reusing `dangerouslySetInnerHTML` without sanitization is not an acceptable shortcut.

A validation error must include file, student identifier where applicable, question number, and reason. Do not print passwords or activation tokens.

### Preparation sequence

1. Validate the complete bundle in memory before writes.
2. Canonicalize ordering and values; calculate a deterministic source hash.
3. Find/create the demo test using its source key.
4. Reject writes if the test is published or another build is active.
5. Acquire a build state using an atomic compare-and-set; generate `buildId`.
6. Upsert roster records without changing existing passwords.
7. Upsert test-owned original/practice questions by source key.
8. Join question metadata, key, response, and marking into typed question results.
9. Compute each student’s raw metrics.
10. Compute cohort comparisons from those same results.
11. Upsert reports with the same `buildId`, replacing their analysis snapshot completely.
12. Preserve separate reflection fields; invalidate reflections only for questions whose content/key changed, and report that explicitly.
13. Verify counts, score reconciliation, ownership, and recommendation coverage.
14. Mark the test `READY` only after all checks pass.
15. `publish` verifies the current build again, then atomically changes `READY → PUBLISHED`.

### Why this is enough for the demo

Students cannot read unpublished builds. Multi-document preparation does not require a new queue or a broad transaction design if publication is a single, guarded visibility switch.

- A failure leaves the test unpublished and reports a resumable failure.
- Repeat preparation must not create additional tests, students, questions, or reports.
- An unchanged published bundle can return “already published”; it must not rewrite data.
- Old/stale reports whose `buildId` does not match the published test build are never returned or counted.
- A stuck build requires an explicit operator unlock after confirming the previous process has stopped.

### Correction policy

For this demo, choose simplicity over uninterrupted availability:

`Backup input + relevant records → Unpublish → Correct JSON → Prepare entire cohort → Verify → Republish`

A corrected answer key requires every affected report and cohort comparison to be rebuilt. Never correct only the currently viewed student.

Historical revisions and zero-downtime publication are deferred. Preserve the prior prepared bundle for rollback.

---

## 8. Grading boilerplate

Place grading in a pure module. The CLI uses it; the browser does not independently regrade official reports.

```python
# Proposed: analysis_service/app/domain/grading.py
import re
from decimal import Decimal
from typing import Literal

INTEGER = re.compile(r"^[+-]?\d+$")
Status = Literal["correct", "incorrect", "skipped"]

def normalize_integer(value: object) -> int:
    # bool is a subclass of int in Python: reject it explicitly.
    if isinstance(value, bool):
        raise ValueError("Boolean is not an integer answer")
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        text = value.strip()
        if INTEGER.fullmatch(text):
            return int(text)
    raise ValueError("Expected an integer or integer string")

def normalize_mcq(value: object, options: list[str]) -> str:
    if not isinstance(value, str):
        raise ValueError("MCQ answer must be a letter string")
    letter = value.strip().upper()
    allowed = {chr(65 + i) for i in range(len(options))}
    if letter not in allowed:
        raise ValueError("Option is outside this question's choices")
    return letter

def grade_one(
    *,
    kind: str,
    answer: object,
    key: object,
    options: list[str],
    correct_marks: Decimal,
    incorrect_penalty: Decimal,
) -> tuple[Status, Decimal]:
    if kind == "numerical":
        normalized_key = normalize_integer(key)
    elif kind == "multiple_choice":
        normalized_key = normalize_mcq(key, options)
    else:
        raise ValueError("Unsupported question type")

    if correct_marks <= 0 or incorrect_penalty < 0:
        raise ValueError("Invalid marking scheme")

    if answer is None:
        return "skipped", Decimal("0")

    normalized_answer = (
        normalize_integer(answer)
        if kind == "numerical"
        else normalize_mcq(answer, options)
    )
    if normalized_answer == normalized_key:
        return "correct", correct_marks
    return "incorrect", -incorrect_penalty
```

Implementation notes:

- Pydantic models must validate finite decimals, text lengths, and supported choices before this function runs.
- Keep Decimal arithmetic inside grading; serialize scores using one documented representation in the API adapter.
- New prepared MCQ JSON uses letters only. A separate legacy adapter may convert literal option text only when it matches exactly one option; ambiguity is an error.
- Do not apply the old evaluator’s `1–4 → A–D` conversion to numerical questions.
- Proposed integer policy accepts `"+04"` as 4 and `"-0"` as 0, but rejects `"4.0"`, scientific notation, fractions, and booleans. Document this for the data-preparation team.
- Unsupported multi-correct, dropped, bonus, or optional-choice questions must block preparation until their scoring is explicitly resolved. Do not guess.

---

## 9. Analysis definitions

Generate all views from one list of normalized question-result records.

Each row contains at least:

```text
questionNo, questionId, subject, unit, chapter[], topic[]
questionType, difficulty, questionIntent
questionText, supported media, options
studentAnswer, correctAnswer, status
awardedMarks, maximumMarks
solutionText, selectedOptionExplanation?
recommendationRefs
```

### 9.1 Standard breakdown

For every applicable group:

```text
questionCount
correct
incorrect
skipped
attempted = correct + incorrect
score = sum(awardedMarks)
maximumMarks = sum(maximumMarks)
accuracy = correct / attempted × 100, or null if attempted == 0
coverage = attempted / questionCount × 100, or null if questionCount == 0
```

Return `null`/“Not enough data” for undefined percentages, never `NaN`, infinity, or a fabricated 0% accuracy.

Compute:

- Overall.
- Subject.
- Difficulty.
- Subject × difficulty.
- Question type.
- Unit.
- Chapter.
- Topic/concept.

**Required invariants:**

- `correct + incorrect + skipped == questionCount`.
- Overall score equals the sum of question marks.
- Subject/difficulty/type partitions reconcile with the overall score.
- Negative scores remain negative; do not clamp them to zero.

Chapter/topic tags may overlap. Count a question once within each matching tag, but label those tables **overlapping categories**. Their rows must not be summed as a partition of the test. Do not infer a specific chapter-topic relationship from two independent arrays.

### 9.2 Comparisons

Compute comparisons from valid current-build reports in the same cohort.

- Class average for a category = sum of students’ category scores / number of evaluated students.
- Use the same question set and marking scheme for all compared students.
- Topper is determined by overall test score.
- For tied overall toppers, average that group’s category scores and label the comparison accordingly.
- Include the cohort size and computation timestamp.
- With only one evaluated student, suppress comparative judgments and display “Comparison unavailable: only one evaluated student.”
- Do not return classmates’ names, enrollment numbers, answer sheets, or raw score arrays to students.
- Absentees are excluded, not converted to zero-score reports.

Rank and percentile are not necessary for this launch. Omit them rather than inventing tie rules or copying the old placeholder values.

### 9.3 Strengths and improvement priorities

Proposed demo defaults:

- At least 3 attempted questions in a topic before assigning a strength/weakness label.
- Strength: accuracy ≥80%.
- Needs improvement: accuracy <50%.
- Other topics: developing.
- Fewer than 3 attempts: limited evidence.

Keep these values in one configuration module and identify them as heuristic thresholds, not validated diagnoses.

Rank revision priorities by marks lost relative to maximum marks, with counts and question references visible. Show skipped-heavy topics separately from inaccurate attempted topics.

A single test supports “needs review in this test,” not “consistently weak over time.”

### 9.4 Explanations and revision list

- Show `solutionText` as the explanation of the correct method.
- Show a wrong-option explanation only if supplied by the content author.
- Never infer “carelessness,” “calculation error,” or a cognitive cause from an incorrect answer alone.
- Store the student’s own reflection separately and label it as self-reported.
- Build a simple revision list: topic, evidence, what to review, and mapped practice links.
- Do not invent study duration, daily availability, or a calendar schedule.

---

## 10. Student activation and API contracts

### 10.1 Activation

Generate a high-entropy, single-use activation code per precreated student. Store only its digest and expiry. Deliver codes privately through the institution; do not bundle them in frontend files or application logs.

```text
Enrollment number + activation code + chosen password
    → verify exact roster record
    → atomically set password and consume claim
    → return authenticated student session
```

Use an atomic database condition requiring an unclaimed, unexpired code and no existing password. Two simultaneous activation requests must not both succeed.

- Existing accounts use login, not activation-based password replacement.
- Do not trust name, enrollment number alone, or a browser-supplied student ID as proof of account ownership.
- Use bcrypt compatible with the existing hashes; test an actual legacy-compatible hash fixture.
- Require a configured JWT secret, fixed verification algorithm, and expiration. No fallback secret.
- Derive identity from the verified token and load the student record server-side.
- Use a dedicated demo token audience and reject tokens intended for another service.
- Apply basic rate limits to activation/login and generic failure messages.

### 10.2 New public endpoints

```text
POST /api/v2/demo/auth/activate
POST /api/v2/demo/auth/login
GET  /api/v2/demo/auth/me

GET  /api/v2/demo/reports
GET  /api/v2/demo/reports/{reportId}
GET  /api/v2/demo/reports/{reportId}/questions/{questionNo}/practice
PUT  /api/v2/demo/reports/{reportId}/questions/{questionNo}/reflection
```

Report endpoints must verify:

1. Authenticated student exists.
2. Report belongs to that student.
3. Test belongs to the configured institute.
4. Test is demo-managed and published.
5. Report build matches the published test build.
6. Requested question belongs to that report.

Return 404 for inaccessible report/question IDs without revealing whether another student owns them.

Do not expose a general “fetch arbitrary question ID” endpoint. Practice access goes through the owned report’s mapping.

### 10.3 Detail response

```json
{
  "schemaVersion": 1,
  "reportId": "...",
  "test": {
    "title": "...",
    "questionCount": 75,
    "computedAt": "..."
  },
  "summary": {},
  "breakdowns": {},
  "comparisons": {},
  "insights": [],
  "revisionList": [],
  "questions": []
}
```

The implementation agent must define typed structures for the abbreviated objects in `schemas/report.py` and the matching TypeScript interfaces before implementing components.

Use string IDs in JSON and actual BSON ObjectIds in database queries. Invalid IDs produce controlled client errors, not server crashes.

For private reports use `Cache-Control: private, no-store`. Do not persist complete reports in browser local storage.

---

## 11. Frontend: small, isolated additions

### Existing files to inspect first

- `frontend/src/context/AuthContext.tsx`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/pages/StudentSignup.tsx`
- `frontend/src/pages/StudentLogin.tsx`
- `frontend/src/pages/Reports.tsx`
- `frontend/src/components/LatexText.tsx`
- `frontend/src/App.tsx`

Do not rewrite the 1,913-line `Reports.tsx` component to fit the demo. Add a separate student analysis view and preserve the legacy view behind the existing route configuration.

### Proposed additions

```text
frontend/src/
  api/demoClient.ts
  types/demoAnalysis.ts
  pages/DemoReports.tsx
  pages/DemoReportDetail.tsx
  components/demo/
    DemoStudentLayout.tsx
    ScoreSummary.tsx
    BreakdownTable.tsx
    ComparisonTable.tsx
    QuestionReview.tsx
    PracticePanel.tsx
    ReflectionInput.tsx
    RevisionPriorities.tsx
    LockedFeatureCard.tsx
```

### Routing/auth changes

- Add a demo feature flag and a dedicated FastAPI base URL.
- Adapt `AuthContext` to use the demo auth client when the flag is enabled while preserving the context interface used by `ProtectedRoute`.
- Verify the actual current auth response envelope before wiring the adapter; do not assume a field name from this plan.
- Demo signup collects enrollment, activation code, and password; it does not let the user choose a different institute, batch, or student identity.
- Demo login redirects to reports, not the legacy dashboard.
- A minimal demo layout avoids background calls to legacy institute/dashboard/student APIs that are private for launch.
- Use one dedicated Axios client; clear its token and in-memory report state on logout or user change.
- Handle expired sessions and cancel/ignore stale fetches when navigating between reports.

### UI/UX direction

Reuse the existing typography, colors, cards, math rendering, and responsive layout. Do not introduce a redesign dependency.

Suggested order:

1. Test title, score, attempted/correct/incorrect/skipped summary.
2. Subject and difficulty tables.
3. Class/topper comparisons with cohort labels.
4. Unit/chapter/topic and question-type tables.
5. Improvement priorities and revision list.
6. Question review with correct/incorrect/skipped filters.
7. Practice panel and reflection editor within each question.
8. Locked future-feature cards.

Specific rules:

- Subject tabs come from report data, not `['Physics', 'Chemistry', 'Biology']`.
- Numerical questions render values, not an empty options grid.
- Keep question order from `questionNo`; never rely on MongoDB result order.
- Make practice available from every original question, including skipped and correct ones.
- Show practice answers only after the student chooses to reveal/check them; do not imply this is a secure examination mode.
- Reflections use explicit save, visible save status, and a configurable length limit such as 1,000 characters.
- Locked features open a clear “Not available in this demo” message and make no generation API call.
- Empty categories show “No questions in this category.” Missing reports show “Your analysis is not published yet.”

---

## 12. Backend file map and execution order

All paths below are proposed additions unless explicitly described as existing.

```text
analysis_service/
  pyproject.toml
  .env.example
  app/
    main.py
    config.py
    db.py
    cli.py
    schemas/
      inputs.py
      report.py
      auth.py
    domain/
      normalization.py
      grading.py
      analytics.py
      comparisons.py
      insights.py
    services/
      validation.py
      importer.py
      publication.py
      account_claims.py
    repositories/
      students.py
      questions.py
      tests.py
      reports.py
    api/
      dependencies.py
      auth.py
      reports.py
  tests/
    fixtures/
    test_validation.py
    test_grading.py
    test_import_idempotency.py
    test_comparisons.py
    test_access.py
    test_activation.py
```

### Implementation phases

**Phase 1 — Contracts and fixtures**

- Inspect the existing model/auth files and confirm actual shapes.
- Create a tiny fixture containing MCQ, numerical zero, negative integer, skipped answers, Mathematics, tied toppers, and multiple batches.
- Define Pydantic and TypeScript contracts.
- Confirm institutional marking in the manifest.

**Exit:** Inputs validate or fail with actionable errors; no database mutation yet.

**Phase 2 — Preparation engine**

- Implement normalization, pure grading, aggregation, and comparisons.
- Implement stable-ID upserts, build state, publication checks, and recommendations.
- Add only necessary optional model compatibility fields; do not alter existing API contracts.

**Exit:** Running prepare twice changes no entity counts, and all score/count invariants pass.

**Phase 3 — Student access**

- Implement account activation, login, owner-scoped read APIs, and reflections.
- Enforce legacy deployment isolation.

**Exit:** An activated student sees only their own published current-build reports.

**Phase 4 — Demo UI**

- Wire the demo auth adapter and routes.
- Render snapshots and practice questions.
- Add loading, empty, error, expiry, and locked-feature states.

**Exit:** A student can complete the launch flow on desktop and mobile without calling legacy APIs.

**Phase 5 — Rehearsal and release**

- Import the real prepared bundle privately.
- Manually reconcile selected students against the source sheets.
- Verify Mathematics/numerical display, account linking, cohort comparisons, and all practice mappings.
- Publish only after the checklist below passes.

### Instructions to the lower-parameter implementation model

- Work one phase at a time; report changed files and checks run after each phase.
- Implement the tiny fixture end to end before importing the real cohort.
- Do not infer missing schema fields or exam rules.
- Do not introduce OCR, Redis, workers, vector databases, or LLM calls.
- Do not rename existing collections or identifiers.
- Do not use student names as join keys.
- Do not edit unrelated legacy components to make the new demo compile.
- Keep a single grading implementation and a single set of metric formulas.
- Stop on ambiguous source data rather than inventing answers or metadata.

---

## 13. Acceptance tests: non-negotiable safeguards

### Grading/data

- MCQ letters normalize correctly; ambiguous literal options are rejected by the legacy adapter.
- Numerical 0, negative integers, and leading-zero strings grade correctly.
- `false`, fractional values, invalid options, and duplicate question numbers are rejected.
- Null is skipped; missing rows are errors.
- Per-type penalties are respected and total score reconciles.
- Zero attempts and empty categories do not divide by zero.
- Overlapping topic tags do not inflate overall totals.
- Mathematics stays Mathematics throughout import, grading, and rendering.

### Idempotency/publication

- Preparing the same bundle twice creates no duplicates.
- A failed build cannot be viewed by students.
- A published report cannot be partially overwritten by another prepare call.
- Old build reports do not enter comparisons or report lists.
- Answer-key correction rebuilds the whole affected cohort.
- Exactly three valid recommendation references exist for every original question before publication.

### Identity/privacy

- Two students with the same name remain distinct.
- Activation preserves the student `_id` referenced by the report.
- A used/expired activation code fails; simultaneous claims yield only one success.
- Importing a roster never changes an existing password.
- Student A cannot read or modify student B’s report, practice mapping, or reflection.
- Anonymous access fails even with a valid report ID.
- Legacy direct deployment URLs cannot expose the same database publicly.
- Report responses contain no other students’ identifiers or raw answer sheets.

### UI

- Ordered MCQ and numerical review works with LaTeX.
- Correct, incorrect, and skipped filters are accurate.
- Class/topper values match independently calculated fixtures, including ties.
- Empty and single-student cohorts are explained honestly.
- Practice works without the mock recommendation file or an AI provider.
- Logout clears the previous student’s report from memory and view.
- Locked features do not trigger requests.

---

## 14. Day-before and demo-day runbook

### Before the institution sends data

The software, contracts, importer, authentication, and fixture rehearsal should already be complete. The day-before window should be for content preparation and verification—not building this feature set from scratch.

Prepare:

- Private data directory and deployment secrets.
- A completed sample bundle accepted by the validator.
- An agreed enrollment identifier, marking scheme, and batch rule.
- Institution-approved activation delivery.
- A rollback copy and an unpublished test rehearsal.

### Day before analysis

1. Receive the paper, key, roster, and response sheets.
2. Prepare and validate JSON.
3. Review numerical keys, signs, skipped answers, and mappings.
4. Prepare the 225 practice questions and authored solutions.
5. Run ingestion and verification while unpublished.
6. Independently verify a high-scoring, low-scoring, and skipped-heavy student, plus all unusual answer formats.
7. Test account activation for representative accounts.
8. Freeze the bundle and publish only after approval.

**Schedule risk:** Authoring and checking 225 useful practice questions may take longer than the analysis computation. Have the authors/templates ready beforehand. If coverage is incomplete, do not fabricate questions or pretend the complete feature is ready.

### Demo day

- Check service/database health and one approved student login.
- Confirm report and practice endpoints return the published build.
- Distribute activation details privately.
- Keep the operator available for roster/activation issues.
- Do not change keys or recompute a live cohort without unpublishing first.

---

## 15. Short execution summary

**Reuse the existing students, tests, question collections, and evaluation reports. Add a small FastAPI service and private JSON-preparation CLI; support Mathematics and exact integer grading; publish only fully verified snapshots; activate the already-created student accounts; render a focused React report/practice view. Keep legacy APIs private, prevent duplicate imports, and defer OCR, live AI, and longitudinal features.**

The result is a fast, controlled demo whose useful safeguards are identity correctness, grading correctness, complete publication, and private student access—not a broad software-hardening project.
