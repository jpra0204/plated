# Plated — Phase A Build Plan (Pre-Launch Friend Release)

> **How to use this:** This is the source of truth for Claude Code. Work top to bottom — steps are ordered by dependency, not arbitrarily. Steps marked **[CLAUDE CODE]** are ready to hand off directly. Steps marked **[YOU]** require Pablo's review or a manual decision before Claude Code proceeds. Where an assumption was made because it wasn't explicitly specified, it's flagged with **[ASSUMPTION]** — flag back if wrong, otherwise proceed as written.
>
> Reference existing project docs for context: `ARCHITECTURE.md`, `product-ux-acceptance-criteria.md`, `home-saved-profile-requirements.md`, and the current-state summary. Do not re-implement anything already listed as built in the current-state summary.

---

## Ordering rationale

1. **Recipe detail page** comes first because Chef-approve, Home, and Saved all redirect into it — nothing downstream can be wired correctly until it exists.
2. **Pantry expiration tracking** comes before **freshness weighting in the Chef prompt** and before the **Home expiring-soon badge**, since both read expiry data that doesn't exist yet.
3. **Bulk delete** and **recipe caching** are independent of everything else and can slot in anywhere — placed after the pantry/detail-page work since they're lower urgency.
4. **Auth model rework** must happen before **the landing page**, since the landing page's CTA routing depends on the new auth redirect logic.

---

## A1 — Recipe detail page [CLAUDE CODE]

### Product requirements
- New route: `/recipe/:id`
- Full-screen page, tab bar remains visible (standard authenticated screen).
- Header content: recipe name, cook time, difficulty, servings, Chef badge if `source === 'chef_ai'`.
- **Save icon** — top-right corner of the page. Bookmark icon, filled state when the recipe is already saved for this user, outline/empty state when it isn't. Tapping toggles save/unsave immediately (optimistic update + toast).
- Ingredient list — full list with "In pantry" / "Missing" tags, same visual style as existing expanded cards.
- Numbered steps.
- **"Cook this"** — the only other CTA on this page. Sticky button, fixed to the bottom of the screen, positioned *above* the tab bar (not overlapping it). Tapping it runs the existing cook logic (decrement pantry, increment cooked count, toast, invalidate queries).
- This page must work in two contexts:
  - **Unsaved recipe** (e.g. arriving from Home's Trending/Suggested before saving): save icon starts empty; tapping it saves.
  - **Already-saved recipe** (arriving from Saved list, or from Chef after Approve): save icon starts filled.
- No inline expand/collapse anywhere else — this page is the only place ingredients + steps are shown in full.

### Prompt for Claude Code
> "Create a new route `/recipe/:id` rendering a full recipe detail page. Fetch recipe data via `GET /api/v1/recipes/:id` (existing endpoint). Header shows name, cook time, difficulty, servings, and a Chef sparkles badge if the recipe's source is `chef_ai`. Add a bookmark icon button in the top-right of the header — filled if the recipe is in the user's saved collection, outline if not — tapping it calls the save/unsave mutation and updates optimistically with a toast. Below the header: ingredient list with in-pantry/missing tags, then numbered steps. Add a sticky 'Cook this' button fixed above the tab bar, calling the existing cook mutation, with the existing toast and query invalidation behavior. Use the visual style already established in the Saved and Home expanded-card components as the reference — do not introduce new visual patterns."

---

## A2 — Migrate all recipe entry points to the detail page [CLAUDE CODE]

### Product requirements
- **Home** (both "Trending" and "Suggested for you" rows): tapping a row navigates to `/recipe/:id` instead of expanding inline. Remove the inline expanded-card component and its "Cook this"/"Save" buttons entirely from Home.
- **Saved**: tapping a card's top zone navigates to `/recipe/:id` instead of expanding inline. Remove the inline expanded-card component and its "Cook this"/"Delete" buttons from Saved. (Delete still needs a home — see note below.)
- **All recipe card list views** (Home rows, Saved cards): add a small **non-clickable saved indicator icon** (filled bookmark, no tap target) on cards that are already saved, so the user can tell at a glance without opening the detail page.
- **Delete recipe** (previously a CTA inside Saved's expanded card): since the expanded card is gone, move this to a swipe-to-delete or an overflow/kebab menu on the Saved list card itself. **[ASSUMPTION]** Using swipe-to-delete with the existing inline confirm pattern ("Remove this recipe?") — flag if you'd prefer a different interaction.

### Prompt for Claude Code
> "Remove the inline expanded-card behavior from Home.jsx and Saved.jsx. Tapping any recipe row/card in either screen now navigates to `/recipe/:id` using React Router. Add a small filled-bookmark indicator icon (non-interactive) to any card that is already in the user's saved collection, in both Home and Saved list views. Since Saved's expanded card previously hosted the 'Delete' action, implement swipe-to-delete on the Saved list card with the existing inline confirmation copy ('Remove this recipe?' / Confirm / Cancel)."

---

## A3 — Chef "Approve" redirects to detail page [CLAUDE CODE]

### Product requirements
- Chef's Result state keeps its current three buttons: **Approve**, **Retry**, **Adjust** — no change to that screen's behavior or layout.
- Approve is still the moment the recipe is saved (as today) — this is intentional, so the user still has the option to Retry before committing.
- After a successful Approve, instead of navigating to `/saved`, navigate to `/recipe/:id` for the newly approved recipe.

### Prompt for Claude Code
> "Update the Chef screen's Approve action: after the approve mutation succeeds, navigate to `/recipe/:id` for the newly created recipe instead of navigating to `/saved`. No other changes to the Chef input/generating/result state logic."

---

## A4 — Pantry header: remove item count, add "last updated" + "Select" [CLAUDE CODE]

### Product requirements
- Remove the "N items" text currently shown top-right of the Pantry header.
- Replace it with a **"Select"** text link in that same position, top-right of the header (entry point for bulk delete — see A7).
- Directly below the header row, add a small text line using the **same typography as the old item counter**, reading:
  - `Last updated: {Recipe Name} · {time ago}` — when the most recent pantry mutation was a "Cook this" action. Example: `Last updated: Shakshuka · 2h ago`
  - `Last updated: manual add · {time ago}` — when the most recent mutation was adding an item (Voice, Manual, or later Scan)
  - `Last updated: manual edit · {time ago}` — when the most recent mutation was editing a quantity
  - `Last updated: manual delete · {time ago}` — when the most recent mutation was deleting an item (single or bulk)
- This requires tracking the last mutation type + timestamp + (if applicable) recipe name at the user level. **[ASSUMPTION]** Store this as `last_pantry_update` JSONB on the `users` row (shape: `{ type: 'cook'|'add'|'edit'|'delete', recipe_name?: string, updated_at: timestamptz }`), updated on every relevant mutation. Flag if you'd rather this live elsewhere (e.g. its own table).

### Prompt for Claude Code
> "In the Pantry screen header, remove the '{n} items' text. In its place, add a 'Select' text link (this will later trigger bulk-delete mode — implement the UI now, wire the behavior in a later step). Below the header row, add a small text element matching the typography of the old item counter, showing 'Last updated: {label} · {time ago}' where label is the recipe name for cook-triggered updates, or one of 'manual add' / 'manual edit' / 'manual delete' for other pantry mutations. Add a `last_pantry_update` JSONB column to the `users` table via migration, shaped `{ type, recipe_name, updated_at }`. Update this column inside the existing cook, pantry add, pantry edit, and pantry delete endpoints. Expose it on `GET /api/v1/profile` (or `GET /api/v1/pantry`, whichever is already fetched on the Pantry screen) and render it with a relative-time formatter (e.g. '2h ago')."

---

## A5 — Pantry expiration tracking (MVP) [CLAUDE CODE + YOU checkpoint]

### Product requirements
- Every ingredient in the catalogue gets a default shelf-life value (in days).
- When a pantry item is added, its expiry date is auto-calculated as `added_at + shelf_life_days`.
- The expiry date is **user-editable** — tapping into a pantry item's expanded/edit view (the existing tap-to-edit stepper interaction) should also expose an editable expiry date field.
- The pantry tile shows a **visible countdown** at all times (not just when expanded) — e.g. "Expires in 3 days".
- When an item is within the "expiring soon" window, show a **visual warning indicator** on the tile (e.g. amber tag/icon, consistent with the amber "Missing" tag styling already used elsewhere in the app for consistency).
- **[ASSUMPTION]** "Expiring soon" threshold defaults to **3 days or fewer remaining**. Flag if you want a different number.

### ⚠️ Review checkpoint — [YOU]
Before Claude Code runs the migration/seed, it must first output a **reviewable list** (e.g. a markdown table or CSV) of every ingredient in the current catalogue with its proposed default shelf-life in days, grouped by category. Pablo reviews and edits this list before the seed is finalized. Do not seed the database until this list is approved.

### Prompt for Claude Code
> "First: generate a markdown table listing every ingredient currently in the `ingredients` catalogue, with a proposed `shelf_life_days` value for each, grouped by category (produce, dairy, grains, protein, legumes, other). Use general food-safety norms (e.g. garlic ~30 days, milk ~7 days, fresh herbs ~7 days, rice/dry grains ~365 days). Output this table and stop — do not write migrations or seed data yet. Wait for explicit approval on the values before proceeding.
>
> Once approved: add a `shelf_life_days` column to the `ingredients` table via migration, and update the seed file with the approved values. Add an `expiry_date` column to `pantry_items` (nullable timestamptz), auto-calculated as `added_at + shelf_life_days` on insert when the item resolves to a catalogue ingredient (leave null for free-text items with no catalogue match, unless the user sets one manually). Make `expiry_date` editable via the existing pantry item tap-to-edit UI — add an editable date field alongside the existing quantity stepper. On the pantry tile itself (not just the expanded state), show 'Expires in N days' text at all times. When `expiry_date` is 3 days or fewer away, show a visual warning indicator on the tile using the same amber styling already used for 'Missing' ingredient tags elsewhere in the app."

---

## A6 — Home: pantry expiring-soon warning [CLAUDE CODE]

*(Depends on A5.)*

### Product requirements
- On Home's "Pantry items" stat card, show a warning badge/text reading **"N items expiring soon"** whenever at least one pantry item is within the expiring-soon window (same 3-day threshold as A5).
- If nothing is expiring soon, the stat card looks exactly as it does today — no empty warning state shown.

### Prompt for Claude Code
> "On the Home screen's 'Pantry items' stat card, add a small warning line reading '{n} items expiring soon' whenever one or more pantry items have an `expiry_date` within 3 days. Omit this line entirely when no items qualify. Reuse the amber warning styling from the Pantry tile expiration indicator (A5) for visual consistency."

---

## A7 — Pantry bulk delete [CLAUDE CODE]

*(The "Select" link entry point was already added to the header in A4 — this step wires the actual behavior.)*

### Product requirements
- Tapping **"Select"** (top-right of Pantry header) enters selection mode.
- In selection mode:
  - Tiles no longer expand on tap (the existing tap-to-edit stepper is suspended).
  - Each tile shows a checkbox (top-left corner); tapping the tile toggles its checked state.
  - Selected tiles get a subtle primary-colored border/tint, consistent with the existing "active" tile styling seen in the current tap-to-edit state.
  - A bottom action bar appears, docked above the tab bar: **"Cancel"** (left) and **"Delete (n)"** (right — disabled/greyed while `n === 0`).
- Tapping **"Delete (n)"** shows an inline confirmation ("Delete {n} items?" / Confirm / Cancel) before removing them.
- Confirming exits selection mode and returns to normal tap-to-expand behavior; "Cancel" does the same without deleting anything.
- This is a soft delete (`deleted_at`), consistent with existing single-item delete behavior.
- This bulk delete action should also update the `last_pantry_update` field from A4 (type: `delete`).

### Prompt for Claude Code
> "Implement Pantry bulk-delete selection mode, triggered by the existing 'Select' link in the header. While active: tiles show a checkbox instead of expanding on tap; tapping toggles selection with a border/tint matching the existing active-tile style. Show a bottom action bar above the tab bar with 'Cancel' and 'Delete (n)' (disabled at n=0). Confirming shows an inline 'Delete {n} items?' confirmation before soft-deleting the selected pantry items (batch call, single transaction) and exiting selection mode. Update the `last_pantry_update` user field with `{ type: 'delete', updated_at: now }` on successful bulk delete."

---

## A8 — Recipe caching by filters [CLAUDE CODE]

### Product requirements
- On a fresh **"Chef it"** generation (not Retry): before calling Gemini, search the `recipes` catalogue for a match on `meal_type`, `cook_time`, `difficulty`, `cuisine`, and active dietary preferences. **Servings is excluded from matching.**
- Cache lookup is **bypassed entirely** (always call Gemini) whenever the "Extra notes" field is non-empty — this is already the documented behavior, just confirming it stays.
- Among candidate matches, additionally rank by **pantry ingredient overlap** — the cached recipe whose ingredient list overlaps most with the user's current pantry wins.
- If multiple candidates tie on overlap, take the first one returned (no further tie-breaking logic needed).
- On a cache hit: **scale ingredient quantities** to match the servings the user requested for this generation (e.g. cached recipe was for 2 servings, user requested 4 → multiply all ingredient quantities by 2).
- **Retry** always calls Gemini fresh — it never checks the cache, since its entire purpose is to produce something different from what was just shown.

### Prompt for Claude Code
> "Implement cache-first recipe lookup for Chef's fresh 'Chef it' generation flow (not Retry). Before calling Gemini, query the `recipes` table for candidates matching `meal_type`, `cook_time_mins`, `difficulty`, and `cuisine`, filtered further by the user's active dietary preferences, but excluding `servings` from the match. Skip this lookup entirely if the Extra Notes field is non-empty. Among matching candidates, rank by ingredient overlap with the user's current pantry (highest overlap wins; ties resolved by taking the first result). On a cache hit, scale all `recipe_ingredients` quantities proportionally to the user's requested servings before returning the recipe. Retry must always bypass this cache and call Gemini directly, exactly as it does today."

---

## A9 — Chef: pantry freshness weighting in prompt [CLAUDE CODE — paused]

*(Depends on A5 for expiry data to exist.)*

### Product requirements
- The Gemini prompt should be made aware of which pantry ingredients are closer to expiring, so it can be biased toward using them.

### ⚠️ Do not implement prompt logic yet
Scaffold the function signature and data plumbing only (i.e., make sure `days_until_expiry` per pantry item is available to `buildChefPrompt()`), but **leave the actual prompt wording as a TODO**. Pablo will provide the specific prompt design once expiration data (A5) is live and he's had a chance to see it in practice.

### Prompt for Claude Code
> "Update `buildChefPrompt()` in `apps/api/src/services/gemini.js` so that each pantry item passed into the prompt includes a computed `days_until_expiry` value (from the `expiry_date` added in A5). Do NOT write the actual prompt instructions for how Gemini should use this data yet — leave a clear `// TODO: Pablo to provide freshness-weighting prompt language` comment at the relevant spot and stop there."

---

## A10 — Chef: "trying something new" cuisine option [CLAUDE CODE]

### Product requirements
- Add an option at the top of the existing cuisine dropdown list, e.g. **"Surprise me — pick for me"**.
- Selecting it does not lock in a specific cuisine — instead, the backend picks a cuisine at random from the pre-defined cuisine list at generation time.
- All other filters (meal type, cook time, difficulty, servings) behave exactly as normal — only the cuisine is randomized.
- **[ASSUMPTION]** Random selection is uniform across the existing cuisine list (no weighting toward cuisines the user hasn't tried). Flag if you want weighting instead.

### Prompt for Claude Code
> "Add a 'Surprise me — pick for me' option at the top of the Chef cuisine dropdown. When selected, the frontend sends no fixed cuisine value; the backend, inside the chef generation route, picks one cuisine at random (uniform distribution) from the existing predefined cuisine list before building the Gemini prompt. All other filters behave unchanged."

---

## A11 — Auth model rework [CLAUDE CODE]

### Product requirements
- Home moves behind the same `ProtectedRoute` pattern already used for Chef, Pantry, and Saved.
- **Delete** the entire signed-out Home experience: the no-name greeting, "Create an account..." hero variant, "--" stat cards with "Sign in to track" links, and the public Trending feed used for logged-out users. None of this is needed anymore.
- Signed-out users hitting `/home` (or any protected route) redirect to the Auth page exactly as Chef/Pantry/Saved already do today — no special-cased "Maybe later" link for Home (that pattern remains unique to the Profile/Sign-in tab, unchanged).
- After successful authentication, default redirect destination (when none was stored) becomes `/home`, not `/` .

### Prompt for Claude Code
> "Wrap the Home route in the existing `ProtectedRoute` component, identical to Chef/Pantry/Saved. Delete all signed-out-specific Home UI: the anonymous greeting, the 'Create an account to start cooking' hero variant, the '--' stat cards with 'Sign in to track' links, and the public Trending feed component used only for logged-out users. Update the auth redirect default (when no intended destination was stored) to `/home` instead of `/`. Leave the Profile tab's 'Sign in' behavior and its 'Maybe later' option untouched."

---

## A12 — Landing page [CLAUDE CODE — needs live execution-time guidance]

*(Depends on A11 — the routing this page relies on must exist first.)*

### Product requirements
- Route: `/` (root). This is now a distinct route from `/home`.
- Pure marketing content: copy, one or more screenshots, and CTA button(s). No live data, no recipe previews.
- CTA behavior: 
  - If the visitor is already authenticated, the CTA routes straight to `/home`.
  - If not authenticated, the CTA routes to the Auth page; on successful authentication, the user lands on `/home`.
- **This step needs a live working session with Pablo** to choose screenshots, write copy, and decide page structure/sections — do not have Claude Code freelance the content or layout. Treat this step as "scaffold only" until that session happens.

### Prompt for Claude Code
> "Create a new route at `/` rendering a standalone landing page (no tab bar), separate from `/home`. For now, scaffold the page structure only: a hero section (headline + subhead placeholders), a screenshot placeholder section, and a primary CTA button. Wire the CTA so that authenticated visitors are routed to `/home` and unauthenticated visitors are routed to the Auth page (which itself already redirects to `/home` on success). Do not finalize copy, imagery, or visual design yet — flag this page as pending a content/design pass."

---

## Summary — build order

| # | Step | Depends on |
|---|---|---|
| A1 | Recipe detail page | — |
| A2 | Migrate entry points to detail page | A1 |
| A3 | Chef Approve → detail page redirect | A1 |
| A4 | Pantry header: remove count, add last-updated + Select | — |
| A5 | Expiration tracking MVP | — (needs [YOU] review checkpoint) |
| A6 | Home expiring-soon warning | A5 |
| A7 | Bulk delete | A4 |
| A8 | Recipe caching by filters | — |
| A9 | Freshness weighting in prompt (paused) | A5 |
| A10 | "Trying something new" cuisine option | — |
| A11 | Auth model rework | — |
| A12 | Landing page | A11 |
