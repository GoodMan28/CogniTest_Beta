# Fixture Expectations

These values were computed independently (a standalone Python script, not
the application code — see the R1 phase report in `PHASE_STATUS.md` for the
verification transcript) from the synthetic fixture in
`analysis_service/tests/fixtures/synthetic_fixture.py`, and are transcribed
verbatim into `synthetic_fixture.py`'s `EXPECTED` dict so domain tests (R2)
and ingestion tests (R3/R4) assert against one source of truth.

This document mirrors `CogniTest_REMEDIATION_PROMPTS.md` Section 1.6. If the
two ever disagree, re-derive from scratch — do not assume either is right.

## Fixture shape

- 4 original questions: Q1 Physics/MCQ/easy/"1D Motion", Q2
  Mathematics/numerical/medium/"Linear", Q3 Chemistry/MCQ/hard/"Heat", Q4
  Mathematics/numerical/hard/"Power rule".
- Marking: +4 correct / −1 incorrect for both question types.
- Roster: A, B, C in batch `Alpha`; D in batch `Beta`. A and C share the
  display name "Rahul Sharma" (different `enrollmentNo`) to prove identity
  is never resolved by name.
- Answer key: Q1=B, Q2=0, Q3=A, Q4=−2.
- 12 practice questions, 3 per original question: `p1..p3` (Physics, Q1),
  `m1..m3` (Mathematics, Q2), `c1..c3` (Chemistry, Q3), `m4..m6`
  (Mathematics, Q4).

## Per-student totals

| Student | Batch | Q1 | Q2 | Q3 | Q4 | Total |
|---|---|---|---|---|---|---|
| A | Alpha | B (correct) | 0 (correct) | skipped | −2 (correct) | **12** |
| B | Alpha | B (correct) | skipped | A (correct) | −2 (correct) | **12** |
| C | Alpha | D (incorrect) | 0 (correct) | B (incorrect) | skipped | **2** |
| D | Beta | B (correct) | 0 (correct) | A (correct) | −2 (correct) | **16** |

Maximum possible score: `16.00`.

## Student A

**Summary:** questionCount 4, correct 3, incorrect 0, skipped 1, attempted
3, score `12.00`, maximumMarks `16.00`, accuracyPct `100.00`, coveragePct
`75.00`.

**Subject buckets:**

| subject | score | max | accuracyPct | coveragePct |
|---|---|---|---|---|
| Physics | 4.00 | 4.00 | 100.00 | 100.00 |
| Mathematics | 8.00 | 8.00 | 100.00 | 100.00 |
| Chemistry | 0.00 | 4.00 | null | 0.00 |

**Difficulty buckets:**

| difficulty | score | max | accuracyPct | coveragePct |
|---|---|---|---|---|
| easy | 4.00 | 4.00 | 100.00 | 100.00 |
| medium | 4.00 | 4.00 | 100.00 | 100.00 |
| hard | 4.00 | 8.00 | 100.00 | 50.00 |

**Question-type buckets:**

| type | score | max | accuracyPct | coveragePct |
|---|---|---|---|---|
| multiple_choice | 4.00 | 8.00 | 100.00 | 50.00 |
| numerical | 8.00 | 8.00 | 100.00 | 100.00 |

## Student C

**Summary:** correct 1, incorrect 2, skipped 1, score `2.00`, accuracyPct
`33.33`, coveragePct `75.00`.

**Per-question marks lost** (maximumMarks − awardedMarks): Q1 Physics/"1D
Motion" incorrect, lost `5.00`; Q2 Mathematics/"Linear" correct, lost
`0.00`; Q3 Chemistry/"Heat" incorrect, lost `5.00`; Q4 Mathematics/"Power
rule" skipped, lost `4.00`.

**Revision list** (topics with `marksLost == 0.00` excluded; ties on
marksLost sort by subject name then topic name):

| rank | subject | topic | marksLost | reason | questionNos |
|---|---|---|---|---|---|
| 1 | Chemistry | Heat | 5.00 | inaccurate | [3] |
| 2 | Physics | 1D Motion | 5.00 | inaccurate | [1] |
| 3 | Mathematics | Power rule | 4.00 | skipped | [4] |

(Mathematics/"Linear" does not appear — its marksLost is `0.00`.)

## Cohort Alpha (A, B, C)

cohortSize 3, available `true`, topperCount 2 (A and B tied at 12), topperLabel
`"Joint toppers' average"`.

| scope | key | classAverage | topperScore |
|---|---|---|---|
| overall | overall | 8.67 | 12.00 |
| subject | Physics | 2.33 | 4.00 |
| subject | Chemistry | 1.00 | 2.00 |
| subject | Mathematics | 5.33 | 6.00 |
| difficulty | easy | 2.33 | 4.00 |
| difficulty | medium | 2.67 | 2.00 |
| difficulty | hard | 3.67 | 6.00 |
| questionType | multiple_choice | 3.33 | 6.00 |
| questionType | numerical | 5.33 | 6.00 |

(26/3 → 8.67, 7/3 → 2.33, 8/3 → 2.67, 11/3 → 3.67, 10/3 → 3.33, 16/3 → 5.33 —
all `ROUND_HALF_UP` to two places.)

## Cohort Beta (D only)

cohortSize 1, available `false`, unavailableReason `"Comparison unavailable:
only one evaluated student."`, categories `[]`.

## After the R6 answer-key correction (Q1: `B` → `D`)

New totals: A = 7, B = 7, C = 7, D = 11. Alpha cohort `overall`:
classAverage `7.00`, topperScore `7.00`, topperCount 3 (all of A/B/C now
tied), topperLabel `"Joint toppers' average"`.

## Insights

Every topic in this fixture has exactly one question, so every insight in
this fixture is `Limited evidence` regardless of correctness — this is by
design, to keep the primary fixture's numbers simple. A second, DB-free
fixture (`analysis_service/tests/fixtures/insight_fixture.py`, added in
Phase R2) has a topic with ≥ 3 attempts specifically to exercise the
`Strength` / `Developing` / `Needs improvement` labels.

## Verification method (R1)

These numbers were computed by an independent standalone script (grading
each student/question pair by hand from the answer key and marking scheme,
then computing subject/difficulty/questionType partitions and cohort
statistics with plain `Decimal` arithmetic) — not by importing or calling
any `app.domain.*` code. The full script and its output are recorded in the
R1 entry of `implementation/PHASE_STATUS.md`. Every value there matches
this document exactly.
