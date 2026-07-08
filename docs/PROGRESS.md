# Plated — Phase A Progress

> Single source of truth for what's done. `/plated-run` reads and writes this file.
> Status values: `pending` | `blocked-on-review` | `done` | `blocked-on-you` | `paused`
> Type values: `CLAUDE CODE` = agent executes | `YOU` = Pablo must act first

---

## Phase A — Pre-Launch Friend Release

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| A1 | CLAUDE CODE | Recipe detail page (`/recipe/:id`) | done | Completed 2026-07-06 |
| A2 | CLAUDE CODE | Migrate all recipe entry points to detail page | done | Completed 2026-07-06 |
| A3 | CLAUDE CODE | Chef Approve → redirect to detail page | done | Completed 2026-07-06 |
| A4 | CLAUDE CODE | Pantry header: remove count, add last-updated + Select | done | Completed 2026-07-06 |
| A5a | CLAUDE CODE | Expiration tracking: generate shelf-life table for review | done | Completed 2026-07-06 |
| A5b | YOU | Review and approve the shelf-life table | done | Approved 2026-07-07 |
| A5c | CLAUDE CODE | Expiration tracking: run migration + seed with approved values | done | Completed 2026-07-07 |
| A6 | CLAUDE CODE | Home: pantry expiring-soon warning badge | done | Completed 2026-07-07 |
| A7 | CLAUDE CODE | Pantry bulk delete (wire Select behavior) | done | Completed 2026-07-06 |
| A8 | CLAUDE CODE | Recipe caching by filters (cache-first Chef generation) | done | Completed 2026-07-07 |
| A9 | CLAUDE CODE | Chef: pantry freshness weighting in prompt | done | Completed 2026-07-07 — prompt wording TODO left for Pablo |
| A10 | CLAUDE CODE | Chef: "Surprise me" cuisine option | done | Completed 2026-07-07 |
| A11 | CLAUDE CODE | Auth model rework (Home behind ProtectedRoute) | done | Completed 2026-07-06 |
| A12 | YOU | Landing page — needs live session with Pablo for copy + design | done | Completed 2026-07-07 |

---

## Blocked / needs your input right now

*(Updated automatically by `/plated-run` — do not edit manually)*

- **A12** — Landing page needs a live session with you. Come prepared with: (1) a screenshot or two of the app to use as hero images, (2) the headline and subhead copy you want, (3) any section structure ideas. Once agreed, run `/plated-run` and Claude will scaffold the page.

---

## Recent completions

*(Updated automatically after each merged PR)*

- **A1** — Recipe detail page (`/recipe/:id`) — 2026-07-06
- **A2** — Migrate all recipe entry points to detail page — 2026-07-06
- **A3** — Chef Approve → redirect to detail page — 2026-07-06
- **A4** — Pantry header: remove count, add last-updated + Select — 2026-07-06
- **A5a** — Expiration tracking: shelf-life table generated — 2026-07-06
- **A5b** — Shelf-life values approved by Pablo — 2026-07-07
- **A8** — Recipe caching by filters (cache-first Chef generation) — 2026-07-07
- **A5c** — Expiration tracking: migration + seed deployed — 2026-07-07
- **A10** — Chef "Surprise me" cuisine option — 2026-07-07
- **A6** — Home pantry expiring-soon warning badge — 2026-07-07
- **A9** — Chef freshness scaffolding (days_until_expiry wired, prompt TODO left for Pablo) — 2026-07-07
- **A12** — Landing page at `/` (scaffold complete, design pass deferred) — 2026-07-07
- **A7** — Pantry bulk delete (Select mode wired) — 2026-07-06
- **A11** — Auth model rework (Home behind ProtectedRoute) — 2026-07-06
