import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MatchBar from '../components/MatchBar.jsx';
import PantryTag from '../components/PantryTag.jsx';
import RecipeThumb from '../components/RecipeThumb.jsx';
import Toast from '../components/Toast.jsx';
import { get, post, del } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';

/**
 * RecipeDetail — full recipe detail page at /recipe/:id.
 *
 * Fetches recipe via GET /api/v1/recipes/:id (includes in_pantry flags,
 * is_saved, saved_id, and match_pct from the backend).
 *
 * Features:
 *   - Bookmark save/unsave button in header top-right (optimistic update)
 *   - Ingredient list with In pantry / Missing tags
 *   - Numbered steps
 *   - Sticky "Cook this" button above the tab bar
 */
export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [toast, setToast] = useState({ visible: false, message: '' });

  // Local save state — initialised from server data, updated optimistically
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const dataInitialized = useRef(false);

  const showToast = (message) => setToast({ visible: true, message });

  // ── Recipe detail query ───────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.recipes.detail(id),
    queryFn: () => get(`/api/v1/recipes/${id}`),
    staleTime: 60_000,
  });

  // Seed local save state from server on first load only
  useEffect(() => {
    if (data?.recipe && !dataInitialized.current) {
      setIsSaved(data.recipe.is_saved ?? false);
      setSavedId(data.recipe.saved_id ?? null);
      dataInitialized.current = true;
    }
  }, [data]);

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => post('/api/v1/saved', { recipeId: id }),
    onMutate: () => {
      // Optimistic update
      setIsSaved(true);
    },
    onSuccess: (responseData) => {
      setSavedId(responseData.savedRecipe?.id ?? null);
      showToast('Saved to your recipes');
      queryClient.invalidateQueries({ queryKey: queryKeys.saved.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(id) });
    },
    onError: () => {
      // Rollback optimistic update
      setIsSaved(false);
      showToast('Could not save recipe. Please try again.');
    },
  });

  // ── Unsave mutation ───────────────────────────────────────────────────────
  const unsaveMutation = useMutation({
    mutationFn: () => del(`/api/v1/saved/${savedId}`),
    onMutate: () => {
      // Optimistic update
      setIsSaved(false);
    },
    onSuccess: () => {
      setSavedId(null);
      showToast('Removed from saved recipes');
      queryClient.invalidateQueries({ queryKey: queryKeys.saved.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(id) });
    },
    onError: () => {
      // Rollback optimistic update
      setIsSaved(true);
      showToast('Could not remove recipe. Please try again.');
    },
  });

  // ── Cook mutation ─────────────────────────────────────────────────────────
  const cookMutation = useMutation({
    mutationFn: () => post('/api/v1/cook', { recipeId: id }),
    onSuccess: (responseData) => {
      const n = responseData.removedItems?.length ?? 0;
      const msg = n > 0
        ? `Cooked! Removed ${n} ingredient${n !== 1 ? 's' : ''} from your pantry.`
        : 'Cooked! No pantry items to remove.';
      showToast(msg);
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.suggestions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root() });
    },
    onError: () => showToast('Something went wrong. Please try again.'),
  });

  // ── Save/unsave toggle ────────────────────────────────────────────────────
  const handleSaveToggle = () => {
    if (saveMutation.isPending || unsaveMutation.isPending) return;
    if (isSaved && savedId) {
      unsaveMutation.mutate();
    } else if (!isSaved) {
      saveMutation.mutate();
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="page">
        <div className="recipe-detail__nav">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ChevronLeftIcon aria-hidden="true" /> Back
          </button>
        </div>
        <div className="recipe-detail__hero recipe-detail__hero--skeleton">
          <div className="skeleton skeleton--text-lg" style={{ width: '70%', marginBottom: 8 }} />
          <div className="skeleton skeleton--text-sm" style={{ width: '50%' }} />
        </div>
        <div className="empty-state" style={{ paddingTop: 32 }}>
          <p>Loading recipe…</p>
        </div>
      </div>
    );
  }

  if (isError || !data?.recipe) {
    return (
      <div className="page">
        <div className="recipe-detail__nav">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ChevronLeftIcon aria-hidden="true" /> Back
          </button>
        </div>
        <div className="empty-state">
          <p>Recipe not found.</p>
          <button className="btn btn--secondary" onClick={() => navigate(-1)}>Go back</button>
        </div>
      </div>
    );
  }

  const recipe = normalizeRecipe(data.recipe);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="page recipe-detail-page">
        <Toast
          message={toast.message}
          visible={toast.visible}
          onDismiss={() => setToast(t => ({ ...t, visible: false }))}
        />

        {/* Nav row: back button + save icon */}
        <div className="recipe-detail__nav">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ChevronLeftIcon aria-hidden="true" /> Back
          </button>
          <button
            className="icon-btn recipe-detail__save-btn"
            onClick={handleSaveToggle}
            aria-label={isSaved ? 'Remove from saved' : 'Save recipe'}
            disabled={saveMutation.isPending || unsaveMutation.isPending}
          >
            {isSaved
              ? <BookmarkFilledIcon aria-hidden="true" />
              : <BookmarkIcon aria-hidden="true" />}
          </button>
        </div>

        {/* Recipe image — actual photo when available, grey placeholder otherwise */}
        <RecipeThumb
          imageUrl={recipe.imageUrl}
          alt={recipe.name}
          className="recipe-detail__image"
        />

        {/* Recipe hero header */}
        <div className="recipe-detail__hero">
          <div className="recipe-detail__hero-title-row">
            <h1 className="recipe-detail__title">{recipe.name}</h1>
            {recipe.source === 'chef_ai' && (
              <span className="chef-badge">
                <SparklesIcon aria-hidden="true" /> Chef
              </span>
            )}
          </div>
          <div className="recipe-detail__meta">
            <span><ClockIcon aria-hidden="true" /> {recipe.cookTime} min</span>
            <span><ChefHatIcon aria-hidden="true" /> {recipe.difficulty}</span>
            <span><UsersIcon aria-hidden="true" /> {recipe.servings} servings</span>
          </div>
        </div>

        {/* Pantry match bar */}
        <MatchBar pct={recipe.matchPct} className="recipe-detail__match-bar" />

        {/* Ingredients */}
        <p className="section-label">Ingredients</p>
        <div className="ing-list-bg">
          {recipe.ingredients.map((ing, i) => (
            <div key={i} className="ing-row-sm">
              <div className="ing-row-sm__left">
                {ing.inPantry
                  ? <CheckCircleIcon className="icon--green" aria-hidden="true" />
                  : <AlertCircleIcon className="icon--amber" aria-hidden="true" />}
                {ing.name}
              </div>
              <div className="ing-row-sm__right">
                <span className="ing-qty-sm">{ing.quantity} {ing.unit}</span>
                <PantryTag variant={ing.inPantry ? 'in-pantry' : 'missing'} />
              </div>
            </div>
          ))}
        </div>

        {/* Steps */}
        <p className="section-label">Steps</p>
        <div className="step-list">
          {recipe.steps.map((step, i) => (
            <div key={i} className="step-row-sm">
              <div className="step-num-sm" aria-hidden="true">{i + 1}</div>
              <p className="step-text-sm">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Cook this button — fixed above the tab bar */}
      <button
        className="recipe-detail__cook-btn btn btn--primary"
        onClick={() => cookMutation.mutate()}
        disabled={cookMutation.isPending}
        aria-label={cookMutation.isPending ? 'Cooking…' : 'Cook this recipe'}
      >
        <ChefHatIcon aria-hidden="true" />
        {cookMutation.isPending ? 'Cooking…' : 'Cook this'}
      </button>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalise raw API response shape to the flat object used by this page.
 * Mirrors the normalizeRecipe pattern from Home.jsx and Saved.jsx.
 */
function normalizeRecipe(r) {
  return {
    id:         r.id,
    name:       r.name,
    source:     r.source,
    cookTime:   r.cook_time_mins,
    difficulty: r.difficulty,
    servings:   r.servings,
    cuisine:    r.cuisine,
    mealType:   r.meal_type,
    matchPct:   r.match_pct ?? 0,
    imageUrl:   r.image_url ?? null,
    ingredients: (r.ingredients ?? []).map(ing => ({
      name:     ing.name,
      quantity: ing.quantity,
      unit:     ing.unit,
      inPantry: ing.in_pantry ?? false,
    })),
    steps: (r.steps ?? []).map(s =>
      typeof s === 'string' ? s : s.instruction
    ),
  };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronLeftIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function BookmarkIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
    </svg>
  );
}

function BookmarkFilledIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
    </svg>
  );
}

function SparklesIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" />
    </svg>
  );
}

function ClockIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ChefHatIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" /><line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  );
}

function UsersIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CheckCircleIcon({ className, ...props }) {
  return (
    <svg className={className} {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircleIcon({ className, ...props }) {
  return (
    <svg className={className} {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
