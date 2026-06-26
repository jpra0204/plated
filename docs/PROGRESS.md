# Plated — Build Progress

> Single source of truth for what's done. `/plated-start`, `/plated-status`, and `/plated-next`
> all read and write this file. Status values: `pending` | `done` | `blocked-on-user` | `deferred`.
> Don't edit the Type column — it determines who's allowed to do the step.

## Phase 0 — Accounts & credentials

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 0.1 | YOU | Create dedicated Google account | done | Confirmed by user 2026-06-23 |
| 0.2 | YOU | Create GCP project (`plated-dev`) | done | Confirmed by user 2026-06-23; billing enabled |
| 0.3 | YOU | Create Firebase project, enable Google + Email/Password providers | done | Confirmed by user 2026-06-23; linked to plated-dev GCP project |
| 0.4 | YOU | Enable GCP APIs (Cloud Run, Cloud SQL, Artifact Registry, Secret Manager) | done | Confirmed by user 2026-06-23; all four APIs enabled |

## Phase 1 — Repo cleanup & monorepo scaffold

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 1.1 | CLAUDE CODE | Wipe old code, scaffold npm workspaces monorepo | done | Verified: npm workspaces, concurrently, ESLint, Prettier, docker-compose.yml, .gitignore, .env.example all present |
| 1.2 | CLAUDE CODE | Set up `apps/api` skeleton (placeholder routes) | done | Verified: all routes, middleware, services, db/index.js present |
| 1.3 | CLAUDE CODE | Set up `apps/web` skeleton (Vite, Router, Zustand, React Query) | done | Verified: all deps installed; pages, components, stores, hooks, lib/api.js present |

## Phase 2 — Database

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 2.1 | YOU | Spin up local PostgreSQL (`docker compose up -d`) | done | Confirmed by user 2026-06-23; postgres + jaeger both healthy |
| 2.2 | CLAUDE CODE | Write all Knex migrations (9 tables, in dependency order) | done | 9 migration files written and run; all tables verified in local DB 2026-06-23 |
| 2.3 | CLAUDE CODE | Write ingredients seed file (~80 items) | done | 102 ingredients seeded across all 6 categories; verified in local DB 2026-06-23 |
| 2.4 | YOU | Run migrations + seed, verify in DB | done | Confirmed by user 2026-06-23 |

## Phase 3 — UI (static, hardcoded data)

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 3.1 | CLAUDE CODE | Design tokens + shared components (TabBar, RecipeCard, Toast, MatchBar, PantryTag) | done | Verified: styles/tokens.css + components.css; all five components implemented |
| 3.2 | CLAUDE CODE | Home screen (static) | done | Verified: all three states with fake data |
| 3.3 | CLAUDE CODE | Chef screen (static) | done | Verified: all three states with fake data |
| 3.4 | CLAUDE CODE | Pantry screen (static) | done | Verified: main grid + Add Item flow with fake data |
| 3.5 | CLAUDE CODE | Saved & Profile screens (static) | done | Verified: both screens implemented with fake data |
| 3.6 | CLAUDE CODE | Auth screen (static, client-side validation only) | done | Verified: signin/signup modes, validation, Google SSO button |

## Phase 4 — Authentication

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 4.1 | CLAUDE CODE | Add Firebase SDK to frontend, wire authStore to `onAuthStateChanged` | done | firebase installed; lib/firebase.js + initAuthListener() in main.jsx; .env.example with VITE_FIREBASE_* |
| 4.2 | CLAUDE CODE | Wire Auth screen to Firebase (Google OAuth, sign in, create account) | done | signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword wired; error mapping; loading state |
| 4.3 | CLAUDE CODE | Auth middleware + `POST /auth/sync` on backend | done | Firebase Admin verifyIdToken; /auth/sync upserts users + dietary_preferences; telemetry.js Resource import fixed |
| 4.4 | CLAUDE CODE | `ProtectedRoute` + TabBar auth-aware labels | done | ProtectedRoute created; Chef/Pantry/Saved wrapped; TabBar Profile↔Sign-in was already implemented |

## Phase 5 — Backend routes

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 5.1 | CLAUDE CODE | Pantry routes + tests | done | pantry.js (GET/POST/PATCH/DELETE + soft-delete + ownership checks); pantry.test.js (14 tests all passing); pre-existing Phase 3 prop-types lint fixed 2026-06-23 |
| 5.2 | CLAUDE CODE | Voice parsing route (`/pantry/voice`, `/pantry/bulk`) + tests | done | gemini.js wired to @google/genai; voice route parses transcript + enriches with catalogue; bulk route uses DB transaction; 15 tests passing 2026-06-23 |
| 5.3 | CLAUDE CODE | Recipe routes (`trending`, `suggestions`, `:id`) + tests | done | calculateMatch added to pantryMatch.js; trending/suggestions/:id implemented; 31 tests (route + unit) all passing 2026-06-23 |
| 5.4 | CLAUDE CODE | Chef generation + approve routes + tests | done | generate: pantry snapshot, previousRecipeIds, Gemini mock, transactional insert; approve: approved_at, is_public flip, saved_recipes insert; 17 tests all passing 2026-06-23 |
| 5.5 | CLAUDE CODE | Saved, Cook, Profile routes + tests | done | saved (list+match_pct, save, soft-delete), cook (case-insensitive match, atomic transaction), profile (GET stats, PATCH fields+prefs, DELETE cascade); 118 tests all passing 2026-06-23 |

## Phase 6 — Connect frontend to API

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 6.1 | CLAUDE CODE | API client + React Query setup, query key constants | done | queryKeys.js created; React Query defaults updated (refetchOnWindowFocus: false globally); ESLint fixed and clean (installed eslint-plugin-react, fixed config to target .js/.jsx) 2026-06-25 |
| 6.2 | CLAUDE CODE | Wire Home screen to real data | done | Auth-aware Home.jsx: trending (logged-out) + suggestions (logged-in) via React Query; skeleton loading; Cook/Save mutations with invalidation; backend embeds ingredients+steps in both list endpoints 2026-06-25 |
| 6.3 | CLAUDE CODE | Wire Chef screen to real data | done | Generate/approve mutations wired; backend returns in_pantry per ingredient; Retry passes retryOf context; Adjust preserves filters 2026-06-25 |
| 6.4 | CLAUDE CODE | Wire Pantry screen to real data | done | GET /pantry query; add/edit/delete mutations; new GET /ingredients catalogue endpoint for autosuggest; voice bulk add flow 2026-06-25 |
| 6.5 | CLAUDE CODE | Wire Saved + Profile screens to real data | done | Saved: GET /saved with ingredients+in_pantry embedded, cook+delete mutations with confirm. Profile: preferences PATCH on toggle, edit form, Firebase signOut 2026-06-25 |

## Phase 7 — Voice input

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 7.1 | CLAUDE CODE | `useVoiceInput` hook (Web Speech API) | done | continuous SpeechRecognition; returns supported/start/stop/status/transcript/error; fires onResult with final accumulated transcript on stop 2026-06-26 |
| 7.2 | CLAUDE CODE | Wire Voice tab in Pantry Add Item flow | done | VoiceTab uses useVoiceInput; real mic start/stop; unsupported browser fallback; editable quantity+unit per parsed row before bulk add 2026-06-26 |

## Phase 8 — Observability

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 8.1 | CLAUDE CODE | Custom OTel spans (chef.generate, pantry.voice_parse, cook.execute) | done | chef.generate (user.id, meal_type, pantry_size), pantry.voice_parse (transcript_length, items_parsed), cook.execute (ingredients_removed); span.recordException on error; 118 tests still passing 2026-06-26 |

## Phase 9 — GCP deployment

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 9.1 | YOU | Install + authenticate gcloud CLI | blocked-on-user | Install gcloud SDK and run: gcloud auth login && gcloud config set project <your-project-id> |
| 9.2 | YOU | Create Cloud SQL instance | pending | |
| 9.3 | YOU | Create Artifact Registry repository | pending | |
| 9.4 | CLAUDE CODE | Write Dockerfiles (api + web) | pending | |
| 9.5 | YOU | Store secrets in Secret Manager | pending | |
| 9.6 | CLAUDE CODE | GitHub Actions CI/CD workflows | pending | ci.yml scaffold exists; needs full implementation |
| 9.7 | YOU | First production deploy | pending | |
| 9.8 | YOU | Run migrations against Cloud SQL | pending | |

## Phase 10 — Scanning (deferred)

| ID | Type | Step | Status | Notes |
|---|---|---|---|---|
| 10.1 | DEFERRED | Barcode vs Gemini Vision implementation | deferred | blocked on product decision — see ARCHITECTURE.md §18 |

---

## Blocked / needs your input right now
*(Claude Code keeps this section updated — don't edit manually except to clear it)*

- **9.1 [YOU]** — Install gcloud CLI (https://cloud.google.com/sdk/docs/install), then run:
  ```
  gcloud auth login
  gcloud config set project <your-GCP-project-id>
  ```
  Once done, run `/plated-next` and I'll continue with 9.2 (Cloud SQL instance).
