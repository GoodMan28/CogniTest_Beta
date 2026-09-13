# Operator Runbook

Every command below was actually run against a real local MongoDB during
remediation Phase R0-R6 (see `implementation/PHASE_STATUS.md` for the
transcripts). Backend commands are run from `analysis_service/` with the
virtual environment active and `PYTHONPATH=.` set (so `python -m app.cli`
resolves). Windows `cmd`/PowerShell syntax is shown; substitute
`export VAR=value` for `set VAR=value` on Linux/Mac, and
`venv/bin/...` for `venv\Scripts\...`.

**Safety rule that applies to every write command below:** never point
`MONGODB_URI` at a database that is not disposable. `pytest` and
`rehearsal.py` both refuse to run at all unless the resolved database name
ends in `_test` (or, for `rehearsal.py` against a real staging
environment, `--i-know-this-is-staging --database-name <exact name>` is
passed explicitly). `prepare`/`verify`/`publish` have no such guard — they
are meant to run against the real institute database, so double-check
`MONGODB_URI` yourself before running them for real.

## 1. Installing dependencies

**Backend (FastAPI):**
```bash
cd analysis_service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend (React):**
```bash
cd frontend
npm ci
```

## 2. Starting local frontend and FastAPI services

**Backend:**
```bash
cd analysis_service
set PYTHONPATH=.
venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

**Frontend (demo mode):**
```bash
cd frontend
set VITE_USE_DEMO=true
npm run dev
```

## 3. Configuring the same-origin development proxy

`frontend/vite.config.ts` proxies `/api/v2/demo` to `http://localhost:8000`
(FastAPI) and everything else under `/api` to `http://localhost:5000`
(legacy Express). The `/api/v2/demo` entry is declared *before* the plain
`/api` entry — Vite matches proxy entries in declaration order, so this
ordering is load-bearing; if a future edit reorders them, every demo
request silently falls through to Express instead of FastAPI. No other
configuration is needed for `npm run dev`. For production, see
`implementation/DEPLOYMENT_PLAN.md` for the NGINX rules.

## 4. Running every test category

```bash
cd analysis_service
set PYTHONPATH=.
venv\Scripts\python -m pytest tests/unit -v          # domain logic only, no DB/HTTP required
venv\Scripts\python -m pytest tests/integration -v   # requires a local MongoDB, targets a *_test database
venv\Scripts\python -m pytest -q                      # everything
```

```bash
cd frontend
npm test          # vitest component tests
npx tsc --noEmit -p tsconfig.app.json   # typecheck only
npm run build      # full production build (set VITE_USE_DEMO=true first for the demo build)
```

## 5. Creating/checking indexes

```bash
cd analysis_service
set PYTHONPATH=.
venv\Scripts\python -m app.cli indexes --check
venv\Scripts\python -m app.cli indexes --apply
```

`indexes --apply` inspects existing indexes before creating the demo
roster-identity index, so it never conflicts with (or duplicates) the
legacy Express/Mongoose global unique index on `students.enrollmentNo`.

## 6. Validating a prepared bundle without writes

```bash
cd analysis_service
set PYTHONPATH=.
venv\Scripts\python -m app.cli validate --dir C:\path\to\private_data\<test-key>
```

Prints every validation error found (not just the first) and makes no
database connection at all.

## 7. Preparing a test

```bash
cd analysis_service
set PYTHONPATH=.
venv\Scripts\python -m app.cli prepare --dir C:\path\to\private_data\<test-key>
```

Runs `validate` again internally before writing anything. The institute is
always `settings.institute_id` (from `.env`'s `INSTITUTE_ID`) — there is no
`--instituteId` flag; the manifest's `instituteId` must match it exactly or
`validate`/`prepare` reject the bundle.

Preparing an unchanged bundle against a test that is already `READY` or
`PUBLISHED` with identical content is a safe no-op (prints nothing extra,
writes nothing). Preparing changed content against a `PUBLISHED` test is
refused — unpublish first (Section 11).

## 8. Verifying stored results

```bash
cd analysis_service
set PYTHONPATH=.
venv\Scripts\python -m app.cli verify --test-key <test-key> --dir C:\path\to\private_data\<test-key>
```

Independently recomputes every student's score and every cohort's
comparisons from the bundle and compares them against what `prepare`
stored. On success, marks the current build as verified — `publish`
(Section 10) refuses to run until this has passed for the current build.

## 9. Issuing activation details to a private file

```bash
cd analysis_service
set PYTHONPATH=.
venv\Scripts\python -m app.cli issue-claims --test-key <test-key> --out C:\path\to\private\claims.json
```

Writes a JSON array of `{enrollmentNo, name, claimCode}` and sets the
output file's permissions to `0600`. Deliver these codes to students
through a private channel (email, the institute's own portal) — never
commit this file, never log its contents, and never put it under
`frontend/public`. Already-activated students (those with a password set)
are skipped, not reissued a new code.

## 10. Publishing and unpublishing

**Publish (requires a passed `verify` for the current build — Section 8):**
```bash
cd analysis_service
set PYTHONPATH=.
venv\Scripts\python -m app.cli publish --test-key <test-key>
```

**Unpublish:**
```bash
cd analysis_service
set PYTHONPATH=.
venv\Scripts\python -m app.cli unpublish --test-key <test-key>
```

Unpublishing does not delete any report; it only flips
`analysisDemo.status` from `PUBLISHED` back to `READY`, which is what the
student-facing endpoints actually gate on.

## 11. Correcting a key and rebuilding a cohort

Never edit a single student's report after a shared answer key changes.
The whole affected cohort must be rebuilt:

```text
1. Back up the current prepared bundle directory and the affected
   students/tests/evaluationreports documents (Section 13).
2. python -m app.cli unpublish --test-key <test-key>
3. Correct answer_key.json (or whichever file changed) in the bundle directory.
4. python -m app.cli validate --dir <bundle-dir>
5. python -m app.cli prepare  --dir <bundle-dir>
6. python -m app.cli verify   --test-key <test-key> --dir <bundle-dir>
7. python -m app.cli publish  --test-key <test-key>
```

Every evaluated student's score, breakdowns, and cohort comparisons are
recomputed by step 5 — there is no partial-rebuild option, by design.

## 12. Recovering a failed build

A build can only be in `BUILDING` if a `prepare` process is (or was)
actively running. Before touching anything, confirm on the machine/process
list that no `python -m app.cli prepare` process for this test is still
running. Only then, manually reset the lock:

```bash
mongosh "<your MONGODB_URI>" --eval "db.tests.updateOne({instituteId: ObjectId('<institute-id>'), 'analysisDemo.sourceKey': '<test-key>'}, {\$set: {'analysisDemo.status': 'FAILED'}})"
```

(Setting it to `FAILED` rather than clearing the lock fields entirely is
deliberate: `analysisDemo.buildId`/`sourceHash` are left in place for
forensic purposes, and `FAILED` is not `BUILDING`, so `acquire_build_lock`
will accept a fresh `prepare` normally.) Then re-run Section 7.

## 13. Backing up the prepared bundle and affected records

**Not run/verified on this machine**: `mongodump`/`mongorestore` are not
installed in this development environment (confirmed absent via `which`),
so the exact commands in this section and Section 14 are written to
correct MongoDB Database Tools syntax but were not executed. Verify them
against a real `mongodump`/`mongorestore` install (or install MongoDB
Database Tools) before relying on them for a real backup/restore.

Back up the bundle directory itself with a normal file copy first (it is
outside version control and outside `frontend/public` by design). Then
dump the four collections a demo-managed test touches:

```bash
mongodump --uri="<your MONGODB_URI>" --collection=tests --query="{\"analysisDemo.sourceKey\": \"<test-key>\"}" --out=.\backups\
mongodump --uri="<your MONGODB_URI>" --collection=evaluationreports --query="{\"analysisDemo.buildId\": \"<build-id>\"}" --out=.\backups\
mongodump --uri="<your MONGODB_URI>" --collection=students --out=.\backups\
mongodump --uri="<your MONGODB_URI>" --collection=physics_questions --query="{\"analysisDemo.sourceKey\": {\"\$regex\": \"^<test-key>:\"}}" --out=.\backups\
```

(Repeat the last line for `chemistry_questions`, `biology_questions`,
`mathematics_questions` as needed — a subject's collection only needs
backing up if the paper actually uses that subject.) `students` is backed
up in full rather than filtered, since a demo-managed roster upsert only
ever adds to or updates name/batch on existing student documents; a full
dump is the safe default there.

## 14. Rolling back code and restoring a prior approved build

```bash
git checkout <previous-approved-commit>
mongorestore --uri="<your MONGODB_URI>" --drop --dir=.\backups\<database-name>\
```

`--drop` replaces the collections being restored; make sure the dump
directory is the correct backup before running this against anything but a
`_test` database.

## 15. Checking application and database readiness

```bash
curl http://localhost:8000/health
```

Returns `{"status": "ok", "database_ready": true|false}`. `status: ok`
means the FastAPI process itself is up; `database_ready` reflects whether
its last MongoDB ping succeeded — check both before telling students to
log in.

## Development database safety

`analysis_service/tests/conftest.py` refuses to run the test suite at all
unless `MONGODB_URI` resolves to a database whose name ends in `_test`.
`rehearsal.py` enforces the same rule (Section: staging rehearsal below).
Nothing in `app/cli.py` enforces this — `prepare`/`verify`/`publish` are
meant to run against the real institute database on demo day, so always
confirm `MONGODB_URI` in `.env` by hand before running them.

## Staging rehearsal

```bash
cd analysis_service
set PYTHONPATH=.
venv\Scripts\python rehearsal.py --generate 100 30 --dir _rehearsal_bundle
```

Generates a synthetic, schema-valid bundle (100 students, 30 questions,
alternating subjects/question types/correctness, 3 practice questions per
original question), then runs the real `validate -> prepare -> verify ->
publish` pipeline against it and prints preparation/verification duration,
average and largest report document size, and report-detail endpoint
latency. Refuses to run unless `MONGODB_URI` resolves to a `_test`
database (pass `--i-know-this-is-staging --database-name <exact name>` to
run it against a real, named staging environment instead — never against
production). To rehearse with a real prepared bundle instead of a
generated one, pass `--dir <bundle-dir>` without `--generate`.

Measured once during Phase R6 development (100 students, 30 questions,
local MongoDB, local FastAPI in-process — not over a network): preparation
0.650s, verification 0.500s, average report document 50,087 bytes, largest
report document 50,801 bytes (well within MongoDB's 16 MB document limit),
average report-detail endpoint latency 2.21 ms. These numbers describe
this specific run, on this machine, once — re-run the command yourself for
a number you can rely on, and do not treat 2.21 ms as a guaranteed
production latency: it excludes network latency, a real reverse proxy, and
concurrent load, none of which have been measured.
