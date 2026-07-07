import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import RecipeCard from '../components/RecipeCard.jsx';
import useAuthStore from '../stores/authStore.js';
import { get } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';

export default function Home() {
  const navigate = useNavigate();
  const { user, status, setIntendedDestination } = useAuthStore();
  const isAuthenticated = status === 'authenticated';
  const isLoadingAuth = status === 'loading';

  // ── Profile query — stats + greeting name (logged-in only) ────────────────
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.profile.root(),
    queryFn: () => get('/api/v1/profile'),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const profile = profileData?.profile;
  const pantryCount = profile?.pantryCount ?? 0;
  const savedCount = profile?.savedCount ?? null;

  // ── Suggestions (logged-in only) ──────────────────────────────────────────
  const {
    data: suggestionsData,
    isLoading: suggestionsLoading,
    isError: suggestionsError,
    refetch: refetchSuggestions,
  } = useQuery({
    queryKey: queryKeys.recipes.suggestions(),
    queryFn: () => get('/api/v1/recipes/suggestions'),
    enabled: isAuthenticated,
    staleTime: 0,           // always refetch on Home tab visit
    refetchOnWindowFocus: true,
  });

  // ── Trending (logged-out only) ────────────────────────────────────────────
  const {
    data: trendingData,
    isLoading: trendingLoading,
    isError: trendingError,
    refetch: refetchTrending,
  } = useQuery({
    queryKey: queryKeys.recipes.trending(),
    queryFn: () => get('/api/v1/recipes/trending'),
    enabled: !isAuthenticated && !isLoadingAuth,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // ── Saved recipe IDs — for saved indicator on suggestion rows ─────────────
  // [ASSUMPTION]: We fetch the full saved list and build a Set of IDs so we can
  // mark which suggestion/trending rows are already saved without a per-recipe
  // API call. The saved list is already cached from the Saved screen.
  const { data: savedListData } = useQuery({
    queryKey: queryKeys.saved.list(),
    queryFn: () => get('/api/v1/saved'),
    enabled: isAuthenticated,
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

  const rawRecipes = (isAuthenticated ? suggestionsData?.recipes : trendingData?.recipes) ?? [];
  const recipes = rawRecipes.slice(0, 5).map(normalizeRecipe);

  const isRecipesLoading = isAuthenticated ? suggestionsLoading : trendingLoading;
  const isRecipesError = isAuthenticated ? suggestionsError : trendingError;
  const refetchRecipes = isAuthenticated ? refetchSuggestions : refetchTrending;

  // Show "add ingredients" prompt when profile is ready and pantry is empty
  const showPantryEmptyPrompt = isAuthenticated && !profileLoading && profile && pantryCount === 0;

  // ── Auth-gate helper ──────────────────────────────────────────────────────

  const requireAuth = () => {
    setIntendedDestination('/');
    navigate('/auth');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{greetingFull}</h1>
      </div>

      {/* Hero card */}
      <div className="hero-card">
        <h2 className="hero-card__title">What can I cook today?</h2>
        {isAuthenticated ? (
          <>
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
          </>
        ) : (
          <>
            <p className="hero-card__body">Create an account to start cooking with your pantry.</p>
            <button className="hero-card__cta" onClick={requireAuth}>Get started</button>
          </>
        )}
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <BasketIcon className="stat-card__icon" aria-hidden="true" />
          <span className="stat-card__val">
            {isAuthenticated ? (profileLoading ? '—' : pantryCount) : '--'}
          </span>
          <span className="stat-card__lbl">Pantry items</span>
          {!isAuthenticated && (
            <button className="stat-card__signin" onClick={requireAuth}>Sign in to track</button>
          )}
        </div>
        <div className="stat-card">
          <BookmarkIcon className="stat-card__icon" aria-hidden="true" />
          <span className="stat-card__val">
            {isAuthenticated ? (profileLoading ? '—' : (savedCount ?? '—')) : '--'}
          </span>
          <span className="stat-card__lbl">Saved recipes</span>
          {!isAuthenticated && (
            <button className="stat-card__signin" onClick={requireAuth}>Sign in to track</button>
          )}
        </div>
      </div>

      {/* Recipe section */}
      <p className="section-label">{isAuthenticated ? 'Suggested for you' : 'Trending'}</p>

      {isRecipesLoading ? (
        <div className="suggestion-list">
          <SkeletonRows count={3} />
        </div>
      ) : isRecipesError ? (
        <div className="empty-state">
          <p>Couldn&apos;t load recipes.</p>
          <button className="btn btn--secondary" onClick={() => refetchRecipes()}>Try again</button>
        </div>
      ) : showPantryEmptyPrompt ? (
        <div className="empty-state">
          <p>Add ingredients to your pantry to get suggestions.</p>
          <button className="btn btn--primary" onClick={() => navigate('/pantry')}>Add ingredients</button>
        </div>
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <p>
            {isAuthenticated
              ? 'No suggestions right now — try adding more pantry items.'
              : 'No trending recipes right now.'}
          </p>
        </div>
      ) : (
        <div className="suggestion-list">
          {recipes.map((recipe, idx) => (
            <div key={recipe.id}>
              {idx > 0 && <div className="divider" />}
              <RecipeCard
                recipe={recipe}
                showMatchPill={isAuthenticated}
                showPantryTags={isAuthenticated}
                onNavigate={() => navigate('/recipe/' + recipe.id)}
                isSaved={isAuthenticated && savedRecipeIdSet.has(recipe.id)}
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
