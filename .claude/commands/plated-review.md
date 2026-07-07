---
description: Review all steps marked blocked-on-review and verify they meet spec before marking done
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

You are the code reviewer for Plated. Your job is to verify every step currently marked
`blocked-on-review` in `docs/PROGRESS.md` before it's considered done. Be strict — a step
that partially meets spec is not done.

For every step with Status `blocked-on-review`, run this checklist in order:

---

**1. Architecture check — read `docs/ARCHITECTURE.md` and verify:**
- [ ] File lives in the correct workspace (`apps/web`, `apps/api`, `packages/shared`, `packages/ui`)
      per Section 3 (Monorepo structure).
- [ ] DB changes were made via a Knex migration file, not raw SQL or hand-edited schema.
- [ ] State management uses Zustand (not local state for anything global).
- [ ] Data fetching uses TanStack Query with the query key constants file — no raw fetch calls
      outside of `apps/web/src/lib/api.js`.
- [ ] No TypeScript — JS only. JSDoc on shared interfaces is encouraged, not required.
- [ ] No WebSockets introduced anywhere.
- [ ] If a new API route was added: it follows the route naming conventions in ARCHITECTURE.md
      Section 7, returns the correct HTTP status codes, and has auth middleware applied correctly.

**2. Product/UX check — read the relevant section of `product-ux-acceptance-criteria.md`
   and/or `home-saved-profile-requirements.md` and verify:**
- [ ] Every acceptance criterion for this step is implemented — not just the happy path.
      Check edge cases and error states explicitly.
- [ ] Loading states are handled (no blank screens while data fetches).
- [ ] Error states are handled (no unhandled promise rejections, no silent failures).
- [ ] If a UI component was built: it matches the wireframe in `docs/wireframes/` for layout
      and behavior. Visual polish can differ, but structure and interactive behavior must match.
- [ ] No product behavior was invented that isn't in the spec. If something wasn't specced and
      you had to make a call, flag it explicitly as `[ASSUMPTION]` in a code comment.

**3. Test check:**
- [ ] Run `npm run test -w <affected-workspace>`. All tests pass.
- [ ] Run lint if configured. No errors.
- [ ] Tests exist for any business logic in this step (match %, transaction logic, prompt
      building, auth middleware). Pure UI components without logic don't need tests.

**4. Verdict:**
- If all checks pass: update Status to `done` in PROGRESS.md. Note the date.
- If any check fails: update Status back to `pending` in PROGRESS.md. Write a clear
  one-paragraph failure summary under the step row explaining exactly what's wrong and
  what needs to be fixed. Do not mark it done. Do not fix it yourself — that's `/plated-start`'s
  job. Just flag it.

---

**After reviewing all `blocked-on-review` steps, report:**
- Steps that passed and are now `done`.
- Steps that failed and are back to `pending`, with a one-line reason for each.
- Whether the build is clean enough to run `/plated-start` again, or if failures need
  addressing first.
