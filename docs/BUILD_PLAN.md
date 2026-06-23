# Plated — Step-by-Step Build Plan

> **How to use this:** Work top to bottom. Steps marked **[YOU]** require manual action in a browser or console. Steps marked **[CLAUDE CODE]** can be handed directly to Claude Code. Steps marked **[PARALLEL]** can be done at the same time as the previous track. Placeholder values that need replacing are marked `<!-- REPLACE: description -->`.

---

## Phase 0 — Accounts & credentials
> Do this first. Everything downstream depends on these credentials existing.

---

### Step 0.1 — [YOU] Create a dedicated Google account for Plated

Create a new Google account (e.g. `plated.app.dev@gmail.com`) to own all GCP and Firebase resources. Keep it separate from your personal account so billing, permissions, and project ownership are clean from day one.

---

### Step 0.2 — [YOU] Create a GCP project

1. Sign in at [console.cloud.google.com](https://console.cloud.google.com) with the new account
2. Create a new project named `plated-dev`
3. Note the **Project ID** (may differ from the name) — you'll use it throughout
4. Enable billing (required for Cloud SQL and Cloud Run, even on free tier)

> **Project ID to note:** `<!-- REPLACE: your GCP project ID, e.g. plated-dev-123456 -->`

---

### Step 0.3 — [YOU] Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) with the same Google account
2. Click "Add project" → select the **existing** `plated-dev` GCP project (this links them)
3. Enable Google Analytics if prompted (optional, skip for now)
4. In Firebase console → Authentication → Get started → enable **Google** and **Email/Password** providers
5. Go to Project Settings → General → note the **Firebase config object** (API key, auth domain, project ID)

> **Firebase config to note:**
> ```
> apiKey: <!-- REPLACE: Firebase API key -->
> authDomain: <!-- REPLACE: e.g. plated-dev.firebaseapp.com -->
> projectId: <!-- REPLACE: Firebase project ID -->
> ```

---

### Step 0.4 — [YOU] Enable GCP APIs

In GCP console, enable these APIs (search each in the API Library):
- Cloud Run API
- Cloud SQL Admin API
- Artifact Registry API
- Secret Manager API

---

## Phase 1 — Repo cleanup & monorepo scaffold
> Claude Code handles this entirely. You just point it at the repo.

---

### Step 1.1 — [CLAUDE CODE] Wipe old code and scaffold monorepo

**Prompt Claude Code with:**
> "I have an existing repo with old code from a previous app attempt. I need you to: delete everything except the `.git` folder and any existing GitHub Actions workflows, then scaffold a fresh npm workspaces monorepo with this structure:"

```
plated/
├── apps/
│   ├── web/          # Vite + React 18 — scaffold with: npm create vite@latest
│   └── api/          # Node.js + Express — scaffold manually
├── packages/
│   ├── shared/       # empty package for now, just package.json
│   └── ui/           # empty package for now, just package.json
├── docs/             # paste ARCHITECTURE.md and product docs here
├── docker-compose.yml
├── .env.example      # root level
├── .gitignore
├── .eslintrc.js
├── .prettierrc
└── package.json      # root with workspaces config
```

Tell Claude Code to:
- Set up npm workspaces in root `package.json`
- Add `concurrently` as a dev dep at root for `npm run dev`
- Add ESLint + Prettier configs at root
- Write a root `.gitignore` that covers Node, Vite, `.env` files, and `dist/`
- Write the `docker-compose.yml` per ARCHITECTURE.md Section 17
- Leave `apps/web/src` and `apps/api/src` mostly empty — just entry points

---

### Step 1.2 — [CLAUDE CODE] Set up apps/api skeleton

**Prompt Claude Code with:**
> "Scaffold the Express API in `apps/api/` with this structure. Do not implement route logic yet — just the skeleton with placeholder responses."

```
apps/api/
├── src/
│   ├── index.js           # Express app, imports telemetry first
│   ├── telemetry.js       # OTel setup (full implementation per ARCHITECTURE.md)
│   ├── middleware/
│   │   ├── auth.js        # Firebase JWT verification skeleton
│   │   ├── errorHandler.js
│   │   └── requestLogger.js
│   ├── routes/
│   │   ├── auth.js        # POST /api/v1/auth/sync — placeholder 200
│   │   ├── pantry.js      # placeholder routes
│   │   ├── recipes.js     # placeholder routes
│   │   ├── chef.js        # placeholder routes
│   │   ├── saved.js       # placeholder routes
│   │   └── profile.js     # placeholder routes
│   ├── services/
│   │   ├── gemini.js      # placeholder, exports buildChefPrompt and buildVoiceParsePrompt
│   │   └── pantryMatch.js # full implementation — pure function, easy to test
│   └── db/
│       └── index.js       # Knex instance using DATABASE_URL from env
├── db/
│   ├── knexfile.js
│   ├── migrations/        # empty for now
│   └── seeds/             # empty for now
├── .env.example
└── package.json
```

---

### Step 1.3 — [CLAUDE CODE] Set up apps/web skeleton

**Prompt Claude Code with:**
> "Set up the React frontend in `apps/web/` using Vite. Install React Router v6, Zustand, and TanStack Query. Create this folder structure with empty files — no logic yet."

```
apps/web/src/
├── main.jsx              # React root, wrap with QueryClientProvider + Router
├── App.jsx               # Tab bar layout + route definitions (all 5 tabs)
├── pages/
│   ├── Home.jsx          # placeholder
│   ├── Chef.jsx          # placeholder
│   ├── Pantry.jsx        # placeholder
│   ├── Saved.jsx         # placeholder
│   ├── Profile.jsx       # placeholder
│   └── Auth.jsx          # placeholder
├── components/
│   └── TabBar.jsx        # actual tab bar component — implement this now
├── stores/
│   ├── authStore.js      # Zustand auth store with shape from ARCHITECTURE.md
│   └── pantryStore.js    # placeholder
├── hooks/
│   └── useVoiceInput.js  # placeholder
└── lib/
    └── api.js            # base fetch wrapper with auth header injection
```

---

## Phase 2 — Database
> Can be done in parallel with Phase 3 (UI). Both tracks are independent until Phase 4.

---

### Step 2.1 — [YOU] Spin up local PostgreSQL

```bash
docker compose up -d
```

Verify it's running: `docker compose ps` — postgres should show as healthy.

---

### Step 2.2 — [CLAUDE CODE] Write all Knex migrations

**Prompt Claude Code with:**
> "Write Knex migration files for all tables in ARCHITECTURE.md Section 5, in this order. Each migration is one file. Use the exact SQL from the architecture doc."

Migration order (dependencies first):
1. `create_users`
2. `create_dietary_preferences`
3. `create_ingredients`
4. `create_pantry_items`
5. `create_recipes`
6. `create_recipe_ingredients`
7. `create_recipe_steps`
8. `create_saved_recipes`
9. `create_chef_generations`

---

### Step 2.3 — [CLAUDE CODE] Write the ingredients seed file

**Prompt Claude Code with:**
> "Write a Knex seed file at `apps/api/db/seeds/ingredients.js` that populates the `ingredients` table with ~80 common pantry items across all categories: produce, dairy, grains, protein, legumes, other. Use the schema from ARCHITECTURE.md. Include `name_normalized` (lowercase trim of name), `default_unit`, `allowed_units` array, and `is_countable`."

---

### Step 2.4 — [YOU] Run migrations and seed

```bash
npm run db:migrate -w apps/api
npm run db:seed -w apps/api
```

Verify: connect to the DB (`psql` or TablePlus) and confirm tables and seed data exist.

---

## Phase 3 — UI (parallel with Phase 2)
> Build all five screens as static wireframes first — no API calls, hardcoded data. This lets you validate the UI before the backend is ready.

---

### Step 3.1 — [CLAUDE CODE] Design system & shared components

**Prompt Claude Code with:**
> "Create a design system file at `apps/web/src/styles/tokens.css` with the CSS variables from ARCHITECTURE.md. Then build these shared components in `apps/web/src/components/` — use the wireframes in the project docs as the visual reference. Use only the design tokens, no hardcoded colors."

Components to build:
- `TabBar.jsx` — 5 tabs, active state, auth-aware label switching (Profile ↔ Sign in)
- `RecipeCard.jsx` — collapsed and expanded states, match bar, pantry tags
- `Toast.jsx` — auto-dismiss, green checkmark variant
- `MatchBar.jsx` — colour thresholds from the spec (green/grey/amber)
- `PantryTag.jsx` — "In pantry" / "Missing" tags

---

### Step 3.2 — [CLAUDE CODE] Home screen (static)

**Prompt Claude Code with:**
> "Build the Home screen at `apps/web/src/pages/Home.jsx` using hardcoded data. Implement all three states from the wireframes: default (with hero card + stats + suggestion list), expanded recipe card, and the post-cook toast state. No API calls — import fake data from a local constant."

Reference: `home_screen_v2.html` in the project docs.

---

### Step 3.3 — [CLAUDE CODE] Chef screen (static)

**Prompt Claude Code with:**
> "Build the Chef screen at `apps/web/src/pages/Chef.jsx`. Implement all three states: input form (with chip selectors, servings stepper, notes field), loading/generating state, and result state (with ingredient list, pantry tags, approve/retry buttons). No API calls yet — use a button to manually toggle between states for testing."

Reference: `chef_wireframes.html` in the project docs.

---

### Step 3.4 — [CLAUDE CODE] Pantry screen (static)

**Prompt Claude Code with:**
> "Build the Pantry screen at `apps/web/src/pages/Pantry.jsx`. Include the main grid view with category filters and the full-screen Add Item flow with three tabs: Scan (camera placeholder + manual fallback), Voice (mic button + parsed results state), and Manual (autosuggest input + item confirmation form). No API calls — use hardcoded ingredient list for autosuggest."

---

### Step 3.5 — [CLAUDE CODE] Saved & Profile screens (static)

**Prompt Claude Code with:**
> "Build Saved (`apps/web/src/pages/Saved.jsx`) and Profile (`apps/web/src/pages/Profile.jsx`) screens using hardcoded data. For Saved: list view with search, filter chips, collapsed and expanded card states, cook/delete actions. For Profile: avatar, stats row, dietary preference toggles (local state only), account rows."

Reference: `saved_and_profile_v2.html` in the project docs.

---

### Step 3.6 — [CLAUDE CODE] Auth screen (static)

**Prompt Claude Code with:**
> "Build the Auth screen at `apps/web/src/pages/Auth.jsx`. Full-screen layout with Google SSO button, email/password fields, mode toggle between Sign in and Create account. Wire up form validation logic (client-side only, no API calls yet). Include the 'Maybe later' back option."

---

## Phase 4 — Authentication (connects Phase 1 + 3)
> First thing that wires frontend to a real external service.

---

### Step 4.1 — [CLAUDE CODE] Add Firebase SDK to frontend

**Prompt Claude Code with:**
> "Install `firebase` in `apps/web`. Create `apps/web/src/lib/firebase.js` that initialises the Firebase app using environment variables. Wire up the Zustand authStore to listen to `onAuthStateChanged`. Add the Firebase config values as placeholders."

Placeholders to fill in after running:
```
VITE_FIREBASE_API_KEY=<!-- REPLACE: from Firebase console Step 0.3 -->
VITE_FIREBASE_AUTH_DOMAIN=<!-- REPLACE: from Firebase console Step 0.3 -->
VITE_FIREBASE_PROJECT_ID=<!-- REPLACE: from Firebase console Step 0.3 -->
```

---

### Step 4.2 — [CLAUDE CODE] Wire Auth screen to Firebase

**Prompt Claude Code with:**
> "Connect the Auth screen to Firebase Authentication. Implement: Google OAuth via `signInWithPopup`, email/password sign in via `signInWithEmailAndPassword`, account creation via `createUserWithEmailAndPassword`. On success, call `POST /api/v1/auth/sync` with the Firebase JWT. Handle all error states from the UX spec (wrong password, email not found, etc.)."

---

### Step 4.3 — [CLAUDE CODE] Implement auth middleware and sync endpoint on backend

**Prompt Claude Code with:**
> "Implement the auth middleware in `apps/api/src/middleware/auth.js` using `firebase-admin`. Add the Firebase service account key as an environment variable placeholder. Implement `POST /api/v1/auth/sync` to upsert the user row in PostgreSQL using the decoded Firebase UID."

Placeholder:
```
FIREBASE_SERVICE_ACCOUNT_KEY=<!-- REPLACE: base64-encoded service account JSON from Firebase console → Project Settings → Service accounts -->
```

---

### Step 4.4 — [CLAUDE CODE] Add route guards to frontend

**Prompt Claude Code with:**
> "Create a `ProtectedRoute` component that reads from the Zustand authStore. Wrap Chef, Pantry, and Saved routes with it — redirect to Auth with the intended destination stored in authStore. Update TabBar to show 'Sign in' label when logged out."

---

## Phase 5 — Backend routes (API layer)
> Build each route with its tests. Work feature by feature, not all routes at once.

---

### Step 5.1 — [CLAUDE CODE] Pantry routes + tests

**Prompt Claude Code with:**
> "Implement the pantry routes in `apps/api/src/routes/pantry.js`: GET /pantry, POST /pantry, PATCH /pantry/:id, DELETE /pantry/:id (soft delete). All require auth middleware. Write Vitest unit tests for each route using Supertest. Test: happy path, auth missing (401), item not found (404), soft delete leaves row with deleted_at set."

---

### Step 5.2 — [CLAUDE CODE] Voice parsing route + tests

**Prompt Claude Code with:**
> "Implement `POST /api/v1/pantry/voice` and `POST /api/v1/pantry/bulk`. The voice route takes a transcript string, calls `buildVoiceParsePrompt` in gemini.js, sends it to the Gemini API, and returns the parsed items array. The bulk route takes that array and inserts all items into pantry_items in one transaction. Write tests — mock the Gemini API call and test the parsing and bulk insert logic."

---

### Step 5.3 — [CLAUDE CODE] Recipe routes + tests

**Prompt Claude Code with:**
> "Implement recipe routes: GET /recipes/trending (public, random 5 from DB), GET /recipes/suggestions (auth required, uses pantryMatch.js to rank by match %, time of day, dietary preferences), GET /recipes/:id (full detail with ingredients and steps). Write tests for the suggestion ranking logic, especially the match % calculation and time-of-day ordering."

---

### Step 5.4 — [CLAUDE CODE] Chef generation route + tests

**Prompt Claude Code with:**
> "Implement `POST /api/v1/chef/generate` and `POST /api/v1/chef/:generationId/approve`. Generate: build prompt from pantry snapshot + filters + preferences, call Gemini, parse JSON response, insert into recipes + recipe_ingredients + recipe_steps + chef_generations tables. Approve: mark generation as approved, insert into saved_recipes with is_chef_pick=true, navigate hint in response. Write tests — mock Gemini, test that retry doesn't repeat a recipe_id for the same session."

---

### Step 5.5 — [CLAUDE CODE] Saved, Cook, and Profile routes + tests

**Prompt Claude Code with:**
> "Implement the remaining routes: GET/POST/DELETE /saved, POST /cook (decrement pantry quantities, increment users.cooked_count in a single transaction, remove items that hit 0), GET/PATCH /profile, PATCH /profile/preferences. Write tests for the cook transaction — verify pantry decrement and cooked_count increment happen atomically."

---

## Phase 6 — Connect frontend to API
> Replace all hardcoded data with real API calls, screen by screen.

---

### Step 6.1 — [CLAUDE CODE] API client and React Query setup

**Prompt Claude Code with:**
> "Implement `apps/web/src/lib/api.js` as a base fetch wrapper that automatically attaches the Firebase JWT from Zustand authStore to every request. Set up React Query with sensible defaults (staleTime, retry config). Create query key constants file at `apps/web/src/lib/queryKeys.js`."

---

### Step 6.2 — [CLAUDE CODE] Wire Home screen

**Prompt Claude Code with:**
> "Replace all hardcoded data in Home.jsx with React Query hooks. Implement: pantry count query (30s poll), saved count query (30s poll), suggestions query (refetch on tab focus). Wire 'Cook this' mutation (POST /cook, invalidate pantry + suggestions on success, show Toast). Wire 'Save' mutation (POST /saved, invalidate saved count). Handle loading skeletons and error states per the UX spec."

---

### Step 6.3 — [CLAUDE CODE] Wire Chef screen

**Prompt Claude Code with:**
> "Replace Chef.jsx hardcoded state transitions with real API calls. Implement: 'Chef it' button calls POST /chef/generate and transitions to loading → result state. 'Approve' calls POST /chef/:id/approve then navigates to Saved. 'Retry' calls POST /chef/generate again with same filters (pass previous generationId context). 'Adjust' returns to input with filters preserved in component state."

---

### Step 6.4 — [CLAUDE CODE] Wire Pantry screen

**Prompt Claude Code with:**
> "Wire the Pantry screen: main grid uses GET /pantry with category filter applied client-side. Manual tab: autosuggest searches the ingredients catalogue from GET /recipes (or a new GET /ingredients endpoint — add it if needed). Voice tab: call POST /pantry/voice with transcript, show parsed results, confirm calls POST /pantry/bulk. Edit/delete on existing items calls PATCH and DELETE endpoints."

---

### Step 6.5 — [CLAUDE CODE] Wire Saved and Profile screens

**Prompt Claude Code with:**
> "Wire Saved screen: GET /saved with search and filter applied client-side. 'Cook this' mutation same as Home. 'Delete' calls DELETE /saved/:id with inline confirmation. Wire Profile screen: GET /profile for stats and preferences. PATCH /profile/preferences on every toggle change (immediate, no save button). PATCH /profile for edit profile sub-screen."

---

## Phase 7 — Voice input (MVP feature)

---

### Step 7.1 — [CLAUDE CODE] Implement useVoiceInput hook

**Prompt Claude Code with:**
> "Implement `apps/web/src/hooks/useVoiceInput.js` using the Web Speech API. Hook returns: `start()`, `stop()`, `status` ('idle' | 'listening' | 'processing'), `transcript`. Detect browser support — if `window.SpeechRecognition` and `window.webkitSpeechRecognition` are both undefined, return `{ supported: false }`. Handle the `onresult` and `onerror` events. Do not send to API — just return the transcript string."

---

### Step 7.2 — [CLAUDE CODE] Wire voice tab in Pantry

**Prompt Claude Code with:**
> "Wire the Voice tab in the Pantry Add Item flow using `useVoiceInput`. On transcript received: call POST /pantry/voice, show the parsed results list (sub-state B). Each row is editable. 'Redo' resets to sub-state A. 'Add all to pantry' calls POST /pantry/bulk and closes the Add Item flow. Show the unsupported browser fallback if `supported: false`."

---

## Phase 8 — Observability

---

### Step 8.1 — [CLAUDE CODE] Complete OTel implementation

**Prompt Claude Code with:**
> "The telemetry.js skeleton is already in place. Now add custom spans for the three highest-value operations: `chef.generate` (attributes: user ID, meal type, pantry size, generation duration), `pantry.voice_parse` (attributes: transcript length, items parsed), and `cook.execute` (attributes: ingredients removed count). Wrap each in try/catch with `span.recordException` on error. Verify the Jaeger UI at localhost:16686 receives traces when running locally."

---

## Phase 9 — GCP deployment

---

### Step 9.1 — [YOU] Install and authenticate gcloud CLI

```bash
# Install: https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud config set project <!-- REPLACE: your GCP project ID from Step 0.2 -->
```

---

### Step 9.2 — [YOU] Create Cloud SQL instance

```bash
gcloud sql instances create plated-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=<!-- REPLACE: your preferred region, e.g. northamerica-northeast1 -->

gcloud sql databases create plated_prod --instance=plated-db
gcloud sql users create plated --instance=plated-db --password=<!-- REPLACE: strong password -->
```

---

### Step 9.3 — [YOU] Create Artifact Registry repository

```bash
gcloud artifacts repositories create plated \
  --repository-format=docker \
  --location=<!-- REPLACE: same region as above -->
```

---

### Step 9.4 — [CLAUDE CODE] Write Dockerfiles

**Prompt Claude Code with:**
> "Write a Dockerfile for `apps/api` — Node 20 Alpine base, copy only what's needed, run as non-root user, expose port 3001. Write a Dockerfile for `apps/web` — multi-stage build: Node 20 to build the Vite app, then nginx:alpine to serve the static output. Both Dockerfiles should be in their respective app directories."

---

### Step 9.5 — [YOU] Store secrets in Secret Manager

```bash
# Create each secret (then add the value in the GCP console UI or via echo pipe)
gcloud secrets create DATABASE_URL --replication-policy=automatic
gcloud secrets create GEMINI_API_KEY --replication-policy=automatic
gcloud secrets create FIREBASE_SERVICE_ACCOUNT_KEY --replication-policy=automatic
```

Add the actual values via GCP console → Secret Manager → each secret → "Add version".

---

### Step 9.6 — [CLAUDE CODE] Write GitHub Actions CI/CD workflows

**Prompt Claude Code with:**
> "Write two GitHub Actions workflows: (1) `.github/workflows/ci.yml` — runs on push and PR: installs deps, lints, runs tests with a postgres service container. (2) `.github/workflows/deploy.yml` — runs on merge to main only: builds Docker images for api and web, pushes to Artifact Registry, deploys both to Cloud Run using gcloud CLI. Use GitHub secrets for GCP credentials. Add placeholder comments for all secret names that need to be configured in the GitHub repo settings."

GitHub secrets to add after:
```
GCP_PROJECT_ID=<!-- REPLACE: GCP project ID -->
GCP_SA_KEY=<!-- REPLACE: service account JSON with Cloud Run + Artifact Registry permissions -->
GCP_REGION=<!-- REPLACE: your region -->
```

---

### Step 9.7 — [YOU] First production deploy

```bash
# Trigger manually or push to main
git push origin main
```

Watch the Actions tab in GitHub. Verify both Cloud Run services are healthy in GCP console.

---

### Step 9.8 — [YOU] Run migrations against Cloud SQL

```bash
# Using Cloud SQL Auth Proxy locally to reach the prod DB
cloud-sql-proxy <!-- REPLACE: connection name from Cloud SQL console --> &
DATABASE_URL=<!-- REPLACE: prod connection string --> npm run db:migrate -w apps/api
DATABASE_URL=<!-- REPLACE: prod connection string --> npm run db:seed -w apps/api
```

---

## Phase 10 — Scanning (deferred — decision pending)

> Do not start this phase until the barcode-vs-vision decision is made. The endpoint shape is already reserved in the API (`/api/v1/pantry/scan`). When ready:

**If barcode:** install `@zxing/library` in `apps/web`, add Open Food Facts API call in the scan route.

**If Gemini Vision:** send base64 image to Gemini multimodal in the scan route — response shape is identical to the voice parse response, so the frontend needs no changes.

---

## Parallel work summary

```
Phase 0        Phase 1          Phase 2          Phase 3
[Accounts]  →  [Repo scaffold]  [Database]  ←→  [UI screens]
                    ↓               ↓               ↓
               Phase 4 (Auth — first integration point)
                    ↓
               Phase 5 (Backend routes)
                    ↓
               Phase 6 (Wire frontend to API)
                    ↓
               Phase 7 (Voice)  +  Phase 8 (OTel)
                    ↓
               Phase 9 (GCP deploy)
                    ↓
               Phase 10 (Scanning — when decided)
```

**Phases 2 and 3 are the big parallel opportunity.** Once Phase 1 scaffold is done, one track builds all database migrations and seeds while the other builds all five UI screens as static wireframes. They converge at Phase 4.

---

## Placeholder index

All values marked `<!-- REPLACE: ... -->` in one place for easy tracking:

| Location | Placeholder | Where to get it |
|---|---|---|
| Step 0.2 | GCP Project ID | GCP console after project creation |
| Step 0.3 | Firebase API key | Firebase console → Project Settings → General |
| Step 0.3 | Firebase auth domain | Same as above |
| Step 0.3 | Firebase project ID | Same as above |
| Step 4.1 | `VITE_FIREBASE_API_KEY` | Same as above |
| Step 4.1 | `VITE_FIREBASE_AUTH_DOMAIN` | Same as above |
| Step 4.1 | `VITE_FIREBASE_PROJECT_ID` | Same as above |
| Step 4.3 | `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase console → Project Settings → Service accounts → Generate new private key |
| Step 9.2 | Cloud SQL region | Your choice — pick one close to your users |
| Step 9.2 | Cloud SQL password | Generate a strong one, store it in a password manager |
| Step 9.3 | Artifact Registry region | Same as Cloud SQL |
| Step 9.5 | Secret values | From above steps |
| Step 9.6 | `GCP_PROJECT_ID` GitHub secret | GCP Project ID |
| Step 9.6 | `GCP_SA_KEY` GitHub secret | GCP console → IAM → Service accounts → create one with Cloud Run Admin + Artifact Registry Writer roles |
| Step 9.6 | `GCP_REGION` GitHub secret | Your region |
| Step 9.8 | Cloud SQL connection name | GCP console → Cloud SQL → instance → connection name field |
