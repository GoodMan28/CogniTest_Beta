# CogniTest — Newton Tutorials tenant + PINNACLE-27/28 ingestion

Status snapshot. See `test_credentials.md` for logins/IDs (gitignored).

## Done and verified (live, against the real Atlas DB)

- **Renderer**: `LatexText.tsx` (regex-heuristic LaTeX mangler) deleted, replaced
  with `MarkdownText.tsx` (react-markdown + remark-math + rehype-katex). All 18+
  call sites migrated. 6 regression tests in
  `frontend/src/components/__tests__/MarkdownText.test.tsx`.
- **Mathematics wiring**: `MathematicsQuestion` model, `ALL_QUESTION_MODELS` /
  `findQuestionByIdAnySubject` helpers, `mathsTaxonomy`, fixed 3→4 collection
  lookups in `questionController`, `evaluationController`, `reportRoutes.ts`.
  Also fixed a real pre-existing bug: `getQuestionStats`'s chapter aggregation
  wasn't casting `instituteId` to ObjectId for `.aggregate()` (Mongoose only
  auto-casts for `.find()`/`.countDocuments()`), so chapter breakdowns were
  silently empty for every subject, not just Mathematics.
- **Auth**: JWT_SECRET fallback literal removed (fails fast now); a real secret
  was generated and added to `.env` (there wasn't one before).
- **Tenant**: "Newton Tutorial Private Limited" institute + admin seeded via
  `backend/src/scripts/seed_newton.ts` (idempotent — re-run confirmed no dupes).
- **Ingestion**: `backend/src/scripts/ingest_markdown_paper.ts` — deterministic
  regex parser, dry-run mode with validation assertions, `--retag` mode. Both
  papers ingested: 150 question docs (50 Physics / 50 Chemistry / 50 Math —
  Physics is intentionally duplicated per-test since both papers share an
  identical Physics section), full unit/chapter/topic tagging from the user's
  taxonomy. Re-run confirmed idempotent (delete-then-reinsert).
- **Template + Tests**: one shared Template (75Q/300M, negativeMarking:1),
  two Tests ("PINNACLE-27 Periodic Test", "PINNACLE-28 Periodic Test") both
  linked via `templateId`, batches `Pinnacle-27`/`Pinnacle-28` respectively.
- **Batch scoping**: `testController.getTests`/`getTestById` filter by the
  caller's batch; legacy tests with no `batches` field remain visible to
  everyone (confirmed no regression for 2 pre-existing tenants' tests).
  Verified end-to-end: a Pinnacle-27 student's test list only shows PINNACLE-27;
  forcing the PINNACLE-28 testId returns 403.
- **IDOR fixes**: `reportRoutes.ts` — `/student/:studentId`,
  `/download/:studentId/:testId`, `/:reportId/review` now require auth and
  force the studentId from the JWT (student role) or verify institute
  ownership (admin role). Added missing institute-ownership checks to 3
  admin-only routes that had none.
- **Evaluation**: `evaluateJsonBatch` (hardcoded Windows path + hardcoded
  batch) replaced with `POST /api/v1/evaluation/evaluate-sheet` (admin-only,
  numerical tolerance ±0.01, idempotent per student+test, batch from
  `test.batches[0]`). Verified: all-correct sheet → 300; a mixed sheet with
  wrong/unanswered/numerical-near-miss → hand-verified score of 250.
- **Student signup**: now accepts `instituteId` in the body (was silently
  defaulting to `ADMIN_INSTITUTE_ID` env var / first institute in DB — a real
  cross-tenant bug), validates `batch` against `institute.batches`. Added
  `GET /api/v1/institute/public` (unauthenticated) so the signup batch
  dropdown is populated dynamically instead of 3 hardcoded values.
- **Full-pipeline check**: fetched the deep per-report analysis
  (`getReportAnalysis`) and cohort analytics (`/test/:testId/analytics`) for
  a real mixed-sheet report — chapter/topic breakdowns for Physics, Chemistry
  and Mathematics all matched hand-calculated numbers exactly. This endpoint
  didn't need changes — it derives subjects dynamically already.

## Known gaps / not done

- No browser-based visual check of the admin/student UI (no browser
  automation tool available in this environment) — only `tsc`/`vitest`/build
  and API-level (curl) verification were possible.
- 4 one-off scripts (`embed_and_push.ts`, `migrate_hierarchy.ts`,
  `seed_from_files.ts`, `seed.ts`) still hardcode Physics/Chemistry/Biology
  only — not on any live request path, so left alone; would need updating if
  ever re-run for Mathematics data.
- `uploadBatchOMR`'s call to `http://localhost:8000/process-omr` (dead ML
  service) untouched, per the handoff's explicit instruction to leave it.
- No automated backend test suite exists (no jest/vitest wired for
  `backend/`) — verification there was manual (curl against the live DB).
- Test data left in the DB: 3 "TEST"-tagged students with real reports (see
  `test_credentials.md`) — useful as fixtures, but delete if unwanted.

## Key IDs
- Newton Tutorial Private Limited: `6aa70c122d7b8807b8d82e35`
- Shared Template ("JEE Main Full Length — Periodic Test"): `6aa70df0efce59792715a92b`
