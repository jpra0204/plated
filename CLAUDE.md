# Plated — Project Context

Plated is a mobile-first AI recipe app. Full specs already exist — read them before writing
any code, don't re-derive decisions that are already made.

## Required reading (in this order)
1. `docs/PROGRESS.md` — current build status. Always check this FIRST, every session.
2. `docs/ARCHITECTURE.md` — tech stack, DB schema, API design, infra. Wins on *implementation* details.
3. `docs/BUILD_PLAN.md` — the step-by-step build order. Each step has the exact prompt to follow.
4. `docs/product-ux-acceptance-criteria.md` + `docs/home-saved-profile-requirements.md` +
   `docs/chef-pantry-requirements.md` — product/UX behavior. Wins on *behavior* when it conflicts
   with anything else.
5. Wireframe HTML files in `docs/wireframes/` — visual reference only, not implementation.

## Conventions (do not deviate without flagging it)
- **JavaScript only** — no TypeScript yet. JSDoc on shared interfaces is encouraged.
- **npm workspaces monorepo**: `apps/web`, `apps/api`, `packages/shared`, `packages/ui`.
- **DB schema changes ONLY via Knex migration files** in `apps/api/db/migrations/`. Never hand-edit
  a table. Never run raw SQL against the dev DB to "fix" something — write a migration.
- **State**: Zustand for global state. **Data fetching**: TanStack Query — mutations invalidate
  relevant query keys immediately; polling is just the background safety net.
- **Auth**: Firebase (Google SSO + email/password). Backend never touches or stores passwords.
- **Tests**: Vitest, co-located with the file under test (`foo.js` + `foo.test.js`). Anything
  implemented from Phase 5 onward (routes, business logic) needs tests in the same step.
- **Real-time**: React Query polling + invalidation. Do not introduce WebSockets — explicitly
  decided against in ARCHITECTURE.md.

## Working agreement
- Don't invent product behavior. If the UX docs don't cover a case, ask — don't guess.
- Don't invent architecture. If ARCHITECTURE.md doesn't cover something, flag it as an open
  decision (see ARCHITECTURE.md §18) rather than silently picking an approach.
- A step marked `[YOU]` in BUILD_PLAN.md is never your job to attempt. Flag it clearly and stop.
- Before marking any step done in `docs/PROGRESS.md`, run lint and relevant tests. Fix failures
  first.
- Update `docs/PROGRESS.md` immediately after finishing a step — it's the only thing future
  sessions trust to know what's already built.
