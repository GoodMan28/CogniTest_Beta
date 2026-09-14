# CogniTest — Integrate the real AI-generated practice questions into the Pinnacle-27 / Pinnacle-28 reports

You are implementing this in the repository `CogniTest_Beta_Python` (Windows, Git Bash or PowerShell).
Follow every step in order. Do not skip a verification step. Do not "improve" anything that is not listed.
Every code block below has already been executed and verified against this repository — copy it exactly.

---

## 0. Background you need (read once, do not modify anything here)

### 0.1 What exists today

* Two tests are prepared/published through the **analysis service** (`analysis_service/`, Python + FastAPI + MongoDB):
  `pinnacle-27` and `pinnacle-28`. Each is described by a 6-file bundle in
  `analysis_service/private_data/<test-key>/` — `manifest.json`, `questions.json`, `answer_key.json`,
  `students.json`, `responses.json`, `recommendations.json`.
* The bundles are produced by `analysis_service/scripts/generate_pinnacle27_bundle.py` and
  `analysis_service/scripts/generate_pinnacle28_bundle.py`. Their `build_recommendations()` function currently
  **fabricates placeholder practice questions** (`"[Practice 1] This question reinforces the concept tested in Question 51 ... Consult your instructor"`, options `"Option A (Practice 1 — Q51)"`, always `correctOption: "A"`). That is the thing you are replacing.
* Both papers have 75 questions: Q1–25 Physics, Q26–50 Chemistry, Q51–75 Mathematics. The Physics section is
  **identical** in both papers, so the same generated Physics file is used for both tests.
* The bundle → database pipeline is `python -m app.cli validate | prepare | verify | publish` (see
  `implementation/RUNBOOK.md`). `prepare` upserts each practice question into the per-subject question
  collections keyed by `analysisDemo.sourceKey = "<testKey>:practice:<sourceKey>"` and links them from
  `Test.questions[].recommendations[]` (`app/repositories/questions.py: upsert_practice_questions`,
  `app/services/preparation.py`). Because we keep the **same sourceKey scheme (`p{qno}-{1..3}`)**, re-running
  `prepare` overwrites the placeholders in place instead of creating new documents.
* The student report page (`frontend/src/pages/DemoReportDetail.tsx`) fetches practice questions with
  `GET /api/v2/demo/reports/{reportId}/questions/{questionNo}/practice` (`app/api/routers/reports.py` →
  `app/services/reports.py: get_practice_questions` → `PracticeQuestionDTO` in `app/api/schemas/reports.py`).
  Two components render them: `frontend/src/components/demo/PracticePanel.tsx` (inside "Question-by-Question
  Breakdown") and `frontend/src/components/demo/FixItZone.tsx` (the "Fix It Zone"). **Both currently print the
  question text, options and solution as plain strings**, so LaTeX like `$\lim _{x \rightarrow 2} ...$` would show
  up raw. The rest of the app renders LaTeX with `frontend/src/components/MarkdownText.tsx` (react-markdown +
  remark-math + rehype-katex) — see `QuestionReview.tsx` for the pattern (options labelled `A.`/`B.`/... with
  `String.fromCharCode(65 + idx)`).
* The admin page `frontend/src/pages/Reports.tsx` already renders practice questions with `MarkdownText` and
  letter labels, reading the same `Test.questions[].recommendations` links through the Node backend
  (`backend/src/controllers/reportAnalysisController.ts: getPracticeQuestions`). It needs **no change**.

### 0.2 The bundle schema you must satisfy (`analysis_service/app/schemas/inputs.py`)

`recommendations.json` is a list of `{ "originalQuestionNo": int, "recommendations": [PracticeQuestion x3] }`.
Each practice question (`PracticeQuestionSchema`) has **exactly** these fields and no others (`extra="forbid"`):

| field | rule |
|---|---|
| `sourceKey` | string, unique across the whole file, must not equal the parent's questionNo as a string. Use `p{qno}-{i}`. |
| `subject` | `"Physics" \| "Chemistry" \| "Mathematics"` (also Biology) |
| `unit` | non-empty string |
| `chapter`, `topic` | non-empty lists of unique strings |
| `questionType` | `"multiple_choice" \| "numerical"` |
| `difficulty` | `"easy" \| "medium" \| "hard"` |
| `questionIntent`, `questionText`, `solutionText` | non-empty strings |
| `options` | MCQ: list of ≥2 strings. Numerical: must be absent/empty. |
| `correctOption` | MCQ only: **a single letter** `A`.. that indexes into `options`. |
| `numericalAnswer` | Numerical only. **Today: `Optional[int]`** — this is the one schema change you make (Phase 2). |
| `imageUrl`, `diagramSvg`, `smilesNotation`, `optionsMedia`, `distractorExplanations` | optional |

Cross-file rules (`app/services/bundle.py`): exactly one entry per original question (1..75), exactly
`manifest.recommendationsPerQuestion` (= 3) practice questions each.

### 0.3 The five source files (already on disk)

They were saved from a Gmail preview, so every file has **junk text before the JSON array** (lines like
`Skip to content`, `Using BIT Webmail Mail with screen readers`, `Last account activity: ...`) and a **junk
trailer after it** (`PINNACLE_27_Maths_Q51-75_Generated_Questions.json` / `Displaying ....json.`). The JSON
array is exactly the text from the first `[` to the last `]`.

| file (in `C:\Users\Abhineet Anand\Downloads\`) | covers | shape | `sourceQuestionNumber` looks like |
|---|---|---|---|
| `Pinnacle-2728 physics.txt` | Q1–25, **both tests** | grouped | `"Physics Q1"` |
| `Pinnacle-27 chem.txt` | Q26–50 of pinnacle-27 | grouped | `"Chemistry Q26"` |
| `Pinnacle 27 maths.txt` | Q51–75 of pinnacle-27 | grouped | `"51"` |
| `Pinnacle-28 chem.txt` | Q26–50 of pinnacle-28 | **flat** | `"26"` |
| `Pinnacle-28 maths.txt` | Q51–75 of pinnacle-28 | grouped | `"Q51"` |

* "grouped" = `[{ "sourceQuestionNumber", "sourceSubject", "sourceQuestionText", "generatedQuestions": [3 items] }, ...]`
* "flat" = `[ {question fields..., "sourceQuestionNumber", "sourceQuestionText"}, ... ]` (75 items, 3 per source question, in order)
* Every generated item has: `subject, unit, chapter[], topic[], questionType, difficulty, questionIntent,
  questionText, options[], correctOption (FULL OPTION TEXT, not a letter), numericalAnswer, solutionText,
  isEmbedded, imageUrl, diagramSvg, smilesNotation, optionsMedia` and sometimes `sourceQuestionNumber` /
  `sourceQuestionText`. All media fields are `null`, `isEmbedded` is `false`.

### 0.4 Data defects that were found (your code must handle every one of these — it does, if you copy Phase 1 exactly)

1. **Gmail wrapper text** around the JSON (all 5 files).
2. **`correctOption` is the option's text, not a letter.** It matches one option exactly in all 375 items; convert to `A`/`B`/`C`/`D` by index.
3. **Non-integer `numericalAnswer`** in 5 items (`Physics Q23` medium `6.93`, `Physics Q23` hard `8.33`, `Physics Q25` hard `5.25` — these three affect both tests — plus pinnacle-27 `Chemistry Q49` hard `2.83` and `Maths Q71` medium `10.5`). The schema rejects them today (`Input should be a valid integer, got a number with a fractional part`). Fix = Phase 2. Also integer-valued floats like `5.0`, `-4.0` exist → normalise to `int`.
4. **Negative numerical answers** (`-4`, `-24`, `-3`) — allowed, no action.
5. **Broken JSON escape**: pinnacle-27 Maths Q62 options contain `"$x\to0$"` with a single backslash, so `json.loads` produces a **TAB character + `o`**. Must be restored to `\to`.
6. **Broken LaTeX**: pinnacle-27 Maths Q56 easy solution contains `\frac{f(n)}{}` (empty denominator).
7. **Sentences that only make sense next to sibling/source question** in `solutionText`, e.g. `"As before, ..."`, `"As above, ..."`, `"From the original identity ..."`, `"By the general computation, ..."` (11 in pinnacle-27 maths, 6 in pinnacle-28 maths) and one rambling sentence (`"... grows moderately... more precisely ..."`). Fixed by an explicit patch table.
8. **Taxonomy tags in the generated files disagree with the paper** for ~72 items (e.g. paper Q53 is tagged `Evaluation of Limits (L'Hopital)`, generated ones say `Limits using Expansions`), and 4 items use a topic `Quantum Mechanics` that does not exist in `data/pinnacle/taxonomy.json`. Decision: **practice questions always inherit `subject/unit/chapter/topic` from the parent paper question** (`questions.json`). Never copy taxonomy from the generated file.
9. **Difficulty order is inconsistent** (pinnacle-28 chemistry has 11 questions whose 3 items are all `easy`; physics has 3 with `medium, medium, hard`). Decision: sort the 3 items `easy → medium → hard` (stable) and assign `p{qno}-1..3` after sorting. Do not invent difficulties.
10. Extra fields (`isEmbedded`, `sourceQuestionNumber`, `sourceQuestionText`, null media) must be **dropped** (`extra="forbid"`).

### 0.5 Things you must NOT do

* Do not edit `questions.json`, `answer_key.json`, `students.json`, `responses.json`, `manifest.json` content (Phase 5 checks they are byte-identical after regeneration, except `responses.json` path handling in 3.2 which must still produce identical output).
* Do not change `AnswerKeySchema` (the real paper's numerical answers stay `int`).
* Do not touch `backend/` (Node) — nothing there needs to change (`Question.numericalAnswer` is already `Number`).
* Do not modify `MarkdownText.tsx`.
* Do not commit `analysis_service/private_data/**`, `data/pinnacle/generated/**` if `.gitignore` already excludes them (check with `git check-ignore -v <path>`); if they are not ignored, do not add them to a commit either — they are private student/content data.
* Do not touch `analysis_service/scripts/generate_pinnacle27_report.py` / `generate_pinnacle28_report.py` (report generators, unrelated).

---

## Phase 0 — Put the source files into the repo (no code yet)

1. Create the directory `data/pinnacle/generated/`.
2. Copy the five files with these exact names (keep them as-is, wrapper text included — the loader strips it):

```
data/pinnacle/generated/physics_q1-25_generated.json           <- "C:\Users\Abhineet Anand\Downloads\Pinnacle-2728 physics.txt"
data/pinnacle/generated/pinnacle27_chemistry_q26-50_generated.json <- "C:\Users\Abhineet Anand\Downloads\Pinnacle-27 chem.txt"
data/pinnacle/generated/pinnacle27_maths_q51-75_generated.json     <- "C:\Users\Abhineet Anand\Downloads\Pinnacle 27 maths.txt"
data/pinnacle/generated/pinnacle28_chemistry_q26-50_generated.json <- "C:\Users\Abhineet Anand\Downloads\Pinnacle-28 chem.txt"
data/pinnacle/generated/pinnacle28_maths_q51-75_generated.json     <- "C:\Users\Abhineet Anand\Downloads\Pinnacle-28 maths.txt"
```

3. Also fix the pinnacle-28 responses input, which today is read from a hard-coded path outside the repo:
   copy `C:\Users\Abhineet Anand\.gemini\antigravity-ide\brain\f8a0157b-f356-4ee6-8ec3-c2e6512208cc\scratch\pinnacle28_data.json`
   to `data/pinnacle/pinnacle_28_batch_responses.json`.

4. Back up the current bundles so Phase 5 can diff against them:

```powershell
Copy-Item -Recurse analysis_service\private_data\pinnacle-27 analysis_service\private_data\pinnacle-27.before
Copy-Item -Recurse analysis_service\private_data\pinnacle-28 analysis_service\private_data\pinnacle-28.before
```

Acceptance: `python -c "import json;print(len(json.load(open('data/pinnacle/pinnacle_28_batch_responses.json',encoding='utf-8'))))"` prints the number of students (it is a dict keyed by student name).

---

## Phase 1 — Shared loader module

Create `analysis_service/scripts/generated_recommendations.py` with **exactly** this content:

```python
#!/usr/bin/env python3
"""
generated_recommendations.py

Shared loader that turns the AI-generated practice-question files in
data/pinnacle/generated/ into the `recommendations.json` entries the
analysis-service bundle expects (app/schemas/inputs.py: RecommendationSchema
/ PracticeQuestionSchema).

Used by generate_pinnacle27_bundle.py and generate_pinnacle28_bundle.py.
"""
import json
import re
from typing import Any, Dict, List, Tuple

# ── 1. Reading the raw files ────────────────────────────────────────────────

def strip_email_wrapper(text: str) -> str:
    """The files were saved from a Gmail preview: header lines before the
    JSON array and a 'Displaying <name>.json.' trailer after it. The JSON
    array is everything from the first '[' to the last ']' inclusive."""
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1 or end < start:
        raise ValueError("No JSON array found in generated file")
    return text[start : end + 1]


def _question_no(source_question_number: str) -> int:
    """'51' -> 51, 'Q51' -> 51, 'Physics Q1' -> 1, 'Chemistry Q26' -> 26."""
    digits = re.sub(r"\D", "", str(source_question_number))
    if not digits:
        raise ValueError(f"Cannot parse question number from {source_question_number!r}")
    return int(digits)


def load_generated_file(path: str) -> List[Tuple[int, Dict[str, Any]]]:
    """Returns [(originalQuestionNo, rawGeneratedQuestion), ...] in file order.

    Handles both shapes that exist:
      grouped: [{"sourceQuestionNumber": "51", "generatedQuestions": [{...},{...},{...}]}, ...]
      flat:    [{"sourceQuestionNumber": "26", ...question fields...}, ...]
    """
    with open(path, "r", encoding="utf-8") as fh:
        data = json.loads(strip_email_wrapper(fh.read()))
    if not isinstance(data, list) or not data:
        raise ValueError(f"{path}: expected a non-empty JSON array")

    out: List[Tuple[int, Dict[str, Any]]] = []
    if "generatedQuestions" in data[0]:
        for group in data:
            no = _question_no(group["sourceQuestionNumber"])
            for raw in group["generatedQuestions"]:
                out.append((no, raw))
    else:
        for raw in data:
            out.append((_question_no(raw["sourceQuestionNumber"]), raw))
    return out


# ── 2. Text cleanup ─────────────────────────────────────────────────────────

# Exact substring patches for sentences that only make sense next to the
# source question ("As before, ...", "From the original identity ...") or
# that contain broken LaTeX. Keyed by test key; each tuple is
# (originalQuestionNo, difficulty, field, old, new).
# Strings are Python raw strings: a single backslash here is a single
# backslash in the loaded JSON value. Each `old` must occur exactly once in
# the field value, otherwise apply_patches() raises (so a silently-missed
# patch cannot happen).
TEXT_PATCHES: Dict[str, List[Tuple[int, str, str, str, str]]] = {
    "pinnacle-27": [
        (56, "easy", "solutionText",
         r"\left(1+\frac{f(n)}{}\right)^n\to e^{\lim n\cdot f(n)}",
         r"\left(1+f(n)\right)^n\to e^{\lim n\cdot f(n)}"),
        (56, "hard", "solutionText", "As before, the limiting exponent is", "The limiting exponent is"),
        (57, "hard", "solutionText", r"By the general computation, $\lim", r"We have $\lim"),
        (61, "medium", "solutionText", "As above, using", "Using"),
        (64, "hard", "solutionText",
         r"since $\ln\sin x\to-\infty$ faster than $\frac1x\to\infty$ grows moderately... more precisely $\frac{1}{x}\ln\sin x\to-\infty$, so this term $\to0$.",
         r"since $\ln\sin x\to-\infty$ while $\frac{1}{x}\to+\infty$, so $\frac{1}{x}\ln\sin x\to-\infty$ and this term $\to0$."),
        (66, "medium", "solutionText", r"As before, $\ln", r"$\ln"),
        (71, "medium", "solutionText", "As in the general pattern, each factor", "Each factor"),
        (72, "medium", "solutionText", "As in the general argument, $a+b", "Using the sum and product of roots, $a+b"),
        (72, "hard", "solutionText", "As before, using the product-of-roots relation", "Using the product-of-roots relation"),
        (74, "medium", "solutionText", "As above, the limit equals", "By L'Hopital's rule, the limit equals"),
        (74, "hard", "solutionText", "As above, the limit equals", "By L'Hopital's rule, the limit equals"),
    ],
    "pinnacle-28": [
        (51, "medium", "solutionText", "As before, $x=a^3-3ab^2$", "Cubing $a+ib$ gives $x=a^3-3ab^2$"),
        (54, "hard", "solutionText", "As shown before, $z=i$.",
         r"Multiplying numerator and denominator by $(1+i)$ gives $z=\dfrac{(1+i)^2}{2}=i$."),
        (58, "hard", "solutionText",
         r"From the original identity, $|1-\cos\theta+i\sin\theta|=2|\sin(\theta/2)|$.",
         r"Since $(1-\cos\theta)^2+\sin^2\theta=2-2\cos\theta=4\sin^2(\theta/2)$, we have $|1-\cos\theta+i\sin\theta|=2|\sin(\theta/2)|$."),
        (60, "medium", "solutionText", "(as in the original identity)",
         r"(from rationalising with the conjugate: $\mathrm{Re}=\dfrac{1-\cos\theta}{2-2\cos\theta}=\dfrac12$)"),
        (66, "hard", "solutionText", r"From the original identity $\dfrac{1-i}{1+i}=-i$, which has argument",
         r"We have $\dfrac{1-i}{1+i}=-i$, which has argument"),
        (67, "hard", "solutionText", r"From the original identity, $\dfrac{1+i\sqrt3}{\sqrt3+i}$ has amplitude",
         r"Since $\arg(1+i\sqrt3)=\dfrac{\pi}{3}$ and $\arg(\sqrt3+i)=\dfrac{\pi}{6}$, $\dfrac{1+i\sqrt3}{\sqrt3+i}$ has amplitude"),
    ],
}


def clean_text(value: str) -> str:
    """Generic, always-safe cleanup applied to every text field."""
    if value is None:
        return value
    # The generated JSON wrote "\to" with a single backslash inside a JSON
    # string, so json.loads turned it into a TAB character followed by "o".
    # Restore the LaTeX arrow. (No legitimate text contains a literal TAB.)
    value = value.replace("\t" + "o", "\\to")
    if "\t" in value:
        raise ValueError(f"Unexpected TAB character in text: {value!r}")
    return value.strip()


def apply_patches(test_key: str, no: int, difficulty: str, rec: Dict[str, Any]) -> None:
    for (pno, pdiff, field, old, new) in TEXT_PATCHES.get(test_key, []):
        if pno != no or pdiff != difficulty:
            continue
        count = rec[field].count(old)
        if count != 1:
            raise ValueError(
                f"{test_key} Q{no} {difficulty} {field}: patch text found {count} times "
                f"(expected exactly once): {old!r}"
            )
        rec[field] = rec[field].replace(old, new)


# ── 3. Building bundle entries ──────────────────────────────────────────────

DIFFICULTY_ORDER = {"easy": 0, "medium": 1, "hard": 2}


def _squash_ws(s: str) -> str:
    return re.sub(r"\s+", "", s)


def _letter_for_correct_option(raw: Dict[str, Any], no: int) -> str:
    options = raw.get("options") or []
    correct = raw.get("correctOption")
    if correct is None:
        raise ValueError(f"Q{no}: multiple_choice generated question has no correctOption")
    # Exact match first, then whitespace-insensitive match.
    matches = [i for i, o in enumerate(options) if o == correct]
    if not matches:
        matches = [i for i, o in enumerate(options) if _squash_ws(o) == _squash_ws(correct)]
    if len(matches) != 1:
        raise ValueError(
            f"Q{no}: correctOption {correct!r} matched {len(matches)} of options {options!r}"
        )
    return chr(65 + matches[0])


def _normalize_numerical(value: Any, no: int) -> Any:
    if isinstance(value, bool) or value is None:
        raise ValueError(f"Q{no}: numerical generated question has no numericalAnswer")
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, (int, float)):
        return value
    raise ValueError(f"Q{no}: numericalAnswer must be a number, got {value!r}")


def build_practice_question(
    test_key: str, no: int, index: int, raw: Dict[str, Any], parent: Dict[str, Any]
) -> Dict[str, Any]:
    """
    raw:    one generated question (as loaded from the file)
    parent: the original paper question from questions.json (same questionNo)
    index:  1-based position among the parent's practice questions (after sorting)
    """
    if raw["questionType"] != parent["questionType"]:
        raise ValueError(
            f"Q{no}: generated questionType {raw['questionType']!r} != paper "
            f"questionType {parent['questionType']!r}"
        )
    if raw["difficulty"] not in DIFFICULTY_ORDER:
        raise ValueError(f"Q{no}: bad difficulty {raw['difficulty']!r}")

    rec: Dict[str, Any] = {
        "sourceKey": f"p{no}-{index}",
        # Taxonomy always inherited from the parent paper question, never
        # from the generated file (the generated tags disagree with the
        # paper for ~70 items and use 1 topic that is not in taxonomy.json).
        "subject": parent["subject"],
        "unit": parent["unit"],
        "chapter": list(parent["chapter"]),
        "topic": list(parent["topic"]),
        "questionType": raw["questionType"],
        "difficulty": raw["difficulty"],
        "questionIntent": clean_text(raw["questionIntent"]),
        "questionText": clean_text(raw["questionText"]),
        "solutionText": clean_text(raw["solutionText"]),
    }
    if raw["questionType"] == "multiple_choice":
        rec["correctOption"] = _letter_for_correct_option(raw, no)
        rec["options"] = [clean_text(o) for o in raw["options"]]
    else:
        rec["numericalAnswer"] = _normalize_numerical(raw.get("numericalAnswer"), no)

    # Optional media: only pass through when actually present (all null today).
    for field in ("imageUrl", "diagramSvg", "smilesNotation", "optionsMedia"):
        if raw.get(field):
            rec[field] = raw[field]

    apply_patches(test_key, no, raw["difficulty"], rec)
    return rec


def build_recommendations(
    test_key: str, generated_paths: List[str], questions: List[Dict[str, Any]], per_question: int = 3
) -> List[Dict[str, Any]]:
    """
    generated_paths: the generated files covering the whole paper
                     (physics + chemistry + maths for one test).
    questions:       the bundle's questions.json entries (already built).
    Returns the full recommendations.json list, sorted by originalQuestionNo,
    each with exactly `per_question` practice questions ordered easy->medium->hard.
    """
    parents = {q["questionNo"]: q for q in questions}
    by_no: Dict[int, List[Dict[str, Any]]] = {}
    for path in generated_paths:
        for no, raw in load_generated_file(path):
            by_no.setdefault(no, []).append(raw)

    missing = sorted(set(parents) - set(by_no))
    extra = sorted(set(by_no) - set(parents))
    if missing or extra:
        raise ValueError(f"{test_key}: generated questions missing for {missing}, unknown qnos {extra}")

    result = []
    for no in sorted(parents):
        raws = by_no[no]
        if len(raws) != per_question:
            raise ValueError(f"{test_key} Q{no}: expected {per_question} generated questions, got {len(raws)}")
        raws = sorted(raws, key=lambda r: DIFFICULTY_ORDER.get(r["difficulty"], 99))  # stable sort
        recs = [
            build_practice_question(test_key, no, i, raw, parents[no])
            for i, raw in enumerate(raws, start=1)
        ]
        result.append({"originalQuestionNo": no, "recommendations": recs})
    return result
```

Acceptance for Phase 1 (run from repo root; must print `75 75` and no traceback):

```powershell
cd analysis_service
$env:PYTHONPATH = "."
venv\Scripts\python -c "import json,sys; sys.path.insert(0,'scripts'); from generated_recommendations import build_recommendations as b; q27=json.load(open('private_data/pinnacle-27/questions.json',encoding='utf-8')); q28=json.load(open('private_data/pinnacle-28/questions.json',encoding='utf-8')); G='../data/pinnacle/generated/'; r27=b('pinnacle-27',[G+'physics_q1-25_generated.json',G+'pinnacle27_chemistry_q26-50_generated.json',G+'pinnacle27_maths_q51-75_generated.json'],q27); r28=b('pinnacle-28',[G+'physics_q1-25_generated.json',G+'pinnacle28_chemistry_q26-50_generated.json',G+'pinnacle28_maths_q51-75_generated.json'],q28); print(len(r27),len(r28))"
cd ..
```

---

## Phase 2 — Allow decimal `numericalAnswer` on practice questions (analysis service)

### 2.1 Schema

File: `analysis_service/app/schemas/inputs.py`. In `class PracticeQuestionSchema(QuestionContentBase)`:

* change the field declaration
  `numericalAnswer: Optional[int] = None`
  to
  `numericalAnswer: Optional[Union[int, float]] = None`
* add `Union` to the existing `from typing import ...` line.
* keep the existing `_no_boolean_numerical_answer` (`mode="before"`) validator, and **add** this validator right after it (inside the class):

```python
    @field_validator("numericalAnswer", mode="after")
    @classmethod
    def _finite_and_int_when_whole(cls, v):
        # Practice questions are self-study, never graded, so a decimal
        # answer (e.g. 6.93 s) is legitimate here — unlike AnswerKeySchema,
        # which stays int-only for the real paper. Whole-number floats
        # (5.0) are stored as int so the DTO never shows "5.0".
        if v is None:
            return v
        if isinstance(v, float):
            if not math.isfinite(v):
                raise ValueError("numericalAnswer must be finite")
            if v.is_integer():
                return int(v)
        return v
```

`math` is already imported at the top of that file. Do **not** change `AnswerKeySchema`. Update the docstring
comment of `PracticeQuestionSchema` is not required.

### 2.2 DTO formatting

File: `analysis_service/app/services/reports.py`, function `get_practice_questions`. Replace

```python
        else:
            correct_answer = str(doc.get("numericalAnswer"))
```

with

```python
        else:
            value = doc.get("numericalAnswer")
            # Whole-number floats from older imports must not render as "5.0".
            if isinstance(value, float) and value.is_integer():
                value = int(value)
            correct_answer = str(value)
```

### 2.3 Tests

File: `analysis_service/tests/unit/test_schemas.py`. Add after `test_practice_question_has_no_question_no_field`:

```python
def _numerical_practice(**overrides):
    base = {
        "sourceKey": "p2-1", "subject": "Physics", "unit": "Mechanics",
        "chapter": ["Kinematics"], "topic": ["1D Motion"], "questionType": "numerical",
        "difficulty": "easy", "questionIntent": "x", "questionText": "x", "solutionText": "x",
    }
    base.update(overrides)
    return base

def test_practice_question_accepts_decimal_numerical_answer():
    # Practice answers are self-study (never graded) so 6.93 is legitimate.
    parsed = PracticeQuestionSchema(**_numerical_practice(numericalAnswer=6.93))
    assert parsed.numericalAnswer == 6.93

def test_practice_question_normalizes_whole_float_to_int():
    parsed = PracticeQuestionSchema(**_numerical_practice(numericalAnswer=5.0))
    assert parsed.numericalAnswer == 5 and isinstance(parsed.numericalAnswer, int)

def test_practice_question_rejects_non_finite_and_boolean_numerical_answer():
    with pytest.raises(ValidationError):
        PracticeQuestionSchema(**_numerical_practice(numericalAnswer=float("inf")))
    with pytest.raises(ValidationError):
        PracticeQuestionSchema(**_numerical_practice(numericalAnswer=True))

def test_answer_key_still_rejects_decimal_numerical_answer():
    # The real paper's key is unchanged: integers only.
    with pytest.raises(ValidationError):
        AnswerKeySchema(questionNo=2, numericalAnswer=6.93)
```

Acceptance: `cd analysis_service; $env:PYTHONPATH="."; venv\Scripts\python -m pytest tests/unit -q` → all pass
(baseline before your change is **76 passed**; after it must be **80 passed**). Then also run
`venv\Scripts\python -m pytest tests -q` (integration tests too) and confirm nothing that passed before fails now.

---

## Phase 3 — Make the two bundle scripts use the real questions

### 3.1 `analysis_service/scripts/generate_pinnacle27_bundle.py`

1. Near the top, after `SOURCE_DIR = ...`, add:

```python
GENERATED_DIR = os.path.join(REPO_ROOT, "data", "pinnacle", "generated")
GENERATED_FILES = [
    os.path.join(GENERATED_DIR, "physics_q1-25_generated.json"),          # Q1-25 (shared by both papers)
    os.path.join(GENERATED_DIR, "pinnacle27_chemistry_q26-50_generated.json"),
    os.path.join(GENERATED_DIR, "pinnacle27_maths_q51-75_generated.json"),
]
```

and after the `import sys` line add:

```python
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generated_recommendations import build_recommendations as build_generated_recommendations  # noqa: E402
```

2. **Delete the whole existing `build_recommendations(questions_raw, answer_key_raw, mcq_qnos)` function**
   (the one that builds `"[Practice {i}] This question reinforces ..."`) and the `PLACEHOLDER` strings it used
   are no longer needed for recommendations (keep `PLACEHOLDER_SOLUTION`; it is still used by `build_questions`).

3. In `main()`, replace

```python
    recommendations = build_recommendations(questions_raw, answer_key_raw, mcq_qnos)
```

with

```python
    recommendations = build_generated_recommendations(
        TEST_KEY, GENERATED_FILES, questions, per_question=RECS_PER_QUESTION
    )
```

(`questions` is the list returned by `build_questions(...)` a few lines above — it must be passed, not
`questions_raw`, because the parent taxonomy/difficulty come from the built bundle question.)

4. Update the module docstring line `- Placeholder practice questions generated (3 per original question)` to
   `- 3 real AI-generated practice questions per original question (data/pinnacle/generated/)`.

### 3.2 `analysis_service/scripts/generate_pinnacle28_bundle.py`

Same four edits as 3.1 but with the pinnacle-28 file names:

```python
GENERATED_FILES = [
    os.path.join(GENERATED_DIR, "physics_q1-25_generated.json"),
    os.path.join(GENERATED_DIR, "pinnacle28_chemistry_q26-50_generated.json"),
    os.path.join(GENERATED_DIR, "pinnacle28_maths_q51-75_generated.json"),
]
```

Additionally, in `load_all()` replace the hard-coded absolute path block

```python
    responses_file = r"C:\Users\Abhineet Anand\.gemini\antigravity-ide\brain\f8a0157b-f356-4ee6-8ec3-c2e6512208cc\scratch\pinnacle28_data.json"

    with open(responses_file, "r", encoding="utf-8") as f:
        responses_raw = json.load(f)
```

with

```python
    responses_raw    = load_json("pinnacle_28_batch_responses.json")
```

(the file was copied into `data/pinnacle/` in Phase 0.3).

### 3.3 Regenerate and prove only `recommendations.json` changed

```powershell
python analysis_service\scripts\generate_pinnacle27_bundle.py
python analysis_service\scripts\generate_pinnacle28_bundle.py
git diff --no-index --stat analysis_service\private_data\pinnacle-27.before analysis_service\private_data\pinnacle-27
git diff --no-index --stat analysis_service\private_data\pinnacle-28.before analysis_service\private_data\pinnacle-28
```

Acceptance: each `--stat` lists **only** `recommendations.json`. If `responses.json` for pinnacle-28 differs,
the file you copied in Phase 0.3 is not the one the old script used — stop and report.

### 3.4 Validate both bundles

```powershell
cd analysis_service
$env:PYTHONPATH = "."
venv\Scripts\python -m app.cli validate --dir private_data/pinnacle-27
venv\Scripts\python -m app.cli validate --dir private_data/pinnacle-28
cd ..
```

Acceptance: both print success, zero errors. Then spot-check the content:

```powershell
python -c "import json; r={e['originalQuestionNo']:e['recommendations'] for e in json.load(open('analysis_service/private_data/pinnacle-27/recommendations.json',encoding='utf-8'))}; print(r[62][0]['options'][2]); print(r[62][0]['correctOption']); print([x['numericalAnswer'] for x in r[71]]); print([x['difficulty'] for x in r[36]]); print(r[56][0]['solutionText'][:160])"
```

Expected output (exactly):

```
does not exist because $x\to0$
D
[5, 10.5, 39]
['easy', 'medium', 'hard']
Write the base as $1+\frac{(3-4)n+(2-7)}{n^2+4n+7}=1+\frac{-n-5}{n^2+4n+7}$. Then $\left(1+f(n)\right)^n\to e^{\lim n\cdot f(n)}$ where $\lim_{n\to\infty} n\cdo
```

and for pinnacle-28:

```powershell
python -c "import json; r={e['originalQuestionNo']:e['recommendations'] for e in json.load(open('analysis_service/private_data/pinnacle-28/recommendations.json',encoding='utf-8'))}; print([x['difficulty'] for x in r[27]]); print(r[54][2]['solutionText'][:90]); print([x['numericalAnswer'] for x in r[23]]); print(sum(1 for e in r.values() for x in e if 'As before' in x['solutionText'] or 'original identity' in x['solutionText']))"
```

Expected:

```
['easy', 'easy', 'easy']
Multiplying numerator and denominator by $(1+i)$ gives $z=\dfrac{(1+i)^2}{2}=i$. Since pow
[8, 6.93, 8.33]
0
```

---

## Phase 4 — Render practice questions properly in the student report (frontend)

### 4.1 New shared component

Create `frontend/src/components/demo/PracticeQuestionCard.tsx` with exactly this content:

```tsx
import { useState } from 'react';
import DOMPurify from 'dompurify';
import MarkdownText from '../MarkdownText';
import type { PracticeQuestionDTO } from '../../types/demoAnalysis';

const DIFFICULTY_STYLES: Record<PracticeQuestionDTO['difficulty'], string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-red-100 text-red-700',
};

/**
 * One self-study practice question (not scored). Shared by PracticePanel
 * (inside Question Review) and FixItZone so both render identically:
 * LaTeX via MarkdownText, options labelled A/B/C/D, difficulty badge, and a
 * reveal that highlights the correct option and shows the solution.
 */
const PracticeQuestionCard = ({ question }: { question: PracticeQuestionDTO }) => {
  const [revealed, setRevealed] = useState(false);
  const isMcq = question.questionType === 'multiple_choice' && question.options.length > 0;
  const correctIndex = isMcq ? question.correctAnswer.charCodeAt(0) - 65 : -1;
  const correctOptionText = correctIndex >= 0 ? question.options[correctIndex] : undefined;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${DIFFICULTY_STYLES[question.difficulty]}`}
        >
          {question.difficulty}
        </span>
        <span className="text-xs text-gray-400 uppercase tracking-wider">
          {question.questionType === 'numerical' ? 'Numerical' : 'MCQ'}
        </span>
      </div>

      <div className="text-sm text-gray-800 mb-3 leading-relaxed">
        <MarkdownText text={question.questionText} />
      </div>

      {question.media?.imageUrl && (
        <img src={question.media.imageUrl} alt="" className="mb-3 max-w-full rounded" />
      )}
      {question.media?.diagramSvg && (
        <div
          className="mb-3"
          // Sanitized server-side at import time AND again here on render.
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(question.media.diagramSvg, {
              USE_PROFILES: { svg: true, svgFilters: true },
            }),
          }}
        />
      )}

      {isMcq && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
          {question.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const highlight =
              revealed && idx === correctIndex
                ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                : 'border-gray-200 bg-white';
            return (
              <div key={idx} className={`p-2 border rounded-md flex items-start space-x-2 text-sm ${highlight}`}>
                <span className="font-medium text-gray-900">{letter}.</span>
                <span className="text-gray-700"><MarkdownText text={opt} /></span>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setRevealed(prev => !prev)}
        className="text-xs text-indigo-600 font-medium hover:text-indigo-800"
      >
        {revealed ? 'Hide Answer & Solution' : 'Check / Reveal Answer'}
      </button>

      {revealed && (
        <div className="mt-3 p-3 bg-white border border-indigo-100 rounded text-sm text-gray-700 space-y-2">
          <p>
            <span className="font-medium">Answer: </span>
            {isMcq ? (
              <>
                {question.correctAnswer}
                {correctOptionText !== undefined && (
                  <>
                    {' — '}
                    <MarkdownText text={correctOptionText} />
                  </>
                )}
              </>
            ) : (
              <MarkdownText text={question.correctAnswer} />
            )}
          </p>
          <p>
            <span className="font-medium">Solution: </span>
            <MarkdownText text={question.solutionText} />
          </p>
        </div>
      )}
    </div>
  );
};

export default PracticeQuestionCard;
```

### 4.2 Use it in `PracticePanel.tsx`

File: `frontend/src/components/demo/PracticePanel.tsx`.

* Add `import PracticeQuestionCard from './PracticeQuestionCard';`
* Remove `import DOMPurify from 'dompurify';` (no longer used here).
* Remove the `revealed` state and the `toggleReveal` function.
* Replace the whole `{questions.map((q, idx) => ( <div key={q.sourceKey} ...> ... </div> ))}` block (everything
  from `{questions.map(` to the matching `))}`) with:

```tsx
      {questions.map(q => (
        <PracticeQuestionCard key={q.sourceKey} question={q} />
      ))}
```

Everything else in the file (the "Load Practice Questions" button, loading text, empty-state text, the `<h4>`
heading) stays as it is.

### 4.3 Use it in `FixItZone.tsx`

File: `frontend/src/components/demo/FixItZone.tsx`.

* Add `import PracticeQuestionCard from './PracticeQuestionCard';`
* Remove `import DOMPurify from 'dompurify';`.
* Inside the inline practice panel, replace the whole `{practiceData.map((pq) => ( <div key={pq.sourceKey} ...> ... </div> ))}`
  block with:

```tsx
                  {practiceData.map(pq => (
                    <PracticeQuestionCard key={pq.sourceKey} question={pq} />
                  ))}
```

Keep the `<h5>Practice Questions — self-study, not scored</h5>` heading, the spinner, and the empty state.

### 4.4 Type comment

File: `frontend/src/types/demoAnalysis.ts`, interface `PracticeQuestionDTO`: change the comment on
`correctAnswer` to `// MCQ letter ("A".."D") or a number string, possibly decimal (e.g. "6.93") — self-study, not scored`.

### 4.5 Test

Create `frontend/src/components/demo/__tests__/PracticeQuestionCard.test.tsx` with exactly this content:

```tsx
import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import PracticeQuestionCard from '../PracticeQuestionCard';
import type { PracticeQuestionDTO } from '../../../types/demoAnalysis';

const mcq: PracticeQuestionDTO = {
  sourceKey: 'p62-1',
  subject: 'Mathematics',
  questionType: 'multiple_choice',
  difficulty: 'easy',
  questionText: '$\\lim _{x \\rightarrow 0} \\frac{\\sqrt{1-\\cos 2 x}}{x}$',
  options: [
    'exists and equals $+\\sqrt{2}$',
    'exists and equals $-\\sqrt{2}$',
    'does not exist because $x\\to0$',
    'does not exist because the left hand limit is not equal to the right hand limit',
  ],
  correctAnswer: 'D',
  solutionText: '$\\sqrt{1-\\cos2x}=\\sqrt{2}\\,|\\sin x|$, so the one-sided limits differ.',
};

const numerical: PracticeQuestionDTO = {
  sourceKey: 'p71-2',
  subject: 'Mathematics',
  questionType: 'numerical',
  difficulty: 'medium',
  questionText: 'The limit is ____.',
  options: [],
  correctAnswer: '10.5',
  solutionText: 'Each factor contributes $-\\frac{kx^2}{2}$.',
};

const visibleText = (container: HTMLElement) => {
  // KaTeX keeps the raw source in a hidden MathML annotation; strip it
  // before asserting nothing raw leaked into the visible output.
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.katex-mathml').forEach(el => el.remove());
  return clone.textContent || '';
};

describe('PracticeQuestionCard', () => {
  it('renders LaTeX in the question and options via KaTeX, with A/B/C/D labels', () => {
    const { container } = render(<PracticeQuestionCard question={mcq} />);
    expect(container.querySelectorAll('.katex').length).toBeGreaterThan(0);
    expect(container.querySelector('.katex-error')).toBeFalsy();
    const text = visibleText(container);
    expect(text).not.toContain('\\frac');
    expect(text).not.toContain('\\to');
    expect(text).toContain('A.');
    expect(text).toContain('D.');
    expect(text).toContain('easy');
  });

  it('hides the answer until revealed, then shows letter + option text + solution', () => {
    const { container, getByText } = render(<PracticeQuestionCard question={mcq} />);
    expect(visibleText(container)).not.toContain('Solution:');
    fireEvent.click(getByText('Check / Reveal Answer'));
    const text = visibleText(container);
    expect(text).toContain('Answer: D');
    expect(text).toContain('Solution:');
    expect(container.querySelector('.ring-green-500')).toBeTruthy();
  });

  it('shows a decimal numerical answer as-is', () => {
    const { container, getByText } = render(<PracticeQuestionCard question={numerical} />);
    fireEvent.click(getByText('Check / Reveal Answer'));
    expect(visibleText(container)).toContain('10.5');
  });
});
```

Acceptance (run in `frontend/`):

```powershell
npx vitest run          # baseline was 13 passed; must now be 16 passed, 0 failed
npx tsc -b --noEmit     # must exit 0 with no output
npm run lint            # must report no new errors
```

---

## Phase 5 — Rebuild and republish both tests (database)

This follows the correction policy in `implementation/RUNBOOK.md` §11. Reports and student reflections are
preserved (`prepare` upserts reports and never touches `analysisDemo.reflections`); a new `buildId` is issued.
Students must reload the report page afterwards.

Run from `analysis_service/` with `$env:PYTHONPATH = "."`, once per test key (`pinnacle-27` then `pinnacle-28`):

```powershell
venv\Scripts\python -m app.cli unpublish --test-key pinnacle-27
venv\Scripts\python -m app.cli validate  --dir private_data/pinnacle-27
venv\Scripts\python -m app.cli prepare   --dir private_data/pinnacle-27
venv\Scripts\python -m app.cli verify    --test-key pinnacle-27 --dir private_data/pinnacle-27
venv\Scripts\python -m app.cli publish   --test-key pinnacle-27
```

Notes:
* If `unpublish` says the test is not published (status READY), continue with `validate`.
* If `prepare` says `Cannot prepare: this test is currently PUBLISHED and the new content differs`, you skipped `unpublish`.
* If `prepare` returns silently without writing, the bundle did not change (sourceHash identical) — Phase 3.3 was not done.
* `verify` re-checks that every question has exactly 3 practice mappings that resolve to stored documents.

### 5.1 Database-level acceptance (proves the report API will return real questions)

Run from `analysis_service/` with `PYTHONPATH=.`:

```powershell
venv\Scripts\python -c "from app.db import db_client; from app.config import settings; from bson import ObjectId; from app.repositories.questions import get_collection_for_subject; db=db_client.get_db(); inst=ObjectId(settings.institute_id)
for tk in ['pinnacle-27','pinnacle-28']:
    t=db['tests'].find_one({'instituteId':inst,'analysisDemo.sourceKey':tk}); qs=t['questions']
    assert t['analysisDemo']['status']=='PUBLISHED', (tk, t['analysisDemo']['status'])
    assert all(len(q.get('recommendations',[]))==3 for q in qs), 'not 3 recs everywhere'
    bad=0; placeholder=0
    for q in qs:
        for ref in q['recommendations']:
            d=db[get_collection_for_subject(ref['subject'])].find_one({'_id':ref['questionId']})
            if d is None: bad+=1
            elif d['questionText'].startswith('[Practice'): placeholder+=1
    q62=[db[get_collection_for_subject(r['subject'])].find_one({'_id':r['questionId']}) for r in next(q for q in qs if q['questionNo']==62)['recommendations']]
    print(tk, 'missing docs:', bad, '| placeholders left:', placeholder, '| Q62 first practice:', q62[0]['questionText'][:60], '| difficulties:', [d['difficulty'] for d in q62])
"
```

Expected: for both keys `missing docs: 0 | placeholders left: 0`, difficulties `['easy', 'medium', 'hard']`, and
the Q62 text starts with `$\lim _{x \rightarrow` (pinnacle-27) / `If $\dfrac{1+ix}{1-ix}` (pinnacle-28).

### 5.2 Browser acceptance

1. Start the analysis service (`venv\Scripts\python -m uvicorn app.main:app --reload --port 8000` from
   `analysis_service/`) and the frontend (`npm run dev` in `frontend/`, `VITE_USE_DEMO=true` is already set in
   `frontend/.env`).
2. Log in as any activated Pinnacle-27 student, open the report, scroll to **Fix It Zone**, click **Fix it** on a
   Mathematics question (e.g. Q62 or Q71) and confirm:
   * 3 cards appear with badges `easy`, `medium`, `hard` in that order;
   * the limit expressions render as math (no raw `$`, `\lim`, `\frac` visible);
   * options are labelled `A.`–`D.`; "Check / Reveal Answer" shows `Answer: D — does not exist because ...`
     and highlights option D in green;
   * for Q71 the medium card's answer reads `10.5`.
3. Repeat inside **Question-by-Question Breakdown** ("Load Practice Questions") for a Physics question (e.g. Q23)
   and a Chemistry question (e.g. Q30) — the same card layout must appear.
4. Log in as an admin, open the admin Reports page for the same student, open practice for the same question —
   it must show the same real questions (no change was made there; this only confirms the shared data).

---

## Phase 6 — Final checklist before you report back

* [ ] `git status` shows changes only in: `analysis_service/app/schemas/inputs.py`, `analysis_service/app/services/reports.py`,
      `analysis_service/tests/unit/test_schemas.py`, `analysis_service/scripts/generated_recommendations.py` (new),
      `analysis_service/scripts/generate_pinnacle27_bundle.py`, `analysis_service/scripts/generate_pinnacle28_bundle.py`,
      `frontend/src/components/demo/PracticeQuestionCard.tsx` (new), `frontend/src/components/demo/PracticePanel.tsx`,
      `frontend/src/components/demo/FixItZone.tsx`, `frontend/src/components/demo/__tests__/PracticeQuestionCard.test.tsx` (new),
      `frontend/src/types/demoAnalysis.ts`, plus the data files under `data/pinnacle/` and `analysis_service/private_data/` (private — do not commit those).
* [ ] `pytest tests -q` in `analysis_service` → no failures; unit count = 80.
* [ ] `npx vitest run` → 16 passed; `npx tsc -b --noEmit` → exit 0.
* [ ] Both `--stat` diffs in 3.3 show only `recommendations.json`.
* [ ] Both tests are `PUBLISHED` and 5.1 printed `placeholders left: 0`.
* [ ] Delete the `*.before` backup directories only after 5.1 passes.
* [ ] Report: the exact outputs of 3.4, 5.1, the test counts, and anything that deviated from "Expected".
