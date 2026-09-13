# CogniTest — Phase-wise Implementation Prompts

**Suggested filename:** `CogniTest_PHASEWISE_EXECUTION_PROMPTS.md`

These prompts implement the prepared-data student-analysis demo in the existing repository. They are written for an implementation model with repository and terminal access.

**Execution rule:** Give the model the master prompt, both original Markdown documents, and **one phase at a time**. Do not ask it to implement every phase in one uninterrupted response. Carry the updated implementation notes forward between phases.

The goal is reliable, modular implementation—not a rewrite, not a collection of demo-only hacks, and not unnecessary infrastructure.

---

# 1. Architecture and scope to preserve

## Product outcome

Internal operators prepare question, answer-key, roster, response, and recommendation JSON. A private CLI validates and imports those datasets, computes reports, and publishes a verified cohort. Students activate their existing roster accounts, log in, and see their own analysis and mapped practice questions.

```text
Private prepared JSON
        │
        ▼
Validation + preparation CLI
        │
        ▼
Existing MongoDB database
        ▲
        │
New FastAPI student-analysis API
        ▲
        │
Existing React application, with isolated demo routes
```

## Technology boundary

- Preserve the existing React + TypeScript application.
- Implement new backend functionality in FastAPI.
- Reuse MongoDB and the existing core collections.
- Preserve the existing Express backend; do not migrate or rewrite it.
- Keep legacy APIs private for the student demo unless their access controls have independently been verified.

**Tradeoff:** The FastAPI service adds deployment overhead. This specification deliberately uses an additive service rather than disguising a backend migration as a small patch.

## Included

- Account activation and login.
- Manual JSON ingestion through a private CLI.
- MCQ and exact integer-numerical grading.
- Mathematics support in the new analysis path.
- Precomputed question-wise and aggregate reports.
- Subject, difficulty, subject × difficulty, question-type, unit, chapter, and topic breakdowns.
- Defined class-average and topper comparisons.
- Authored solutions and optional wrong-option explanations.
- Three mapped practice questions per original question.
- Saved student reflections.
- Rule-based revision priorities.
- Clearly locked future features.

## Excluded

OCR, OMR image processing, live AI generation, vector search, online exam administration, paid features, notifications, growth tracking, full calendar planning, and a legacy-backend rewrite.

## Three implementation refinements

These clarify the previous blueprint so the execution model does not have to invent details:

1. **Demo authentication uses a JWT in a secure HttpOnly cookie**, not an additional browser-readable token. Keep the existing React auth-context interface through an adapter. Legacy authentication remains unchanged outside demo mode.
2. **Reflections use a map keyed by validated question number**, rather than an array. This allows atomic updates without duplicate reflection entries.
3. **Snapshot marks and percentages use canonical decimal strings.** Domain arithmetic uses `Decimal`; legacy numeric fields remain numbers through explicit conversion. The frontend formats official results but does not recalculate them.

Production routing must make the new API available under the frontend’s origin. Development should use a Vite proxy. If the current hosting cannot support this, report the deployment blocker instead of silently weakening cookie security.

---

# 2. MASTER PROMPT — Give this to the implementation model first

## Your role

You are implementing a defined extension inside an existing repository. Your job is to execute the current phase accurately, preserve existing behavior outside the demo feature, and leave evidence that your changes work.

The user wants a fast-to-ship implementation with maintainable boundaries. Do not equate speed with skipping validation or testing. Do not equate maintainability with introducing unnecessary frameworks or abstraction layers.

## Sources of truth

Use this order:

1. Current repository files and executable configuration.
2. Explicit requirements and contracts in this execution specification.
3. The supplied project-context Markdown as an inspection guide.
4. The feature-workflow Markdown for product context.

The project-context document describes a snapshot. It is not proof that the current checkout still matches every detail.

When repository facts conflict with the execution specification:

- State the conflict with the real file path and relevant symbol.
- Preserve existing public contracts unless this specification explicitly changes the demo path.
- Stop if resolving the conflict requires a product or destructive migration decision.
- Do not invent missing functions, files, environment variables, middleware, or integrations.

## Mandatory working rules

1. Inspect before editing.
2. Implement only the current phase.
3. Do not replace working legacy features with placeholders.
4. Do not introduce an OCR, AI, queue, Redis, or vector-search dependency.
5. Do not rename existing collections or identifiers.
6. Do not join students by name.
7. Do not put Mathematics records into Biology.
8. Do not make API calls or database queries directly from React presentation components; use the demo client and hooks.
9. Keep grading and analytics independent of FastAPI, MongoDB, and React.
10. Put database access in repository modules. Put HTTP mapping in API modules. Put orchestration in service modules.
11. Use explicit input, database, and response mappings. Never return raw MongoDB documents.
12. Use strict validation for new inputs. Do not silently repair ambiguous data.
13. Add regression tests with each behavioral change.
14. Do not silently catch errors and continue. Report contextual failures without exposing secrets.
15. Do not run destructive database commands or production imports without operator approval.
16. Do not claim tests passed unless you ran them and saw the result.
17. If the environment prevents a check, mark it `NOT RUN`, explain why, and provide the exact command.
18. Do not modify unrelated dependencies or lockfiles.
19. Use the repository’s established frontend conventions unless incompatible with a stated requirement.
20. Do not deploy automatically merely because coding is complete.

## Dependency and runtime rules

- Inspect installed runtimes and dependency versions first.
- Use one Python dependency-management approach consistently.
- Pin a compatible dependency set and record the selected versions.
- Use FastAPI, Pydantic, PyMongo, an established JWT library, bcrypt-compatible password hashing, and pytest.
- Do not mix incompatible Pydantic APIs.
- Do not use deprecated package examples from memory when the installed API differs.
- With synchronous PyMongo, use synchronous FastAPI route handlers for blocking database work, or explicitly offload blocking calls. Do not block the event loop inside `async def` handlers.
- Create and close one MongoDB client per application process through application lifespan management.

## Required implementation records

Create and maintain:

```text
implementation/
  REPO_FACTS.md
  CONTRACTS.md
  FIXTURE_EXPECTATIONS.md
  PHASE_STATUS.md
  RUNBOOK.md
```

These documents must remain concise and factual. They are the handoff memory for subsequent phases.

## Required response after every phase

```text
PHASE: <number and name>
STATUS: COMPLETE | BLOCKED

Repository facts verified:
- ...

Files changed:
- path — purpose

Behavior implemented:
- ...

Checks actually run:
- command — result

Checks not run:
- command — reason

Compatibility notes:
- ...

Remaining blockers:
- ...

Next permitted phase:
- ...
```

Never advance merely because code compiles. The current phase’s exit criteria must pass.

---

# 3. Shared contracts — Apply in every phase

## 3.1 Identity and subject handling

- Institution identity comes from operator configuration and verified database records, not student request bodies.
- Student identity is the existing MongoDB `_id`, resolved from the institution’s stable enrollment identifier.
- New records must not collide with the existing global enrollment uniqueness constraint.
- Ambiguous case-insensitive enrollment matches are errors.
- Existing passwords are never overwritten during import.
- Use an explicit subject registry:

```python
SUBJECT_COLLECTIONS = {
    "Physics": "physics_questions",
    "Chemistry": "chemistry_questions",
    "Biology": "biology_questions",
    "Mathematics": "mathematics_questions",
}
```

Verify existing collection names before implementing this registry. Unknown subjects fail validation. Do not use a fallback collection.

Only the subjects present in the imported paper appear in its report.

## 3.2 Prepared-data directory

```text
private_data/<test-key>/
  manifest.json
  questions.json
  answer_key.json
  students.json
  responses.json
  recommendations.json
```

Real prepared data must be gitignored and must never enter frontend assets. Synthetic fixtures belong in the test directory.

### Manifest

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
markingByType
comparisonPolicy
recommendationsPerQuestion
```

`markingByType` supplies `correctMarks` and nonnegative `incorrectPenalty` for each supported type. Optional per-question overrides may be used only when explicitly supplied.

Do not assume the real paper uses +4/−1. Those values appear below only in synthetic fixtures.

`expectedStudentCount` means evaluated students included in this import. Roster-only students may exist without a response set; they receive no zero-score report.

### Question contract

```text
questionNo: positive integer
subject: supported subject
unit: nonempty string
chapter: nonempty unique string array
topic: nonempty unique string array
questionType: multiple_choice | numerical
difficulty: easy | medium | hard
questionIntent: nonempty string
questionText: nonempty string
options: required for MCQ; absent or empty for numerical
solutionText: nonempty string
supported optional media
```

Validate MCQ option counts within the implemented letter range. The default implementation supports 2–26 options; the real exam format may impose a narrower rule.

### Answer-key contract

Exactly one entry per original question:

```json
[
  { "questionNo": 1, "correctOption": "B" },
  { "questionNo": 2, "numericalAnswer": 0 }
]
```

The paper determines the type. A numerical question cannot receive an MCQ key or vice versa.

### Response contract

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

- Every evaluated student has an explicit row for every question.
- `null` means skipped.
- A missing row means incomplete input.
- Numerical zero is a valid answer.
- Booleans, fractions, scientific notation, and decimal strings such as `"4.0"` are not valid integer responses in this version.
- Accept canonicalizable integer strings such as `"+04"` and `"-0"`.
- Bound supported integers to the JavaScript safe-integer range to avoid browser precision loss; document this as a platform limit, not an exam rule.

### Recommendation contract

Each original question maps to exactly three practice-question objects for the complete demo. Practice questions have their own stable source keys, full metadata, valid answers, and authored solutions.

Resolve references during import. Do not use frontend mock lookups or manually fabricated ObjectIds.

## 3.3 Score and comparison rules

- Correct: add configured correct marks.
- Incorrect: subtract configured penalty.
- Skipped: zero.
- Negative scores are valid.
- Integer questions use exact equality.
- Unsupported multi-correct, bonus, dropped, or optional-choice rules block preparation until explicitly resolved.

Proposed comparison policy, stored in the manifest:

- Cohort: same institute, test, and imported batch snapshot.
- Average: all valid evaluated students in that cohort, including the viewer.
- Topper: highest overall test score in that cohort.
- Tied toppers: mean of the tied group’s category scores, labeled `Joint toppers’ average`.
- One evaluated student: comparisons unavailable.
- Absentees: excluded.
- Do not expose other students’ raw scores or identities.

## 3.4 Analysis formulas

```text
attempted = correct + incorrect
questionCount = correct + incorrect + skipped
score = sum(awardedMarks)
maximumMarks = sum(questionMaximumMarks)
accuracyPct = correct / attempted × 100, or null
coveragePct = attempted / questionCount × 100, or null
marksLost = maximumMarks - score
```

Subject, difficulty, and question-type partitions reconcile with the overall totals.

Chapter/topic tags may overlap. Count a question once within a matching tag and label those breakdowns as overlapping. Do not add those rows to derive the test total.

Keep subject in grouping keys. A topic named `Equilibrium` in two different subjects must not accidentally become one group.

Use decimal arithmetic for official results. Round display values only at serialization using a documented rule, proposed as two decimal places with `ROUND_HALF_UP`.

## 3.5 Snapshot response contract

Define complete Pydantic and TypeScript types before building UI components.

```typescript
type DecimalText = string;
type QuestionStatus = 'correct' | 'incorrect' | 'skipped';
type QuestionType = 'multiple_choice' | 'numerical';

interface MetricBucket {
  key: string;
  label: string;
  subject?: string;
  questionCount: number;
  correct: number;
  incorrect: number;
  skipped: number;
  attempted: number;
  score: DecimalText;
  maximumMarks: DecimalText;
  accuracyPct: DecimalText | null;
  coveragePct: DecimalText | null;
  overlapping: boolean;
}

interface QuestionResult {
  questionNo: number;
  questionId: string;
  contentHash: string;
  subject: string;
  unit: string;
  chapter: string[];
  topic: string[];
  questionType: QuestionType;
  difficulty: 'easy' | 'medium' | 'hard';
  questionIntent: string;
  questionText: string;
  options: string[];
  studentAnswer: string | null;
  correctAnswer: string;
  status: QuestionStatus;
  awardedMarks: DecimalText;
  maximumMarks: DecimalText;
  solutionText: string;
  selectedOptionExplanation?: string;
  practiceCount: number;
}
```

For snapshot answers, MCQs use letters and numerical questions use normalized integer strings. The discriminator is `questionType`; do not infer the type from the answer’s appearance.

Extend these types explicitly for sanitized media, comparison rows, insights, and revisions. Do not use `any` to bypass missing contracts.

The detail response includes `schemaVersion`, `reportId`, `buildId`, test metadata, summary, breakdowns, comparisons, insights, revision list, questions, and the viewer’s reflections.

---

# 4. PHASE 0 PROMPT — Inspect the repository and establish the baseline

## Objective

Determine what actually exists before adding code. Do not implement features in this phase.

## Tasks

1. Inspect repository structure, Git status, package files, lockfiles, runtime configuration, deployment files, and environment-variable references.
2. Read the actual implementations of:
   - Student, Question, Test, EvaluationReport, and StudentAnalytics models.
   - Signup, login, and current-user handlers.
   - JSON ingestion and evaluation handlers.
   - Student report listing and review routes.
   - React AuthContext, ProtectedRoute, signup/login pages, Reports, App routing, and LatexText.
3. Record:
   - Actual model fields, required properties, defaults, collection names, and indexes.
   - How existing bcrypt hashes are generated and verified.
   - Actual auth-context shape and caller expectations.
   - Subject factories and Mathematics gaps.
   - Existing unsafe/public legacy routes that touch the same data.
   - Existing test, build, lint, and type-check commands.
4. Identify user-modified files. Do not overwrite unrelated changes.
5. Run available baseline checks without changing dependencies.
6. Separate pre-existing failures from new-work blockers.
7. Determine how development and production can route `/api/v2/demo/*` to FastAPI on the frontend’s origin.
8. Determine whether the legacy backend’s direct hosting URL can be made private. Do not change production exposure yet.
9. Create the implementation records listed in the master prompt.

## Deliverables

- `REPO_FACTS.md` with actual paths and verified findings.
- `PHASE_STATUS.md` containing the baseline results.
- A small proposed integration map: files added versus existing files modified.
- An explicit list of blockers requiring operator input.

## Exit criteria

- No invented existing functions or paths.
- Existing auth and report contracts are documented.
- The new-service boundary is feasible locally.
- Deployment uncertainty is recorded, not hidden.

Stop after the inspection report.

---

# 5. PHASE 1 PROMPT — Scaffold the service, contracts, and synthetic fixtures

## Objective

Create the smallest runnable FastAPI service and strict input/output contracts. Do not connect student UI or import real data yet.

## Proposed structure

Adapt names to repository conventions without changing responsibilities:

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
      reports.py
      auth.py
    domain/
      normalization.py
      grading.py
      analytics.py
      comparisons.py
      insights.py
    repositories/
      students.py
      questions.py
      tests.py
      reports.py
    services/
      validation.py
      preparation.py
      publication.py
      account_claims.py
    api/
      dependencies.py
      auth.py
      reports.py
  tests/
    fixtures/
    unit/
    integration/
```

Do not create empty abstraction classes merely to fill this tree. Introduce modules as responsibilities become implemented.

## Tasks

1. Add application startup, validated settings, a health endpoint, and MongoDB client lifecycle handling.
2. Distinguish liveness from database readiness. Do not leak configuration in either response.
3. Require secrets and institute configuration; provide `.env.example` with placeholders only.
4. Define strict Pydantic models for every prepared file.
5. Reject unknown fields in new JSON contracts unless a specific extension field is documented.
6. Bound array sizes, string lengths, integer ranges, and body/file sizes through named configuration constants.
7. Validate timezone-aware dates and use UTC in storage.
8. Define the full report API contract and matching TypeScript interfaces.
9. Define domain errors separately from HTTP exceptions.
10. Add synthetic fixtures and expected results.

## Required synthetic fixture

Four questions, all with +4 correct and −1 incorrect for testing only:

| Question | Subject | Type | Difficulty | Key |
|---|---|---|---|---|
| 1 | Physics | MCQ | Easy | B |
| 2 | Mathematics | Numerical | Medium | 0 |
| 3 | Chemistry | MCQ | Hard | A |
| 4 | Mathematics | Numerical | Hard | −2 |

Responses:

| Student | Batch | Q1 | Q2 | Q3 | Q4 | Score |
|---|---|---|---|---|---|---|
| A | Alpha | B | 0 | skipped | −2 | 12 |
| B | Alpha | B | skipped | A | −2 | 12 |
| C | Alpha | D | 0 | B | skipped | 2 |
| D | Beta | B | 0 | A | −2 | 16 |

Expected:

- Alpha cohort size: 3.
- Alpha mean: 26/3, displayed as 8.67.
- Alpha joint toppers: A and B.
- Alpha joint-topper Mathematics mean: 6.
- Beta comparisons: unavailable because only one evaluated student exists.
- Twelve valid practice questions: three per original.

Include two students with the same display name but different enrollment identifiers in identity fixtures.

## Tests

- Schema rejects booleans as numerical integers.
- Unknown question types and subjects fail.
- Missing response rows fail.
- Numerical zero remains valid.
- Manifest count mismatches fail.
- Duplicate keys and unsupported option letters fail.
- Configuration fails clearly when required secrets are absent.

## Exit criteria

- Service starts locally.
- Liveness works.
- Contract tests pass.
- Fixture expected values are independently written in `FIXTURE_EXPECTATIONS.md`.
- No real database records have been mutated.

---

# 6. PHASE 2 PROMPT — Implement pure grading and analysis

## Objective

Implement deterministic domain functions that produce a complete analysis without FastAPI or MongoDB dependencies.

## Tasks

1. Implement normalization for MCQ letters, integer answers, labels, and question-number joins.
2. Implement grading from explicit type and marking rules.
3. Generate ordered question-result rows.
4. Implement metric buckets and all required breakdowns.
5. Implement cohort comparisons from the same normalized results.
6. Implement rule-based insights and revision priorities.
7. Implement deterministic decimal formatting and source-data canonicalization.
8. Ensure every function has clear typed inputs and outputs.

## Grading starter

Adapt this boilerplate to the verified Python version and domain types:

```python
from dataclasses import dataclass
from decimal import Decimal
import re
from typing import Literal

INTEGER_PATTERN = re.compile(r"^[+-]?[0-9]+$")
MAX_SAFE_INTEGER = 9_007_199_254_740_991
Status = Literal["correct", "incorrect", "skipped"]

@dataclass(frozen=True)
class GradeResult:
    status: Status
    normalized_answer: str | None
    awarded_marks: Decimal

def normalize_integer(value: object) -> str:
    if type(value) is int:
        number = value
    elif isinstance(value, str):
        text = value.strip()
        if len(text) > 32 or not INTEGER_PATTERN.fullmatch(text):
            raise ValueError("Expected an integer answer")
        number = int(text)
    else:
        raise ValueError("Expected an integer or integer string")

    if abs(number) > MAX_SAFE_INTEGER:
        raise ValueError("Integer exceeds supported range")
    return str(number)

def normalize_mcq(value: object, option_count: int) -> str:
    if not 2 <= option_count <= 26:
        raise ValueError("Unsupported number of options")
    if not isinstance(value, str):
        raise ValueError("Expected an option letter")
    letter = value.strip().upper()
    allowed = {chr(65 + index) for index in range(option_count)}
    if letter not in allowed:
        raise ValueError("Option is outside the available choices")
    return letter

def grade_one(
    *,
    kind: str,
    answer: object,
    key: object,
    option_count: int,
    correct_marks: Decimal,
    incorrect_penalty: Decimal,
) -> GradeResult:
    if not correct_marks.is_finite() or not incorrect_penalty.is_finite():
        raise ValueError("Marking values must be finite")
    if correct_marks <= 0 or incorrect_penalty < 0:
        raise ValueError("Invalid marking scheme")

    if kind == "multiple_choice":
        normalize = lambda value: normalize_mcq(value, option_count)
    elif kind == "numerical":
        normalize = normalize_integer
    else:
        raise ValueError("Unsupported question type")

    normalized_key = normalize(key)
    if answer is None:
        return GradeResult("skipped", None, Decimal("0"))

    normalized_answer = normalize(answer)
    if normalized_answer == normalized_key:
        return GradeResult("correct", normalized_answer, correct_marks)
    return GradeResult("incorrect", normalized_answer, -incorrect_penalty)
```

Do not use `if not answer` to detect a skipped response. That incorrectly treats numerical zero as missing.

## Analysis requirements

- Unknown or malformed values fail before aggregation.
- The question key is validated even when the student skipped the question.
- Keep all zero-attempt categories present when questions exist in that category.
- Return null accuracy when attempted is zero.
- Do not use legacy SWOT functions with inconsistent thresholds.
- Proposed insights: at least three attempted questions before labeling a topic strong or weak; strength ≥80%, needs improvement <50%.
- Low-sample topics are labeled `Limited evidence`.
- A skipped-heavy topic is not automatically labeled a conceptual weakness.
- Revision priorities include evidence and linked question numbers.
- Authored solutions explain the method. They do not establish why a student made a mistake.
- No LLM calls.

## Tests

- Every fixture score and comparison matches Phase 1 expectations.
- Different MCQ and numerical penalties are honored in a separate fixture.
- All-skipped and all-incorrect tests work.
- Negative scores remain negative.
- `+04`, `-0`, and whitespace normalize consistently.
- `false`, `4.0`, `1e2`, and invalid letters fail.
- Overlapping tags never inflate overall totals.
- Same-named tags in different subjects stay separate.
- Input ordering does not change the result.
- Class/topper calculations never mix batches.
- A separate fixture with sufficient topic attempts verifies insight thresholds.

## Exit criteria

The complete domain test suite passes without a running database or web server.

---

# 7. PHASE 3 PROMPT — Implement database mappings and safe preparation

## Objective

Persist validated data into the existing models with stable identifiers, repeatable imports, and no automatic publication.

## Proposed additive model fields

Use the `analysisDemo` namespace.

### Students

```text
claimDigest
claimExpiresAt
claimedAt
```

### Questions

```text
managed
sourceKey
contentHash
```

### Tests

```text
managed
sourceKey
status: DRAFT | BUILDING | FAILED | READY | PUBLISHED
buildId
sourceHash
expectedStudents
policy
computedAt
publishedAt
```

Each `Test.questions[]` entry additionally stores demo marking, recommendation references, and optional authored distractor explanations.

### Evaluation reports

```text
managed
buildId
sourceHash
batchSnapshot
computedAt
schemaVersion
snapshot
reflections: map keyed by questionNo
```

A reflection value contains:

```text
text
updatedAt
questionContentHash
```

A reflection whose content hash no longer matches is retained as stale, not silently applied to the revised question or silently deleted.

## Tasks

1. Implement explicit repository methods and document mappers.
2. Preserve BSON ObjectIds in the database and convert IDs to strings only in API DTOs.
3. Set required fields explicitly because PyMongo does not apply Mongoose defaults.
4. Add optional fields to existing Mongoose interfaces/schemas where needed so legacy tooling does not strip or misinterpret them. Do not modify unrelated controllers.
5. Verify and make `omrImageUrl` optional if the real model currently requires it. Do not invent an image URL.
6. Add Mathematics storage using the existing question document shape.
7. Implement stable source keys:
   - Original: `<testKey>:original:<questionNo>`.
   - Practice: `<testKey>:practice:<providedSourceKey>`.
8. Upsert test-owned question copies. Do not overwrite shared legacy question-bank records.
9. Preserve existing passwords and activation data during roster imports.
10. Keep legacy `StudentAnalytics` unchanged.
11. Populate legacy report score/performance fields consistently while making the demo snapshot authoritative.
12. Store demo-managed tests with legacy `isPublished = false`.
13. Add a BSON-size check before writes. Reject oversized snapshots with an actionable message; do not discover MongoDB’s document-size limit during publication.
14. Sanitize supported rich media using a maintained parser/sanitizer. Do not use a regex-only SVG security filter.

## Index requirements

Create named indexes through an explicit CLI command:

- Unique demo test source key per institute.
- Unique demo question source key per institute within each subject collection.
- Unique `(testId, studentId)` for demo-managed reports.
- Student report lookup index.

Use partial indexes for new demo constraints where legacy records do not have the relevant fields. Inspect existing indexes first. Never drop an existing index automatically.

## CLI commands

```bash
python -m app.cli validate --dir <private-directory>
python -m app.cli indexes --check
python -m app.cli indexes --apply
python -m app.cli prepare --dir <private-directory>
```

`validate` performs no writes. Index application and preparation must display their target database without printing credentials.

## Preparation algorithm

1. Load and validate every file.
2. Resolve identity collisions before writing.
3. Compute all results and comparisons.
4. Canonicalize validated content and calculate the source hash.
5. Acquire the test’s build state with an atomic compare-and-set.
6. Reject another active build or a changed published test.
7. Upsert students and test-owned questions.
8. Resolve recommendation references.
9. Upsert one report per test/student with the current build ID.
10. Replace only fields owned by preparation; never replace an entire student document or overwrite reflection fields.
11. Verify current-build record counts and invariants.
12. Change the test to `READY` only if the build ID still matches.
13. On failure, leave the test unpublished, record a bounded error summary, and exit nonzero.

Use one operator process per test. A crashed build may be unlocked only after the operator confirms that the previous process has stopped. Do not implement automatic lock stealing that allows a stale process to continue writing.

## Idempotency rules

- Same input must reuse the same test, students, questions, and reports.
- Semantically identical file ordering must not create a different source hash.
- A no-op rerun does not regenerate activation codes.
- Changed content requires an explicit rebuild.
- A published unchanged bundle may return `Already published`; it must not rewrite live documents.
- Stale reports from an earlier build are not counted or returned.

## Tests

Use a real isolated MongoDB test database for index and atomic-update behavior. Mocks alone are insufficient for these guarantees.

- Run preparation twice; assert unchanged entity counts.
- Preserve an existing password.
- Preserve distinct students with identical names.
- Inject a failure halfway through preparation; the test remains unpublished.
- Reject concurrent preparation for the same test.
- Verify Mathematics references and integer responses.
- Verify field mappings preserve required legacy shapes.
- Verify oversized or unsafe media is rejected or sanitized according to contract.

## Exit criteria

The synthetic bundle produces a verified `READY` test and stable report documents. No student can read them yet.

---

# 8. PHASE 4 PROMPT — Implement verification, publication, and correction controls

## Objective

Make publication a controlled switch over a complete, validated build.

## Commands

```bash
python -m app.cli verify --test-key <key>
python -m app.cli publish --test-key <key>
python -m app.cli unpublish --test-key <key>
```

Add an explicit recovery command only if needed, with a confirmation requirement and documented preconditions.

## Tasks

1. Implement verification that independently rechecks stored results against prepared inputs or recomputed domain output.
2. Verify:
   - Expected evaluated-student count.
   - Exactly one current-build report per student.
   - Question count and score reconciliation.
   - Subject/type/difficulty partition reconciliation.
   - Same build ID across the test and all publishable reports.
   - Cohort comparisons match the current evaluated set.
   - Every original question has three valid practice mappings.
   - Every report’s student and test belong to the configured institute.
3. Implement atomic `READY → PUBLISHED` using expected state, build ID, and source hash in the update condition.
4. Keep legacy `isPublished = false`.
5. Implement unpublication without deleting reports.
6. Reject changed preparation while published.
7. Document correction flow:

```text
Back up relevant data and prepared bundle
→ Unpublish
→ Correct source JSON
→ Prepare the full affected cohort
→ Verify
→ Publish
```

Do not patch one student’s score after an answer-key correction.

## Tests

- An incomplete build cannot publish.
- A stale build cannot publish over a newer one.
- A failed build cannot publish.
- A missing recommendation prevents complete-demo publication.
- A corrected key updates all affected student and cohort results.
- Stale reflections remain identifiable by content hash.
- Repeated publish is either a safe no-op or a clear state response, never a duplicate operation.

## Exit criteria

The fixture can be prepared, independently verified, published, unpublished, corrected, and republished through documented commands.

---

# 9. PHASE 5 PROMPT — Implement student activation and secure sessions

## Objective

Let a student claim the precreated roster record and log in without duplicating identity or exposing another student’s report.

## Endpoints

```text
POST /api/v2/demo/auth/activate
POST /api/v2/demo/auth/login
POST /api/v2/demo/auth/logout
GET  /api/v2/demo/auth/me
```

## Tasks

1. Create an operator-only claim-issuance command.
2. Generate high-entropy single-use codes with a cryptographically secure generator.
3. Store only code digests and expirations.
4. Export delivery information to an explicitly requested private output file with restrictive permissions. Never print codes in routine logs.
5. Do not reissue codes or reset passwords during preparation.
6. Activation accepts enrollment number, code, and chosen password.
7. Resolve the existing student and use an atomic update requiring:
   - Correct claim digest.
   - Unexpired claim.
   - Unclaimed state.
   - No existing password.
8. Set the password on the same student `_id` and consume the claim.
9. Verify compatibility with an actual bcryptjs-compatible test hash before enabling login for existing accounts.
10. Define password limits explicitly, including bcrypt’s byte-length behavior. Do not silently truncate newly chosen passwords.
11. Issue a JWT with fixed algorithm, configured issuer/audience, subject, role, issued-at, and expiry.
12. Use an HttpOnly cookie scoped to `/api/v2/demo`, Secure in production, and SameSite=Lax or stricter.
13. Do not return the JWT in the JSON response.
14. The current-user response returns an allowlisted student DTO, never a database document.
15. Logout clears the cookie using matching attributes and path.

## CSRF and abuse controls

- Route the API through the frontend origin.
- For unsafe browser methods, validate the `Origin` against an exact configured allowlist and reject missing/unapproved origins.
- Do not use wildcard credentialed CORS.
- Enforce request-size limits at the application/proxy boundary.
- Implement a shared rate limit for activation/login before deployment: use verified hosting support or a small MongoDB-backed limiter. An in-memory limiter alone is not a production guarantee across instances.
- If using MongoDB limiter records, TTL handles cleanup only; code must enforce the actual time window.
- Trust forwarded IP headers only from configured proxies.
- Use generic authentication failures and never log passwords, claim codes, cookies, or JWTs.

## Tests

- Activation keeps the report-linked student ID.
- Two simultaneous activation requests result in one successful claim.
- Expired and already-used claims fail.
- Existing passwords cannot be replaced through activation.
- Login verifies compatible existing hashes.
- Wrong issuer/audience/algorithm, expired token, or deleted student fails authentication.
- Cookie settings are correct in production configuration.
- Cross-origin unsafe requests fail.
- Rate limiting returns 429 after the configured threshold.
- Responses contain no password or claim data.

## Exit criteria

The synthetic students can activate and log in securely. The FastAPI authentication contract is documented for the React adapter.

---

# 10. PHASE 6 PROMPT — Implement owner-scoped reports, practice, and reflections

## Objective

Expose precomputed reports without regrading on requests or allowing arbitrary student/question lookup.

## Endpoints

```text
GET /api/v2/demo/reports
GET /api/v2/demo/reports/{reportId}
GET /api/v2/demo/reports/{reportId}/questions/{questionNo}/practice
PUT /api/v2/demo/reports/{reportId}/questions/{questionNo}/reflection
```

## Authorization requirements

Every detail/practice/reflection request verifies:

1. Authenticated student exists.
2. Report belongs to that student.
3. Test and student belong to the configured institute.
4. Test is demo-managed and published.
5. Report build matches the published build.
6. Requested question belongs to that report.

The list endpoint derives the student ID from the session. It does not accept an arbitrary student ID query parameter.

Use consistent 404 responses for missing or inaccessible resources. A malformed ObjectId receives a controlled client error, not a traceback.

## Tasks

1. Implement bounded report listing with documented pagination.
2. Return typed DTOs from snapshots.
3. Do not perform grading or cohort recomputation inside HTTP handlers.
4. Return aggregate comparison values only, not classmates’ score arrays.
5. Resolve practice only through the owned report’s stored mappings.
6. Include practice answers and solutions only in the practice feature’s response contract, not in unrelated list responses.
7. Make clear that practice is a self-study experience, not a secure examination.
8. Accept reflections with:
   - Text bounded to 1,000 characters.
   - Expected build ID.
   - Expected question content hash.
9. Use atomic `$set` on a server-generated reflection-map key from validated `questionNo`.
10. Never allow user-supplied MongoDB paths or update operators.
11. Treat empty reflection text as explicit clearing, and document that behavior.
12. Return 409 for a stale reflection edit so the client can refresh rather than overwrite against an old question.
13. Set `Cache-Control: private, no-store` on student-data and auth responses.
14. Return stable error codes with non-sensitive user messages.

## Performance requirements

- Use projections and bounded queries.
- No per-question database query loops for original report detail; the snapshot already contains those rows.
- Practice resolution may fetch the three mapped questions in one grouped lookup per subject.
- Do not add a caching service.

## Tests

- Student A cannot list, read, practice from, or reflect on B’s reports.
- Anonymous requests fail even with valid IDs.
- Unpublished and stale-build reports remain inaccessible.
- Unknown question numbers fail.
- Reflection updates do not alter score or snapshot fields.
- Concurrent edits do not create duplicate reflection entries.
- Stale build/hash updates return 409.
- DTOs contain no raw Mongo fields, credentials, or other student identities.
- Correct fixtures are served without invoking grading functions on the request path.

## Exit criteria

All report API integration tests pass against a published synthetic fixture.

---

# 11. PHASE 7 PROMPT — Integrate the React demo without rewriting legacy views

## Objective

Connect students to the new flow using modular components and existing styling.

## Proposed files

```text
frontend/src/
  api/demoClient.ts
  types/demoAnalysis.ts
  hooks/useDemoReports.ts
  hooks/useDemoReport.ts
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

Use fewer files if a component has no independent responsibility. Do not combine the entire feature into a new giant page.

## Tasks

1. Add a demo feature flag and an API client for `/api/v2/demo`.
2. Preserve the actual AuthContext interface documented in Phase 0.
3. In demo mode, hydrate identity through `/auth/me`; do not read or store a new JWT in localStorage.
4. Configure requests to carry same-origin cookies.
5. Keep legacy auth behavior unchanged outside demo mode.
6. Signup in demo mode collects enrollment number, activation code, and password.
7. Redirect successful demo login to the report list.
8. Create a minimal demo layout that does not fetch private legacy dashboard or institute endpoints.
9. Preserve existing legacy Reports.tsx; route demo students to the new pages behind the flag.
10. Implement report hooks with explicit loading/error/empty states and request cancellation or stale-response protection.
11. Clear report data on logout and user change.
12. Do not persist full reports in localStorage or a service-worker cache.

## Display order

1. Test title, computed timestamp, and total score.
2. Correct, incorrect, skipped, and attempted summary.
3. Subject and difficulty breakdowns.
4. Class/topper comparisons with clear cohort and tie labels.
5. Question-type, unit, chapter, and topic tables.
6. Revision priorities with evidence.
7. Filterable ordered question review.
8. Practice and reflection controls.
9. Locked future features.

## Component rules

- Subject tabs derive from the report, not a hardcoded three-subject array.
- Numerical answers render as values; do not access `.options.map()` unconditionally.
- Keep numerical zero visible.
- Use question number order.
- Use the existing math renderer only after confirming it does not introduce unsafe HTML paths.
- Sanitize SVG through the shared media boundary; never pass untrusted SVG directly to `dangerouslySetInnerHTML`.
- Decimal conversion in React is for formatting/charts only, not official grading.
- Null percentages display `Not enough data`.
- Zero-question categories display `No questions in this category`.
- Multi-tag tables display `Overlapping categories; do not sum rows`.
- Practice is available for correct, incorrect, skipped original questions.
- Practice answers are revealed after the student chooses check/reveal. Do not claim the client hides answers securely.
- Reflections have explicit save, save status, length feedback, and stale-edit handling.
- Locked features make no generation request.

## UI/UX direction

Reuse current fonts, colors, spacing conventions, cards, and icons. Favor readable tables and focused question cards over decorative charts.

Provide keyboard access, visible focus states, labeled inputs, accessible errors, and usable small-screen layouts. Do not make correctness depend on color alone.

## Tests

- Activation/login/report navigation works.
- Protected routes wait for session hydration instead of flashing incorrect content.
- Numerical zero and skipped values render differently.
- Mathematics appears only when present.
- Question filters have correct counts.
- A stale report request cannot overwrite a newly selected report.
- Logout removes the prior report from view.
- Reflection save and 409 refresh flow work.
- Practice works without mock JSON or AI credentials.
- Locked cards make no network request.
- Demo screens make no legacy API requests.

## Exit criteria

A synthetic student completes activation → login → analysis → practice → reflection on desktop and mobile layouts. Frontend type checks and component tests pass.

---

# 12. PHASE 8 PROMPT — Integration tests, legacy isolation, and regression checks

## Objective

Prove the complete flow and ensure the new path does not expose the database through old endpoints or unintentionally change legacy behavior.

## Tasks

1. Add an end-to-end test using the repository’s existing browser-test framework, or introduce one minimal framework if none exists.
2. Use synthetic accounts and a test database only.
3. Execute:
   - Prepare fixture.
   - Verify and publish.
   - Issue a claim.
   - Activate student A.
   - Log in.
   - Open the report.
   - Check fixture totals and comparisons.
   - Open practice.
   - Save a reflection.
   - Log out.
   - Log in as another student and verify isolation.
4. Test unpublication while students can otherwise access the service.
5. Test answer-key correction and full-cohort rebuild.
6. Run backend unit/integration tests, frontend type checks/tests, and production build.
7. Compare results to the Phase 0 baseline. Do not label old failures as caused by this feature, and do not use old failures as an excuse to ignore new ones.
8. Inspect the network trace for accidental calls to legacy endpoints.
9. Verify the deployment plan blocks public access to legacy report, student-update, ingestion, evaluation, and destructive routes—including the backend’s direct hosting URL.
10. Verify cookies, Origin enforcement, request limits, logging redaction, and rate limits in a production-like configuration.
11. Add a small CI workflow using the commands actually proven to work. Do not reference nonexistent scripts.

## Required release checks

- Wrong answer keys do not silently pass preparation.
- Duplicate import produces no duplicate records.
- Incomplete builds remain invisible.
- No cross-student reads or writes.
- No new unsafe raw SVG rendering.
- No secrets or real student data in Git or frontend build output.
- No hardcoded developer-specific filesystem paths.
- No fallback authentication secret.
- No placeholder score/rank/PDF presented as real analysis.
- New demo records are not exposed through legacy publication behavior.

## Exit criteria

All new-flow tests pass. Any remaining legacy issue is documented and isolated from student access. If legacy public exposure cannot be blocked, mark release `BLOCKED` even if the UI works.

---

# 13. PHASE 9 PROMPT — Operator runbook, staging rehearsal, and release handoff

## Objective

Make the system operable by the team without requiring the implementation model to improvise on demo day.

## Tasks

Complete `implementation/RUNBOOK.md` with exact verified commands for:

1. Installing dependencies.
2. Starting local frontend and FastAPI services.
3. Configuring the same-origin development proxy.
4. Running every test category.
5. Creating/checking indexes.
6. Validating a prepared bundle without writes.
7. Preparing a test.
8. Verifying stored results.
9. Issuing activation details to a private file.
10. Publishing and unpublishing.
11. Correcting a key and rebuilding a cohort.
12. Recovering a failed build after confirming the old process stopped.
13. Backing up the prepared bundle and affected records.
14. Rolling back code and restoring a prior approved build.
15. Checking application and database readiness.

## Staging rehearsal

Use a representative, approved dataset before the real launch. Record:

- Number of students and questions.
- Validation duration.
- Preparation duration.
- Report document sizes.
- Report endpoint latency under an agreed test load.
- Any failures and corrections.

Do not claim a concurrency target the team has not specified or measured. Record the actual tested envelope and raise capacity questions if launch expectations exceed it.

## Real-data release procedure

The software should already work before the institution sends the final files.

```text
Receive paper/key/roster/responses
→ Prepare JSON and authored practice content
→ Validate
→ Resolve every blocking error
→ Prepare privately
→ Verify independently
→ Test representative student accounts
→ Freeze source bundle
→ Publish
→ Distribute activation details privately
```

Manually check representative high-scoring, low-scoring, numerical-heavy, and skipped-heavy students against source sheets.

The 225 practice questions are a content-production requirement, not a computation problem. If they are not ready, report incomplete scope rather than generating unchecked placeholders.

## Operational boundaries

- Never put real inputs in `frontend/public`.
- Never publish automatically after receiving files.
- Never run the legacy global demo-clear endpoint.
- Never reset passwords to fix a roster mismatch.
- Never edit only one report after correcting a shared answer key.
- Never assume changing the frontend API URL makes the legacy API private.
- Do not deploy or change production database state without operator approval.

## Final handoff

Provide:

- Actual added/modified file list.
- Verified commands and their latest results.
- Environment-variable list without secret values.
- Confirmed database/index changes.
- Known limitations and unsupported exam rules.
- Rollback procedure.
- Remaining deployment/content blockers.
- A completed launch checklist.

Mark the implementation complete only when the evidence supports it.

---

# 14. Phase-to-phase handoff prompt

Use this wrapper when starting each next phase:

> Read `implementation/REPO_FACTS.md`, `CONTRACTS.md`, `FIXTURE_EXPECTATIONS.md`, and `PHASE_STATUS.md`, then inspect the actual files relevant to this phase. Summarize the current state briefly. Execute only Phase `<N>` from `CogniTest_PHASEWISE_EXECUTION_PROMPTS.md`. Preserve the master-prompt rules and shared contracts. Do not rebuild completed phases, silently change contracts, or proceed past a blocker. Run the phase’s checks, update the implementation records, and finish with the required phase report.

If context is lost, this wrapper and the implementation records should restore enough information to continue without guessing.

---

# 15. Final definition of done

The feature is done when:

- A manually prepared cohort imports repeatedly without duplication.
- MCQ and integer-numerical scores match independently checked answers.
- Mathematics and all required breakdowns work.
- Publication exposes only a complete current build.
- Activation attaches credentials to the student record that already owns the report.
- Students can access only their own reports, practice mappings, and reflections.
- Class/topper comparisons follow the stored policy and handle ties/empty cases honestly.
- Practice contains real authored content, not placeholders.
- The new React flow is modular and tested.
- Legacy behavior is preserved outside demo mode and legacy public exposure is controlled.
- Operators can prepare, verify, publish, correct, and recover using the runbook.
- Tests, limitations, and deployment readiness are reported truthfully.

**Implementation principle:** One authoritative grading path, explicit data contracts, private preparation, verified publication, and isolated student access. Those boundaries provide speed and maintainability without turning the demo into a platform rewrite.
