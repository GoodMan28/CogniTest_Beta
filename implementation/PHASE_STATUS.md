# Remediation Status

Tracking `CogniTest_REMEDIATION_PROMPTS.md`. Do not trust anything below
labeled COMPLETE without also reading the "Checks actually run" section of
its phase report — this file was previously left in a false "Project is
finished" state before the 2026-09-13 audit that produced the remediation
document.

**Update (2026-09-13, end of R6):** All seven remediation phases (R0-R6)
are now genuinely complete, with the evidence for each recorded in its own
phase report below. This is not the same claim the pre-remediation version
of this file made: that one asserted completion with no working analysis
feature and several fabricated metrics behind it. This one is backed by
125 passing backend tests, 7 passing frontend tests, a real two-process
HTTP walkthrough, and a real rehearsal run — all reproducible from the
commands in `RUNBOOK.md`. Real, non-code blockers remain (see R6's report)
and are listed in `HANDOFF.md`'s launch checklist; "remediation complete"
is not the same claim as "ready to launch to real students" — the latter
still requires an operator to work through that checklist.

| Phase | Status |
|---|---|
| R0 — Safety, secrets, test isolation | COMPLETE |
| R1 — Contracts and fixture | COMPLETE (with documented, expected temporary breakage — see report) |
| R2 — Pure analysis domain | COMPLETE |
| R3 — Validation, ingestion, verification, publication | COMPLETE |
| R4 — API delivery from stored snapshot | COMPLETE |
| R5 — Frontend integration | COMPLETE |
| R6 — Tests, CI, rehearsal, documentation | COMPLETE |

---

## Phase reports (oldest first; the last one is "latest")

```
PHASE: R0 — Safety, secrets, and test isolation
STATUS: COMPLETE

Defects addressed: D17, D18, D19 (partial — student_test_reports removal only;
  full test_scenario_e2e.py rewrite is deferred to R3/R6 as planned), D20

Repository facts verified:
- analysis_service/app/config.py had defaulted jwt_secret, institute_id, and
  mongodb_uri — confirmed by reading the file before editing.
- analysis_service/.env existed with MONGODB_URI=mongodb://localhost:27017/cognitest
  (a local, non-test database with 2 tests/2 students/6 evaluationreports
  already in it from prior manual work) and JWT_SECRET=your_jwt_secret_here
  (20 bytes, below the new 32-byte minimum).
- Four integration test files (test_auth.py, test_preparation.py,
  test_publication.py, test_reports.py) each independently defined an
  identical autouse `clean_db` fixture that deletes every document in every
  collection of whatever database MONGODB_URI resolves to — confirmed via
  grep before touching them.
- test_scenario_e2e.py seeded a `student_test_reports` collection that no
  application code reads (the app reads `evaluationreports`); confirmed by
  grepping app/ and app/services/reports.py for that collection name (no
  matches) before removing the seeding.
- analysis_service/app/services/rate_limiter.py incremented a counter but
  never checked whether the stored `expiresAt` had already passed, relying
  solely on MongoDB's TTL background sweep (~60s cycle) to reset it.
- Local MongoDB at mongodb://localhost:27017 is reachable (`db.runCommand
  ({ping:1})` returned `{ok: 1}`).
- pydantic-settings 2.15.0: confirmed by direct test that (a) a real process
  environment variable overrides a value in `.env`, and (b) a `list[str]`
  field is parsed from a JSON-array-shaped environment variable string.

Files changed:
- .gitignore — added analysis_service/venv/, analysis_service/.pytest_cache/,
  **/__pycache__/, private_data/, and the two credential-bearing operator
  scripts (backend/check.js, backend/check_subj.js).
- backend/SECRETS_WARNING.md (new) — documents the hardcoded Atlas
  credential in check.js/check_subj.js and instructs the operator to rotate
  it; confirmed via `git log --all --source` that neither file was ever
  committed.
- analysis_service/app/config.py — removed defaults for mongodb_uri,
  jwt_secret, institute_id, allowed_origins (now all required); added
  cookie_secure and trusted_proxy_count settings; added a model_validator
  rejecting a jwt_secret shorter than 32 bytes.
- analysis_service/.env.example — documents all required/optional settings
  with placeholders and generation instructions; no real values.
- analysis_service/.env — updated to a valid configuration pointing at
  `cognitest_test` (was `cognitest`, a non-test local DB with pre-existing
  data, left untouched at 2 tests/2 students/6 evaluationreports) with a
  32+ byte local secret and an explicit ALLOWED_ORIGINS.
- analysis_service/tests/conftest.py (new) — forces safe env-var defaults
  before any app.* import, then refuses to run the suite at all unless the
  resolved database name ends in `_test`.
- analysis_service/tests/integration/conftest.py (new) — the single shared
  `clean_db` autouse fixture, scoped to tests/integration/ only so unit
  tests never require a running MongoDB instance.
- analysis_service/tests/integration/test_auth.py,
  test_preparation.py, test_publication.py, test_reports.py — removed the
  now-duplicated `clean_db` fixture and the unused `apply_indexes` import
  from each; they now use the shared fixture.
- analysis_service/tests/integration/test_scenario_e2e.py — removed the
  `student_test_reports` seeding/updates (dead weight the app never reads);
  its `setup_db` fixture now clears `evaluationreports` instead.
- analysis_service/tests/integration/test_rate_limiter.py (new) — 3 tests
  covering limit enforcement, window-expiry reset without waiting for the
  TTL sweep, and key independence.
- analysis_service/app/services/rate_limiter.py — rewrote as a single
  atomic `find_one_and_update` with an update pipeline so an expired window
  resets on the very next call, in code, regardless of Mongo's TTL sweep
  timing.
- analysis_service/app/api/dependencies/auth.py — added `get_client_ip()`,
  which trusts only the socket peer unless `trusted_proxy_count > 0`, in
  which case it reads the correct hop from `X-Forwarded-For`.
- analysis_service/app/api/routers/auth.py — `check_login_rate_limit` now
  calls `get_client_ip()` instead of reading `request.client.host` directly.
- .github/workflows/ci.yml — MONGODB_URI now ends in `_test`; JWT_SECRET is
  now 47 bytes; added ALLOWED_ORIGINS.

Behavior implemented:
- The process refuses to start (Pydantic ValidationError) if JWT_SECRET,
  MONGODB_URI, INSTITUTE_ID, or ALLOWED_ORIGINS is unset, or if JWT_SECRET
  is under 32 bytes.
- The test suite refuses to collect any tests (pytest.exit) unless the
  configured database name ends in `_test`.
- A rate-limit key's window now resets on the first call after `expiresAt`
  has passed, without depending on background TTL cleanup.
- Login/activation rate limiting uses a configurable trusted-proxy count
  instead of unconditionally trusting `X-Forwarded-For`.
- venv/, __pycache__, .pytest_cache, private_data/, and the two credential
  scripts can no longer be accidentally committed.

Checks actually run:
- `cd analysis_service && venv\Scripts\python.exe -m pytest -q`
  — 33 passed (30 pre-existing + 3 new rate-limiter tests), 0 failed.
- `git check-ignore -v analysis_service/venv backend/check.js
  backend/check_subj.js private_data/foo analysis_service/.pytest_cache`
  — all five matched their new .gitignore rules.
- `git log --all --source --oneline -- backend/check.js
  backend/check_subj.js` — no output; neither file was ever committed.
- Ran the full suite with `MONGODB_URI=mongodb://localhost:27017/cognitest`
  (no `_test` suffix) forced via an inline env var — pytest aborted
  collection immediately with the expected refusal message; zero tests ran
  and zero documents were touched in that database (verified counts
  unchanged: 2 tests/2 students/6 evaluationreports, before and after).
- Verified via `mongosh` that a normal test run only ever touches
  `cognitest_test` (counts changed there) and never `cognitest` (counts
  identical before/after).
- Verified directly via a one-off Python snippet that Settings() raises
  `Field required` for jwt_secret when unset (with .env excluded) and
  raises the custom "must be at least 32 bytes" ValueError when set to a
  short value.

Checks not run:
- `cd backend && npx tsc --noEmit` — not run; no backend/ TypeScript files
  were touched in this phase (only backend/SECRETS_WARNING.md, a new
  Markdown file, and .gitignore entries for two untracked .js files).
- Frontend checks — not run; no frontend/ files were touched in this phase.

Contract drift check:
- Not applicable to this phase (no Section-1 snapshot/DTO fields were
  touched).

Remaining blockers:
- Operator must rotate the MongoDB Atlas password embedded in
  backend/check.js / backend/check_subj.js (see
  backend/SECRETS_WARNING.md). This cannot be verified or completed by the
  implementation model.
- The pre-existing local `cognitest` database (2 tests/2 students/6
  evaluationreports) still exists and is not a `_test` database; it is
  simply no longer the default target. The operator may want to drop it
  once confirmed unneeded.

Next permitted phase:
- R1 — Contracts and fixture
```

```
PHASE: R1 — Contracts and fixture
STATUS: COMPLETE

Defects addressed: none directly (R1 is contracts-only); this phase
  establishes the shapes that R2-R4 use to fix D2, D4, D6, D9, D10, D11,
  D16.

Repository facts verified:
- app/schemas/inputs.py before editing: ManifestSchema.markingByType was
  Dict[str, Any] (no marking validation at all); QuestionSchema/AnswerKeySchema
  already existed with the field-level checks documented in R0's read; the
  RecommendationSchema stub used questionNo/practiceQuestions (wrong field
  names vs. the blueprint's actual recommendations.json shape) and
  PracticeQuestionSchema was a one-field stub (extra='ignore', only sourceKey).
- app/schemas/reports.py before editing: MetricBucket and QuestionResult
  existed and were kept unchanged; SnapshotResponse existed and was
  confirmed unused (grep across app/ and tests/, only a .pyc match) before
  deleting it.
- app/api/schemas/reports.py and app/schemas/auth.py before editing: read in
  full; confirmed app/schemas/auth.py's existing LoginRequest/TokenResponse
  are dead code (grepped, zero non-definition references) — left them in
  place (out of scope) and added StudentMeDTO alongside them.
- Confirmed by direct test that pydantic-settings 2.15.0's datetime fields
  parse ISO-8601 strings with a 'Z' suffix into tz-aware datetimes without
  any Python-version-specific fromisoformat handling.
- Ran a standalone, from-scratch grading/aggregation script (not importing
  any app.domain code) to independently verify every number before writing
  it into EXPECTED — see the "Checks actually run" section below for the
  transcript.

Files changed:
- analysis_service/app/schemas/inputs.py — added MarkingSchema (Decimal,
  parsed via str(x), rejects non-finite/boolean/non-positive correctMarks/
  negative incorrectPenalty); ManifestSchema.markingByType is now
  Dict[Literal["multiple_choice","numerical"], MarkingSchema]; date is now
  a tz-aware datetime field; instituteId is validated as a real ObjectId
  AND checked to equal settings.institute_id; added QuestionContentBase
  (fields shared by original and practice questions) with QuestionSchema
  and PracticeQuestionSchema both inheriting from it; added
  RosterEntrySchema + validate_roster_uniqueness(); rewrote
  RecommendationSchema to originalQuestionNo + recommendations
  (List[PracticeQuestionSchema]) matching the blueprint's actual
  recommendations.json shape, with a within-entry sourceKey-uniqueness
  check (cross-file uniqueness deferred to R3).
- analysis_service/app/schemas/reports.py — added QuestionMedia, Breakdown,
  Insight, RevisionItem, StudentSnapshot, CohortCategoryStat,
  CohortAggregates (Section 1.3/1.4); kept MetricBucket and QuestionResult
  (added QuestionResult.media); deleted the unused SnapshotResponse.
- analysis_service/app/api/schemas/reports.py — replaced ReportSummaryDTO,
  ReflectionItemDTO, ReportDetailDTO, PracticeQuestionDTO with the Section
  1.5 shapes; added ComparisonRow, Comparisons, TestInfoDTO; kept
  ReflectionUpdateDTO as-is. Not wired into app/services/reports.py yet
  (that is Phase R4) — this is why 1 integration test now xfails (see
  below).
- analysis_service/app/schemas/auth.py — added StudentMeDTO (not yet wired
  into the /me route; that is Phase R4, alongside defect D23).
- frontend/src/types/demoAnalysis.ts — replaced entirely with the Section
  1.3-1.5 TypeScript mirror (interfaces, no `any`).
- analysis_service/tests/fixtures/synthetic_fixture.py — removed
  recommendationRefs from QUESTIONS (obsolete shape); set
  MANIFEST.instituteId to the configured test institute id and
  MANIFEST.date to an explicit UTC-offset string; added STUDENTS (roster,
  A/C sharing a display name), RECOMMENDATIONS (12 practice questions, 3
  per original question, each schema-valid), ANSWER_KEY_CORRECTED (for the
  R6 key-correction rehearsal), and EXPECTED (every independently-verified
  number from FIXTURE_EXPECTATIONS.md, ready for R2-R4 tests to assert
  against).
- analysis_service/tests/unit/test_schemas.py — extended with 19 new tests
  covering manifest marking/date/institute-id validation, roster
  uniqueness (case-insensitive and exact), rejection of
  recommendationRefs on QuestionSchema, PracticeQuestionSchema's
  exactly-one-answer and option-range checks, RecommendationSchema parsing
  and within-entry sourceKey uniqueness, and a full-fixture round trip.
- implementation/FIXTURE_EXPECTATIONS.md — rewritten with every number from
  Section 1.6, transcribed from the independently-computed EXPECTED dict.
- implementation/CONTRACTS.md — rewritten to point at Section 1, list the
  three (now five, counting StudentMeDTO's two sides) files that must stay
  in sync, and record the QuestionContentBase/PracticeQuestionSchema
  correction below.
- analysis_service/tests/integration/test_auth.py,
  test_publication.py (test_publication_lifecycle only), test_reports.py,
  test_scenario_e2e.py (test_full_lifecycle only) — marked xfail(strict=False)
  with a specific defect-referencing reason each; see "Behavior implemented"
  and "Contract drift check" below for why.

Behavior implemented:
- Every prepared-bundle file has a complete, strict Pydantic contract,
  including the two files (students.json, recommendations.json) that the
  pre-remediation ingestion code never read at all.
- ManifestSchema now rejects: non-finite/negative/zero marking values,
  timezone-naive dates, malformed instituteId, and instituteId values that
  don't match the deployment's configured institute — all previously
  unvalidated.
- PracticeQuestionSchema is self-contained enough to catch a wrong-range
  option letter and a both-or-neither answer at parse time, without needing
  the original question for context.
- The Section 1 snapshot/DTO/TypeScript contract now exists in code on all
  three sides (Python domain, Python API, TypeScript), ready for R2-R5 to
  implement against instead of inventing field names.

Checks actually run:
- `cd analysis_service && venv\Scripts\python.exe -m pytest tests/unit/test_schemas.py -v`
  — 25 passed.
- `cd analysis_service && venv\Scripts\python.exe -m pytest -q`
  — 48 passed, 4 xfailed (all four are pre-existing integration tests that
  exercised the OLD recommendationRefs-on-QuestionSchema contract and the
  OLD api/schemas/reports.py DTO field names; each carries an xfail reason
  naming the exact defect and the phase that resolves it). 0 unexpectedly
  failed, 0 unexpectedly passed.
- A standalone Python script (not part of the test suite; transcript below)
  independently recomputed every number in EXPECTED/FIXTURE_EXPECTATIONS.md
  from the raw fixture data using plain Decimal arithmetic, with no
  dependency on any app.domain code:
  ```
  Student A: score 12.00/16.00, accuracy 100.00, coverage 75.00
  Student A Physics 4.00/4.00, Mathematics 8.00/8.00, Chemistry 0.00/4.00 (acc null)
  Student A easy 4.00/4.00, medium 4.00/4.00, hard 4.00/8.00
  Student A multiple_choice 4.00/8.00, numerical 8.00/8.00
  Student C: score 2.00, accuracy 33.33, coverage 75.00
  Student C marksLost: Q1 Physics 5.00, Q2 Mathematics 0.00, Q3 Chemistry 5.00, Q4 Mathematics 4.00
  Cohort Alpha: overall avg 8.67 top 12.00; Physics 2.33/4.00; Chemistry 1.00/2.00;
    Mathematics 5.33/6.00; easy 2.33/4.00; medium 2.67/2.00; hard 3.67/6.00;
    multiple_choice 3.33/6.00; numerical 5.33/6.00
  After Q1 key B->D: totals A=7 B=7 C=7 D=11; Alpha overall avg 7.00 top 7.00
  ```
  Every value matches what was written into EXPECTED and
  FIXTURE_EXPECTATIONS.md exactly.
- `venv\Scripts\python.exe -c "from app.schemas.inputs import ...; parse the
  whole fixture through every schema"` (ad hoc, not a pytest file) — all six
  fixture lists parsed without error; negative checks (case-insensitive
  roster duplicate, recommendationRefs rejection) raised as expected.
- `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — 22 errors, all in
  the 6 existing demo components/pages (BreakdownTable, ComparisonTable,
  QuestionReview, RevisionPriorities, ScoreSummary, DemoReports) referencing
  fields the old demoAnalysis.ts had (batchSnapshot, testQuestions,
  performance, totalMarks, createdAt, id, responses) that the Section-1
  contract does not. This is discussed under "Contract drift check" below.
- `cd backend && npx tsc --noEmit` — 0 errors (backend untouched this
  phase; confirms nothing here broke it).

Checks not run:
- None applicable — every check this phase's scope implies was run.

Contract drift check:
- Python (app/schemas/reports.py + app/api/schemas/reports.py) and
  TypeScript (demoAnalysis.ts) are now IDENTICAL field-for-field: verified
  by construction (the TS file is a direct transcription of the Python
  field lists, not independently authored) rather than a separate diff
  tool.
- The 6 existing frontend demo components and 4 backend integration tests
  are, as of this phase, DELIBERATELY OUT OF SYNC with the new contract.
  This is an explicit, planned consequence of replacing the contract before
  the code that reads/writes it, not an oversight:
  - Frontend: my own R1 task list said both "the UI may temporarily fail
    type-checks... that is expected" and "Keep tsc passing... only adding
    the new types" — self-contradictory once the file is actually replaced
    verbatim (which is what "replace the file contents ... verbatim" the
    R1 task also says). I followed the verbatim-replacement instruction, so
    tsc now fails against the 6 old components; this is deliberately
    deferred to Phase R5 (which rewrites those components against the real
    contract) rather than patched here with `any` or partial types, which
    the master rules forbid.
  - Backend: 4 integration tests (test_auth.py::test_auth_lifecycle,
    test_publication.py::test_publication_lifecycle,
    test_reports.py::test_reports_lifecycle,
    test_scenario_e2e.py::test_full_lifecycle) call the OLD, un-rewritten
    run_preparation_algorithm/run_verification/services.reports functions
    with the NEW fixture and NEW DTOs respectively; three fail because
    run_verification now correctly finds 0 practice mappings (the fixture
    no longer carries the fictitious recommendationRefs shortcut) and one
    fails because services/reports.py still constructs API DTOs with the
    old field names. All four are marked xfail(strict=False) with a reason
    naming the exact defect (D6 for the first three, D2/D4-adjacent DTO
    mismatch for the fourth) and the phase that resolves it (R3 for
    preparation/verification, R4 for services/reports.py) — not silently
    skipped, not deleted, not weakened to pass.

Remaining blockers:
- Same two as R0 (Atlas password rotation; stale local `cognitest` DB) —
  unchanged, not this phase's concern.
- The 4 xfail markers above must be removed by R3/R4 once those phases
  rewrite the corresponding production code; if a future phase report finds
  them still xfailing after claiming R3/R4 complete, that is a real bug,
  not expected state.

Next permitted phase:
- R2 — Pure analysis domain (no DB, no HTTP)
```

```
PHASE: R2 — Pure analysis domain (no DB, no HTTP)
STATUS: COMPLETE

Defects addressed: D2 (breakdowns/insights/revision list were never
  computed — now they are, as pure functions ready for R3 to call and
  store); groundwork for D4 (build_cohort_aggregates never leaks student
  identities, computed per-batch by the caller).

Repository facts verified:
- app/domain/grading.py, app/domain/analytics.py (compute_metrics,
  format_decimal), app/schemas/reports.py (MetricBucket, QuestionResult)
  were read in full before extending them; confirmed compute_metrics's
  List[GradeResult] signature and format_decimal's ROUND_HALF_UP rule, and
  reused both rather than re-implementing rounding or status counting.
- Grepped for evaluate_insight and compute_cohort_stats usage before
  touching either: evaluate_insight was used only by
  tests/unit/test_analytics.py (rewritten below); compute_cohort_stats was
  used by both tests/unit/test_comparisons.py AND
  app/services/preparation.py (not yet rewritten — Phase R3's job). Kept
  compute_cohort_stats as a working, unmodified legacy shim rather than
  deleting it, specifically so preparation.py's existing (imperfect, D4)
  behavior keeps working until R3 replaces the call site — deleting it now
  would have turned 5 currently-passing integration tests + rehearsal.py
  into import errors for no benefit this phase.

Files changed:
- analysis_service/app/domain/results.py (new) — build_question_results():
  turns (questions, answer_key, one student's response, marking, id/hash/
  practice-count lookup maps) into ordered QuestionResult rows via
  app.domain.grading.grade_one. Raises ValueError naming the questionNo for
  any malformed key/answer/missing row.
- analysis_service/app/schemas/inputs.py — added
  QuestionContentBase.distractorExplanations (Optional[Dict[str,str]]):
  R1 omission found while wiring results.py's
  selectedOptionExplanation lookup — the blueprint documents this as a
  storage field (Test.questions[].authoredDistractorExplanations) and
  app.domain.results already needed to read it from the source question,
  but no R1 schema actually allowed operators to supply it. Added as a
  direct correction, not a new feature; re-ran the full R1 test_schemas.py
  suite afterward (still 25/25) to confirm no regression.
- analysis_service/app/domain/analytics.py — kept compute_metrics and
  format_decimal unchanged; removed evaluate_insight (superseded, see
  app/domain/insights.py); added build_summary() and build_breakdowns(),
  which group QuestionResult rows into the 7 required scopes (subject,
  difficulty, subjectDifficulty, questionType, unit, chapter, topic) in
  that fixed order, correctly handling chapter/topic's list-valued,
  overlapping tags (one question can land in multiple chapter/topic
  buckets) while keeping subject/difficulty/questionType as true,
  summable partitions.
- analysis_service/app/domain/insights.py (new) — MIN_ATTEMPTS_FOR_LABEL=3,
  STRENGTH_ACCURACY=80, WEAK_ACCURACY=50 as named constants;
  build_insights() (Strength/Developing/Needs improvement/Limited evidence
  per (subject, topic)); build_revision_list() (ranked by marks lost desc
  then subject then topic, topics with 0 marksLost excluded, capped at 10,
  reason is "skipped" when skipped>=incorrect else "inaccurate"). Documented
  a deliberate signature simplification vs. the phase prompt's sketch (see
  "Contract drift check").
- analysis_service/app/domain/comparisons.py — added
  build_cohort_aggregates() (the real Section 1.4 contract: cohortSize<2 ->
  available=False with the exact required reason string; otherwise class
  average / topper score per category, joint-topper averaging, and zero
  student identities anywhere in the output); kept compute_cohort_stats as
  a documented legacy shim (see above).
- analysis_service/app/domain/snapshot.py (new) — build_student_snapshot():
  the one function that composes summary+breakdowns+insights+revisionList+
  questions into a StudentSnapshot; the only call site Phase R3 needs for
  per-student assembly.
- analysis_service/tests/fixtures/insight_fixture.py (new) — hand-built
  QuestionResult rows (not a full bundle — nothing here touches ingestion)
  covering all 4 insight labels: a 100%-accuracy topic (Strength), a
  50%-accuracy topic (Developing), a 25%-accuracy topic (Needs
  improvement), and a 2-attempt topic (Limited evidence despite 100%
  accuracy, proving the attempt-count floor works independent of accuracy).
- analysis_service/tests/unit/test_analytics.py — kept
  test_compute_metrics/test_format_decimal_rounding; removed the three
  evaluate_insight tests (function deleted); added 8 new tests for
  build_summary/build_breakdowns against EXPECTED, an
  overlapping-never-inflates-the-total check, a same-topic-different-
  subjects check, and an input-order-independence check.
- analysis_service/tests/unit/test_comparisons.py — kept both
  compute_cohort_stats tests unchanged; added 4 new tests for
  build_cohort_aggregates against EXPECTED's Alpha/Beta tables, a
  no-student-identities-in-output check, and the post-answer-key-correction
  Alpha rehearsal from EXPECTED["after_key_correction"].
- analysis_service/tests/unit/test_insights.py (new) — 7 tests: all four
  labels reachable, limited-evidence-despite-perfect-accuracy, the exact
  80% boundary counts as Strength, an all-skipped topic is Limited evidence
  (never auto-labeled a weakness), revision-list ranking/reason/cap-at-10,
  and the skipped-dominant reason case.
- analysis_service/tests/unit/test_results.py (new) — 13 tests (4
  parametrized) against EXPECTED's per-student totals plus targeted checks:
  numerical zero handled correctly, skipped vs. incorrect vs. correct,
  practiceCount population, negative awardedMarks not clamped, "+04"/"-0"
  normalization, and rejection of boolean/"4.0"/"1e2"/non-numeric answers,
  an out-of-range MCQ letter, and a missing (not null) response row.
- analysis_service/tests/unit/test_snapshot.py (new) — 5 tests: correct
  breakdown scope order, questionNo ordering independent of input order,
  summary matches EXPECTED, schemaVersion is "1.0", and student C's full
  revisionList matches EXPECTED exactly (list equality, not just spot
  fields).

Behavior implemented:
- A complete, deterministic StudentSnapshot (summary, all 7 breakdowns,
  insights, revision list, ordered questions) can now be built from
  (questions, answer key, one response, marking) with zero database or
  network access — this is the actual "analysis" the whole feature is
  named for, which the pre-remediation code imported but never called.
- Cohort comparisons (build_cohort_aggregates) never include another
  student's enrollment number, name, or id anywhere in the output, and are
  computed per explicit per_student dict — the caller (R3) is responsible
  for building one such dict per roster batch, never mixing batches.

Checks actually run:
- `cd analysis_service && venv\Scripts\python.exe -m pytest tests/unit -v`
  — 76 passed, 0 failed.
- `cd analysis_service && venv\Scripts\python.exe -m pytest -q` (full
  suite, unit+integration) — 84 passed, 4 xfailed (the same 4 from R1,
  same reasons; confirmed no new failures or newly-xfailing tests were
  introduced by this phase).
- `grep -rln "app\.db\|db_client\|pymongo\|fastapi" tests/unit/*.py
  app/domain/*.py` — no matches, confirming the domain test suite and all
  app/domain modules have zero database/HTTP dependency (R2 exit
  criterion).
- Manual smoke scripts (not part of the test suite; run before writing the
  corresponding pytest files, to validate the approach): built
  QuestionResult rows for students A and C directly via
  build_question_results and confirmed totals (12.00, 2.00) and per-row
  status/answers against EXPECTED before writing test_results.py;
  separately confirmed build_revision_list's output for student C matches
  EXPECTED["student_C"]["revision_list"] exactly, including rank order,
  before writing test_insights.py/test_snapshot.py.

Checks not run:
- None applicable — this phase is explicitly DB-free and HTTP-free by
  design; there is nothing else in its scope to run.

Contract drift check:
- app/schemas/reports.py (StudentSnapshot/CohortAggregates/etc.) unchanged
  from R1 except QuestionResult gaining no new fields (media already
  existed) — no drift. frontend/src/types/demoAnalysis.ts needs no update
  this phase.
- Recorded deviation: CogniTest_REMEDIATION_PROMPTS.md Section 4 task 3
  sketches `build_revision_list(results, practice_counts)` — a second,
  separately-keyed practice_counts argument. Implemented instead as
  `build_revision_list(results)`, reading `practiceCount` directly off each
  QuestionResult row (already populated by build_question_results from the
  caller's practice_counts map at the point of construction). A second,
  independently-keyed parameter here would risk silently drifting out of
  sync with the very rows it describes for no benefit; documented in
  app/domain/insights.py's docstring per the master rule to state such
  conflicts rather than silently picking one interpretation.
- Recorded deviation: Section 1.4's one-line sketch of
  build_cohort_aggregates's `per_student` shape
  ("dict[str, dict[str, MetricBucket]]") is ambiguous about how to tell a
  difficulty bucket keyed "easy" apart from a same-named subject without
  reverse-engineering scope from the key. Implemented as an explicit
  {"overall": MetricBucket, "subject": {...}, "difficulty": {...},
  "questionType": {...}} nested shape instead; documented in
  app/domain/comparisons.py.

Remaining blockers:
- Same two as R0/R1 (Atlas password rotation; stale local `cognitest` DB;
  the 4 xfail markers awaiting R3/R4) — unchanged, not this phase's
  concern.

Next permitted phase:
- R3 — Validation, ingestion, verification, publication
```

```
PHASE: R3 — Validation, ingestion, verification, publication
STATUS: COMPLETE

Defects addressed: D3, D5, D6, D7, D8, D9, D10, D24 (all fully); D4's
  storage half (identity-free batchSnapshot, computed per-batch — the
  delivery half is R4).

Repository facts verified:
- app/repositories/students.py, tests.py, questions.py, reports.py,
  app/services/preparation.py, verification.py, app/cli.py were each read
  in full before rewriting. Confirmed the exact bug in each: students.py's
  $set always wrote name/batch/email/profilePictureUrl unconditionally
  (D3); tests.py's acquire_build_lock allowed rebuilding a PUBLISHED test
  with changed content instead of rejecting it; reports.py's upsert did
  `$set: {"analysisDemo": {...}}` replacing the whole sub-document (D8);
  auth.py stored analysisDemo.activation.{digest,expiresAt,claimed}
  against a Mongoose schema declaring analysisDemo.{claimDigest,
  claimExpiresAt,claimedAt} (D10); tests.py's new-test branch hardcoded
  `f"Test {source_key}"`/`now()`/`"Demo"` instead of manifest values (D24);
  cli.py's `validate` was `pass` (D5); recommendations.json was never
  loaded anywhere in the old pipeline (D6).
- Confirmed via a real `mongosh` ping that a local MongoDB is reachable,
  and used it for every integration test in this phase (via the R0
  `_test`-database guard) plus a genuine CLI walkthrough (see "Checks
  actually run").
- Re-read app/domain/results.py, analytics.py, insights.py, comparisons.py,
  snapshot.py (R2 output) before wiring them into preparation/verification,
  confirming exact function signatures rather than guessing them.

Files changed:
- analysis_service/app/schemas/inputs.py — added
  `distractorExplanations: Optional[Dict[str,str]]` to QuestionContentBase
  (a small, necessary R1 omission found while wiring app.domain.results;
  documented there already in the R2 report).
- analysis_service/app/services/bundle.py (new) — RawBundle/ValidatedBundle
  dataclasses, BundleValidationError (collects every error, not just the
  first), load_bundle() (file-not-found/invalid-JSON errors name the
  file), validate_bundle() (every per-file Pydantic parse plus every
  cross-file check from Section 1.1: question count/numbering, marking
  covers every type present, answer-key one-per-question/type-match/
  option-range, roster uniqueness, response count/duplicate/unknown-
  enrollment/missing-or-extra-answer-row, recommendation count/duplicate-
  original/unique-source-keys-within-entry, and a full grading-feasibility
  pass reusing app.domain.results.build_question_results so validation and
  preparation can never disagree about what "gradable" means).
- analysis_service/app/repositories/students.py — rewritten:
  find_case_insensitive_collisions() (new, called by preparation before
  any write) and upsert_students() using $setOnInsert for
  instituteId/enrollmentNo/email and $set only for non-empty name/batch;
  password/profilePictureUrl/analysisDemo.* are never touched here.
- analysis_service/app/repositories/tests.py — acquire_build_lock() now
  takes manifest_title/date/examType for new-test creation (D24) and
  rejects (returns None) unconditionally when status is PUBLISHED
  (whether content changed or not — Section 5: "reject ... a changed
  published test"); added get_build_status() (read-only, lets the caller
  build a precise error message) and mark_build_failed(); publish_test()
  now requires `analysisDemo.verifiedBuildId == analysisDemo.buildId` via
  `$expr` (defect D7) and gives a distinct error message when READY-but-
  unverified vs. not-found-or-not-READY.
- analysis_service/app/repositories/questions.py — added a
  SUBJECT_COLLECTIONS registry (explicit, `get_collection_for_subject`
  raises on unknown subjects, never falls through); added
  upsert_practice_questions(); both upsert functions now sanitize
  `diagramSvg` via app.services.validation.sanitize_svg (defusedxml, not
  regex) once, at import time, so nothing downstream re-sanitizes
  untrusted SVG.
- analysis_service/app/repositories/reports.py — upsert_student_reports()
  now flattens `analysisDemo` into dotted `$set` paths
  (`_flatten_analysis_demo`) instead of replacing the whole sub-document,
  so `analysisDemo.reflections` (never included in what preparation
  writes) survives every rebuild untouched (defect D8, verified by a
  dedicated test).
- analysis_service/app/services/auth.py — generate_claims/activate_student
  now read/write analysisDemo.claimDigest/claimExpiresAt/claimedAt (a Date,
  not a boolean flag), matching backend/src/models/Student.ts exactly
  (defect D10).
- analysis_service/app/services/preparation.py — full rewrite:
  run_preparation_algorithm(bundle: ValidatedBundle) now: checks roster
  collisions; canonicalizes and hashes all six files (not four); acquires
  the build lock with manifest-derived title/date/examType; on lock
  failure, reads back *why* (BUILDING / PUBLISHED-unchanged-no-op /
  PUBLISHED-changed-must-unpublish-first) and raises (or silently returns
  for the no-op case) accordingly; upserts students, original questions,
  and practice questions; resolves Test.questions[].recommendations from
  the upserted practice ids; calls app.domain.results/snapshot/comparisons
  per student and per roster batch; stores the full StudentSnapshot and
  CohortAggregates (never the enrollment-number-leaking old
  batchSnapshot); on any exception, calls mark_build_failed with a bounded
  error summary and re-raises.
- analysis_service/app/services/verification.py — full rewrite:
  run_verification(institute_id, test_key, bundle) independently
  recomputes every student's QuestionResult/StudentSnapshot and every
  batch's CohortAggregates FROM THE BUNDLE (never trusting "the write
  succeeded"), and compares against stored data: report count, one-
  report-per-student, buildId consistency, institute membership, exactly
  N valid practice mappings per question (each resolving to a real stored
  document), score/status-count/partition-reconciliation per student, and
  cohort classAverage/topperScore per batch. On success, conditionally
  `$set`s analysisDemo.verifiedBuildId (only if the buildId hasn't moved
  underneath it).
- analysis_service/app/repositories/indexes.py — added a helper that
  inspects existing indexes before creating a new
  (instituteId, enrollmentNo) unique index on students, so it is never
  created redundantly (or in conflict) next to the legacy Express/
  Mongoose global-unique-enrollmentNo index; added an
  (instituteId, analysisDemo.status) index on tests.
- analysis_service/app/cli.py — full rewrite: `validate --dir` now
  actually validates (was `pass`); `prepare --dir` validates then prepares
  (no separate `--instituteId` flag anywhere — every command now uses
  `settings.institute_id`); `verify --test-key --dir` (needs the bundle to
  recompute from); `publish`/`unpublish --test-key`; `issue-claims
  --test-key --out`; every command prints the target database name via
  `pymongo.uri_parser.parse_uri`, never the URI itself.
- backend/src/models/Test.ts — `questions[].recommendationRefs: string[]`
  replaced with `recommendations: [{questionId, subject, sourceKey}]`;
  added `analysisDemo.verifiedBuildId` and `analysisDemo.lastError`.
- analysis_service/tests/fixtures/bundle_writer.py (new) — writes the
  fixture (or a caller-overridden variant) to a temp directory as real
  JSON files, for tests that exercise load_bundle/the CLI rather than
  importing Python lists directly.
- analysis_service/tests/integration/test_validation.py (new) — 12 tests:
  missing file, invalid JSON, question-count mismatch, missing response
  row (names both enrollment and question), unknown enrollment, case-
  insensitive roster duplicate, recommendation-count mismatch, answer-key
  type mismatch, answer-key option-out-of-range, malformed numerical
  response, and a "no writes happen" sanity check.
- analysis_service/tests/integration/test_preparation.py — full rewrite,
  17 tests: expected counts (including that practice questions share
  subject collections with originals), idempotency (twice = same counts),
  existing password/profile preserved, two same-named students stay
  distinct, a reflection survives a rebuild, stored snapshot/batchSnapshot
  match EXPECTED exactly (and contain no student identities anywhere in
  the JSON), a simulated mid-preparation failure marks FAILED with a
  bounded lastError, Mathematics + numerical-zero preserved end to end,
  concurrent preparation (simulated BUILDING) is rejected, an oversized
  report is rejected with an actionable message (and does mark FAILED),
  unsafe SVG is rejected before any question is stored.
- analysis_service/tests/integration/test_publication.py — full rewrite,
  5 tests: publish-before-verify fails; the full
  prepare→verify→publish→republish-fails→unpublish→unpublish-fails→
  republish (without re-verifying, since verifiedBuildId survived)
  lifecycle; a changed-while-PUBLISHED prepare is rejected (must
  unpublish first); a bundle with a missing recommendation is rejected by
  validate_bundle itself, before any write; the full answer-key-correction
  rehearsal (unpublish → corrected bundle → prepare → verify → publish)
  reproduces EXPECTED["after_key_correction"] exactly, including the
  cohort's new topperCount of 3.
- analysis_service/tests/integration/test_auth.py — full rewrite (no
  longer xfail): activation/login/JWT lifecycle against the new bundle-
  based prepare/verify calls and the corrected D10 field names; added
  expired-claim and wrong-code tests.
- analysis_service/tests/integration/test_scenario_e2e.py — rewritten to
  use the shared fixture bundle end to end (prepare→verify→publish→
  activate→login→...→answer-key-correction→stale-reflection-409) instead
  of a bespoke inline 1-question paper; the bespoke `setup_db` fixture's
  dead-weight seeding (an `institutes` collection nothing reads, a manual
  physics question, a fake pre-existing "legacy" test) was removed in
  favor of letting `run_preparation_algorithm` create everything. Kept
  under its existing xfail (see "Contract drift check").

Behavior implemented:
- `validate → prepare → verify → publish → unpublish → publish` and the
  full answer-key-correction rehearsal all work through the actual CLI
  (not just direct Python calls) against a real MongoDB `_test` database,
  printing no credentials.
- Re-importing a student never touches their password, profile picture,
  email, or activation state; two students who share a display name stay
  two distinct records; a stored reflection survives a full cohort
  rebuild.
- A test cannot be rebuilt in place while PUBLISHED (must unpublish
  first), and cannot be published at all until an independent
  verification pass has recomputed and matched every stored number.
- Every stored snapshot/cohort document was checked, by test, to contain
  zero student identities (enrollment numbers, names) anywhere in its
  JSON.

Checks actually run:
- `cd analysis_service && venv\Scripts\python.exe -m pytest -q` — 114
  passed, 2 xfailed (both explicitly attributed to Phase R4:
  test_reports.py::test_reports_lifecycle and
  test_scenario_e2e.py::test_full_lifecycle, both blocked on
  app/services/reports.py still using the pre-R3 DTO field names — see
  "Contract drift check"). This is up from 84 passed/4 xfailed at the end
  of R2: 2 of the 4 R1/R2-era xfails (test_auth.py, test_publication.py)
  are now genuinely fixed and passing, not just carried forward.
- A full REAL CLI walkthrough (not direct Python calls), against a freshly
  dropped `cognitest_test` database: `python -m app.cli indexes --apply`,
  `validate --dir`, `prepare --dir`, `verify --test-key --dir`, `publish`,
  `unpublish`, `publish` again, `issue-claims --out` — all succeeded, with
  output transcribed above; `issue-claims` produced 4 real claim codes and
  the file was `chmod 600`. Confirmed no MongoDB URI or credential
  appeared in any command's output (only the database name
  "cognitest_test"). Cleaned up the temp bundle directory, claims file,
  and dropped the test database afterward.
- `cd backend && npx tsc --noEmit` — 0 errors (Test.ts changes compile).
- `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — still exactly
  22 errors, same as end of R1 (confirms this phase, which touched no
  frontend files, changed nothing there).
- `grep -rn "recommendationRefs" backend/src` — no matches, confirming no
  other backend code still references the retired field name.

Checks not run:
- None applicable to this phase's scope.

Contract drift check:
- app/schemas/reports.py / app/api/schemas/reports.py / demoAnalysis.ts:
  unchanged this phase (R3 only produces StudentSnapshot/CohortAggregates
  data via the R2 contract; it does not touch the API DTO layer). No
  drift introduced.
- backend/src/models/Test.ts now matches
  app/services/preparation.py's `Test.questions[].recommendations` shape
  exactly (`{questionId, subject, sourceKey}`), replacing the retired
  `recommendationRefs: string[]`.
- Remaining, EXPECTED drift (unchanged from R1/R2, not newly introduced):
  `app/services/reports.py` (list/detail/practice/reflection) still reads
  the OLD report/DTO shapes and still constructs `ReportSummaryDTO`/
  `ReportDetailDTO` with pre-R1 field names, so every
  `/api/v2/demo/reports*` HTTP call still 500s. This is squarely Phase
  R4's rewrite. Two tests remain xfail for exactly this reason
  (test_reports.py::test_reports_lifecycle,
  test_scenario_e2e.py::test_full_lifecycle) — both were re-verified this
  phase to still fail for only this reason (not a new, different one),
  by running them individually and reading the traceback.
- Recorded deviation: CogniTest_REMEDIATION_PROMPTS.md Section 5 does not
  explicitly say what should happen when `prepare` is re-run with
  identical content while the test is READY-but-not-yet-published (as
  opposed to PUBLISHED, which Section 5 does cover: "must not rewrite
  data"). Implemented the same "silent no-op success" behavior for
  READY-same-hash as for PUBLISHED-same-hash, by the same idempotency
  logic ("Repeat preparation must not create additional
  tests/students/questions/reports") — documented in
  app/services/preparation.py.

Remaining blockers:
- Same as R0-R2 (Atlas password rotation; stale local `cognitest` DB) —
  unchanged, not this phase's concern.
- The 2 remaining xfail markers (test_reports.py, test_scenario_e2e.py)
  must be removed by R4 once app/services/reports.py is rewritten against
  the Section 1.5 DTOs.

Next permitted phase:
- R4 — API delivery from stored snapshot
```

```
PHASE: R4 — API delivery from stored snapshot
STATUS: COMPLETE

Defects addressed: D11, D16, D23 (fully); D4's delivery half (Comparisons
  never returns another student's identity, folds the viewer's own score
  in without any recomputation).

Repository facts verified:
- Read app/services/reports.py, app/api/schemas/reports.py,
  app/api/routers/reports.py, app/api/routers/auth.py,
  app/api/dependencies/auth.py, app/schemas/auth.py in full before
  editing. Confirmed get_current_student had no institute filter at all
  (D23: a token whose subject belonged to a different institute's student
  would authenticate successfully); confirmed /auth/me returned an
  ad-hoc inline `StudentDTO(id, enrollmentNo, name)` rather than the
  StudentMeDTO added in R1 (D16, that DTO was never imported anywhere);
  confirmed get_report_detail's practice/question-detail code looped one
  find_one per test question across up to four collections (D11).
- Grepped app/api/schemas/reports.py against
  CogniTest_REMEDIATION_PROMPTS.md Section 1.5 field-by-field and found
  PracticeQuestionDTO was missing `media` (present in the frontend
  TypeScript mirror already, and in the contract doc, but never added to
  the Python DTO in R1) — fixed as a direct correction, documented in the
  DTO's own docstring, before wiring get_practice_questions to populate it.

Files changed:
- analysis_service/app/api/dependencies/auth.py — get_current_student now
  filters on `instituteId: ObjectId(settings.institute_id)` in the same
  find_one as `_id`, with an explicit projection (never returns
  password/analysisDemo.claim* fields to callers) (defect D23).
- analysis_service/app/api/schemas/reports.py — added
  `media: Optional[QuestionMedia]` to PracticeQuestionDTO (R1 omission,
  documented above).
- analysis_service/app/schemas/auth.py — StudentMeDTO now actually wired
  in (was defined but unused since R1).
- analysis_service/app/api/routers/auth.py — `/me` now returns
  StudentMeDTO(id, instituteId, enrollmentNo, name, batch) instead of the
  ad-hoc inline DTO (defect D16); the demo_token cookie's `secure` flag on
  login/logout now reads `settings.cookie_secure` instead of a hardcoded
  `True` (found while touching this file — a real, if minor, gap left
  over from R0 adding the setting without wiring it in anywhere).
- analysis_service/app/services/reports.py — full rewrite:
  get_student_reports/get_report_detail/get_practice_questions/
  update_reflection all now take an explicit `institute_id` parameter and
  filter on it; get_report_detail does exactly one find_one on
  evaluationreports and one on tests (`_authorize_report`, shared by all
  three report-owning functions) and builds Comparisons/reflections
  entirely from the already-fetched snapshot — no per-question query loop
  (defect D11, verified by a query-counting test); get_practice_questions
  now does one grouped `find({"_id": {"$in": ids}})` per subject instead
  of one query per practice question; update_reflection reads the current
  contentHash from `snapshot["questions"]` instead of querying the
  question collection directly, and returns the saved
  Optional[ReflectionItemDTO] (None on clear) rather than nothing.
- analysis_service/app/api/routers/reports.py — every handler now passes
  `ObjectId(settings.institute_id)` through to the service layer; the
  reflection endpoint's `response_model` is `Optional[ReflectionItemDTO]`
  so a clear returns `200 null`, verified directly against a running
  TestClient (not just a service-layer unit test) both for save and clear.
- analysis_service/tests/integration/test_reports.py — full rewrite, 10
  tests: empty-before-publish, list/detail matching EXPECTED exactly
  (summary, 7 breakdowns in order, comparisons including the viewer's own
  yourScore), the single-student (Beta) cohort shows the unavailable
  reason, practice for Q1 returns exactly the 3 real fixture questions
  (p1/p2/p3, not placeholders), an unknown question number is a clean
  404-mapped ValueError, the full reflection lifecycle (save/read-back/
  clear/stale-build/stale-hash), cross-student access denied on all three
  endpoints, unpublished test reports inaccessible, no other student's
  name or the literal key "enrollmentNo" anywhere in a detail response,
  and a query-counting test proving report detail issues at most 2
  `find_one` calls.
- analysis_service/tests/integration/test_scenario_e2e.py — removed the
  xfail marker: the full HTTP lifecycle (prepare→verify→publish→
  activate→login→/me→list→detail→practice→reflection→logout→isolation→
  unpublish→answer-key-correction→stale-reflection-409) now genuinely
  passes end to end (it unexpectedly XPASSed before this removal — the
  services/reports.py rewrite fixed it more completely than anticipated
  when the xfail was written in R3).

Behavior implemented:
- Every /api/v2/demo/reports* and /api/v2/demo/auth/me response is a
  typed, allowlisted DTO built once from an already-authorized,
  already-fetched snapshot/test pair — no grading, no cohort
  recomputation, and (for detail) no per-question database round-trips
  happen on the request path.
- A token belonging to a student from a different institute now fails
  authentication instead of silently working.
- Comparisons in the detail response include the viewer's own score
  alongside the stored class average/topper score, computed by a
  dictionary join against the snapshot the request already fetched — not
  a new query, not new arithmetic.

Checks actually run:
- `cd analysis_service && venv\Scripts\python.exe -m pytest tests/integration/test_reports.py -v`
  — 10 passed (one initial false-positive in a test I wrote myself —
  `test_response_contains_no_other_student_identity` naively checked for
  bare `"B"` in the JSON and collided with a legitimate MCQ
  `correctAnswer: "B"`; caught immediately by running the test, fixed to
  check full names and the literal `enrollmentNo` key instead, documented
  in the test itself).
- `cd analysis_service && venv\Scripts\python.exe -m pytest -q` (full
  suite) — 125 passed, 0 failed, 0 xfailed (down from 2 xfailed at the
  end of R3 — both cleared this phase, one more completely than the R3
  xfail reason anticipated).
- Direct TestClient walkthrough (not part of the pytest suite; ad hoc
  script) of the full auth+report+practice+reflection HTTP flow against a
  freshly-cleared `cognitest_test` database: activate, login, list,
  detail, and specifically PUT reflection with real text (200, full DTO
  body) followed by PUT with empty text (200, literal `null` body) —
  confirming the Optional[ReflectionItemDTO] response_model serializes
  the "cleared" case correctly, which no automated test happened to
  exercise over raw HTTP (only via direct function calls). Dropped the
  test database afterward.
- `cd backend && npx tsc --noEmit` — not re-run this phase (no backend/
  files touched).
- `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — not re-run this
  phase (no frontend/ files touched); still expected to show the same 22
  errors from R1, to be fixed in R5.

Checks not run:
- None applicable to this phase's scope.

Contract drift check:
- app/api/schemas/reports.py now matches
  CogniTest_REMEDIATION_PROMPTS.md Section 1.5 exactly, including the
  PracticeQuestionDTO.media field that was missing since R1 (both the
  Python and TypeScript sides were compared field-by-field; TypeScript
  already had `media` correctly, only Python was behind — no TypeScript
  change was needed this phase).
- app/schemas/reports.py (domain/stored shapes): unchanged this phase.
- frontend/src/types/demoAnalysis.ts: unchanged this phase, and does not
  need to change — R4 only implemented delivery of the contract R1
  already fully specified on the TypeScript side.

Remaining blockers:
- Same as R0-R3 (Atlas password rotation; stale local `cognitest` DB) —
  unchanged, not this phase's concern.
- None specific to R4: this phase closes with zero xfails, which was not
  guaranteed going in (only test_reports.py was explicitly scoped to R4;
  test_scenario_e2e.py clearing too was a bonus of the same rewrite).

Next permitted phase:
- R5 — Frontend integration against the real contract
```

```
PHASE: R5 — Frontend integration against the real contract
STATUS: COMPLETE

Defects addressed: D1, D12, D13, D14, D15, D16 (frontend half).

Repository facts verified:
- Read vite.config.ts, App.tsx, AuthContext.tsx, StudentLogin.tsx,
  StudentSignup.tsx, and every file under src/components/demo/ and
  src/hooks/ in full before editing. Confirmed StudentLogin.tsx's
  `navigate('/student')` on success and App.tsx's existing
  `<Route index element={<Navigate to="/student/reports" replace />} />`
  inside the demo branch already combine to redirect a demo login to
  /student/reports — no edit to StudentLogin.tsx was needed or made.
- Confirmed via `npm view` the current published versions of
  dompurify (3.4.15), vitest (5.0.0), @testing-library/react (16.3.3),
  @testing-library/jest-dom (7.0.1) before installing; jsdom's latest
  (30.0.1) declared an engines requirement this machine's Node (22.16.0)
  does not satisfy (confirmed by an EBADENGINE warning on install), so
  installed jsdom@26.1.0 (engines: node >=18) instead — recorded here as
  a deliberate version choice, not the "current" version.
- Grepped app.schemas.auth.StudentMeDTO (R4) against the frontend's
  demoAnalysis.ts StudentMeDTO to confirm the two already matched
  field-for-field before writing the AuthContext mapper.

Files changed:
- frontend/vite.config.ts — added a '/api/v2/demo' proxy entry (target
  http://localhost:8000, changeOrigin: false) BEFORE the existing '/api'
  entry, since Vite matches proxy entries in declaration order and the
  broader '/api' prefix would otherwise swallow every demo request
  (defect D15).
- frontend/.env.example (new) — documents VITE_USE_DEMO=true.
- frontend/src/context/AuthContext.tsx — added mapStudentMeDTO() to map
  the demo backend's {id, instituteId, enrollmentNo, name, batch} onto the
  existing Student shape's `_id` field (defect D16); wired it into both
  `/auth/me` call sites (initial session check and post-login hydration).
  signup()'s demo branch already posted whatever object it was given to
  `/auth/activate` and then called login(enrollmentNo, password) — since
  DemoActivate now supplies exactly {enrollmentNo, code, password}, no
  change to signup() itself was needed.
- frontend/src/pages/DemoActivate.tsx (new) — enrollment number/activation
  code/password/confirm-password form, styled consistently with the
  existing StudentSignup.tsx; client-side password length/match checks
  before calling signup(); shows the server's `detail` message on failure.
- frontend/src/App.tsx — `/student/signup` now renders `<DemoActivate />`
  in demo mode (StudentSignup.tsx untouched, still used outside demo
  mode); the `axios.get('/api/v1/institute')` branding call (a private
  legacy route per DEPLOYMENT_PLAN.md) is now skipped entirely in demo
  mode, falling back to a static document title (defect D1).
- frontend/src/hooks/useDemoReport.ts — `updateReflection` now patches
  `report.reflections` directly from the PUT response (adding/removing the
  one key that changed) instead of re-fetching the whole report, and
  returns the saved ReflectionItemDTO (or undefined on clear) to its
  caller.
- frontend/src/components/demo/ScoreSummary.tsx — rewritten against
  `report.summary`/`report.test` (title, examType, computedAt) instead of
  the retired `report.performance`/`report.totalMarks`/`report.createdAt`.
- frontend/src/components/demo/BreakdownTable.tsx — rewritten to render
  all 7 `Breakdown` entries (subject/difficulty always visible; the other
  five behind a "show more" toggle), with "Not enough data" for null
  percentages, "No questions in this category" for an empty bucket list,
  and an "Overlapping categories; do not sum rows" caption on the
  unit/chapter/topic/subjectDifficulty-adjacent overlapping breakdowns.
- frontend/src/components/demo/ComparisonTable.tsx — rewritten against
  `report.comparisons`; renders only the `unavailableReason` (no table)
  when `available` is false; the topper column header uses
  `comparisons.topperLabel`.
- frontend/src/components/demo/RevisionPriorities.tsx — rewritten against
  `report.revisionList` (rank/subject/topic/marksLost/reason/questionNos/
  practiceCount) and `report.insights` (grouped by label, "Limited
  evidence" topics hidden from this list since they carry no actionable
  signal).
- frontend/src/components/demo/QuestionReview.tsx — full rewrite (defect
  D12): reads `status`/`studentAnswer`/`correctAnswer` directly off each
  `QuestionResult`, never comparing an answer to a key itself; numerical
  questions render `studentAnswer`/`correctAnswer` as plain values
  (including the string `"0"`, previously indistinguishable from "not
  attempted" under the old `!!responsesByNo[...]` truthiness check) and no
  longer show an options grid; `q.media.diagramSvg` renders only through
  `DOMPurify.sanitize(..., { USE_PROFILES: { svg: true, svgFilters: true } })`;
  now receives `getPracticeQuestions`/`updateReflection` as props from
  DemoReportDetail and passes them down, rather than each child hook
  re-fetching the report.
- frontend/src/components/demo/PracticePanel.tsx — now takes
  `getPracticeQuestions` as a prop instead of calling `useDemoReport`
  itself (defect D13: with one panel per question, that was one redundant
  `GET /reports/{id}` per question); renders `media`; labels itself
  "Self-study practice — not scored"; answer is revealed only after the
  student clicks "Check / Reveal Answer".
- frontend/src/components/demo/ReflectionInput.tsx — now takes
  `updateReflection` as a prop instead of calling `useDemoReport` itself
  (same D13 fix); added a label `htmlFor`/`id` pairing and `role="status"`/
  `role="alert"` on the save-status text for accessibility.
- frontend/src/pages/DemoReportDetail.tsx — calls `useDemoReport` exactly
  once and passes `getPracticeQuestions`/`updateReflection` down into
  `QuestionReview`; empty/error state now reads "Your analysis is not
  published yet." (matching the blueprint's specified copy) instead of a
  generic message.
- frontend/src/pages/DemoReports.tsx — rewritten against
  `ReportSummaryDTO`'s real fields (`reportId`, `testTitle`, `testDate`,
  `maximumMarks`) instead of the retired `id`/`totalMarks`/`createdAt`;
  empty state also reads "Your analysis is not published yet."
- frontend/package.json — added `dompurify`, and devDependencies
  `vitest`, `@testing-library/react`, `@testing-library/jest-dom`,
  `jsdom`; added a `test` script (`vitest run`). This is a deliberate,
  explicitly-flagged deviation from the master prompt's general
  "don't add dependencies" rule — both are load-bearing for defects this
  phase closes (DOMPurify for D12's SVG rendering; vitest for the
  component-test requirement itself) and neither has a workaround within
  the existing toolchain.
- frontend/vitest.config.ts, frontend/src/test/setup.ts (new) — jsdom
  environment, `@testing-library/jest-dom/vitest` matchers.
- frontend/src/components/demo/__tests__/fixtures.ts (new) — a
  `ReportDetailDTO` literal for Student A (and a Student-D variant for the
  unavailable-cohort case), transcribed from
  implementation/FIXTURE_EXPECTATIONS.md so these tests assert against the
  same independently-verified numbers the Python tests do.
- frontend/src/components/demo/__tests__/QuestionReview.test.tsx,
  ComparisonTable.test.tsx, LockedFeatureCard.test.tsx (new) — 7 tests: a
  numerical "0" answer renders as "0" (not "Not attempted"); a null
  answer renders "- Skipped"; filter button counts match the snapshot's
  correct/incorrect/skipped counts exactly; filtering to "skipped" shows
  only Q3; ComparisonTable renders the classAverage/topperLabel when
  available and only the unavailableReason (no table) when not;
  LockedFeatureCard makes zero `fetch` calls (spied and asserted).

Behavior implemented:
- A student in demo mode never calls a legacy `/api/v1/*` endpoint (the
  institute-branding fetch is skipped entirely); the dev proxy correctly
  routes `/api/v2/demo/*` to FastAPI on :8000 instead of the request
  falling through to the legacy Express proxy on :5000.
- Signup/activation in demo mode collects exactly enrollment number,
  activation code, and password, and posts exactly that to
  `/auth/activate` — matching the backend contract for the first time.
- The question review screen never re-grades an answer in the browser;
  a numerical answer of `"0"` is visibly distinct from a skipped question.
- A report page issues exactly one `GET /reports/{id}` regardless of how
  many questions it has; practice reveal and reflection save/clear both
  update local state from the server's response without a full re-fetch.

Checks actually run:
- `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — 0 errors (was
  22 at the end of R1; every one of those was in a file rewritten this
  phase).
- `cd frontend && VITE_USE_DEMO=true npm run build` — succeeds (only the
  pre-existing, unrelated "chunk larger than 500kB" advisory warning).
- `cd frontend && npm test` — 3 files, 7 passed, 0 failed. (One test as
  originally written used `getByText('0')`, which threw
  "multiple elements found" because both "Your Answer" and "Correct
  Answer" render the literal text "0" for Q2 — caught immediately by
  running the test, fixed to `getAllByText('0').length >= 2` plus an
  explicit `queryByText('Not attempted')` absence check, which is a
  strictly more precise assertion of the same defect.)
- `cd backend && npx tsc --noEmit` — not re-run this phase (no backend/
  files touched).
- `cd analysis_service && venv\Scripts\python.exe -m pytest -q` — not
  re-run this phase (no analysis_service/ files touched); still 125
  passed / 0 failed as of R4.
- A real two-process walkthrough (not a browser click-through, but the
  same requests a browser would make): started `uvicorn app.main:app`
  on :8000 and `vite` (VITE_USE_DEMO=true) on :5173 as actual background
  processes; prepared/verified/published the fixture bundle through the
  real CLI against `cognitest_test`; then, through the Vite dev proxy
  (`http://localhost:5173/api/v2/demo/...`, with `Origin` set and cookies
  persisted across requests via curl's cookie jar, exactly as a browser
  session would): confirmed the initial unauthenticated `/auth/me` is
  served by `uvicorn` (not Express) proving the proxy ordering fix works;
  activate → login → `/auth/me` → list reports → report detail → practice
  for Q1, all 200, with `score: "12.00"`, `classAverage: "8.67"`, and
  practice sourceKey `"p1"` matching EXPECTED exactly. Stopped both
  processes afterward (verified via `Get-NetTCPConnection` that neither
  port was still listening) and dropped the test database.

Checks not run:
- A literal browser click-through (mouse/keyboard through the rendered
  pages) was not performed — the walkthrough above exercised the same
  HTTP requests a browser makes, including cookie persistence and the
  Origin header, but not React rendering/interaction itself. Component
  tests (7 passing) cover rendering of the exact fixture data used above.

Contract drift check:
- frontend/src/types/demoAnalysis.ts: unchanged this phase (it was already
  correct from R1 — this phase is exactly the delivery of that contract
  into working UI). No drift; verified by re-reading it once more
  alongside every component this phase touched.

Remaining blockers:
- Same as R0-R4 (Atlas password rotation; stale local `cognitest` DB) —
  unchanged, not this phase's concern.
- A literal browser click-through (see "Checks not run") has still never
  happened; the HTTP-level walkthrough above is strong evidence but is not
  a substitute for a human opening the pages before real launch.

Next permitted phase:
- R6 — Tests, CI, rehearsal, and truthful documentation
```

```
PHASE: R6 — Tests, CI, rehearsal, and truthful documentation
STATUS: COMPLETE

Defects addressed: D19 (remainder — rehearsal.py's own safety), D21, D22.

Repository facts verified:
- Confirmed tests/integration/test_scenario_e2e.py already implements the
  full R6-task-1 checklist (prepare, verify, publish, issue claim,
  activate A, login, list, detail, practice, save reflection, logout,
  login as B, cross-student isolation, unpublish, answer-key correction +
  full rebuild, stale-reflection 409) as a direct result of R3/R4's work —
  confirmed by re-reading the file in full rather than assuming.
- Confirmed via `which mongodump mongorestore mongosh` that this
  development machine has `mongosh` but NOT `mongodump`/`mongorestore`
  installed — recorded as NOT RUN in RUNBOOK.md rather than claiming those
  backup/restore commands were verified.
- Re-read app/api/dependencies/auth.py::get_client_ip (added in R0) before
  writing DEPLOYMENT_PLAN.md's rate-limiting section, and found the
  previous version of that document told operators to configure NGINX for
  `X-Real-IP` — the actual code reads `X-Forwarded-For` gated by
  `TRUSTED_PROXY_COUNT`. Fixed the document to match the code, not the
  other way around.

Files changed:
- analysis_service/rehearsal.py — full rewrite: refuses to run unless
  `MONGODB_URI` resolves to a `_test` database, or
  `--i-know-this-is-staging --database-name <exact match>` is passed
  explicitly; `--generate NUM_STUDENTS NUM_QUESTIONS` writes a synthetic
  bundle that passes `validate_bundle` (alternating subjects/question
  types/correctness, 3 valid practice questions per original question);
  runs the exact `validate -> prepare -> verify -> publish` pipeline via
  the same functions `app/cli.py` calls (not a hand-rolled shortcut);
  times preparation and verification separately; measures every report's
  real BSON size (via `check_bson_size`, not a JSON-string approximation)
  and reports the largest, not just the average; measures
  `get_report_detail` latency over up to 50 calls on a *complete*
  snapshot (previously this measured a report with no analysis computed
  into it at all, producing a meaningless "10ms").
- .github/workflows/ci.yml — added an `npm test` step to the frontend job,
  before the typecheck/build step.
- implementation/RUNBOOK.md — full rewrite. Every command was executed at
  least once during this remediation (most originally in earlier phases,
  re-confirmed here): `indexes --check`/`--apply`, `validate --dir`,
  `prepare --dir`, `verify --test-key --dir`, `publish`/`unpublish
  --test-key`, `issue-claims --test-key --out`, `curl .../health`,
  `rehearsal.py --generate ... --dir ...` (with its safety guard verified
  by testing it against a non-`_test` database and confirming refusal).
  The old version's `check-indexes`, `validate-payload`,
  `prepare-demo-batch`, `verify-build`, `generate-claims`, `check-health`
  commands never existed in `app/cli.py` (defect D21) and are gone.
  Explicitly marked mongodump/mongorestore commands as NOT RUN (see
  above) rather than silently presenting them as verified.
- implementation/HANDOFF.md — full rewrite: replaced the fabricated
  rehearsal numbers (0.191s / ~3.4KB / ~10.03ms, which described a report
  with no analysis in it) with the real numbers from this phase's
  `rehearsal.py` run; removed the false "DOMPurify on the server" claim
  (the server uses `defusedxml`; DOMPurify is frontend-only, added in
  R5) and the "meets the definition of done" sentence; added real,
  specific known limitations (grading rules supported, comparisons are
  per-batch only, no concurrency testing, content-authoring is a separate
  task) and an operator-actionable launch checklist including the Atlas
  password rotation.
- implementation/DEPLOYMENT_PLAN.md — corrected the NGINX example to set
  `X-Forwarded-For` via `$proxy_add_x_forwarded_for` (not `X-Real-IP`,
  which the rate limiter never reads); documented `TRUSTED_PROXY_COUNT`
  and `COOKIE_SECURE` as the actual settings that control this behavior,
  with their actual default values.
- implementation/REPO_FACTS.md — full rewrite reflecting the
  post-remediation codebase: Mathematics as a first-class subject, the
  demo `analysisDemo` fields on every model, `omrImageUrl` optional, the
  real auth/cookie/CSRF mechanism, the real dev proxy (verified
  end-to-end in R5), exact current test counts (125 backend, 7 frontend),
  and the same short list of non-code blockers repeated from HANDOFF.md.

Behavior implemented:
- An operator (or CI) can run `rehearsal.py` to get real, current
  performance numbers from the actual pipeline, with a safety rail that
  makes it structurally difficult to point at a real database by
  accident.
- Every command an operator would copy out of `RUNBOOK.md` either has
  been run in this repository during remediation, or is explicitly
  labeled as not run and why.

Checks actually run:
- `cd analysis_service && ... pytest -q` — 125 passed, 0 failed, 0
  xfailed (final confirmation, unchanged from R4/R5 since no
  analysis_service files were touched except rehearsal.py, which is not
  part of the pytest suite).
- `venv\Scripts\python.exe rehearsal.py --generate 100 30 --dir
  _rehearsal_bundle` against a real, freshly-dropped `cognitest_test`
  database — succeeded; produced the exact numbers now recorded in
  HANDOFF.md and RUNBOOK.md (0.650s prepare, 0.500s verify, 50,087 bytes
  avg / 50,801 bytes max report size, 2.21ms avg detail latency). Then
  ran it again with `MONGODB_URI` pointed at the plain `cognitest`
  database (no `_test` suffix) and confirmed it refused with exit code 1
  and the expected message, touching no data. Cleaned up the generated
  bundle directory and dropped the test database afterward.
- `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — 0 errors.
- `cd frontend && npm test` — 3 files, 7 passed.
- `cd frontend && VITE_USE_DEMO=true npm run build` — succeeds.
- `cd backend && npx tsc --noEmit` — 0 errors.
- `which mongodump mongorestore mongosh` — only `mongosh` present;
  recorded honestly in RUNBOOK.md rather than claiming the backup/restore
  commands were verified.

Checks not run:
- `mongodump`/`mongorestore` commands in RUNBOOK.md Sections 13-14 — the
  tools are not installed on this development machine (confirmed above).
  The commands are written to correct MongoDB Database Tools syntax but
  were not executed. An operator with those tools installed should run
  them once before relying on the backup/restore procedure for real.
- A literal browser click-through of the full student flow (a human
  clicking through DemoActivate → DemoReports → DemoReportDetail in an
  actual browser window) — the closest verification available in this
  environment is R5's real two-process HTTP walkthrough plus the 7
  passing component tests; neither is a substitute for a human opening
  the pages once before real launch.

Contract drift check:
- No contract files were touched this phase. Final field-for-field state:
  app/schemas/reports.py, app/api/schemas/reports.py, and
  frontend/src/types/demoAnalysis.ts all agree; `PracticeQuestionDTO`
  (Python) and `StudentMeDTO`'s wiring were the two real drifts found and
  fixed earlier (R4), both confirmed still consistent now.

Remaining blockers (final list — see HANDOFF.md's Launch Checklist for
the operator-facing version):
- The MongoDB Atlas password embedded in `backend/check.js`/
  `check_subj.js` must be rotated by the operator; confirmed via
  `git log` that neither file was ever committed, so this is a live
  local-disk exposure, not a repository-history one.
- Legacy `/api/v1/*` public exposure via Vercel must be closed at the
  deployment/proxy layer — outside what any code change in this
  repository can enforce.
- No concurrency/load target has been specified or measured; the single
  rehearsal run's 2.21ms is real but is not a capacity guarantee.
- `mongodump`/`mongorestore` backup/restore commands are unverified on
  this machine (tools not installed) — verify once before relying on them.
- A human has not yet clicked through the demo student flow in a real
  browser window.
- The real practice-question content (225 or whatever the actual paper
  needs) has not been authored — this was never in scope for code
  remediation.

Next permitted phase:
- NONE. This was the final phase in
  CogniTest_REMEDIATION_PROMPTS.md. Per Section 10 (Definition of done),
  every item there is now true and was observed, not assumed:
  `validate` rejects every malformed variant tested; `prepare` on the
  fixture twice makes no duplicate writes and never touches an existing
  password/email/profile picture; `verify` recomputes independently and
  `publish` refuses an unverified build; report detail matches EXPECTED
  in <=2 queries with zero other-student identities; the React demo
  renders all seven breakdowns, comparisons (or the honest unavailable
  notice), the revision list, correct numerical answers including "0",
  practice reveal, and persisted reflections, using only
  `/api/v2/demo/*` requests (verified live, not just compiled); the
  activation form works against `/auth/activate`; every `implementation/
  *.md` file describes only commands and results that were executed; the
  leaked credential files are gitignored and the operator has been told,
  in writing, to rotate the password. The non-code blockers listed above
  are real and are the operator's to close, not this remediation's.
```
