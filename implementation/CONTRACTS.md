# Shared Contracts

**Authoritative source: `CogniTest_REMEDIATION_PROMPTS.md`, Section 1.**
This file is a short pointer, not a duplicate — read Section 1 there for
the full field-by-field definitions. This file exists only so a phase
report can say "see CONTRACTS.md" without re-pasting the whole spec.

## Files that must stay in sync, field-for-field

Three files describe the same data at three layers. A field added, renamed,
or removed on one side without the matching change on the other two is a
contract break, even if it compiles:

1. `analysis_service/app/schemas/reports.py` — the domain/stored shapes
   (`MetricBucket`, `Breakdown`, `QuestionResult`, `Insight`,
   `RevisionItem`, `StudentSnapshot`, `CohortCategoryStat`,
   `CohortAggregates`). This is what `app/domain/*` functions return and
   what gets written to `evaluationreports.analysisDemo.snapshot` /
   `.batchSnapshot`.
2. `analysis_service/app/api/schemas/reports.py` — the HTTP response DTOs
   (`ReportSummaryDTO`, `ComparisonRow`, `Comparisons`, `ReflectionItemDTO`,
   `TestInfoDTO`, `ReportDetailDTO`, `PracticeQuestionDTO`,
   `ReflectionUpdateDTO`). These reshape the stored data for one endpoint
   each — never return a stored/domain model directly from a route.
3. `frontend/src/types/demoAnalysis.ts` — the TypeScript mirror of both of
   the above (`export interface`, not `export class`; no `any`).

`analysis_service/app/schemas/auth.py::StudentMeDTO` and
`frontend/src/types/demoAnalysis.ts::StudentMeDTO` are the fourth and fifth
corners of this same rule for `/auth/me`.

## Input contracts

`analysis_service/app/schemas/inputs.py` defines every prepared-bundle file
shape (`ManifestSchema`, `QuestionSchema` / `PracticeQuestionSchema` via the
shared `QuestionContentBase`, `AnswerKeySchema`, `AnswerSchema` /
`StudentResponseSchema`, `RosterEntrySchema`, `RecommendationSchema`).
Within-file rules live as Pydantic validators there; cross-file rules
(counts matching the manifest, every response enrollment number existing in
the roster, etc.) live in `app/services/bundle.py` (Phase R3).

## Known, deliberate deviation from the remediation prompt (recorded here per its own master-prompt rule: "state the conflict")

`CogniTest_REMEDIATION_PROMPTS.md` Section 1.1 describes
`PracticeQuestionSchema` as "same fields as `QuestionSchema` plus
`sourceKey`". Implemented literally, that would include `questionNo`, which
practice questions never have (they are identified by `sourceKey` alone;
see `CogniTest_DEMO_IMPLEMENTATION_BLUEPRINT.md` Section 6.5's
`recommendations.json` example). Phase R1 introduced a shared
`QuestionContentBase` in `app/schemas/inputs.py` holding every field both
schemas actually share, with `QuestionSchema` adding `questionNo` and
`PracticeQuestionSchema` adding `sourceKey` + the answer fields. This is a
correction, not a new liberty — the field set matches Section 1.1's
paragraph prose everywhere except the one field that paragraph got wrong.

## Fixture

`analysis_service/tests/fixtures/synthetic_fixture.py` is the canonical
fixture bundle. Its `EXPECTED` dict is the single source of truth for every
expected number; see `implementation/FIXTURE_EXPECTATIONS.md` for the
human-readable version and how those numbers were independently verified.
