---
description: Execute the next runnable batch of steps from the Plated build plan
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

You are continuing automated implementation of Plated. Your state of truth is `docs/PROGRESS.md`.
Your spec sources are `docs/BUILD_PLAN.md`, `docs/ARCHITECTURE.md`, and the UX docs referenced
in `CLAUDE.md`.

Follow this loop exactly. Do not skip steps or jump ahead, even if a later step looks easy or
independent — dependencies between steps aren't always obvious from the prose.

**1. Find the next step.**
Read `docs/PROGRESS.md` top to bottom. Find the first row whose Status is `pending` (skip
`done`, `blocked-on-user`, and `deferred`).

**2. If its Type is `YOU`:**
- Do not attempt it yourself.
- Pull the exact instructions for that step from `BUILD_PLAN.md`.
- Update its Status to `blocked-on-user` in PROGRESS.md, and add a one-line note of what's needed.
- Add it to the "Blocked / needs your input right now" section at the bottom of PROGRESS.md.
- Stop here entirely. Tell me clearly: which step, what exactly I need to do, and what you'll do
  once it's done.

**3. If its Type is `CLAUDE CODE`:**
- Read the full corresponding section in `BUILD_PLAN.md` for the exact prompt/spec for this step.
- Cross-check `ARCHITECTURE.md` (implementation detail) and the relevant UX doc (behavior) —
  use their exact schema, copy, and behavior rules rather than improvising.
- Implement it.
- If a test suite exists for the affected workspace, run it (`npm run test -w <workspace>`).
  Run lint if configured. Fix any failures before continuing — do not mark the step done with
  failing tests or lint errors.
- Update that row's Status to `done` in PROGRESS.md with a one-line note of what was built.
- If this is a git repo, commit with message `feat(step X.X): <short description>`.
- Go back to step 1.

**4. Stop conditions — stop and summarize when ANY of these are true:**
- You hit a `YOU` step (handled per step 2, then stop).
- You've completed all steps in the current Phase.
- You've completed 5 `CLAUDE CODE` steps in this run.
- You hit something ambiguous, undocumented, or that contradicts an earlier decision in
  ARCHITECTURE.md — stop and ask me rather than guessing.

**5. When you stop, report:**
- What was completed this run (step IDs + one-line descriptions)
- What's next
- Anything blocked on me, with exact instructions
- Anything you're unsure about
