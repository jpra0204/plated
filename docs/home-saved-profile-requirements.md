# Feature Requirements: Home, Saved & Profile
> App wireframe spec — ready for implementation

---

## Design system tokens

| Token | Value |
|---|---|
| `--color-background` | `#FAF9F6` |
| `--color-primary` | `#D75A4A` |
| `--color-primary-dark` | `#D24735` |
| `--color-primary-light` | `#E08074` |
| `--color-secondary` | `#A8B39A` |
| `--text-primary` | `#333333` |
| `--text-secondary` | `#666666` |

**Platform:** Mobile-first, responsive to desktop.
**Navigation:** Persistent bottom tab bar with 5 items — Home, Chef (sparkles icon), Pantry, Saved, Profile/Sign in.
**Authentication model:** Home is public. Chef, Pantry, and Saved are gated — unauthenticated users are redirected to the Auth page. The Profile tab doubles as the Sign in entry point when the user is logged out.

---

## Authentication page (standalone)

### Overview
A standalone full-screen page, not part of the tab navigation. Reached by tapping any gated tab (Chef, Pantry, Saved) or the Sign in tab (Profile) while logged out. Supports Google SSO and email/password for both sign in and account creation.

### Layout
- App logo at the top
- Headline: "Welcome to [App Name]"
- Sub-headline: "Sign in or create an account to get cooking"
- Google SSO button (primary): "Continue with Google"
- Divider: "or"
- Email input field
- Password input field (with show/hide toggle)
- Mode toggle link: switches between "Sign in" and "Create account"
- Back / "Maybe later" option — only shown when arriving from the Profile/Sign in tab. Not shown when arriving from a gated tab.

### Auth methods
**Google SSO:** Triggers OAuth flow. On success, creates or matches account and establishes session.

**Email/Password — Sign in:** Validates credentials, establishes session on success.

**Email/Password — Create account:**
- Requires valid email format
- Password minimum: 8 characters
- Creates new user record and establishes session on success

### Redirect behaviour
- Before navigating to Auth, the app stores the intended destination
- After successful authentication (any method), the user is sent to that stored destination
- If no destination is stored, default to Home
- Stored destination is consumed once and cleared

### Error states
- Wrong password: inline error below password field
- Email not found (sign in): inline error below email field
- Email already exists (create account): inline error with prompt to sign in instead
- Google OAuth failure: inline error above the Google button
- Network failure: inline error, retry available

### Behaviour rules
- Tab bar is hidden on the Auth page
- "Maybe later" / back is only available when arriving from the Sign in tab — not from gated tabs
- Switching between Sign in and Create account modes preserves the email field value and clears errors

---

## Feature 3 — Home

### Overview
Home is accessible to all users regardless of auth state. Logged-out users see a public browsing experience — trending recipes, no personalised stats. Logged-in users see the full personalised experience: pantry-matched suggestions, live stat counts, and interactive Cook this / Save actions.

---

### Logged-out Home state

**Header:** Time-appropriate greeting with no name ("Good morning")

**Hero card:**
- Headline: "What can I cook today?"
- Subtext: "Create an account to start cooking with your pantry."
- CTA: "Get started" — navigates to Auth page, return destination: Home

**Quick stats row:**
- Both stat cards show "--" as the value
- Below each "--": a small link "Sign in to track" — navigates to Auth page

**Trending section** (replaces "Suggested for you"):
- Section label: "Trending"
- Random selection of recipes from the global database — no pantry matching
- No match pill shown
- Refreshes on each visit
- Recipe cards are tappable and expandable (ingredients + steps visible)
- "Cook this" and "Save" inside expanded cards navigate to Auth page when tapped
- A note below the CTAs: "Sign in to cook and save recipes"

---

### Logged-in Home state

**Header:** Time-appropriate greeting with first name

**Hero card:**
- Subtext: "You have [n] items in your pantry. Let Chef find something delicious."
- [n] is live — updates without page reload
- CTA: "Open Chef" — navigates to Chef tab
- If pantry is empty: "Your pantry is empty. Add some ingredients to get started."

**Quick stats row:**
- Pantry items: live count
- Saved recipes: live count
- Both update immediately — not tappable

**Suggested for you section:**
- Ranked by: pantry match % (primary) + time of day + active dietary preferences
- Match pill shown: "[n]% match" (green background, dark green text)
- Refreshes on each Home tab visit
- Empty state if pantry is empty: "Add ingredients to your pantry to get suggestions"
- Empty state if no preference-matching recipes: "No suggestions right now — try adding more pantry items"
- Maximum 5 suggestions

**Expanded recipe card (logged-in):**
- Tapping a row expands it in place — others collapse
- Border: 2px solid primary
- Header (primary background): name, cook time, difficulty, servings
- Pantry match bar below header
- Ingredients with "In pantry" / "Missing" tags
- Numbered steps
- CTAs: "Cook this" (primary) and "Save" (secondary outlined)

**"Cook this" behaviour:**
1. Decrements pantry quantities for all matching ingredients
2. Removes pantry items that reach 0
3. Increments Profile "Cooked" count by 1
4. Toast: "Cooked! Removed [n] ingredients from your pantry." (auto-dismisses 3s)
5. Hero card subtext and pantry stat card update immediately
6. Suggestions list refreshes

**"Save" behaviour:**
- Adds recipe to Saved collection under its existing name
- Toast: "Saved to your recipes"
- Saved count increments immediately
- Save button enters filled state — tapping again does nothing
- If already saved: renders in filled state immediately on expand

---

### Behaviour rules
- Home is the default tab on app launch for all users
- Greeting time logic: before 12pm = morning, 12–5pm = afternoon, after 5pm = evening
- Only one recipe card can be expanded at a time
- Suggestions refresh on every Home tab visit (logged-in)
- Trending refreshes on every Home tab visit (logged-out)

---

## Feature 4 — Saved recipes (authentication required)

### Overview
Fully gated. Logged-out users tapping this tab are redirected to Auth with `/saved` stored as the return destination. Once authenticated, the full Saved experience is available.

### Main screen

**Header:** "Saved recipes" with live count "[n] recipes"

**Search bar:** Real-time filter by recipe name, case-insensitive

**Filter chips (single-select):** All, Breakfast, Lunch, Dinner, Chef picks
- "Chef picks" filters to AI-generated recipes only (sparkles badge)
- Manually saved recipes do not appear under "Chef picks"

**Recipe cards — collapsed:**
- Top zone (tappable): thumbnail placeholder, recipe name, cook time + difficulty, meal type tag, optional Chef sparkles badge
- Bottom zone (always visible): pantry match progress bar + "[n]% in pantry" label
  - Green (80%+), grey (50–79%), amber (<50%)
  - Updates live when pantry changes

**Recipe cards — expanded (tapping top zone):**
- Border: 2px solid primary
- Header (primary background): name, Chef badge if applicable, cook time, difficulty, servings
- Pantry match bar
- Ingredients list with pantry status tags
- Numbered steps
- CTAs: "Cook this" (primary) and "Delete" (destructive secondary)
- Only one card expanded at a time

**"Cook this" (from Saved):**
- Identical to Home "Cook this" behaviour
- Recipe remains in Saved list after cooking — cooking does not delete it
- Pantry match bar updates immediately after cooking

**Delete recipe:**
- Inline confirmation within card: "Delete this recipe?" with Confirm / Cancel
- Confirm: removes recipe, card animates out, count decrements, Home Saved stat decrements
- No undo

### Ordering
- Newly approved Chef recipes appear at the top
- Newly saved recipes from Home appear at the top
- Most recently added is always first

### Empty state
- 0 saved recipes: "No saved recipes yet — Approve a Chef recipe or save one from Home"
- Active filter with 0 results: "No [filter] recipes saved yet"

---

## Feature 5 — Profile / Sign in

### Overview
The Profile tab has two distinct states based on auth. Logged-out: the tab is labelled "Sign in" and tapping it goes directly to the Auth page. Logged-in: the tab is labelled "Profile" and shows the full preferences and account management screen.

### Tab bar behaviour
- **Logged out:** label = "Sign in", icon = person outline (ti-user)
- **Logged in:** label = "Profile", icon = person outline (ti-user)

### Logged-out behaviour
- Tapping "Sign in" tab navigates to Auth page
- Return destination stored as `/profile`
- "Maybe later" / back option available on Auth page (unlike gated tabs)

### Logged-in Profile screen

**Profile header:**
- Avatar (68px circular, secondary colour, primary-light border)
- Display name
- Sub-label: "[role] · [city]"
- Fallback: email if no name set; omit city if not set

**Stats row (3-column, live):**
- Saved: total saved recipes
- Pantry items: total pantry items
- Cooked: cumulative "Cook this" count (append-only, not user-editable)

**Dietary preferences:**
- Chef influence note (always visible): "Chef uses these automatically. You can override them per generation on the Chef screen."
  - Background: `#FAF0EF`, text: `#712B13`, sparkles icon
- Toggles (all default off, changes saved immediately):
  - Vegetarian — Chef excludes meat and fish
  - Gluten-free — Chef excludes gluten-containing ingredients
  - High protein — Chef prioritises protein-rich recipes
  - Macro tracking — `[OUT OF SCOPE]` visible but no effect

**Account section:**
- Edit profile → sub-screen (display name, avatar placeholder, city)
- Notifications → `[OUT OF SCOPE]` placeholder screen
- Log out → inline confirmation → clears session → returns to Home (logged-out state), tab reverts to "Sign in"

### Behaviour rules
- Preference changes take effect immediately, no Save button
- Cooked count cannot be reset by the user
- Stats are read-only (not tappable)
- Log out does not clear locally cached data — it reloads from server on next login

---

## Out of scope — features referenced but not yet specced

| Feature | Where referenced | Placeholder behaviour |
|---|---|---|
| Shopping list | Chef result "Add to list" + inline "Add" on missing ingredients | Button visible; tapping shows "Coming soon" |
| Macro tracking | Profile toggle; future recipe card display | Toggle visible and saveable but has no effect |
| Notification preferences | Profile > Notifications | Navigates to: "Notification settings coming soon." |
| Recipe image upload | Saved card thumbnails | Grey placeholder rectangle — no upload in v1 |
| Cooking mode (step-by-step) | "Cook this" future intent | Not implemented — deducts pantry + increments counter only |
