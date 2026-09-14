# CogniTest — Browser UI test of the real practice questions for two named students

You are testing a web app end-to-end in a real browser (use browser automation / a headed or
headless browser tool — take screenshots at every checkpoint listed below and keep them). This is
**verification only**: do not edit any source file, do not run any database write script, do not
commit anything. If a step fails, capture a screenshot of the failure state, write down the exact
error text, and continue to the next independent step rather than stopping.

Repository root: `C:\Users\Abhineet Anand\Desktop\CogniTest_Beta_Python` (Windows).

## 0. Why this test exists

The practice questions ("Fix It Zone" and "Question-by-Question Breakdown → Load Practice
Questions") for two tests, `pinnacle-27` and `pinnacle-28`, were just switched from fabricated
placeholder text to real AI-generated content, and the two React components that render them were
rewritten to use LaTeX rendering (`MarkdownText` / KaTeX) instead of plain text. This has been
verified at the API/database level already (every practice-question document exists, has the
right difficulty order, no placeholder text remains). **What has NOT yet been verified is that a
real logged-in student sees it correctly rendered in an actual browser** — LaTeX rendering bugs,
CSS/layout issues, and click-interaction bugs only show up there. That is your job.

## 1. Start both servers

Open two terminals (PowerShell or Git Bash) and leave both running for the whole session.

**Terminal A — analysis service (FastAPI, serves the student demo report API):**
```powershell
cd "C:\Users\Abhineet Anand\Desktop\CogniTest_Beta_Python\analysis_service"
$env:PYTHONPATH = "."
venv\Scripts\python -m uvicorn app.main:app --port 8000
```
Wait for `Uvicorn running on http://127.0.0.1:8000`. If it fails with
`only one usage of each socket address ... 10048`, something is already listening on port 8000 —
run `netstat -ano | findstr :8000`, find the PID in the `LISTENING` row, and
`taskkill /PID <pid> /F` before retrying. (This exact situation happened during verification: a
stray leftover process was serving a different database and caused every login below to fail with
401 even with the correct password. If any login in this document fails, check for this first
before concluding the app is broken.)

**Terminal B — frontend (Vite dev server):**
```powershell
cd "C:\Users\Abhineet Anand\Desktop\CogniTest_Beta_Python\frontend"
npm run dev
```
Wait for `Local: http://localhost:5173/`. The frontend is already configured for the demo student
flow (`frontend/.env` has `VITE_USE_DEMO=true`) and proxies `/api/v2/demo/*` to port 8000.

Confirm both are up: open `http://localhost:8000/health` in the browser — it must show
`{"status":"ok","database_ready":true}`. Then open `http://localhost:5173/` — it must load the
CogniTest login page without a console error.

## 2. Test accounts (already activated — use as-is, do not run any activation flow)

| Test | Login URL | Enrollment No. | Password | Student name |
|---|---|---|---|---|
| Pinnacle-27 | `http://localhost:5173/student/login` | `000000002` | `UiTest#2026` | Ankit Kumar |
| Pinnacle-28 | `http://localhost:5173/student/login` | `0000000031` | `UiTest#2026` | Om Rai |

Admin account (for Part B):

| Login URL | Email | Password |
|---|---|---|
| `http://localhost:5173/admin/login` | `admin@newton-main.com` | `password123` |

Both student accounts already have a real, published report waiting for them — no need to take a
test or wait for grading. The student login form has fields labelled **"Enrollment Number"** and
**"Password"** (not email) — use the values from the table exactly as written, including leading
zeros.

---

## Part A — Pinnacle-27 student (Ankit Kumar, enrollment `000000002`)

1. Go to `http://localhost:5173/student/login`, log in with the Pinnacle-27 credentials above.
   **Checkpoint A1**: you land on a reports list page with at least one report card. Screenshot it.
2. Open that report (click into it). **Checkpoint A2**: the report detail page loads — Scoreboard,
   Subject-Wise Performance, and further sections render without a blank page or error banner.
   Screenshot the top of the page.
3. Scroll to the section titled **"Question-by-Question Breakdown"**. Find **Question 62**
   (Mathematics — it's in the Q51–75 range). Expand/open that question's row so its full detail
   (question text, options, solution) is visible.
   **Checkpoint A3**: the question text renders as proper mathematical notation (a fraction with a
   square root and limit symbol, not raw text like `$\lim` or `\sqrt` or a bare dollar sign).
   Screenshot it.
4. Inside that same Q62 block, find the **"Load Practice Questions"** button and click it.
   **Checkpoint A4** — after it loads, you must see **exactly 3** practice question cards, each
   with:
   - a difficulty badge, and the three cards read **easy, medium, hard in that top-to-bottom
     order**;
   - the question text rendered as real math (no visible `$`, `\lim`, `\frac`, `\to`, `\sqrt`
     characters — those must appear as actual mathematical symbols/fractions/limits);
   - four options labelled **A.**, **B.**, **C.**, **D.** side by side;
   - a **"Check / Reveal Answer"** button, not yet expanded.
   Screenshot all 3 cards.
5. Click **"Check / Reveal Answer"** on the **first (easy)** card. **Checkpoint A5**: the correct
   option (this one is **D**) gets highlighted with a green border/background, and below it a line
   appears reading `Answer: D — ` followed by the option's rendered text, then a `Solution:` line
   below that with a rendered mathematical explanation. Screenshot it.
6. Scroll further down to the section titled **"Fix It Zone: Because Every Mistake Has a
   Comeback"**. In its table, find a **Mathematics** row for a question the student got wrong or
   skipped, click its **"✏️ Fix it"** button.
   **Checkpoint A6**: an inline panel opens below that row's group with **3 practice question
   cards** in the same easy → medium → hard order, rendered the same way as step 4 (real math, not
   raw LaTeX). Screenshot it. If Q71 or Q56 happens to be the one available here, specifically
   check its solution text for a fraction that reads correctly (not `\frac{f(n)}{}` with an empty
   denominator, and not a sentence starting mid-thought like "As before,"). If neither Q71/Q56 is
   available among this student's wrong/skipped questions, this specific sub-check is not
   possible — note that and move on; it is not a failure.
7. In the same Fix It Zone, find a **Physics** row (Q1–25) that's wrong/skipped and click
   **"✏️ Fix it"** too. **Checkpoint A7**: same 3-card layout appears with Physics content (these
   are typically projectile-motion or relative-motion word problems, plain English rather than
   heavy LaTeX — confirm the text still reads naturally, no stray backslashes or braces).
   Screenshot it.
8. If a **Chemistry** row (Q26–50) is available wrong/skipped, click **"✏️ Fix it"** on it too and
   screenshot it as **Checkpoint A8**. If none is available, note that and move on.
9. Open the browser's developer console (F12) and check for any red errors logged while doing
   steps 3–8 (ignore harmless warnings like React DevTools suggestions). **Checkpoint A9**: no
   uncaught JS errors. Copy any error text you do see.

## Part B — Pinnacle-28 student (Om Rai, enrollment `0000000031`)

Log out (or open a private/incognito browser window) and repeat the same flow logged in as the
Pinnacle-28 student:

1. Log in with the Pinnacle-28 credentials from the table above. **Checkpoint B1**: reports list
   loads; open the report.
2. In **Question-by-Question Breakdown**, find **Question 62** (Mathematics). This paper's Q62 is
   a different question from Pinnacle-27's (complex numbers, not limits) — its text should start
   with something like *"If `(1+ix)/(1-ix) = a+ib`..."* rendered as real math.
   **Checkpoint B2**: click **"Load Practice Questions"** and confirm the same 3-card
   easy/medium/hard layout, LaTeX rendering correctly. Screenshot it.
3. Reveal the answer on the **medium** card. **Checkpoint B3**: answer and solution appear,
   correctly rendered. Screenshot it.
4. In **Fix It Zone**, open practice for one Mathematics row and one Chemistry row (Q26–50) that
   are wrong/skipped for this student, screenshotting each as **Checkpoint B4** and
   **Checkpoint B5**. For the Chemistry row, this paper's chemistry content is about atomic
   structure (electron configuration, quantum numbers) — confirm option text like `$4s$`, `$3d$`
   renders as styled math, not raw dollar-sign text.
5. Check the dev console for JS errors as in step A9. **Checkpoint B6**.

## Part C — Numerical (non-MCQ) practice question, both papers

MCQ is the common case; specifically confirm a **numerical** practice question also displays
correctly, since one of its possible answers is a **decimal** (this was a real bug fixed just
before this test — it used to be rejected entirely).

1. As either student, in **Question-by-Question Breakdown**, find a **numerical**-type question
   (no lettered options — Pinnacle-27 Q71 "*The limit ... is ____*" is a good one; if that one
   isn't reachable, any numerical Mathematics or Physics question works).
2. Load its practice questions and reveal each of the 3 answers.
   **Checkpoint C1**: each card shows **no options grid at all** (numerical questions must not
   show A/B/C/D boxes) and, after reveal, an `Answer:` line with just a number — for Pinnacle-27
   Q71 specifically, the **medium** card's answer should read **`10.5`** (a decimal, not `10` or
   an error). Screenshot it.

## Part D — Admin side (regression check only — this code path was not changed)

1. Log out of the student session. Go to `http://localhost:5173/admin/login` and log in with the
   admin credentials from the table above.
2. Navigate to the admin **Reports** page, find either Ankit Kumar (Pinnacle-27) or Om Rai
   (Pinnacle-28) in the report list, open their report, and open a practice-question modal for any
   question (the admin UI has its own "practice" button/modal, separate from the student pages
   above — it already rendered LaTeX correctly before this change, so it should still).
   **Checkpoint D1**: practice questions display with rendered math and lettered options here too,
   and nothing looks broken. Screenshot it.

---

## 3. What to report back

For each checkpoint (A1–A9, B1–B6, C1, D1): pass / fail, one screenshot, and — for any fail — the
exact visible error text or a description of what rendered wrong (e.g. "raw `$` and `\frac` visible
in the question text" or "options overlapped the difficulty badge on mobile width"). Also report:

- Any JavaScript console errors captured in A9/B6, verbatim.
- Any HTTP request in the Network tab that returned a non-2xx status while performing the steps
  above (note the URL and status code).
- Whether both servers stayed up for the whole session without crashing.

Do not attempt to fix anything you find — just report it clearly enough that a developer can
reproduce it from your description alone (which student, which question number, which button,
what you expected vs. what you saw).

## 4. Cleanup

When finished, stop both servers (Ctrl+C in each terminal). Do not delete or modify any file, and
do not log in as any student/admin other than the ones listed above.
