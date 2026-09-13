# Repository Facts

Updated at the end of remediation Phase R6 (2026-09-13) to reflect what
the codebase actually contains now, after Phases R0-R5 — the version
before this described a pre-remediation baseline and is out of date.

## Structure & State

- **Root Directory:** `C:\Users\Abhineet Anand\Desktop\CogniTest_Beta_Python`
- **Backend (legacy):** Node.js Express application (TypeScript) in `backend/`. Unchanged in behavior; only additive `analysisDemo` schema fields were added.
- **Backend (new):** FastAPI + PyMongo service in `analysis_service/`. Python 3.10 (CI) / 3.14 (local dev, both supported). See `RUNBOOK.md` for exact commands.
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS in `frontend/`, with an additive demo flow gated by `VITE_USE_DEMO=true`.

## Models (MongoDB/Mongoose, `backend/src/models/`)

- **Student:** `instituteId`, `enrollmentNo` (unique), `name`, `batch`, `email`, `profilePictureUrl`, `password`, plus optional `analysisDemo.{claimDigest, claimExpiresAt, claimedAt}`.
- **Question:** Collections `physics_questions`, `chemistry_questions`, `biology_questions`, **and now `mathematics_questions`** (`MathematicsQuestion` model, added during remediation). Fields: `subject`, `unit`, `chapter`, `topic`, `questionType` (`multiple_choice`|`numerical`), `difficulty`, `questionIntent`, `questionText`, `options`, `correctOption`, `numericalAnswer`, `solutionText`, `isEmbedded`, rich media fields, plus optional `analysisDemo.{managed, sourceKey, contentHash}`. `getQuestionModel()` uses an explicit registry and throws on an unknown subject — Mathematics is a first-class subject throughout the demo path (not, e.g., silently folded into Biology).
- **Test:** `instituteId`, `title`, `date`, `examType`, `totalQuestions`, `marksPerQuestion`, `negativeMarking`, `isPublished` (always `false` for demo-managed tests — publication state lives in `analysisDemo.status` instead), `sections`, `questions[]` (`questionNo`, `questionId`, `subject`, `demoMarking`, `recommendations: [{questionId, subject, sourceKey}]`, `authoredDistractorExplanations`), plus `analysisDemo.{managed, sourceKey, status, buildId, sourceHash, expectedStudents, policy, computedAt, publishedAt, verifiedBuildId, lastError}`.
- **EvaluationReport:** `studentId`, `testId`, `score`, `totalMarks`, `performance` (correct/incorrect/unanswered question-id arrays, kept for legacy compatibility), `omrImageUrl` (now **optional** — there is no OMR image in this workflow), `responses`, plus `analysisDemo.{managed, buildId, sourceHash, computedAt, schemaVersion, snapshot, batchSnapshot, reflections}`. `analysisDemo.snapshot` (a `StudentSnapshot`) and `analysisDemo.batchSnapshot` (a `CohortAggregates`) are the authoritative data the demo API serves — legacy `score`/`performance` are kept in sync but never re-derived from by the new code.
- **StudentAnalytics:** unchanged; the demo path does not read or write it (chapter/topic insights are computed inside each report's own snapshot instead).

## Authentication & Context

- **Legacy (Express):** `bcryptjs` (10 salt rounds); JWT `{id, role: 'student'}`; frontend stores the JWT in `localStorage`, sent as `Authorization: Bearer <token>`.
- **Demo (FastAPI):** `bcrypt` (compatible with `bcryptjs`'s `$2a$`/`$2b$` hashes — verified by a passing activation/login round-trip test); JWT with `iss`/`aud`/`sub`/`role`/`iat`/`exp`, signed with a required (no fallback) `JWT_SECRET` of at least 32 bytes; delivered as an `HttpOnly`, `SameSite=Lax` cookie named `demo_token`, scoped to path `/api/v2/demo`, with `Secure` controlled by the `COOKIE_SECURE` setting (default `true`). No JWT is ever returned in a JSON response body. `get_current_student` (the auth dependency) filters on both `_id` and `instituteId`, so a token for a student in a different institute fails authentication.
- Both auth systems coexist: `frontend/src/context/AuthContext.tsx` branches on `VITE_USE_DEMO` and uses whichever is appropriate; the demo branch never touches `localStorage` for the token (only same-origin cookies).

## Infrastructure

- **Dev routing:** `frontend/vite.config.ts` proxies `/api/v2/demo` to `http://localhost:8000` (FastAPI) — declared *before* the plain `/api` entry (proxied to `http://localhost:5000`, Express), since Vite matches proxy rules in declaration order. Verified working end-to-end (activate/login/list/detail/practice through the real proxy with cookie persistence) during Phase R5.
- **Production routing:** must be enforced by a reverse proxy (NGINX example in `DEPLOYMENT_PLAN.md`) — FastAPI has no CORS middleware of its own; `verify_origin` (an explicit per-route dependency) is the actual CSRF guard, checking `Origin` against `ALLOWED_ORIGINS`.
- **Production exposure:** `vercel.json` still rewrites the legacy Express app publicly; this must be closed at the deployment layer (see `DEPLOYMENT_PLAN.md`) — this codebase cannot enforce it from inside either backend process.
- **CI:** `.github/workflows/ci.yml` runs the full `analysis_service` pytest suite against a real `mongo:6.0` service container (database name ends in `_test`), and runs `npm test` (vitest) + `tsc -b` + `vite build` for the frontend.

## Test/verification state as of R6

- `analysis_service`: 125 tests passing (76 unit, 49 integration), 0 failing, 0 xfailed. Verified with a real `mongosh`-reachable local MongoDB.
- `frontend`: `tsc --noEmit` 0 errors; `npm run build` (VITE_USE_DEMO=true) succeeds; `npm test` (vitest) 7 tests passing across 3 files.
- `backend`: `tsc --noEmit` 0 errors (only additive model changes).
- A real two-process HTTP walkthrough (uvicorn + vite, real cookies, real Origin header) was run once during Phase R5 and reproduced the fixture's independently-computed expected values exactly.

## Known, still-open blockers (not fixable from inside this repository)

- The MongoDB Atlas credential embedded in `backend/check.js`/`check_subj.js` must be rotated by the operator (see `backend/SECRETS_WARNING.md`); confirmed via `git log` that neither file was ever committed.
- Legacy `/api/v1/*` public exposure via Vercel must be closed at the deployment/proxy layer; this repository's code changes cannot enforce that themselves.
- No concurrency/load target has been specified by the institution or measured (see `HANDOFF.md`'s staging rehearsal metrics and their caveats).
- The 225-practice-question (or whatever the real paper needs) content-authoring task is unrelated to code and not something this remediation produces.
