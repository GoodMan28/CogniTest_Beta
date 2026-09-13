# CogniTest — Mock Bundle Generation Prompt

**Suggested filename:** `CogniTest_MOCK_DATA_PROMPT.md`

Give this whole document to the implementation model. It produces one deliverable: a deterministic Python script that writes a realistic, schema-valid prepared-data bundle (a full mock question paper, a roster, mock student responses, and practice questions) that deliberately exercises **every** analytics feature built in `CogniTest_REMEDIATION_PROMPTS.md` Phases R0–R6. It does **not** change any application code.

---

# 0. MASTER PROMPT — read first

## Your role

You are writing a data-generation script, not a feature. You will not edit anything under `analysis_service/app/`, `frontend/src/`, or `backend/`. Your only outputs are:

1. `analysis_service/scripts/generate_mock_bundle.py` (new file; create the `scripts/` directory).
2. The bundle it writes to `private_data/mock-jee-01/` (six JSON files). `private_data/` is already gitignored — never move the output anywhere else, never put it under `frontend/public`.
3. `analysis_service/scripts/MOCK_BUNDLE_SCENARIOS.md` (new): a table of every engineered scenario in the data and the exact observable outcome an operator should see after publishing.

## Sources of truth, in order

1. `analysis_service/app/schemas/inputs.py` — the exact field names, types, and limits every file must satisfy. **Open it and read it before writing a single field.** If this document and that file disagree, that file wins.
2. `analysis_service/app/services/bundle.py::validate_bundle` — the cross-file rules (counts, joins, uniqueness). Read it too.
3. `analysis_service/tests/fixtures/synthetic_fixture.py` — a small, known-good bundle in Python-dict form. Copy its **shape**, not its values.
4. `implementation/RUNBOOK.md` — the commands you will run to prove the bundle works.
5. This document — for what scenarios the data must contain.

## Working rules

- **Deterministic.** Use `random.Random(20260913)` (a seeded instance), never the module-level `random.*` functions and never `datetime.now()` for anything that lands in the files. Running the script twice must produce byte-identical files. Verify this with a checksum (see Section 5).
- **Validate before you claim anything.** The script is not done until `python -m app.cli validate --dir private_data/mock-jee-01` prints `Bundle valid: ...`. Every error it prints names the file, the identifier, and the reason — fix the generator, not the JSON by hand.
- **Never hand-edit the output JSON.** If something is wrong, change the script and re-run it.
- **No answers in `questions.json`.** Original questions carry no `correctOption`/`numericalAnswer`; those live only in `answer_key.json`. (Practice questions in `recommendations.json` DO carry their own answer — that file has no separate key.)
- **No `questionNo` on practice questions.** They are identified by `sourceKey` only.
- **Do not reuse the fixture's `testKey`** (`demo-test`). Use `mock-jee-01` so the two never collide in the same database.
- **Do not run `prepare`/`publish` against any database whose name does not end in `_test`.** Use `MONGODB_URI=mongodb://localhost:27017/cognitest_test` for every command in this task.
- Use only plain Python types in the data (`str`, `int`, `list`, `dict`, `None`). No `Decimal`, no `datetime` objects — write ISO strings yourself so `json.dump` needs no `default=`.
- Python 3.10 syntax only (no `match`, no `type X = ...`); the repo supports 3.10 in CI.

## Required response when you finish

```text
DELIVERABLE: mock bundle generator
STATUS: COMPLETE | BLOCKED

Files created:
- path — purpose

Bundle summary:
- questions: N (MCQ: a, numerical: b) across subjects [...]
- students in roster: N; evaluated (responses): M; batches: [...]
- practice questions: N (exactly 3 per original)

Checks actually run:
- <exact command> — <exact result line printed>

Determinism check:
- <checksum command> run twice — identical: YES | NO

Scenarios verified after publish (from MOCK_BUNDLE_SCENARIOS.md):
- <scenario> — <what you actually observed via API/UI>

Not run:
- <command> — <reason>
```

Do not report `COMPLETE` if `validate` did not pass or if you did not actually run `prepare → verify → publish` and look at at least one report.

---

# 1. The paper: what to generate

## 1.1 Shape

A JEE-style paper. Fixed numbers — do not change them, several scenarios below depend on exact counts:

| Property | Value |
|---|---|
| `testKey` | `mock-jee-01` |
| `title` | `JEE Mock Test 01` |
| `examType` | `JEE` |
| `date` | `"2026-09-20T09:00:00+00:00"` (a literal string; must include the `+00:00`) |
| Subjects | `Physics`, `Chemistry`, `Mathematics` — **exactly these three**, 25 questions each |
| Question order | Q1–Q25 Physics, Q26–Q50 Chemistry, Q51–Q75 Mathematics |
| Total questions | 75 (`expectedQuestionCount: 75`) |
| Per subject | 20 `multiple_choice` + 5 `numerical` (numerical are the last 5 of each subject: Q21–25, Q46–50, Q71–75) |
| Marking | `multiple_choice`: `{"correctMarks": 4, "incorrectPenalty": 1}`; `numerical`: `{"correctMarks": 4, "incorrectPenalty": 0}` — **deliberately different penalties** so the two-scheme handling is exercised |
| `recommendationsPerQuestion` | 3 |
| `comparisonPolicy` | `"batch"` |
| `schemaVersion` | `"1.0"` |
| `instituteId` | **read it from the environment**: `os.environ["INSTITUTE_ID"]`. Do not hardcode. The manifest is rejected if it does not equal the configured `INSTITUTE_ID`. |

## 1.2 Taxonomy per subject (use exactly these strings)

Every question needs `unit` (one string), `chapter` (list of 1–2 strings), `topic` (list of 1–2 strings). Use this fixed taxonomy so breakdowns have meaningful groups:

**Physics** — units: `Mechanics`, `Electricity & Magnetism`, `Modern Physics`.
- `Mechanics` → chapters `Kinematics`, `Laws of Motion`, `Work, Energy and Power` → topics `Projectile Motion`, `Friction`, `Conservation of Energy`, `Equilibrium`
- `Electricity & Magnetism` → chapters `Electrostatics`, `Current Electricity` → topics `Coulomb's Law`, `Ohm's Law`, `Capacitance`
- `Modern Physics` → chapters `Atoms`, `Nuclei` → topics `Bohr Model`, `Radioactivity`

**Chemistry** — units: `Physical`, `Organic`, `Inorganic`.
- `Physical` → chapters `Thermodynamics`, `Chemical Equilibrium` → topics `Enthalpy`, `Equilibrium`, `Le Chatelier`
- `Organic` → chapters `Hydrocarbons`, `Alcohols` → topics `Isomerism`, `Reaction Mechanisms`
- `Inorganic` → chapters `Periodic Table`, `Chemical Bonding` → topics `Periodicity`, `Hybridisation`

**Mathematics** — units: `Algebra`, `Calculus`, `Coordinate Geometry`.
- `Algebra` → chapters `Quadratic Equations`, `Sequences and Series` → topics `Nature of Roots`, `Arithmetic Progression`, `Equilibrium`
- `Calculus` → chapters `Derivatives`, `Integrals` → topics `Power Rule`, `Chain Rule`, `Definite Integrals`
- `Coordinate Geometry` → chapters `Straight Lines`, `Circles` → topics `Slope`, `Tangents`

Note the topic **`Equilibrium` appears in Physics, Chemistry, and Mathematics on purpose.** It must stay three separate groups in the topic breakdown and in insights (keys `Physics::Equilibrium`, `Chemistry::Equilibrium`, `Mathematics::Equilibrium`). Do not "fix" this collision — it is a test.

**Required distribution of `Equilibrium`:** exactly 4 questions in Physics, 4 in Chemistry, 4 in Mathematics carry `Equilibrium` in their `topic` list (so each has ≥3 for the insight threshold). Record which question numbers in `MOCK_BUNDLE_SCENARIOS.md`.

**Overlap requirement:** at least 6 questions in the whole paper must have **two** topics (e.g. `["Projectile Motion", "Conservation of Energy"]`) and at least 4 must have **two** chapters. This exercises the "overlapping categories; do not sum rows" behaviour. Keep entries within a list unique.

## 1.3 Difficulty

Assign `difficulty` so each subject has **exactly**: 10 `easy`, 10 `medium`, 5 `hard` (the 5 numericals are all `hard`; the 20 MCQs split 10 easy / 10 medium). This gives a clean 30/30/15 overall split.

## 1.4 Per-question required fields (original questions, `questions.json`)

Read `QuestionSchema` / `QuestionContentBase` in `inputs.py`. Every entry:

```text
questionNo        int, 1..75, no gaps, no duplicates
subject           one of the three strings above
unit              string from the taxonomy
chapter           list of 1-2 strings, unique within the list
topic             list of 1-2 strings, unique within the list
questionType      "multiple_choice" | "numerical"
difficulty        "easy" | "medium" | "hard"   (lowercase!)
questionIntent    short string, e.g. "Apply Newton's second law"
questionText      non-empty; include LaTeX in at least 10 questions, e.g. "$v = u + at$" — the UI renders KaTeX
options           MCQ: exactly 4 strings; numerical: OMIT the key entirely (do not write null, do not write [])
solutionText      non-empty authored method explanation
distractorExplanations   OPTIONAL: dict letter -> string. Include it on exactly 8 MCQ questions, covering only WRONG letters (never the correct one)
imageUrl          OPTIONAL: include on exactly 3 questions, value like "https://example.com/mock/q7.png"
diagramSvg        OPTIONAL: include on exactly 2 questions, a tiny WELL-FORMED svg with xmlns, e.g.
                  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="15" fill="none" stroke="black"/></svg>'
                  (no DOCTYPE, no entities, no <script> — defusedxml will reject those and prepare will fail)
```

Do NOT include: `correctOption`, `numericalAnswer`, `recommendationRefs`, or any other key — `extra="forbid"` rejects unknowns.

## 1.5 Answer key (`answer_key.json`)

One entry per question, `questionNo` 1..75:

- MCQ → `{"questionNo": n, "correctOption": "<A|B|C|D>"}`; spread letters roughly evenly (about 15 each of A/B/C/D across the 60 MCQs), from the seeded RNG.
- Numerical → `{"questionNo": n, "numericalAnswer": <int>}`. **Required special values** (write these into the scenario table):
  - at least one key that is `0`
  - at least one negative key (e.g. `-3`)
  - at least one two-digit key (e.g. `12`)
  - the rest small integers in `-5..20`

Never set both `correctOption` and `numericalAnswer` on one entry.

---

# 2. The roster and responses

## 2.1 Roster (`students.json`) — 32 students

| Batch | Count | Enrollment numbers | Purpose |
|---|---|---|---|
| `Alpha` | 15 | `JEE-ALPHA-001` … `JEE-ALPHA-015` | main cohort, wide score spread |
| `Beta` | 15 | `JEE-BETA-001` … `JEE-BETA-015` | second cohort, must never mix with Alpha |
| `Gamma` | 1 | `JEE-GAMMA-001` | single-student cohort → "Comparison unavailable" |
| `Alpha` | 1 | `JEE-ALPHA-016` | **roster-only**: in the roster, NO response file entry (absentee) |

- `expectedStudentCount` in the manifest = **31** (evaluated students), not 32. The absentee must not get a report and must not count toward Alpha's cohort size (Alpha cohort size must be 15).
- Names: draw first/last names from two fixed lists with the seeded RNG. **Two students must share the exact same full name** with different enrollment numbers (e.g. `JEE-ALPHA-003` and `JEE-BETA-007` both `"Aarav Patel"`). Record them.
- `email`: include on roughly half the students (`<enrollment lowercased>@example.com`), omit the key on the rest.
- Case: all enrollment numbers uppercase, exactly as shown. Do not create `jee-alpha-001` and `JEE-ALPHA-001` — that is a validation error, not a scenario.

## 2.2 Responses (`responses.json`) — 31 entries

Every entry must have **exactly 75** answer rows, `questionNo` 1..75, each `{"questionNo": n, "answer": <value>}`:

- MCQ answer: a letter string `"A".."D"` or `null` (skipped)
- Numerical answer: an **integer or integer string** (`7`, `"7"`, `"+07"`, `"-0"` are all valid), or `null`. Never `"7.0"`, never `true`, never `""`.

### Engineered students (build these exactly; everything else is RNG-driven)

| Enrollment | Batch | Behaviour | What it proves |
|---|---|---|---|
| `JEE-ALPHA-001` | Alpha | **Every answer correct** (copy the key) | max score; a "Strength" on every topic with ≥3 questions |
| `JEE-ALPHA-002` | Alpha | Every answer correct — **identical to ALPHA-001** | joint toppers → `topperCount: 2`, `topperLabel: "Joint toppers' average"` |
| `JEE-ALPHA-003` | Alpha | All 75 answers `null` | all-skipped: score `0.00`, accuracy `null` everywhere, revision list all `reason: "skipped"`, insights all `Limited evidence` |
| `JEE-ALPHA-004` | Alpha | All 60 MCQs wrong (pick a letter ≠ key), all 15 numericals wrong | **negative overall score** (`-60.00`) — must not be clamped to 0 |
| `JEE-ALPHA-005` | Alpha | Correct on every `Equilibrium` question in all three subjects, wrong on everything else | three separate `*::Equilibrium` insights, all `Strength`, alongside many `Needs improvement` |
| `JEE-ALPHA-006` | Alpha | Numericals answered as strings with formatting: use `"+07"` where key is 7, `"-0"` where key is 0, `" 12 "` (with spaces) where key is 12; MCQs 50% correct | normalisation of `+`, `-0`, whitespace |
| `JEE-ALPHA-007` | Alpha | Skips **all 25 Chemistry** questions, answers the rest ~70% correct | a whole subject with `accuracyPct: null`, `coveragePct: "0.00"`, "No questions attempted" style row; skipped-heavy revision items |
| `JEE-ALPHA-008` | Alpha | Exactly 2 questions attempted per topic where possible, rest skipped | topics landing on `Limited evidence` despite good accuracy (below the 3-attempt threshold) |
| `JEE-BETA-001` | Beta | Every answer correct | Beta's sole topper (`topperCount: 1`, `topperLabel: "Topper"`) — proves cohorts are independent from Alpha |
| `JEE-GAMMA-001` | Gamma | ~60% correct | `comparisons.available: false`, `unavailableReason: "Comparison unavailable: only one evaluated student."` |

For the remaining students (`ALPHA-009..015`, `BETA-002..015`), generate per-question outcomes from the seeded RNG with these probabilities: correct 0.55, incorrect 0.30, skipped 0.15. For "incorrect" on an MCQ pick a random letter ≠ key; on a numerical pick `key + rng.choice([1, -1, 10])`.

**Accuracy-band requirement (verify in your script with an assertion, then record):** across Alpha, at least one topic must come out `Developing` (accuracy between 50% and 80% with ≥3 attempts) for at least one student. If the RNG does not produce it, adjust `ALPHA-009` by hand-coding: on `Physics::Friction` (ensure Friction has ≥4 questions) answer 3 correct, 1 wrong.

---

# 3. Practice questions (`recommendations.json`)

Exactly 75 entries, one per `originalQuestionNo` 1..75, each with exactly 3 practice questions (225 total). Each practice question is a `PracticeQuestionSchema` object (read it): same content fields as an original question **minus `questionNo`**, **plus**:

```text
sourceKey        REQUIRED, unique across the whole file, e.g. f"q{n:02d}-p{k}"  (q07-p1, q07-p2, q07-p3)
correctOption    MCQ practice only
numericalAnswer  numerical practice only
```

Rules:
- Same `subject`, `unit`, `chapter`, `topic` as its original question (so the "3 practice questions available" count in the revision list lines up with the topic).
- Same `questionType` as its original (so a numerical original gets numerical practice).
- `difficulty`: cycle `easy`, `medium`, `hard` across the three practice items.
- `questionText` must be distinct from the original and from each other (e.g. include the sourceKey in the text: `"Practice q07-p2: ..."`).
- MCQ practice: exactly 4 options and a `correctOption` within `A..D`; numerical practice: no `options` key, an integer `numericalAnswer`.
- A `sourceKey` must never equal the original question number as a string (`"7"`) — the validator rejects that.
- Include `distractorExplanations` on 5 practice MCQs and `imageUrl` on 2 practice questions, same rules as originals.

---

# 4. The script: `analysis_service/scripts/generate_mock_bundle.py`

Structure it as small pure functions, each returning plain Python data, and one `main()` that writes files:

```text
build_taxonomy()            -> the dicts from Section 1.2
build_questions(rng)        -> list[dict]   (75 originals, Section 1.4; enforce the exact difficulty and Equilibrium counts with assertions)
build_answer_key(rng, qs)   -> list[dict]   (Section 1.5; assert the required special numerical values are present)
build_roster(rng)           -> list[dict]   (32 entries, Section 2.1)
build_responses(rng, qs, key, roster) -> list[dict]  (31 entries, Section 2.2; engineered students first, RNG for the rest)
build_recommendations(rng, qs) -> list[dict] (Section 3)
build_manifest(qs, responses) -> dict       (Section 1.1; expectedQuestionCount=len(qs), expectedStudentCount=len(responses))
write_bundle(out_dir, ...)  -> writes six files with json.dump(obj, fh, indent=2, sort_keys=True, ensure_ascii=False) + trailing newline
main()                      -> argparse: --out (default private_data/mock-jee-01), --seed (default 20260913)
```

Requirements:
- Every constraint in Sections 1–3 that is a fixed number must be enforced with an `assert` inside the builder that produces it, with a message naming what was expected. The script should refuse to write a bundle that violates its own spec.
- Run the bundle through the real validator **from inside the script** before writing, so a bad generator never writes files:
  ```python
  from app.services.bundle import RawBundle, validate_bundle, BundleValidationError
  ```
  (This import needs `PYTHONPATH=.` from `analysis_service/`, and needs the four env vars set — `app.config` fails to import without them.) On `BundleValidationError`, print every error and `sys.exit(1)` without writing.
- Print, at the end, the counts from the "Bundle summary" block of the required response so you can copy them verbatim.
- Do not import `app.db`, `pymongo`, or anything that opens a database connection. Generation is offline.

---

# 5. Prove it works — run these, in this order, and paste the output

All from `analysis_service/`, with the venv Python and these env vars set (Windows `set`, Linux `export`):

```text
MONGODB_URI=mongodb://localhost:27017/cognitest_test
JWT_SECRET=mock_bundle_secret_at_least_32_bytes_long_xx
INSTITUTE_ID=60c72b2f9b1e8a001c8e4a5d
ALLOWED_ORIGINS=["http://localhost:5174"]
PYTHONPATH=.
```

1. **Generate:** `venv\Scripts\python scripts\generate_mock_bundle.py`
2. **Determinism:** run step 1 again, then compare — e.g. `certutil -hashfile private_data\mock-jee-01\responses.json SHA256` before and after (or `sha256sum` on Linux) for all six files. All six hashes must be identical across the two runs.
3. **Validate (no DB):** `venv\Scripts\python -m app.cli validate --dir private_data\mock-jee-01` → must print `Bundle valid: 75 questions, 32 students, 225 practice questions.`
4. **Break it on purpose, then restore:** temporarily change one response's numerical answer to `"7.0"` in the *script* (not the JSON), regenerate, run `validate`, confirm it fails naming that enrollment number and question, then revert and regenerate. Paste the error line. This proves the validator is actually guarding the data you generated.
5. **Fresh test DB:** `venv\Scripts\python -c "from pymongo import MongoClient; MongoClient('mongodb://localhost:27017/cognitest_test').drop_database('cognitest_test')"` then `venv\Scripts\python -m app.cli indexes --apply`
6. **Prepare / verify / publish:**
   ```text
   venv\Scripts\python -m app.cli prepare --dir private_data\mock-jee-01
   venv\Scripts\python -m app.cli verify  --test-key mock-jee-01 --dir private_data\mock-jee-01
   venv\Scripts\python -m app.cli publish --test-key mock-jee-01
   venv\Scripts\python -m app.cli issue-claims --test-key mock-jee-01 --out private_data\mock-jee-01-claims.json
   ```
   `verify` must print `Verification passed for test 'mock-jee-01' build ...`. If it fails, the message names the student/cohort/question — fix the generator, regenerate, `unpublish` if needed, and repeat. `issue-claims` must report **31** claims (the absentee has no report so gets no claim).
7. **Inspect stored data directly** (one Python snippet is fine) and record the actual values:
   - `JEE-ALPHA-001` snapshot `summary.score` == `"300.00"` and `summary.maximumMarks` == `"300.00"`
   - `JEE-ALPHA-003` `summary.score` == `"0.00"`, `summary.attempted` == `0`, every bucket `accuracyPct` is `null`
   - `JEE-ALPHA-004` `summary.score` == `"-60.00"` (60 MCQs × −1; numericals cost 0)
   - `JEE-ALPHA-005` insights: three entries whose `key` ends in `::Equilibrium`, all `label == "Strength"`
   - `JEE-ALPHA-006`: questions where the key is 7 / 0 / 12 show `studentAnswer` `"7"` / `"0"` / `"12"` and `status: "correct"`
   - `JEE-ALPHA-007`: the `subject` breakdown's `Chemistry` bucket has `attempted == 0`, `accuracyPct == null`, `coveragePct == "0.00"`
   - `JEE-ALPHA-008`: at least one insight `Limited evidence` with `attempted == 2`
   - Alpha `batchSnapshot`: `cohortSize == 15`, `topperCount == 2`, `topperLabel == "Joint toppers' average"`, `overall.topperScore == "300.00"`
   - Beta `batchSnapshot`: `cohortSize == 15`, `topperCount == 1`, `topperLabel == "Topper"`
   - Gamma `batchSnapshot`: `available == false`, `unavailableReason == "Comparison unavailable: only one evaluated student."`, `categories == []`
   - The roster-only `JEE-ALPHA-016` has **no** `evaluationreports` document
   - `db.tests` document: `title == "JEE Mock Test 01"`, `totalQuestions == 75`, every `questions[].recommendations` has length 3
   - Dump one Alpha `batchSnapshot` to JSON and assert none of the strings `JEE-ALPHA`, `JEE-BETA`, or any roster name appear in it
8. **Look at it in the UI** (per `RUNBOOK.md` §2): start FastAPI and Vite (`VITE_USE_DEMO=true`), open `/student/signup`, activate `JEE-ALPHA-005` with its claim code, and confirm on the report page: the topic breakdown (under "Show unit / chapter / topic …") lists `Equilibrium` three times under three subjects; the difficulty table shows Easy/Medium/Hard rows; the "Overlapping categories; do not sum rows" caption is present on chapter/topic; a numerical question renders "Your Answer" as a value; a question with `distractorExplanations` shows "Why this option is wrong" when the student chose that wrong letter (choose ALPHA-004 for that one). Take screenshots if the environment allows; otherwise fetch the same data through `GET /api/v2/demo/reports/{id}` with the login cookie and quote the JSON fields.
9. **Cleanup:** stop both servers; drop `cognitest_test`; delete `private_data\mock-jee-01-claims.json` (the bundle itself may stay — it is gitignored). Confirm with `git status` that nothing under `private_data/` shows up.

---

# 6. `MOCK_BUNDLE_SCENARIOS.md` — what to write

A single table, one row per engineered scenario, with these columns: **Scenario · Where in the data (enrollment / question numbers) · Feature exercised · Expected observable · Observed (fill after step 7/8)**. Include every row from the tables in Sections 1–2 plus: the `Equilibrium` question numbers per subject, the two-topic and two-chapter question numbers, the questions carrying `distractorExplanations`/`imageUrl`/`diagramSvg`, the numerical questions with keys `0`, negative, and two-digit, and the two same-name students. Fill the **Observed** column only with things you actually saw; write `NOT CHECKED` otherwise.

---

# 7. Things that will go wrong, and what they mean

| Symptom | Cause | Fix |
|---|---|---|
| `manifest.json: instituteId ... does not match the configured INSTITUTE_ID` | you hardcoded an id | read `os.environ["INSTITUTE_ID"]` |
| `date must be timezone-aware` | wrote `"2026-09-20T09:00:00"` | append `+00:00` |
| `Numerical questions cannot have options` | wrote `"options": []` or `null` on a numerical | omit the key |
| `expected 75 questions ..., found N` | difficulty/subject loop produced the wrong count | fix the loop; your own `assert` should have caught it first |
| `duplicate practice sourceKey across the file` | reused `p1`/`p2`/`p3` without the question prefix | use `f"q{n:02d}-p{k}"` |
| `missing answer rows for questionNo [...]` | a response has < 75 rows | generate rows for **all** 75 questions, `null` for skipped |
| `Ambiguous case-insensitive roster enrollmentNo` | mixed-case duplicates | keep everything uppercase |
| `Invalid or unsafe SVG content` at `prepare` | `diagramSvg` has a DOCTYPE/entity/script or no `xmlns` | use the minimal svg from Section 1.4 |
| `verify` says a cohort mismatch | you edited JSON by hand after `prepare` | never hand-edit; regenerate, `unpublish`, re-`prepare` |
| `issue-claims` reports 32 not 31 | the absentee got a response entry | remove `JEE-ALPHA-016` from `responses.json` (keep in roster) |
| `pytest`/`rehearsal.py` refuse to run | `MONGODB_URI` not `*_test` | use the URI in Section 5 |

If any command in Section 5 cannot be run in your environment, say so with the exact command and mark the deliverable `BLOCKED`, not `COMPLETE`.
