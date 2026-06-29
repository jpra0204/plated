# Feature Spec: Pantry Quantity Sync
> Two related features that solve "my pantry goes stale when I cook outside the app"

---

## Problem statement

The app's core value proposition depends on the pantry being accurate. The only events that currently update pantry quantities are: manually adding items (Pantry tab) and tapping "Cook this" on an in-app recipe. But users will frequently cook meals that didn't come from the app — and nothing in the current product gives them a fast way to reflect that. Without a fix, pantry data drifts out of date and Chef's suggestions/generations get worse over time, undermining the entire premise of the app.

This is a web app (not a native app), so push notifications are not available as a nudge mechanism. The reminder mechanism below relies entirely on in-session triggers — login and session resume — rather than out-of-app notifications.

Two features solve this together:

1. **Inline pantry editing** — a fast way to adjust quantities directly in the Pantry grid, any time.
2. **Pantry sync reminder modal** — a proactive, meal-time-aware prompt that surfaces on login/session resume, asking the user to reconcile their pantry before they start using Chef.

These are complementary, not redundant. Inline editing is the "I happened to be on the Pantry tab" path. The sync modal is the "the app proactively caught me at a good moment" path.

---

## Feature A: Inline pantry quantity editing

### UX intent
Editing a quantity should never require leaving the Pantry grid or opening a separate screen. The interaction should feel like the tile itself is "unlocking" to reveal controls, not like a new screen has appeared.

### Behaviour

**Default state:**
- Ingredient tiles render as today: icon, name, quantity + unit, in a 2-column grid.

**Given** the user taps an ingredient tile
**When** the tap registers
**Then:**
- The tapped tile expands in place and now spans both grid columns (full width) to make room for controls
- The expansion shows:
  - Ingredient icon + name (top left)
  - A delete button (trash icon, top right) — circular, light red background, red icon
  - A centred quantity stepper (minus / current value with unit / plus)
  - A small hint line below: "Changes save automatically · tap outside to close"
- All other tiles remain in their default collapsed state — only one tile can be expanded at a time
- Tapping a different tile collapses the currently expanded one and expands the newly tapped one
- Tapping anywhere outside the expanded tile (the rest of the screen) collapses it back to default state

**Given** the expanded tile is showing the stepper
**When** the user taps plus or minus
**Then:**
- The quantity updates immediately in local state and is persisted to the backend immediately (no debounce delay required, but should not fire a network request on every single increment if the user is rapidly tapping — batch/debounce the network write, not the UI update)
- There is no "Save" or "Confirm" step — every tap is final
- The unit shown next to the value matches the item's unit (matches existing unit logic: pcs items show no decimal, weight/volume items respect their configured unit)

**Given** the expanded tile is showing and the user taps the delete (trash) icon
**When** the tap registers
**Then:**
- The item is removed from the pantry immediately — no confirmation prompt
- The tile disappears from the grid
- The pantry item count (header, Home stat card) decrements immediately

### Edge cases
- If the user decrements a quantity to 0 via the stepper, the item is **not** automatically deleted — it remains in the pantry at 0 until the user explicitly deletes it or increments it again. (This differs from the "Cook this" auto-removal-at-zero behaviour, which is a different code path — this is direct user-driven editing, and removing it automatically here would be an unexpected/destructive surprise for a manual edit.)
- Minimum quantity via the stepper is 0 — minus button disables at 0.
- No maximum enforced via the stepper (matches existing pantry item add behaviour).
- If two tiles are tapped in very quick succession (race condition on mobile), only the most recently tapped tile should end up expanded.

### Explicitly not required for this feature
- No voice input in this flow (voice is reserved for the sync modal, see Feature B)
- No undo for deletion

---

## Feature B: Pantry sync reminder modal

### UX intent
This is a proactive nudge, not a blocking gate. It should feel helpful ("hey, want to true-up your pantry before you start cooking?") not naggy. It must be trivially easy to dismiss, because forcing friction here would damage trust — the entire point is to reduce friction around pantry accuracy, not add a new annoying gate.

### Trigger logic

**Given** an authenticated user logs in OR resumes a session (returns to the app/tab after being away)
**When** the current local time falls within one of the defined meal-adjacent windows
**Then:** the modal is shown automatically, once, for that visit.

**Meal-adjacent time windows** (all times local to the user):
- Morning / breakfast window: 7:00 AM – 9:00 AM *(exact bounds to finalize — captured here as the intended logic; confirm precise start/end before implementation)*
- Lunch window: 12:00 PM – 2:00 PM
- Early afternoon / late lunch window: 1:00 PM – 3:00 PM
- Dinner window: 7:00 PM – 9:00 PM

> **Implementation note:** the original requirement named specific trigger hours (7 AM, 12 PM, 1 PM, 8 PM) as meal-adjacent check-in points rather than ranges. Before implementation, confirm with product whether these are meant to be exact single-hour triggers or windows (e.g. "anytime between 12–2pm"). This spec assumes windows for a realistic UX (an exact-minute trigger is impractical), but the precise boundaries should be confirmed and locked before building.

**"Session resume" definition (needs technical definition before implementation):**
- At minimum, this should cover: a fresh login, and returning to the browser tab/app after the session token is still valid but some meaningful time has elapsed (e.g. the tab was backgrounded or closed and reopened)
- It should **not** trigger on every navigation between tabs within the app (e.g. going from Home → Pantry → Home should not re-trigger it)
- Suggested approach: track a "last seen at" timestamp in client storage; if the gap between "last seen" and "now" exceeds a threshold (e.g. 30+ minutes) AND the current time is within a meal window, show the modal once per qualifying gap

### Frequency cap
- The modal should show **at most once per qualifying session/window** — i.e. if the user is active continuously through lunch, they should not see it repeatedly every time they tap into the app
- Suggested rule: once shown for a given meal window on a given day, do not show it again until the next meal window begins

### Modal layout & content

- Presented as a bottom sheet that takes up most of the screen height (not a full-screen takeover, and not a small centered dialog — a tall sheet)
- Dark scrim behind it
- Header:
  - Title: "Quick pantry update"
  - Sub-text: "Cooked something since your last visit? Update your pantry so Chef stays accurate."
  - Close button (X), top-right — circular, neutral style
- A small meal-context badge below the header (e.g. "After lunch check-in") — reinforces *why* they're seeing this now
- Body (scrollable if the pantry is long):
  - A voice input bar at the top of the list: mic button + example text showing both supported voice styles
  - Below that, every current pantry item rendered as a row:
    - Icon + name + current quantity/unit (left)
    - A compact quantity stepper (minus / value / plus) (right)
    - A small delete (trash) icon (far right)
- Footer:
  - A small "Changes save automatically" note with a checkmark icon
  - A single full-width primary CTA: "Done"

### Behaviour

**Given** the modal is open
**When** the user adjusts a quantity via any row's stepper
**Then:** the change is saved immediately (same immediate-save behaviour as Feature A) — no batching required before close, though network writes can still be debounced per item.

**Given** the modal is open
**When** the user taps the delete icon on any row
**Then:** that item is removed from the pantry immediately, and its row disappears from the modal's list — no confirmation prompt (consistent with Feature A).

**Given** the modal is open
**When** the user taps the mic button in the voice bar
**Then:** voice input begins. Both of the following input styles must be supported and parsed correctly:
- **Natural language:** e.g. "used 2 eggs and half the rice" → the app must interpret relative/fuzzy quantities ("half the rice") against the current pantry quantity for that item
- **Command style:** e.g. "eggs minus 2, rice minus 100g" → explicit deltas per item

Parsed voice input should pre-fill/update the relevant row's quantity (using the same immediate-save behaviour) — the user should be able to see the rows update as a result of the voice command, then make any further manual corrections via the steppers before closing.

**Given** the modal is open
**When** the user taps either the "Done" button or the "X" close button
**Then:** both actions are functionally identical — the modal simply closes. Neither button triggers any additional save step, because all changes were already saved as they happened. There is no "are you sure" or "discard changes" prompt, since there are no unsaved changes by definition.

### Edge cases
- If the pantry is empty when the modal would trigger, do not show the modal at all (nothing to reconcile) — fall back to existing empty-pantry Home/Pantry behaviour.
- If voice input fails to parse (unrecognised input), show an inline message within the modal (e.g. "Couldn't quite catch that — try again or adjust manually") without closing the modal or losing any state.
- If the user backgrounds the app while the modal is open and returns within the same session, the modal should still be open in its last state (not re-triggered as a new instance).

### Explicitly out of scope for this build
- **`[OUT OF SCOPE]`** A/B testing this modal presentation against an alternative lighter-weight format (e.g. a dismissible banner instead of a full sheet). Product wants this tested in the future, but only the modal version should be built for MVP. Do not build a banner variant now — this note exists purely so the option isn't lost.
- **`[OUT OF SCOPE]`** Push notifications or any out-of-app reminder mechanism — not feasible for a web app without further infrastructure (e.g. web push), and not part of this spec.
- **`[OUT OF SCOPE]`** Image/camera-based pantry recognition as an input method in this modal. Voice and manual stepper/delete are the only input methods for MVP.

---

## Open questions to resolve before implementation

1. **Exact meal window boundaries** — confirm precise start/end times for each of the four windows (this doc proposes ranges around the four trigger hours mentioned: 7am, 12pm, 1pm, 8pm — but the 12pm and 1pm windows as proposed overlap, which may or may not be intentional).
2. **"Session resume" technical definition** — needs a concrete rule (e.g. time-since-last-active threshold) so engineering can implement the trigger consistently.
3. **Voice parsing engine** — natural language quantity parsing (e.g. interpreting "half the rice") requires more than simple command parsing. Confirm whether this is handled by the same AI provider used elsewhere in the app (Gemini) or a separate service.
4. **Per-day vs per-window frequency cap** — confirm the exact suppression rule once shown (this spec assumes "once per meal window per day" as a reasonable default).

---

## Summary of how this resolves the original problem

| Gap | Solved by |
|---|---|
| User cooks offline, pantry goes stale | Sync modal proactively prompts reconciliation at meal-adjacent moments |
| Manually fixing quantities feels slow | Inline tile editing — two taps (expand, adjust) any time, no separate screen |
| Typing exact updates is tedious | Voice input in the sync modal, supporting both natural language and command style |
| Don't want to nag or block users | Modal is dismissible via "Done" or "X" with zero friction, no forced action, and capped to one prompt per meal window |
