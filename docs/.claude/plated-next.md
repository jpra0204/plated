---
description: Execute exactly the next single step from the build plan, then stop and wait
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

Do exactly ONE step — the first row in `docs/PROGRESS.md` with Status `pending`.

Follow the same rules as steps 2–3 in `/plated-start` (handle `YOU` vs `CLAUDE CODE` steps
identically, including the test/lint gate before marking done), but regardless of step type,
stop after this single step and report back. Do not continue to a second step even if it would
be quick.

Use this instead of `/plated-start` when you want to review each change before the next one.
