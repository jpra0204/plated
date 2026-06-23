# Product UX & Acceptance Criteria
> All five screens + authentication — ready to generate technical requirements from

---

## How to use this document

This document is structured in two parts:

1. **User journeys** — end-to-end flows that span multiple screens. Read these first to understand how the screens connect.
2. **Per-screen acceptance criteria** — full detail per screen, including happy path, edge cases, error states, and loading states.

Out-of-scope features are flagged inline as `[OUT OF SCOPE]`. Do not implement these — they are referenced for context only and will be specced separately.

**Authentication model:** The app has two user states — logged out and logged in. Home is accessible to both. Chef, Pantry, and Saved are gated — they require authentication. The Profile tab is the primary entry point for login and account creation for logged-out users.

---

## Part 1 — User journeys

### Journey 0: Logged-out user discovers the app

This journey covers the pre-authentication experience.

1. User opens the app → lands on **Home**
2. Home is fully visible: hero card, Trending recipes, no stat counts (shows "--")
3. User browses trending recipes, taps a card → card expands with ingredients and steps
4. User taps **Chef** tab → redirected to auth page with return destination saved
5. User creates an account via Google SSO or email/password → redirected back to Chef
6. Chef, Pantry, and Saved are now fully unlocked

---

### Journey 1: First-time pantry setup → generate a recipe

This is the core activation loop. A new authenticated user adds ingredients, then generates their first recipe.

1. User is authenticated → lands on **Home**
2. Pantry is empty → hero card subtext reads "You have 0 items in your pantry"
3. User taps the **Pantry** tab → sees empty state with a prompt to add ingredients
4. User taps the **FAB (+)** → full-screen Add Item flow opens on the **Scan** tab
5. User scans a barcode → item is confirmed and added to pantry
6. User switches to **Voice** tab → speaks multiple items → reviews parsed list → taps "Add all to pantry"
7. User returns to pantry main view → items are visible in the grid
8. User taps **Chef** tab → pantry context banner shows the updated item count
9. User selects meal type, cook time, difficulty → taps "Chef it"
10. Loading state appears → result is displayed
11. User reviews recipe, taps **Approve** → navigates to **Saved**, recipe appears at top
12. Profile "Saved" stat increments to 1

---

### Journey 2: Daily cook loop

The returning authenticated user's primary daily interaction.

1. User opens the app → lands on **Home** with a time-appropriate greeting
2. "Suggested for you" list is populated, ranked by pantry match % + time of day + dietary preferences
3. User taps a suggestion row → card expands in place with ingredients, steps, and CTAs
4. User taps **Cook this** → pantry is decremented, toast appears, suggestions refresh
5. Profile "Cooked" stat increments automatically

---

### Journey 3: Chef generation → retry → approve

1. Authenticated user is on **Chef** input screen → selects filters → taps "Chef it"
2. Loading state appears
3. Result is shown — user is not satisfied → taps **Retry**
4. Loading state reappears → new result is shown (different from previous)
5. User taps **Approve** → recipe auto-saved with AI-generated name → navigates to **Saved**
6. Recipe appears at top of Saved list with a sparkles "Chef" badge

---

### Journey 4: Save from Home → cook later from Saved

1. Authenticated user expands a suggestion card on **Home** → taps **Save**
2. Toast appears: "Saved to your recipes" → Saved count increments
3. User navigates to **Saved** tab → recipe appears at top
4. User taps the card → it expands → user taps **Cook this**
5. Pantry is decremented → toast confirms how many ingredients were removed
6. Profile "Cooked" stat increments

---

### Journey 5: Profile preferences → Chef generation

1. Authenticated user opens **Profile** → toggles "Vegetarian" on
2. User navigates to **Chef** → input screen shows an indication that dietary preferences are active
3. User taps "Chef it" → AI generates a vegetarian recipe (no meat or fish in ingredients)
4. User adds a note in Extra notes: "make it high protein" → this overrides for this generation only
5. Vegetarian toggle remains on for future generations

---

### Journey 6: Logged-out user hits a gated tab → authenticates → returns

1. Logged-out user taps **Pantry**, **Chef**, or **Saved** tab
2. App stores the intended destination (e.g. `/pantry`)
3. App redirects to the standalone **Auth page** (full-screen takeover)
4. User signs in or creates an account
5. On successful authentication, app redirects to the originally intended destination
6. The tab they tapped is now fully accessible

---

## Part 2 — Per-screen acceptance criteria

---

## Screen 0 — Authentication page

### UX intent
The auth page is a standalone full-screen experience — not a modal, not a tab. It must be simple, fast, and confidence-inspiring. Google SSO should be the most prominent option. Manual email/password is available as a secondary path. The page is reached either by tapping a gated tab or by tapping "Sign in / Create account" from the Profile tab while logged out.

---

### AC-A1: Entry points
- Tapping the **Profile** tab while logged out navigates to the Auth page
- Tapping **Chef**, **Pantry**, or **Saved** tabs while logged out redirects to the Auth page
- In all cases, the intended destination is stored and the user is returned there after successful authentication
- The Auth page replaces the current screen entirely — the tab bar is not visible

---

### AC-A2: Layout
- App logo or wordmark at the top
- Headline: "Welcome to [App Name]"
- Sub-headline: "Sign in or create an account to get cooking"
- Google SSO button (primary visual prominence): "Continue with Google"
- Divider: "or"
- Email input field
- Password input field
- Toggle between "Sign in" and "Create account" modes (see AC-A4 and AC-A5)
- A back arrow or "Continue as guest" link that returns the user to Home if they arrived from the Profile tab (not available if they arrived from a gated tab — they must authenticate to proceed)

---

### AC-A3: Google SSO

**Given** the user taps "Continue with Google"
**When** the Google OAuth flow completes successfully
**Then:**
- A user account is created or matched to the existing account with that Google identity
- The session is established
- The user is redirected to their intended destination (Home if from Profile tab, or the gated tab they originally tried to access)

**Edge cases:**
- If the Google OAuth flow is cancelled by the user: return to the Auth page, no error shown
- If the Google OAuth flow fails (network/server error): show inline error — "Something went wrong with Google sign-in. Try again."

---

### AC-A4: Sign in (email/password)

**Given** the user enters a valid email and password and taps "Sign in"
**When** credentials are verified
**Then:**
- Session is established
- User is redirected to their intended destination

**Edge cases:**
- If email is not registered: inline error below email field — "No account found with this email"
- If password is incorrect: inline error below password field — "Incorrect password"
- If email field is not a valid email format: inline error on blur — "Enter a valid email address"
- If either field is empty on submit: highlight empty fields with error border, no network call made
- Password field has a show/hide toggle (eye icon)

---

### AC-A5: Create account (email/password)

**Given** the user is in "Create account" mode and fills in email and password and taps "Create account"
**When** the account is created
**Then:**
- A new user record is created
- Session is established
- User is redirected to their intended destination

**Validation rules:**
- Email must be a valid format
- Password minimum: 8 characters
- If email is already registered: inline error — "An account with this email already exists. Sign in instead?"
- Password field has a show/hide toggle

---

### AC-A6: Mode toggle
- A text link below the primary CTA toggles between Sign in and Create account modes
- Sign in mode: link reads "Don't have an account? Create one"
- Create account mode: link reads "Already have an account? Sign in"
- Switching modes clears any validation errors but preserves the email field value

---

### AC-A7: Loading state
- While an auth request is in flight (Google or email/password), the active CTA button shows a spinner and is disabled
- All inputs are disabled during the request
- No skeleton state needed — the form remains visible with a loading indicator on the button only

---

### AC-A8: "Continue as guest" / back behaviour
- If the user arrived at the Auth page from the **Profile tab**: a "Maybe later" or back arrow is visible — tapping it returns to Home
- If the user arrived from a **gated tab** (Chef, Pantry, Saved): no back arrow or skip option is shown — the only way forward is to authenticate
- The tab bar is not shown on the Auth page in either case

---

## Screen 1 — Home

### UX intent
Home is accessible to all users regardless of auth state. Logged-out users see a browsable but limited experience — trending recipes are visible and interactive, but personalised features (stats, pantry-matched suggestions, Cook this, Save) require authentication. The app should feel useful even before sign-in, but the value of signing in must be obvious.

---

### AC-H0: Auth state awareness (Home)

**Logged-out state:**
- Greeting reads "Good morning / afternoon / evening" with no name
- Hero card headline: "What can I cook today?"
- Hero card subtext: "Create an account to start cooking with your pantry."
- Hero card CTA: "Get started" — tapping navigates to the Auth page (return destination: Home)
- Stat cards show "--" for both Pantry items and Saved recipes
- Below each "--" value, a small link: "Sign in to track" — tapping navigates to Auth page
- "Suggested for you" section is replaced by "Trending" (see AC-H4-logged-out)

**Logged-in state:**
- All existing AC-H1 through AC-H10 behaviour applies unchanged

---

### AC-H1: Greeting (logged-in only)
- The greeting reads "Good morning, [first name]" before 12:00pm local time
- The greeting reads "Good afternoon, [first name]" between 12:00pm and 5:00pm local time
- The greeting reads "Good evening, [first name]" after 5:00pm local time
- First name is pulled from the user's profile display name
- If no name is set, the greeting reads "Good morning / afternoon / evening" with no name appended

---

### AC-H2: Hero card (logged-in)
- Displays headline "What can I cook today?" at all times
- Subtext reads "You have [n] items in your pantry. Let Chef find something delicious."
- [n] reflects the live pantry count — updates immediately when pantry changes without page reload
- "Open Chef" button navigates to the Chef tab
- If pantry has 0 items, subtext reads "Your pantry is empty. Add some ingredients to get started."

---

### AC-H3: Quick stats row (logged-in)
- Two stat cards displayed in a 2-column grid: "Pantry items" and "Saved recipes"
- Both counts are live — they update immediately when the underlying data changes
- Stat cards are not tappable (display only)

---

### AC-H4: Trending (logged-out) vs Suggested for you (logged-in)

**Logged-out — "Trending":**
- Section label: "Trending"
- Shows a list of randomly selected recipes from the global database
- No pantry match logic applied — match pill is not shown
- Recipes refresh on each visit to the Home tab (random selection each time)
- Recipe cards are tappable — expanding works the same way (ingredients + steps visible)
- "Cook this" and "Save" CTAs inside expanded cards are auth-gated (see AC-H6-logged-out)
- Maximum of 5 trending recipes shown

**Logged-in — "Suggested for you":**
- Section label: "Suggested for you"
- Suggestions ranked by: pantry match % + time of day + active dietary preferences
- Match pill shown on each row: "[n]% match"
- Suggestions refresh every time the user navigates to the Home tab
- If pantry has 0 items: section replaced with prompt "Add ingredients to your pantry to get suggestions"
- If no suggestions match preferences: "No suggestions right now — try adding more pantry items"
- Maximum of 5 suggestions shown

---

### AC-H5: Suggestion / Trending row (collapsed)
- Each row shows: image thumbnail placeholder, recipe name, cook time + difficulty
- Logged-in: pantry match pill also shown
- Logged-out: no match pill
- The entire row is tappable in both auth states

---

### AC-H6: Recipe card (expanded)

**Logged-in — full behaviour:**
- Expands in place, primary border, header, match bar, ingredients with pantry tags, steps
- Two CTAs: "Cook this" (primary) and "Save" (secondary)
- See AC-H7 and AC-H8 for CTA behaviour

**Logged-out — limited behaviour:**
- Card expands the same way: header, ingredients list, steps — all visible
- Ingredients show without pantry status tags (no pantry to compare against)
- Match bar is not shown
- Two CTAs are shown but both are auth-gated:
  - "Cook this" → tapping navigates to Auth page (return destination: Home)
  - "Save" → tapping navigates to Auth page (return destination: Home)
- A subtle note below the CTAs: "Sign in to cook and save recipes"

---

### AC-H7: "Cook this" (logged-in, from Home)

**Given** the authenticated user taps "Cook this" on an expanded card
**When** the action executes
**Then:**
- Each ingredient in the recipe that exists in the pantry is decremented by the required quantity
- If a pantry item's quantity reaches 0 or below, it is removed from the pantry entirely
- Missing ingredients (not in pantry) are ignored — no error shown
- The Profile "Cooked" counter increments by 1
- Toast notification appears:
  - Background: `#333333`, text: white, icon: green checkmark
  - Message: "Cooked! Removed [n] ingredients from your pantry."
  - Auto-dismisses after 3 seconds
- Pantry stat card and hero card subtext update immediately
- Suggestions list refreshes

**Edge cases:**
- If the recipe has no pantry-matching ingredients: toast reads "Cooked! No pantry items to remove."
- If pantry becomes empty after cooking: hero card subtext updates to the 0-item message

---

### AC-H8: "Save" (logged-in, from Home)

**Given** the authenticated user taps "Save" on an expanded card
**When** the action executes
**Then:**
- Recipe is added to the Saved collection using its existing name
- Toast appears: "Saved to your recipes" — auto-dismisses after 3 seconds
- Saved count stat card increments immediately
- Save button changes to filled bookmark state — tapping again does nothing

**Edge cases:**
- If recipe was already saved: Save button renders in filled state immediately on expand

---

### AC-H9: Loading state
- On initial load, show skeleton placeholder rows in the suggestions / trending section
- Skeleton rows match the height of real rows
- Stats and hero card render immediately from cached/local data

---

### AC-H10: Error state
- If suggestion/trending fetch fails: "Couldn't load recipes. Pull down to refresh."
- Pull-to-refresh retries the fetch
- All other content remains visible

---

## Screen 2 — Chef (authentication required)

### UX intent
Chef is fully gated. A logged-out user who taps the Chef tab is taken to the Auth page immediately. Once authenticated, the full Chef experience is available unchanged.

---

### AC-C0: Auth gate (Chef)

**Given** a logged-out user taps the Chef tab
**When** the tab is selected
**Then:**
- The intended destination (`/chef`) is stored
- The user is immediately redirected to the Auth page (full-screen takeover)
- The tab bar is not shown during Auth
- After successful authentication, the user is redirected to the Chef input screen (State 1)
- All Chef AC-C1 through AC-C15 apply only to authenticated users

---

### AC-C1 through AC-C15
*(Unchanged — see original definitions above. All apply to authenticated users only.)*

---

## Screen 3 — Pantry (authentication required)

### UX intent
Pantry is fully gated. A logged-out user who taps the Pantry tab is taken to the Auth page immediately. Pantry data is always scoped to the authenticated user — there is no shared or anonymous pantry.

---

### AC-P0: Auth gate (Pantry)

**Given** a logged-out user taps the Pantry tab
**When** the tab is selected
**Then:**
- The intended destination (`/pantry`) is stored
- The user is immediately redirected to the Auth page (full-screen takeover)
- The tab bar is not shown during Auth
- After successful authentication, the user is redirected to the main Pantry screen
- All Pantry AC-P1 through AC-P14 apply only to authenticated users

---

### AC-P1 through AC-P14
*(Unchanged — see original definitions above. All apply to authenticated users only.)*

---

## Screen 4 — Saved recipes (authentication required)

### UX intent
Saved is fully gated. A logged-out user who taps the Saved tab is taken to the Auth page immediately. The Saved collection is always scoped to the authenticated user.

---

### AC-S0: Auth gate (Saved)

**Given** a logged-out user taps the Saved tab
**When** the tab is selected
**Then:**
- The intended destination (`/saved`) is stored
- The user is immediately redirected to the Auth page (full-screen takeover)
- The tab bar is not shown during Auth
- After successful authentication, the user is redirected to the Saved screen
- All Saved AC-S1 through AC-S11 apply only to authenticated users

---

### AC-S1 through AC-S11
*(Unchanged — see original definitions above. All apply to authenticated users only.)*

---

## Screen 5 — Profile / Sign in

### UX intent
The Profile tab serves a dual purpose depending on auth state. For logged-out users, it is the primary sign-in entry point — the tab label and icon must communicate this clearly. For logged-in users, it is the preferences and account management screen as previously specced. Industry standard for this pattern is a tab labelled "Sign in" with a person icon when logged out, switching to the user's avatar or "Profile" when logged in.

---

### AC-PR0: Tab bar label by auth state
- **Logged out:** Tab label reads "Sign in", icon is a person outline (ti-user)
- **Logged in:** Tab label reads "Profile", icon is a person outline (ti-user)
- The tab icon does not change — only the label changes between states

---

### AC-PR0b: Logged-out Profile tab

**Given** a logged-out user taps the "Sign in" tab
**When** the tab is selected
**Then:**
- The user is navigated to the Auth page (full-screen takeover)
- The intended return destination is set to `/profile`
- After successful authentication, the user lands on the Profile screen
- Unlike gated tabs (Chef, Pantry, Saved), the "Sign in" tab does show a "Maybe later" / back option on the Auth page — the user can return to Home without authenticating

---

### AC-PR1: Profile header (logged-in)
- Circular avatar placeholder (68px diameter, secondary colour fill, primary-light border)
- Display name below avatar
- Sub-label: "[role] · [city]" (e.g. "Home cook · Montréal")
- If no name or city is set, fall back to email address for name, omit city

---

### AC-PR2: Stats row (logged-in)
- Three stat cards in a 3-column grid: Saved, Pantry items, Cooked
- All three are live — update immediately without page reload:
  - Saved: total count of saved recipes
  - Pantry items: total count of current pantry items
  - Cooked: cumulative count of "Cook this" taps (append-only, cannot be reset by the user)
- Stat cards are not tappable

---

### AC-PR3: Chef influence note (logged-in)
- Displayed directly below the "Dietary preferences" section label, above the toggles
- Background: `#FAF0EF`, text: `#712B13`, sparkles icon
- Text: "Chef uses these automatically. You can override them per generation on the Chef screen."
- Always visible — not dismissible

---

### AC-PR4: Dietary preference toggles (logged-in)

| Toggle | Default | Effect on Chef |
|---|---|---|
| Vegetarian | Off | Chef excludes meat and fish from generated recipes |
| Gluten-free | Off | Chef excludes gluten-containing ingredients |
| High protein | Off | Chef prioritises protein-rich recipes and ingredients |
| Macro tracking | Off | `[OUT OF SCOPE]` — toggle visible but no effect until specced |

**Given** the user toggles any preference
**When** the toggle state changes
**Then:**
- The new state is saved immediately — no "Save" button required
- The next Chef generation will reflect the updated preference
- Toggling off removes it from the Chef generation context immediately

---

### AC-PR5: Account — Edit profile (logged-in)
- Row with right chevron, label "Edit profile"
- Tapping navigates to an Edit Profile sub-screen
- Editable fields: display name, avatar (placeholder — upload not required in v1), city
- Changes are saved and reflected immediately in the Profile header on return

---

### AC-PR6: Account — Notifications (logged-in)
- Row with right chevron, label "Notifications"
- `[OUT OF SCOPE]` — sub-screen shows placeholder: "Notification settings coming soon."

---

### AC-PR7: Log out (logged-in)

**Given** the authenticated user taps "Log out"
**When** the confirmation appears
**Then:**
- Inline confirmation: "Are you sure you want to log out?" with "Log out" and "Cancel"
- "Cancel" dismisses — user stays on Profile
- "Log out" clears the session
- User is navigated to Home in logged-out state
- The Profile tab label reverts to "Sign in"
- Chef, Pantry, and Saved tabs are re-gated
- Local cached data is cleared from the session — data reloads from the server when the user logs back in

---

### AC-PR8: Stats — error/loading (logged-in)
- If profile data fails to load, stat cards show "—" as the value
- No full-page error state — the rest of the Profile screen renders normally

---

## Appendix — Shared components

### Toast notification
Used across Home, Saved, and Chef screens. Behaviour is identical everywhere.
- Background: `#333333`
- Text: white, 12px
- Icon: green checkmark (`#97C459`)
- Appears below the status bar (top of screen), above all content
- Auto-dismisses after 3 seconds
- If two toasts are triggered in quick succession, the second replaces the first

### Pantry match bar
Used on Saved recipe cards and expanded recipe cards on Home (logged-in only).
- Full-width progress bar, height 5px, border-radius 3px
- Fill colour thresholds:
  - 80–100%: `#639922` (green)
  - 50–79%: `#A8B39A` (grey)
  - 0–49%: `#BA7517` (amber)
- Always shows a percentage label to the right
- Updates live when pantry data changes
- Not shown for logged-out users

### "In pantry" / "Missing" tags
Used on ingredient lists in Chef result, Home expanded card (logged-in), and Saved expanded card.
- "In pantry": background `#EAF3DE`, text `#3B6D11`, border-radius 6px, padding 2px 7px, 11px
- "Missing": background `#FAEEDA`, text `#854F0B`, same sizing
- Not shown for logged-out users (no pantry to compare against)

### Auth redirect pattern
Used consistently across all gated surfaces.
- Before redirecting, store the intended destination path (e.g. `/chef`, `/pantry`, `/saved`, `/profile`)
- After successful authentication (any method), retrieve the stored destination and navigate there
- If no destination is stored, default to `/home`
- The stored destination is cleared after it is consumed (one-time use)

---

## Out of scope — features referenced but not yet specced

| Feature | Where referenced | Placeholder behaviour |
|---|---|---|
| Shopping list | Chef result "Add to list" button; inline "Add" on missing ingredients | Button visible; tapping shows "Coming soon" |
| Macro tracking | Profile toggle; future recipe card display | Toggle visible and saveable but has no effect |
| Notification preferences | Profile > Notifications row | Navigates to placeholder: "Notification settings coming soon." |
| Recipe image upload | Saved recipe cards (thumbnail placeholder) | Grey placeholder rectangle — no upload in v1 |
| Cooking mode (step-by-step) | "Cook this" future intent | Not implemented — "Cook this" only deducts pantry and increments counter |
