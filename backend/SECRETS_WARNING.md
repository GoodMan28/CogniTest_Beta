# ⚠️ Credential Exposure — Operator Action Required

`backend/check.js` and `backend/check_subj.js` (in this directory) contain a
**hardcoded MongoDB Atlas connection string with a live username and password**
(`cluster0.m3rxujk.mongodb.net`).

These two files were untracked in Git and have now been added to `.gitignore`
(2026-09-13, remediation Phase R0) so they will not be committed going
forward. That does **not** undo any prior exposure.

## Required operator actions

1. **Rotate the MongoDB Atlas database user's password immediately.** Treat
   the existing password as compromised — it has been sitting in a plaintext
   file on disk and may have been synced, backed up, or briefly staged before
   this fix.
2. Check `git log --all --source -- backend/check.js backend/check_subj.js`
   and `git log -p -- backend/.env` (or equivalent) to confirm neither file
   nor its credentials were ever actually committed to any branch or remote.
   If they were, the credential must be rotated regardless of step 1 being
   done, and consider the history rewrite / secret-scanning implications.
3. Move any ad-hoc DB-inspection scripts like these to read their connection
   string from `backend/.env` (`MONGO_URI`) via `dotenv`, the way
   `backend/getStudents.js` and `backend/src/scripts/check_db.ts` already do,
   instead of hardcoding it.
4. Do not re-add these two files to Git without removing the hardcoded
   credential first.

This file is intentionally tracked (not ignored) so the warning survives.
