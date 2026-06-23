# Plated — Build Progress

> Single source of truth for what's done. `/plated-start`, `/plated-status`, and `/plated-next`
> all read and write this file. Status values: `pending` | `done` | `blocked-on-user` | `deferred`.
> Don't edit the Type column — it determines who's allowed to do the step.

## Phase 0 — Accounts & credentials

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 0.1 | YOU | Create dedicated Google account | pending | |
| 0.2 | YOU | Create GCP project (`plated-dev`) | pending | |
| 0.3 | YOU | Create Firebase project, enable Google + Email/Password providers | pending | |
| 0.4 | YOU | Enable GCP APIs (Cloud Run, Cloud SQL, Artifact Registry, Secret Manager) | pending | |

## Phase 1 — Repo cleanup & monorepo scaffold

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 1.1 | CLAUDE CODE | Wipe old code, scaffold npm workspaces monorepo | pending | |
| 1.2 | CLAUDE CODE | Set up `apps/api` skeleton (placeholder routes) | pending | |
| 1.3 | CLAUDE CODE | Set up `apps/web` skeleton (Vite, Router, Zustand, React Query) | pending | |

## Phase 2 — Database

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 2.1 | YOU | Spin up local PostgreSQL (`docker compose up -d`) | pending | depends on 1.1 |
| 2.2 | CLAUDE CODE | Write all Knex migrations (9 tables, in dependency order) | pending | |
| 2.3 | CLAUDE CODE | Write ingredients seed file (~80 items) | pending | |
| 2.4 | YOU | Run migrations + seed, verify in DB | pending | |

## Phase 3 — UI (static, hardcoded data)

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 3.1 | CLAUDE CODE | Design tokens + shared components (TabBar, RecipeCard, Toast, MatchBar, PantryTag) | pending | |
| 3.2 | CLAUDE CODE | Home screen (static) | pending | ref: `home_screen_v2.html` |
| 3.3 | CLAUDE CODE | Chef screen (static) | pending | ref: `chef_wireframes.html` |
| 3.4 | CLAUDE CODE | Pantry screen (static) | pending | |
| 3.5 | CLAUDE CODE | Saved & Profile screens (static) | pending | ref: `saved_and_profile_v2.html` |
| 3.6 | CLAUDE CODE | Auth screen (static, client-side validation only) | pending | |

## Phase 4 — Authentication

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 4.1 | CLAUDE CODE | Add Firebase SDK to frontend, wire authStore to `onAuthStateChanged` | pending | needs 0.3 config values |
| 4.2 | CLAUDE CODE | Wire Auth screen to Firebase (Google OAuth, sign in, create account) | pending | |
| 4.3 | CLAUDE CODE | Auth middleware + `POST /auth/sync` on backend | pending | needs Firebase service account key |
| 4.4 | CLAUDE CODE | `ProtectedRoute` + TabBar auth-aware labels | pending | |

## Phase 5 — Backend routes

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 5.1 | CLAUDE CODE | Pantry routes + tests | pending | |
| 5.2 | CLAUDE CODE | Voice parsing route (`/pantry/voice`, `/pantry/bulk`) + tests | pending | |
| 5.3 | CLAUDE CODE | Recipe routes (`trending`, `suggestions`, `:id`) + tests | pending | |
| 5.4 | CLAUDE CODE | Chef generation + approve routes + tests | pending | |
| 5.5 | CLAUDE CODE | Saved, Cook, Profile routes + tests | pending | |

## Phase 6 — Connect frontend to API

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 6.1 | CLAUDE CODE | API client + React Query setup, query key constants | pending | |
| 6.2 | CLAUDE CODE | Wire Home screen to real data | pending | |
| 6.3 | CLAUDE CODE | Wire Chef screen to real data | pending | |
| 6.4 | CLAUDE CODE | Wire Pantry screen to real data | pending | |
| 6.5 | CLAUDE CODE | Wire Saved + Profile screens to real data | pending | |

## Phase 7 — Voice input

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 7.1 | CLAUDE CODE | `useVoiceInput` hook (Web Speech API) | pending | |
| 7.2 | CLAUDE CODE | Wire Voice tab in Pantry Add Item flow | pending | |

## Phase 8 — Observability

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 8.1 | CLAUDE CODE | Custom OTel spans (chef.generate, pantry.voice_parse, cook.execute) | pending | |

## Phase 9 — GCP deployment

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 9.1 | YOU | Install + authenticate gcloud CLI | pending | |
| 9.2 | YOU | Create Cloud SQL instance | pending | |
| 9.3 | YOU | Create Artifact Registry repository | pending | |
| 9.4 | CLAUDE CODE | Write Dockerfiles (api + web) | pending | |
| 9.5 | YOU | Store secrets in Secret Manager | pending | |
| 9.6 | CLAUDE CODE | GitHub Actions CI/CD workflows | pending | |
| 9.7 | YOU | First production deploy | pending | |
| 9.8 | YOU | Run migrations against Cloud SQL | pending | |

## Phase 10 — Scanning (deferred)

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 10.1 | DEFERRED | Barcode vs Gemini Vision implementation | deferred | blocked on product decision — see ARCHITECTURE.md §18 |

---

## Blocked / needs your input right now
*(Claude Code keeps this section updated — don't edit manually except to clear it)*

- None yet — run `/plated-start` to begin.
