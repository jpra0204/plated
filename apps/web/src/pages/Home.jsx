import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import RecipeCard from '../components/RecipeCard.jsx';
import useAuthStore from '../stores/authStore.js';
import { get } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';

// ── Expiry helpers (A6) ───────────────────────────────────────────────────────

/**
 * Returns the number of whole days until expiryDate from now.
 * Negative values mean the item has already expired.
 *
 * [ASSUMPTION]: Logic intentionally duplicated from Pantry.jsx rather than
 * extracted to a shared utility, to keep the change minimal and self-contained.
 * The threshold (≤3 days) matches A5c's isExpiringSoon exactly.
 *
 * @param {string} expiryDate - ISO 8601 timestamp
 * @returns {number}
 */
function daysUntilExpiry(expiryDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((new Date(expiryDate).getTime() - Date.now()) / msPerDay);
}

/**
 * Returns true when expiryDate is within the 3-day warning window (or already expired).
 *
 * @param {string|null} expiryDate - ISO 8601 timestamp or null
 * @returns {boolean}
 */
function isExpiringSoon(expiryDate) {
  if (!expiryDate) return false;
  return daysUntilExpiry(expiryDate) <= 3;
}

export default function Home() {
  const navigate = useNavigate();
  // [ASSUMPTION]: Home is always rendered behind ProtectedRoute, so `user` is
  // always set when this component mounts. `status` and `setIntendedDestination`
  // are no longer needed here — the signed-out path is fully handled by ProtectedRoute.
  const { user } = useAuthStore();

  // ── Profile query — stats + greeting name ─────────────────────────────────
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.profile.root(),
    queryFn: () => get('/api/v1/profile'),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const profile = profileData?.profile;
  const pantryCount = profile?.pantryCount ?? 0;
  const savedCount = profile?.savedCount ?? null;

  // ── Suggestions ───────────────────────────────────────────────────────────
  const {
    data: suggestionsData,
    isLoading: suggestionsLoading,
    isError: suggestionsError,
    refetch: refetchSuggestions,
  } = useQuery({
    queryKey: queryKeys.recipes.suggestions(),
    queryFn: () => get('/api/v1/recipes/suggestions'),
    staleTime: 0,           // always refetch on Home tab visit
    refetchOnWindowFocus: true,
  });

  // ── Pantry query — for expiring-soon count on the stat card (A6) ────────────
  // [ASSUMPTION]: The pantry list is already fetched and cached by Pantry.jsx (same
  // queryKey: queryKeys.pantry.list()), so this query will usually hit the React
  // Query cache rather than making a new network request. It's safe to declare it
  // here without concern for duplicate requests.
  const { data: pantryData } = useQuery({
    queryKey: queryKeys.pantry.list(),
    queryFn: () => get('/api/v1/pantry'),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const expiringSoonCount = useMemo(() => {
    const items = pantryData?.items ?? [];
    return items.filter(item => isExpiringSoon(item.expiry_date)).length;
  }, [pantryData]);

  // ── Saved recipe IDs — for saved indicator on suggestion rows ─────────────
  // [ASSUMPTION]: We fetch the full saved list and build a Set of IDs so we can
  // mark which suggestion rows are already saved without a per-recipe API call.
  // The saved list is already cached from the Saved screen.
  const { data: savedListData } = useQuery({
    queryKey: queryKeys.saved.list(),
    queryFn: () => get('/api/v1/saved'),
    staleTime: 30_000,
  });

  const savedRecipeIdSet = useMemo(
    () => new Set((savedListData?.recipes ?? []).map(r => r.id)),
    [savedListData],
  );

  // ── Derived values ────────────────────────────────────────────────────────

  const greeting = getGreeting();
  const firstName = user?.displayName?.split(' ')[0] ?? profile?.displayName?.split(' ')[0] ?? null;
  const greetingFull = firstName ? `${greeting}, ${firstName}` : greeting;

  const recipes = (suggestionsData?.recipes ?? []).slice(0, 5).map(normalizeRecipe);

  // Show "add ingredients" prompt when profile is ready and pantry is empty
  const showPantryEmptyPrompt = !profileLoading && profile && pantryCount === 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{greetingFull}</h1>
      </div>

      {/* Hero card */}
      <div className="hero-card">
        <h2 className="hero-card__title">What can I cook today?</h2>
        <p className="hero-card__body">
          {profileLoading
            ? 'Loading your pantry…'
            : pantryCount === 0
              ? 'Your pantry is empty. Add some ingredients to get started.'
              : `You have ${pantryCount} item${pantryCount !== 1 ? 's' : ''} in your pantry. Let Chef find something delicious.`}
        </p>
        <button className="hero-card__cta" onClick={() => navigate('/chef')}>
          <SparklesIcon aria-hidden="true" /> Open Chef
        </button>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <BasketIcon className="stat-card__icon" aria-hidden="true" />
          <span className="stat-card__val">
            {profileLoading ? '—' : pantryCount}
          </span>
          <span className="stat-card__lbl">Pantry items</span>
          {expiringSoonCount > 0 && (
            <span className="stat-card__warning" aria-label={`${expiringSoonCount} item${expiringSoonCount !== 1 ? 's' : ''} expiring soon`}>
              <WarningIcon className="stat-card__warning-icon" aria-hidden="true" />
              {expiringSoonCount} item{expiringSoonCount !== 1 ? 's' : ''} expiring soon
            </span>
          )}
        </div>
        <div className="stat-card">
          <BookmarkIcon className="stat-card__icon" aria-hidden="true" />
          <span className="stat-card__val">
            {profileLoading ? '—' : (savedCount ?? '—')}
          </span>
          <span className="stat-card__lbl">Saved recipes</span>
        </div>
      </div>

      {/* Recipe section */}
      <p className="section-label">Suggested for you</p>

      {suggestionsLoading ? (
        <div className="suggestion-list">
          <SkeletonRows count={3} />
        </div>
      ) : suggestionsError ? (
        <div className="empty-state">
          <p>Couldn&apos;t load recipes.</p>
          <button className="btn btn--secondary" onClick={() => refetchSuggestions()}>Try again</button>
        </div>
      ) : showPantryEmptyPrompt ? (
        <div className="empty-state">
          <p>Add ingredients to your pantry to get suggestions.</p>
          <button className="btn btn--primary" onClick={() => navigate('/pantry')}>Add ingredients</button>
        </div>
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <p>No suggestions right now — try adding more pantry items.</p>
        </div>
      ) : (
        <div className="suggestion-list">
          {recipes.map((recipe, idx) => (
            <div key={recipe.id}>
              {idx > 0 && <div className="divider" />}
              <RecipeCard
                recipe={recipe}
                showMatchPill
                showPantryTags
                onNavigate={() => navigate('/recipe/' + recipe.id)}
                isSaved={savedRecipeIdSet.has(recipe.id)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="page-bottom" />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function normalizeRecipe(r) {
  return {
    id: r.id,
    name: r.name,
    cookTime: r.cook_time_mins,
    difficulty: r.difficulty,
    servings: r.servings,
    cuisine: r.cuisine,
    mealType: r.meal_type,
    matchPct: r.match_pct ?? 0,
    isChefPick: r.is_chef_pick ?? false,
    ingredients: (r.ingredients ?? []).map(ing => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      inPantry: ing.in_pantry ?? false,
    })),
    steps: (r.steps ?? []).map(s => (typeof s === 'string' ? s : s.instruction)),
  };
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function SkeletonRows({ count = 3 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i}>
      {i > 0 && <div className="divider" />}
      <div className="recipe-card__row recipe-card__row--skeleton" aria-hidden="true">
        <div className="skeleton skeleton--thumb" />
        <div className="skeleton-body">
          <div className="skeleton skeleton--text-lg" />
          <div className="skeleton skeleton--text-sm" />
        </div>
      </div>
    </div>
  ));
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" />
    </svg>
  );
}

function BasketIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function BookmarkIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
    </svg>
  );
}

/* Warning icon — reused from Pantry.jsx for visual consistency (A6) */
function WarningIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
