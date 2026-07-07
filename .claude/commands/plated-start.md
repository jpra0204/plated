---
description: Execute all runnable steps from the Plated build plan until a YOU step or blocker
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

You are continuing automated implementation of Plated. Your state of truth is `docs/PROGRESS.md`.
Your spec sources are `BUILD_PLAN.md` (current phase), `docs/ARCHITECTURE.md`, and the
UX docs referenced in `CLAUDE.md`. Read all of them before touching any code.

Follow this loop exactly — no step limit, run until a natural stop condition.

---

**1. Find the next step.**
Read `docs/PROGRESS.md` top to bottom. Find the first row whose Status is `pending`.
Skip `done`, `blocked-on-user`, `blocked-on-review`, and `deferred`.

**2. If its Type is `YOU`:**
- Do not attempt it.
- Update its Status to `blocked-on-user` in PROGRESS.md.
- Add a one-line note of exactly what's needed.
- Update the "Blocked / needs your input right now" section at the bottom of PROGRESS.md.
- Stop. Report: which step, exactly what I need to do, and what you'll do once it's done.

**3. If its Type is `CLAUDE CODE`:**
- Read the full spec for this step in `BUILD_PLAN.md` or `docs/BUILD_PLAN.md`.
- Cross-check `docs/ARCHITECTURE.md` for implementation details — use its exact schema,
  naming conventions, and patterns. Do not invent alternatives.
- Cross-check the relevant UX doc for behavior rules — `product-ux-acceptance-criteria.md`,
  `home-saved-profile-requirements.md`. When product and tech conflict, product wins on behavior,
  ARCHITECTURE.md wins on implementation.
- Implement it.
- Run tests for the affected workspace: `npm run test -w <workspace>`. Run lint if configured.
  Fix all failures before continuing — do not mark a step done with red tests or lint errors.
- Update that row's Status to `blocked-on-review` in PROGRESS.md with a one-line summary
  of what was built. Do NOT mark it `done` — that only happens after `/plated-review` passes.
- Commit: `git add -A && git commit -m "feat(step X.X): <short description>"`.
- Go back to step 1.

**4. Stop conditions — stop immediately when ANY of these are true:**
- You hit a `YOU` step (report per step 2, then stop).
- All remaining `pending` steps are either `YOU`, `blocked-on-user`, or `deferred`.
- You hit something ambiguous, undocumented, or contradicting a prior decision in
  ARCHITECTURE.md — flag it, stop, ask me rather than guessing.
- You notice something you built in a previous step is now broken by the current step —
  stop, fix it first, then continue.

**5. When you stop, report:**
- Steps completed this run (IDs + one-line summaries), all marked `blocked-on-review`.
- What's next (first `pending` step ID and title).
- Anything blocked on me, with exact instructions.
- Any open questions or things you're unsure about.
- Reminder: run `/plated-review` before starting the next session.
