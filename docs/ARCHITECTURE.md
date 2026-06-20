# Plated — Technical Architecture & Implementation Guide

> **Audience:** Developer + LLM pair working together to build this project.
> **Purpose:** Single source of truth for every structural, infrastructure, and database decision. Read this before writing any code.

---

## 1. What we're building

Plated is a mobile-first recipe app centred on the question "What can I cook?". Users maintain a pantry of ingredients, and an AI (Google Gemini) generates recipes from what they have. Core screens: Home, Chef (AI generator), Pantry, Saved Recipes, Profile.

Full UX spec lives in `product-ux-acceptance-criteria.md` and `home-saved-profile-requirements.md`. This document covers only technical decisions — architecture, data, infra, observability. When product and tech docs conflict, the product docs win on behaviour; this doc wins on implementation.

---

## 2. Guiding principles

1. **Monorepo now, microservices later.** Everything lives in one repo with clear package boundaries so extraction into separate services requires moving code, not rewriting it.
2. **Scalable by structure, not by premature abstraction.** No unnecessary layers. If a pattern isn't needed yet, don't add it — but name and organise files so that adding it later is obvious.
3. **JavaScript (no TypeScript) for now.** JSDoc comments on shared interfaces are encouraged so a TS migration later is straightforward.
4. **GCP-native hosting.** Every infrastructure choice should have a clear GCP equivalent and avoid lock-in to services that don't exist there.
5. **Mobile web first, native app possible later.** React + React Router today. A React Native migration is feasible without a full rewrite if the state/logic layer is kept separate from the view layer.

---

## 3. Monorepo structure

```
plated/
├── apps/
│   ├── web/                  # React frontend (Vite)
│   └── api/                  # Node.js / Express backend
├── packages/
│   ├── shared/               # Shared constants, validators, JSDoc types
│   └── ui/                   # Shared React component library (design system)
├── infra/                    # GCP / Terraform configs (added when needed)
├── docs/                     # ARCHITECTURE.md, wireframes, requirements
├── .github/
│   └── workflows/            # CI/CD pipelines
├── package.json              # Root — workspace config
└── README.md
```

### Workspace tooling

Use **npm workspaces** (built-in, no extra tooling). Root `package.json`:

```json
{
  "name": "plated",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w apps/api\" \"npm run dev -w apps/web\"",
    "test": "npm run test --workspaces --if-present",
    "lint": "eslint apps/ packages/ --ext .js,.jsx"
  }
}
```

Cross-package imports use the workspace package name, e.g. `import { UNITS } from '@plated/shared'`.

---

## 4. Technology choices

| Layer | Choice | Rationale |
|---|---|---|
| Frontend framework | **React 18 + Vite** | Fast dev server, easy React Native migration path, no Next.js SSR complexity needed |
| Routing | **React Router v6** | SPA routing, tab bar navigation, auth redirect pattern |
| State management | **Zustand** | Lightweight, no boilerplate, easy to split by domain (pantry store, auth store, etc.) |
| Backend | **Node.js + Express** | Simple, well-understood, easy to split into microservices later |
| Database | **PostgreSQL** | See Section 5 |
| ORM / query builder | **Knex.js** | Plain JS, no magic, SQL-close, easy to audit — avoids Sequelize overhead |
| Authentication | **Firebase Authentication** | Managed Google SSO + email/password out of the box; free tier generous; GCP-native; JWT verification on backend is one library call |
| AI / LLM | **Google AI Studio (Gemini)** | `@google/generative-ai` SDK; Gemini 1.5 Flash for cost-efficiency |
| Voice input | **Web Speech API** (browser-native) | Zero dependency for MVP; falls back to manual input if unsupported |
| Image / receipt scanning | **Gemini Vision** (deferred) | When barcode vs vision decision is made, Gemini multimodal handles both paths without adding a new vendor |
| Real-time updates | **Polling via React Query** | See Section 6 |
| Data fetching | **TanStack Query (React Query)** | Cache management, polling, loading/error states — replaces manual fetch logic |
| Observability | **OpenTelemetry** | See Section 12 |
| Testing | **Vitest + React Testing Library** | See Section 15 |
| Linting | **ESLint + Prettier** | Consistent across monorepo |

---

## 5. Database — PostgreSQL

### Why PostgreSQL over MongoDB

The app's data is inherently relational: users own pantry items, recipes have ingredients, ingredients appear in pantries. A document store would require duplicating ingredient data or doing application-level joins. PostgreSQL handles this cleanly, and it's a first-class GCP product via **Cloud SQL for PostgreSQL**.

For local development, run PostgreSQL via Docker (`docker-compose.yml` at root).

---

### Schema

All tables use UUID primary keys. Timestamps are `timestamptz` (UTC). Soft deletes (`deleted_at`) are used on user-owned data so pantry changes are auditable and the "Cooked" count is append-only.

---

#### `users`

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid    TEXT UNIQUE NOT NULL,      -- Firebase Auth UID
  email           TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  city            TEXT,
  role_label      TEXT DEFAULT 'Home cook',  -- shown in profile sub-label
  avatar_url      TEXT,                      -- null until upload is in scope
  cooked_count    INTEGER NOT NULL DEFAULT 0, -- append-only, never decremented
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `firebase_uid` is the lookup key on every authenticated request. Backend verifies the Firebase JWT, extracts the UID, and loads this row.
- `cooked_count` is an append-only counter incremented on every "Cook this" action. Stored directly on the user row for fast profile reads — never decremented.

---

#### `dietary_preferences`

```sql
CREATE TABLE dietary_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vegetarian      BOOLEAN NOT NULL DEFAULT FALSE,
  gluten_free     BOOLEAN NOT NULL DEFAULT FALSE,
  high_protein    BOOLEAN NOT NULL DEFAULT FALSE,
  macro_tracking  BOOLEAN NOT NULL DEFAULT FALSE, -- out of scope v1, stored but unused
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);
```

One row per user, upserted on every toggle change.

---

#### `ingredients` (global catalogue)

```sql
CREATE TABLE ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  name_normalized TEXT NOT NULL,               -- lowercase, trimmed — for dedup search
  category        TEXT NOT NULL,               -- produce | dairy | grains | protein | legumes | other
  default_unit    TEXT NOT NULL,               -- g | ml | pcs | tsp
  allowed_units   TEXT[] NOT NULL DEFAULT '{}', -- e.g. ['g','kg','oz','lb','cups']
  is_countable    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name_normalized)
);
```

This is a shared catalogue seeded at startup. When a user types in Manual mode or speaks in Voice mode, the app searches this table for autosuggest. New user-typed items that don't match can be added to the catalogue or stored as free-text (see `pantry_items`).

---

#### `pantry_items`

```sql
CREATE TABLE pantry_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_id   UUID REFERENCES ingredients(id),  -- null if free-text entry
  name            TEXT NOT NULL,                    -- denormalised for display speed
  category        TEXT NOT NULL,
  quantity        NUMERIC(10,3) NOT NULL,
  unit            TEXT NOT NULL,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ                       -- soft delete
);

CREATE INDEX idx_pantry_items_user ON pantry_items(user_id) WHERE deleted_at IS NULL;
```

**Notes:**
- `ingredient_id` is nullable to support free-text items from voice input that don't resolve to a catalogue entry.
- Soft deletes mean "cook this" decrements are auditable. The `WHERE deleted_at IS NULL` partial index keeps active-item queries fast.

---

#### `recipes` (global catalogue — seeded + AI-generated)

```sql
CREATE TABLE recipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'chef_ai'
  meal_type       TEXT,                            -- breakfast | lunch | dinner | snack
  cuisine         TEXT,
  difficulty      TEXT,                            -- easy | medium | hard
  cook_time_mins  INTEGER,
  servings        INTEGER,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,   -- false = user-private Chef result pre-approval
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

#### `recipe_ingredients`

```sql
CREATE TABLE recipe_ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id   UUID REFERENCES ingredients(id), -- null if AI used a free-text ingredient
  name            TEXT NOT NULL,                   -- denormalised
  quantity        NUMERIC(10,3),
  unit            TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0
);
```

---

#### `recipe_steps`

```sql
CREATE TABLE recipe_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number     INTEGER NOT NULL,
  instruction     TEXT NOT NULL
);
```

---

#### `saved_recipes`

```sql
CREATE TABLE saved_recipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id       UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  is_chef_pick    BOOLEAN NOT NULL DEFAULT FALSE,   -- true if approved from Chef screen
  saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,                      -- soft delete (user deletes from Saved)
  UNIQUE(user_id, recipe_id)
);

CREATE INDEX idx_saved_recipes_user ON saved_recipes(user_id, saved_at DESC)
  WHERE deleted_at IS NULL;
```

---

#### `chef_generations` (retry safety)

```sql
CREATE TABLE chef_generations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id       UUID REFERENCES recipes(id),      -- null until generation completes
  filters         JSONB NOT NULL,                   -- {meal_type, cook_time, difficulty, cuisine, servings, notes}
  pantry_snapshot JSONB NOT NULL,                   -- snapshot of pantry at generation time
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | success | failed
  retry_of        UUID REFERENCES chef_generations(id), -- chain retries
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Powers the "Retry generates something different" guarantee — the backend checks this table to avoid repeating a `recipe_id` for the same `user_id` + `filters` session.

---

### Knex migrations

All schema changes are managed via Knex migrations in `apps/api/db/migrations/`. Never alter a table directly — always write a migration file.

```
apps/api/
└── db/
    ├── knexfile.js          # env-based config
    ├── migrations/
    │   ├── 20240101_001_create_users.js
    │   ├── 20240101_002_create_ingredients.js
    │   └── ...
    └── seeds/
        └── ingredients.js   # seed the global ingredient catalogue
```

---

## 6. Real-time updates strategy

**Recommendation: React Query polling with smart invalidation.**

True WebSockets add operational complexity (connection management, reconnect logic, GCP load balancer config) that isn't justified at MVP scale. Polling via React Query is simpler, GCP-friendly, and imperceptible to users at reasonable intervals.

| Data | Poll interval | Notes |
|---|---|---|
| Pantry item count (hero card, stats) | 30s | Also invalidated immediately on any pantry mutation |
| Saved recipe count (stats) | 30s | Also invalidated on save/delete |
| Suggestions on Home | On tab focus | `refetchOnWindowFocus: true` in React Query |
| Cooked count (profile) | 60s | Append-only, low urgency |

**Pattern:** Mutations (Cook this, Save, Add pantry item) call `queryClient.invalidateQueries()` for the relevant keys immediately — so the UI updates instantly after a user action without waiting for the next poll. Polling is only the safety net for background changes.

When you're ready to go real-time properly (WebSockets or SSE), the React Query layer makes this a swap at the data-fetching hook level without touching components.

---

## 7. API design

### Structure

REST API under `/api/v1/`. All endpoints require a Firebase JWT in `Authorization: Bearer <token>` except those marked `[public]`.

```
apps/api/
├── src/
│   ├── index.js              # Express app entry
│   ├── middleware/
│   │   ├── auth.js           # Firebase JWT verification
│   │   ├── errorHandler.js
│   │   └── requestLogger.js  # OpenTelemetry spans
│   ├── routes/
│   │   ├── auth.js           # POST /api/v1/auth/sync
│   │   ├── pantry.js
│   │   ├── recipes.js
│   │   ├── chef.js
│   │   ├── saved.js
│   │   └── profile.js
│   ├── services/
│   │   ├── gemini.js         # Gemini API wrapper
│   │   ├── pantryMatch.js    # pantry % match calculation
│   │   └── voice.js         # voice transcript → structured items
│   └── db/
│       └── index.js          # Knex instance
```

### Key endpoints

```
POST   /api/v1/auth/sync              # Called once post-login: upsert user row from Firebase JWT
GET    /api/v1/pantry                 # List user's active pantry items
POST   /api/v1/pantry                 # Add one item
PATCH  /api/v1/pantry/:id            # Edit quantity/unit
DELETE /api/v1/pantry/:id            # Soft delete

POST   /api/v1/pantry/voice          # Submit transcript → returns parsed items array
POST   /api/v1/pantry/bulk           # Add multiple items at once (voice "Add all")

GET    /api/v1/recipes/trending      # [public] Random selection, no auth required
GET    /api/v1/recipes/suggestions   # Pantry-matched, ranked, auth required
GET    /api/v1/recipes/:id           # Recipe detail with ingredients + steps

POST   /api/v1/chef/generate         # Trigger Gemini generation, returns recipe
POST   /api/v1/chef/:generationId/approve  # Approve → save to Saved

GET    /api/v1/saved                 # List saved recipes (with pantry match %)
POST   /api/v1/saved                 # Save a recipe from Home
DELETE /api/v1/saved/:id             # Soft delete

POST   /api/v1/cook                  # "Cook this" — decrement pantry + log event

GET    /api/v1/profile               # Get profile + stats + preferences
PATCH  /api/v1/profile               # Update display name, city, role
PATCH  /api/v1/profile/preferences   # Update dietary preference toggles
```

### Error response shape

All errors return:

```json
{
  "error": {
    "code": "PANTRY_ITEM_NOT_FOUND",
    "message": "Pantry item not found.",
    "status": 404
  }
}
```

Error codes live in `packages/shared/errors.js` so frontend and backend use the same constants.

---

## 8. Authentication flow

**Firebase Authentication** handles credential storage, Google OAuth, and JWT issuance. The backend never stores passwords.

```
Frontend                    Backend                     Firebase
   │                           │                           │
   │── "Continue with Google" ─►│                           │
   │                           │◄── OAuth flow ────────────│
   │◄── Firebase JWT ──────────│                           │
   │                           │                           │
   │── POST /auth/sync ────────►│                           │
   │   (Bearer: <JWT>)         │── verify token ──────────►│
   │                           │◄── decoded UID ───────────│
   │                           │── upsert users row        │
   │◄── { user } ──────────────│                           │
```

### Frontend auth state (Zustand)

```js
// packages/ui is for components; auth state lives in apps/web/src/stores/authStore.js
{
  user: null | { id, email, displayName, firebaseUid },
  token: null | string,     // Firebase ID token, refreshed automatically
  status: 'loading' | 'authenticated' | 'unauthenticated',
  intendedDestination: null | string  // stored before auth redirect
}
```

### Backend middleware

```js
// apps/api/src/middleware/auth.js
const { getAuth } = require('firebase-admin/auth');

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  const decoded = await getAuth().verifyIdToken(token);
  req.firebaseUid = decoded.uid;
  req.user = await db('users').where({ firebase_uid: decoded.uid }).first();
  next();
}
```

---

## 9. AI — Gemini integration

### Chef generation flow

```
Frontend                    Backend                     Gemini
   │                           │                           │
   │── POST /chef/generate ────►│                           │
   │   {filters, notes}        │── build prompt ───────────►│
   │                           │   (pantry snapshot +      │
   │                           │    filters + preferences) │
   │                           │◄── recipe JSON ───────────│
   │                           │── insert recipe rows      │
   │                           │── insert chef_generation  │
   │◄── { generationId,        │                           │
   │      recipe } ────────────│                           │
```

### Prompt structure (in `apps/api/src/services/gemini.js`)

```js
function buildChefPrompt({ pantryItems, filters, preferences, previousRecipeIds }) {
  return `
You are a recipe generator. Generate ONE recipe using primarily the ingredients listed.

PANTRY INGREDIENTS:
${pantryItems.map(i => `- ${i.name} (${i.quantity} ${i.unit})`).join('\n')}

REQUIREMENTS:
- Meal type: ${filters.mealType}
- Cook time: ${filters.cookTime}
- Difficulty: ${filters.difficulty}
${filters.cuisine ? `- Cuisine: ${filters.cuisine}` : ''}
- Servings: ${filters.servings}
${filters.notes ? `- User notes: ${filters.notes}` : ''}

DIETARY PREFERENCES (apply strictly):
${preferences.vegetarian ? '- Vegetarian: no meat or fish' : ''}
${preferences.glutenFree ? '- Gluten-free: no gluten-containing ingredients' : ''}
${preferences.highProtein ? '- High protein: prioritise protein-rich ingredients' : ''}

${previousRecipeIds.length ? `DO NOT generate any of these recipes again (IDs already seen this session): ${previousRecipeIds.join(', ')}` : ''}

Respond ONLY with a valid JSON object in this exact shape:
{
  "name": "Recipe Name",
  "cook_time_mins": 30,
  "difficulty": "easy",
  "servings": 2,
  "cuisine": "Mediterranean",
  "ingredients": [
    { "name": "Tomatoes", "quantity": 3, "unit": "pcs", "in_pantry": true },
    { "name": "Cumin", "quantity": 1, "unit": "tsp", "in_pantry": false }
  ],
  "steps": [
    { "step_number": 1, "instruction": "Heat olive oil in a pan..." }
  ]
}
`.trim();
}
```

### Voice transcript → pantry items

Also handled by Gemini (simpler model call):

```js
function buildVoiceParsePrompt(transcript) {
  return `
Parse this spoken ingredient list into structured JSON.
Infer quantities and units from context (e.g. "6 eggs" → pcs, "500g of rice" → g).
If unit cannot be inferred, default to "g" for solids, "ml" for liquids.

Transcript: "${transcript}"

Respond ONLY with a JSON array:
[
  { "name": "Eggs", "quantity": 6, "unit": "pcs" },
  { "name": "Rice", "quantity": 500, "unit": "g" }
]
`.trim();
}
```

---

## 10. Voice input (MVP)

### Web Speech API

The browser-native `SpeechRecognition` API requires no dependencies and no server round-trip for the recording itself. The transcript is then sent to `/api/v1/pantry/voice` where Gemini parses it.

```js
// apps/web/src/hooks/useVoiceInput.js
export function useVoiceInput({ onTranscript }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  // ...start(), stop(), status: 'idle' | 'listening' | 'processing'
}
```

**Browser support note:** Chrome and Edge support this natively. Safari requires a flag. Firefox does not support it. For MVP this is acceptable — show a fallback message prompting Manual tab if unsupported. When moving to a native app, this swaps to `expo-speech` or the platform SDK.

### Image / receipt scanning (deferred — architecture note)

When the barcode-vs-vision decision is made, the approach is:

- **Barcode only:** use `@zxing/library` (browser-based barcode decoder) + a product lookup API (Open Food Facts is free and has a large DB). No Gemini call needed.
- **Full image / receipt:** send the image to `/api/v1/pantry/scan` where it's passed to Gemini Vision (`gemini-1.5-flash` supports multimodal). Returns the same parsed-items JSON shape as voice.
- **Both:** the endpoint accepts either a barcode string or a base64 image and routes accordingly.

The frontend Add Item UI already has the Scan tab placeholder — no structural changes needed when this ships.

---

## 11. Pantry match calculation

The `% in pantry` value shown on recipe cards is computed server-side on the `GET /recipes/suggestions` and `GET /saved` endpoints, not client-side. This keeps the logic in one place.

```js
// apps/api/src/services/pantryMatch.js
function calculateMatch(recipeIngredients, pantryItems) {
  const pantryNames = new Set(
    pantryItems.map(i => i.name.toLowerCase().trim())
  );
  const total = recipeIngredients.length;
  const matched = recipeIngredients.filter(
    i => pantryNames.has(i.name.toLowerCase().trim())
  ).length;
  return total === 0 ? 0 : Math.round((matched / total) * 100);
}
```

Suggestions are ranked: `match_pct DESC, CASE WHEN meal_type = $timeOfDayMealType THEN 0 ELSE 1 END`.

---

## 12. Observability — OpenTelemetry

### Backend instrumentation

```
apps/api/
└── src/
    └── telemetry.js   # OTel SDK setup — imported first in index.js
```

```js
// apps/api/src/telemetry.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

`getNodeAutoInstrumentations()` automatically instruments:
- All Express HTTP requests (trace per request)
- All `pg` / Knex database queries (trace per query)
- `node-fetch` / `axios` outbound calls (Gemini API calls get traced)

### Custom spans for business logic

```js
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('plated-api');

async function generateRecipe(params) {
  return tracer.startActiveSpan('chef.generate', async (span) => {
    span.setAttributes({
      'user.id': params.userId,
      'chef.meal_type': params.filters.mealType,
      'chef.pantry_size': params.pantryItems.length,
    });
    try {
      const result = await callGemini(params);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

### GCP export target

In production on GCP, export to **Google Cloud Trace** (free, native). Set:
```
OTEL_EXPORTER_OTLP_ENDPOINT=https://cloudtrace.googleapis.com/v2
```

For local dev, run **Jaeger** via Docker (`docker-compose.yml`) and point the exporter there.

### Metrics (add after traces are working)

Use `@opentelemetry/sdk-metrics` to track:
- `plated.chef.generation.duration` (histogram)
- `plated.pantry.item_count` (gauge per user, sampled)
- `plated.recipe.save_count` (counter)

Export metrics to **Google Cloud Monitoring**.

---

## 13. GCP hosting plan

### MVP (start here)

| Component | GCP service |
|---|---|
| Frontend | **Cloud Run** (serve Vite build as static via `serve` or nginx container) |
| Backend API | **Cloud Run** (Node.js container) |
| Database | **Cloud SQL for PostgreSQL** (db-f1-micro for dev, db-g1-small for prod) |
| Secrets | **Secret Manager** (DB password, Gemini API key, Firebase service account) |
| Container registry | **Artifact Registry** |
| CI/CD | **GitHub Actions** → build → push to Artifact Registry → deploy to Cloud Run |

### Later (when traffic justifies it)

| Component | GCP service |
|---|---|
| API Gateway | **Cloud Endpoints** or **API Gateway** (when microservices split happens) |
| Background jobs | **Cloud Tasks** (async Gemini calls if response time becomes a concern) |
| CDN | **Cloud CDN** (in front of Cloud Run for frontend) |
| Observability | **Cloud Trace + Cloud Monitoring** (OTel already wired) |

### Native app path (longer term)

When ready for Google Play / App Store:
- React → **React Native (Expo)** is the cleanest migration. Keeping business logic in hooks and Zustand stores (not components) now makes this much easier.
- Backend is identical — same REST API, same auth.
- Web Speech API → `expo-speech` for voice.
- No backend changes needed for the app store submission.

---

## 14. Environment variables

```
# apps/api/.env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://plated:plated@localhost:5432/plated_dev
FIREBASE_PROJECT_ID=plated-dev
GEMINI_API_KEY=...
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=plated-api

# apps/web/.env
VITE_API_URL=http://localhost:3001
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=plated-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=plated-dev
```

Never commit `.env` files. Use `.env.example` files with placeholder values.

---

## 15. Testing

### Philosophy

Unit test business logic and services. Integration test API routes. Don't test React component internals — test behaviour from the user's perspective.

### Stack

| Layer | Tool |
|---|---|
| Unit + integration | **Vitest** (fast, ESM-native, same config as Vite) |
| React component | **React Testing Library** |
| API route tests | **Supertest** + Vitest |
| DB in tests | In-memory SQLite via Knex (same schema, swap dialect) or a dedicated test Postgres DB |
| Test data | **@faker-js/faker** for fixtures |

### File structure

Co-locate tests next to the files they test:

```
apps/api/src/services/
├── pantryMatch.js
└── pantryMatch.test.js

apps/web/src/components/
├── RecipeCard/
│   ├── RecipeCard.jsx
│   └── RecipeCard.test.jsx
```

### What to test first (prioritised)

1. `pantryMatch.js` — pure function, zero setup, high value
2. `gemini.js` prompt builder — mock the API call, test the prompt output
3. Voice parse logic — given a transcript, assert the structured output shape
4. `POST /api/v1/cook` route — pantry decrement logic, cooked count increment, transaction integrity
5. `POST /api/v1/chef/generate` route — mock Gemini, assert generation is stored + returned
6. Auth middleware — valid token passes, invalid token 401s

### Running tests

```bash
npm run test                    # all workspaces
npm run test -w apps/api        # backend only
npm run test -w apps/web        # frontend only
npm run test -- --coverage      # with coverage report
```

---

## 16. CI/CD — GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: plated_test
          POSTGRES_USER: plated
          POSTGRES_PASSWORD: plated
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run test
```

Deployment to Cloud Run fires on merge to `main` only (separate `deploy.yml` workflow).

---

## 17. Local development setup

### Prerequisites
- Node.js 20+
- Docker Desktop (for PostgreSQL + Jaeger)

### `docker-compose.yml` (at repo root)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: plated_dev
      POSTGRES_USER: plated
      POSTGRES_PASSWORD: plated
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - '16686:16686'   # Jaeger UI → http://localhost:16686
      - '4318:4318'     # OTLP HTTP receiver

volumes:
  pgdata:
```

### First-time setup

```bash
git clone https://github.com/your-org/plated.git
cd plated
npm install                        # installs all workspaces
docker compose up -d               # start postgres + jaeger
npm run db:migrate -w apps/api     # run all migrations
npm run db:seed -w apps/api        # seed ingredient catalogue
npm run dev                        # starts both api + web
```

---

## 18. Open decisions (log here, don't code around them)

| Decision | Options | Status |
|---|---|---|
| Barcode vs vision scanning | Barcode (ZXing + Open Food Facts) vs Gemini Vision for full image | Undecided — architecture supports both paths |
| Approve flow | Auto-save vs naming confirmation | Product decision pending |
| Retry behaviour | Immediate re-generate vs filter adjustment prompt | Product decision pending |
| Shopping list feature | Fully specced as out-of-scope v1 | Deferred |
| Macro tracking | Toggle visible, no backend effect | Deferred |

---

## 19. Glossary

| Term | Meaning |
|---|---|
| Chef | The AI recipe generation feature (and screen) |
| Pantry | The user's stored ingredient list |
| Generation | One Gemini call + its result, tracked in `chef_generations` |
| Approve | User accepts a Chef result → saved to `saved_recipes` |
| Cook this | User marks a recipe as cooked → pantry decremented, cooked count incremented |
| Pantry match % | % of recipe ingredients that exist in the user's current pantry |
| Firebase UID | The identifier Firebase Auth gives every user; primary join key between Firebase and our DB |
