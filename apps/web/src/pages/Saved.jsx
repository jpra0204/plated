import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MatchBar from '../components/MatchBar.jsx';
import RecipeThumb from '../components/RecipeThumb.jsx';
import Toast from '../components/Toast.jsx';
import { get, del } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';

/**
 * Saved — list of saved recipes.
 *
 * Each card taps → navigates to /recipe/:id.
 * Delete: swipe-to-delete with inline confirmation ('Remove this recipe?' / Cancel / Yes, remove).
 *
 * Cook this is no longer available from Saved — it lives on the detail page (A1).
 */

const FILTERS = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Chef picks'];

export default function Saved() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch]       = useState('');
  const [activeFilter, setFilter] = useState('All');
  const [toast, setToast]         = useState({ visible: false, message: '' });

  const showToast = (message) => setToast({ visible: true, message });

  // ── Saved list query ──────────────────────────────────────────────────────
  const {
    data: savedData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.saved.list(),
    queryFn: () => get('/api/v1/saved'),
    staleTime: 30_000,
  });

  const rawRecipes = savedData?.recipes ?? [];
  const recipes = rawRecipes.map(normalizeRecipe);

  const filtered = useMemo(() => {
    let list = recipes;
    if (search) list = list.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
    if (activeFilter === 'Chef picks') list = list.filter(r => r.isChefPick);
    else if (activeFilter !== 'All') {
      const target = activeFilter.toLowerCase();
      list = list.filter(r => r.mealType?.toLowerCase() === target);
    }
    return list;
  }, [recipes, search, activeFilter]);

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (savedId) => del(`/api/v1/saved/${savedId}`),
    onSuccess: () => {
      showToast('Recipe removed from saved.');
      queryClient.invalidateQueries({ queryKey: queryKeys.saved.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root() });
    },
    onError: () => showToast('Could not delete recipe. Please try again.'),
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Saved recipes</h1>
        <span className="page-count">{isLoading ? '—' : rawRecipes.length} recipes</span>
      </div>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast(t => ({ ...t, visible: false }))}
      />

      {/* Search */}
      <div className="search-bar">
        <SearchIcon aria-hidden="true" />
        <input
          className="search-bar__input"
          placeholder="Search saved recipes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search saved recipes"
        />
        {search && (
          <button className="search-bar__clear" onClick={() => setSearch('')} aria-label="Clear">×</button>
        )}
      </div>

      {/* Filter chips */}
      <div className="chips-row">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`chip ${activeFilter === f ? 'chip--active' : ''}`}
            onClick={() => setFilter(f)}
            aria-pressed={activeFilter === f}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="empty-state"><p>Loading saved recipes…</p></div>
      ) : isError ? (
        <div className="empty-state">
          <p>Could not load saved recipes.</p>
          <button className="btn btn--secondary" onClick={() => refetch()}>Try again</button>
        </div>
      ) : rawRecipes.length === 0 ? (
        <div className="empty-state"><p>No saved recipes yet. Cook something or approve a Chef pick!</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No saved recipes match your filters.</p></div>
      ) : (
        filtered.map(recipe => (
          <SavedCard
            key={recipe.id}
            recipe={recipe}
            onNavigate={() => navigate('/recipe/' + recipe.id)}
            onDelete={() => deleteMutation.mutate(recipe.savedId)}
            deleting={deleteMutation.isPending}
          />
        ))
      )}

      <div className="page-bottom" />
    </div>
  );
}

// ── Saved card — tap to navigate, swipe-left to delete ───────────────────────

/**
 * [ASSUMPTION]: Swipe-to-delete triggers when the user swipes left by more than
 * 50px horizontally with less than 80px vertical drift (to avoid conflicting with
 * page scroll). On trigger, the card enters an inline confirm state showing
 * "Remove this recipe?" with Cancel and Yes, remove buttons — matching the copy
 * used by the previous inline expanded-card deletion flow.
 */
function SavedCard({ recipe, onNavigate, onDelete, deleting }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const swipeTriggered = useRef(false);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeTriggered.current = false;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    // Left swipe: dx > 50 means moved 50px to the left
    if (dx > 50 && dy < 80) {
      swipeTriggered.current = true;
      setConfirmDelete(true);
    }
    touchStartX.current = null;
  };

  const handleClick = () => {
    // If a swipe just triggered the confirm, eat the synthetic click
    if (swipeTriggered.current) {
      swipeTriggered.current = false;
      return;
    }
    if (!confirmDelete) {
      onNavigate();
    }
  };

  if (confirmDelete) {
    return (
      <div className="recipe-card saved-card saved-card--confirming">
        <div className="recipe-card__main">
          <RecipeThumb imageUrl={recipe.imageUrl ?? null} alt={recipe.name} className="recipe-card__thumb" />
          <div className="recipe-card__body">
            <div className="recipe-card__name">{recipe.name}</div>
          </div>
        </div>
        <div className="saved-card__confirm">
          <p className="delete-confirm__prompt">Remove this recipe?</p>
          <div className="expanded-cta-row">
            <button
              className="btn btn--secondary"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              className="btn btn--danger btn--flex2"
              onClick={() => {
                onDelete();
                setConfirmDelete(false);
              }}
              disabled={deleting}
            >
              {deleting ? 'Removing…' : 'Yes, remove'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="recipe-card saved-card"
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter') onNavigate();
        // Delete key also triggers confirm (keyboard accessibility)
        if (e.key === 'Delete') setConfirmDelete(true);
      }}
      aria-label={`View ${recipe.name}`}
    >
      <div className="recipe-card__main">
        <RecipeThumb imageUrl={recipe.imageUrl ?? null} alt={recipe.name} className="recipe-card__thumb" />
        <div className="recipe-card__body">
          <div className="recipe-card__name">{recipe.name}</div>
          <div className="recipe-card__meta">
            <ClockIcon aria-hidden="true" /> {recipe.cookTime} min
            <ChefHatIcon aria-hidden="true" style={{ marginLeft: 4 }} /> {recipe.difficulty}
          </div>
          <div className="recipe-card__tags">
            <span className="r-tag">{recipe.mealType}</span>
            {recipe.isChefPick && (
              <span className="r-tag r-tag--chef">
                <SparklesIcon aria-hidden="true" /> Chef
              </span>
            )}
          </div>
        </div>
        {/* Non-interactive saved indicator — every card in Saved is already saved */}
        <BookmarkFilledIcon className="saved-badge" aria-hidden="true" />
      </div>
      <MatchBar pct={recipe.matchPct} className="recipe-card__match-bar" />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeRecipe(r) {
  return {
    savedId:    r.saved_id,
    id:         r.id,
    name:       r.name,
    cookTime:   r.cook_time_mins,
    difficulty: r.difficulty,
    servings:   r.servings,
    cuisine:    r.cuisine,
    mealType:   r.meal_type,
    matchPct:   r.match_pct ?? 0,
    isChefPick: r.is_chef_pick ?? false,
    imageUrl:   r.image_url ?? null,
    ingredients: (r.ingredients ?? []).map(ing => ({
      name: ing.name, quantity: ing.quantity, unit: ing.unit,
      inPantry: ing.in_pantry ?? false,
    })),
    steps: (r.steps ?? []).map(s => (typeof s === 'string' ? s : s.instruction)),
  };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon(props)       { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>; }
function ClockIcon(props)        { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>; }
function ChefHatIcon(props)      { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" /><line x1="6" y1="17" x2="18" y2="17" /></svg>; }
function SparklesIcon(props)     { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" /></svg>; }
function BookmarkFilledIcon({ className, ...props }) { return <svg className={className} {...props} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" /></svg>; }
