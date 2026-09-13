# Release Handoff

This handoff was rewritten during remediation Phase R6 (2026-09-13). The
previous version of this file made claims that were not true of the
codebase at the time (fabricated rehearsal metrics, a nonexistent
`check-indexes` CLI command, a claim that the server sanitizes SVG with
DOMPurify when it actually uses `defusedxml`, and "meets the definition of
done" while the core analysis feature had not yet been implemented). See
`implementation/PHASE_STATUS.md` for the full, phase-by-phase record of
what was actually built and verified — this file summarizes it.

## Summary

The CogniTest analysis demo (a FastAPI service alongside the existing
Express backend, plus new React routes) is implemented and tested per
`CogniTest_REMEDIATION_PROMPTS.md` Phases R0-R6. An operator can prepare,
verify, publish, correct, and recover a test's analysis through
`app/cli.py`; an activated student sees a precomputed report (score,
seven breakdowns, cohort comparisons, insights, revision list, ordered
question review), practice questions, and can save reflections — all
through `/api/v2/demo/*`, isolated from the legacy `/api/v1/*` Express
routes.

## Staging Rehearsal Metrics

Measured once during Phase R6, running the real CLI pipeline
(`rehearsal.py --generate 100 30`) against a local MongoDB and an
in-process FastAPI call (not over a network, not behind a reverse proxy,
no concurrent load):

- **Students:** 100, **Questions:** 30
- **Preparation duration:** 0.650 s
- **Verification duration:** 0.500 s
- **Average report document size:** 50,087 bytes (well within MongoDB's
  16 MB document limit)
- **Largest report document size:** 50,801 bytes
- **Average report-detail endpoint latency:** 2.21 ms

These describe one run, on one machine, once. They are evidence the
pipeline works and is not pathologically slow — they are not a production
capacity guarantee. No concurrency target has been specified by the
institution or tested here; if launch expectations imply a specific
concurrent-student count, that must be measured separately before
launch, not assumed from this single-request number.

## Added & Modified Components

- **`analysis_service/` (new FastAPI service):**
  - `app/domain/`: pure functions — `grading.py`, `results.py`,
    `analytics.py`, `insights.py`, `comparisons.py`, `snapshot.py`. No
    database or HTTP dependency anywhere in this package.
  - `app/schemas/`: `inputs.py` (prepared-bundle file contracts),
    `reports.py` (StudentSnapshot/CohortAggregates, the stored shapes),
    `auth.py` (StudentMeDTO).
  - `app/services/`: `bundle.py` (load + validate), `preparation.py`,
    `verification.py`, `auth.py`, `reports.py` (API delivery),
    `rate_limiter.py`, `validation.py` (BSON size check, SVG
    sanitization via `defusedxml` — **not** DOMPurify; DOMPurify is used
    on the frontend for a second, defense-in-depth sanitization pass at
    render time).
  - `app/repositories/`: one module per collection family (`students`,
    `questions`, `tests`, `reports`, `indexes`) — all database access
    goes through these.
  - `app/api/`: FastAPI routers and dependencies; every response is a
    typed, allowlisted Pydantic DTO.
  - `app/cli.py`: `validate`, `prepare`, `verify`, `publish`, `unpublish`,
    `issue-claims`, `indexes --check`/`--apply` — see `RUNBOOK.md` for
    exact commands.
  - `tests/`: `unit/` (76 tests, no DB/HTTP), `integration/` (49 tests,
    requires MongoDB, refuses to run against a non-`_test` database).
- **`frontend/` (React additions):**
  - `src/api/demoClient.ts`: axios instance for `/api/v2/demo`,
    `withCredentials: true`.
  - `src/types/demoAnalysis.ts`: the TypeScript mirror of the Python
    snapshot/DTO contract — kept field-for-field identical by hand.
  - `src/hooks/useDemoReports.ts`, `useDemoReport.ts`: data fetching;
    `useDemoReport` is called once per report page, not once per
    question.
  - `src/pages/DemoReports.tsx`, `DemoReportDetail.tsx`, `DemoActivate.tsx`.
  - `src/components/demo/`: `DemoStudentLayout`, `ScoreSummary`,
    `BreakdownTable`, `ComparisonTable`, `QuestionReview`,
    `PracticePanel`, `ReflectionInput`, `RevisionPriorities`,
    `LockedFeatureCard`, plus `__tests__/` (7 vitest component tests).
- **`backend/` (existing Express app, minimally touched):**
  - `src/models/Student.ts`, `Question.ts`, `Test.ts`,
    `EvaluationReport.ts` gained optional `analysisDemo` sub-documents
    (additive only); `EvaluationReport.omrImageUrl` became optional.
  - No controller, route, or existing business logic was changed.
- **`implementation/`:** `RUNBOOK.md`, `PHASE_STATUS.md`,
  `DEPLOYMENT_PLAN.md`, `CONTRACTS.md`, `FIXTURE_EXPECTATIONS.md`,
  `REPO_FACTS.md`, this file.

## Operational Boundaries & Known Limitations

- **SVG/media sanitization**: original and practice question `diagramSvg`
  is sanitized once at import time with `defusedxml` (rejects DTDs,
  external entities, non-`<svg>` roots), and sanitized *again* at render
  time on the frontend with DOMPurify before `dangerouslySetInnerHTML`.
  There is no server-side DOMPurify step — that claim in an earlier
  version of this document was wrong.
- **Legacy isolation**: legacy `/api/v1/*` Express routes must be blocked
  at the reverse-proxy layer for the public demo deployment (see
  `DEPLOYMENT_PLAN.md`); this codebase does not and cannot enforce that
  from inside the FastAPI service.
- **Data flow**: `app.cli prepare`/`verify`/`publish` must only be run by
  an operator against a deliberately-chosen database; no automatic
  preparation exists, and nothing in the CLI stops an operator from
  pointing `MONGODB_URI` at the wrong database (unlike the test suite and
  `rehearsal.py`, which both refuse to run against anything not named
  `*_test`, `prepare`/`verify`/`publish` have no such guard by design,
  since they are meant to run against the real institute database).
- **Grading rules supported**: exact single-correct-option MCQ, exact
  integer-numerical (no tolerance). Partial credit, multi-correct
  options, and bonus/dropped questions are not supported and will fail
  validation rather than being silently mis-scored.
- **Comparisons**: class-average/topper comparisons are computed per
  roster `batch` only; rank/percentile are intentionally not computed.
  A single-student cohort shows an explicit "comparison unavailable"
  message rather than a fabricated statistic.
- **Practice**: self-study only — a student's practice attempt never
  affects their official score, and the practice endpoint states this in
  the UI.
- **Content coverage**: the pipeline supports however many practice
  questions are supplied in `recommendations.json` (exactly
  `manifest.recommendationsPerQuestion` per original question, enforced
  by `validate`). Authoring enough real practice content for a real paper
  (e.g. 225 questions for a 75-question paper) is a content-production
  task for the institution/content team, not something this codebase can
  generate.
- **Concurrency**: not load-tested (see Staging Rehearsal Metrics above).

## Launch Checklist

- [ ] Merge `main` into the deployment target branch.
- [ ] Configure environment variables: `MONGODB_URI`, `JWT_SECRET`
      (32+ bytes), `INSTITUTE_ID`, `ALLOWED_ORIGINS` (exact origin list,
      JSON array).
- [ ] Rotate the MongoDB Atlas password currently embedded in
      `backend/check.js`/`check_subj.js` (see `backend/SECRETS_WARNING.md`)
      — this predates and is unrelated to the demo feature, but must not
      ship.
- [ ] Set `VITE_USE_DEMO=true` in the frontend build.
- [ ] Implement the NGINX proxy rules in `DEPLOYMENT_PLAN.md`, including
      blocking legacy `/api/v1/*` and the FastAPI `/docs`/`/openapi.json`.
- [ ] `python -m app.cli indexes --check`, then `--apply` if anything is
      missing.
- [ ] `curl <host>/health` — confirm `database_ready: true`.
- [ ] Validate the real prepared bundle: `python -m app.cli validate --dir <bundle>`.
- [ ] `prepare`, then `verify`, then manually reconcile a high-scoring,
      low-scoring, and skipped-heavy student against the source sheets
      before publishing.
- [ ] `publish`, then `issue-claims --out <private file>`, then deliver
      activation codes to students through a private channel.

Every item above is an operator action; none of it happens automatically.
