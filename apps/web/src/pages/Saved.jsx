import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MatchBar from '../components/MatchBar.jsx';
import PantryTag from '../components/PantryTag.jsx';
import Toast from '../components/Toast.jsx';
import { get, post, del } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';

/**
 * Saved — list + expanded card.
 *
 * Uses GET /saved (returns match_pct, ingredients+in_pantry, steps).
 * Cook: POST /cook with invalidation.
 * Delete: DELETE /saved/:savedId with inline confirmation.
 */

const FILTERS = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Chef picks'];

export default function Saved() {
  const queryClient = useQueryClient();
  const [search, setSearch]         = useState('');
  const [activeFilter, setFilter]   = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toast, setToast]           = useState({ visible: false, message: '' });

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

  // ── Cook mutation ─────────────────────────────────────────────────────────
  const cookMutation = useMutation({
    mutationFn: (recipeId) => post('/api/v1/cook', { recipeId }),
    onSuccess: (data) => {
      const n = data.removedItems?.length ?? 0;
      showToast(n > 0
        ? `Cooked! Removed ${n} ingredient${n !== 1 ? 's' : ''} from your pantry.`
        : 'Cooked! No pantry items to remove.');
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.suggestions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.saved.all() });
    },
    onError: () => showToast('Something went wrong. Please try again.'),
  });

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (savedId) => del(`/api/v1/saved/${savedId}`),
    onSuccess: () => {
      setExpandedId(null);
      setConfirmDeleteId(null);
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
        filtered.map(recipe =>
          expandedId === recipe.id ? (
            <ExpandedRecipe
              key={recipe.id}
              recipe={recipe}
              onCollapse={() => setExpandedId(null)}
              onCook={() => cookMutation.mutate(recipe.id)}
              onDelete={() => setConfirmDeleteId(recipe.savedId)}
              confirmingDelete={confirmDeleteId === recipe.savedId}
              onConfirmDelete={() => deleteMutation.mutate(recipe.savedId)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              cooking={cookMutation.isPending}
              deleting={deleteMutation.isPending}
            />
          ) : (
            <CollapsedRecipe
              key={recipe.id}
              recipe={recipe}
              onExpand={() => { setExpandedId(recipe.id); setConfirmDeleteId(null); }}
            />
          )
        )
      )}

      <div className="page-bottom" />
    </div>
  );
}

// ── Collapsed recipe card ─────────────────────────────────────────────────────

function CollapsedRecipe({ recipe, onExpand }) {
  return (
    <div
      className="recipe-card"
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onExpand()}
      aria-label={`Expand ${recipe.name}`}
    >
      <div className="recipe-card__main">
        <div className="recipe-card__thumb" aria-hidden="true" />
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
      </div>
      <MatchBar pct={recipe.matchPct} className="recipe-card__match-bar" />
    </div>
  );
}

// ── Expanded recipe card ──────────────────────────────────────────────────────

function ExpandedRecipe({
  recipe,
  onCollapse,
  onCook,
  onDelete,
  confirmingDelete,
  onConfirmDelete,
  onCancelDelete,
  cooking,
  deleting,
}) {
  return (
    <div className="expanded-recipe">
      <button className="expanded-recipe__header" onClick={onCollapse} aria-label="Collapse recipe">
        <div className="expanded-recipe__title-row">
          <span className="expanded-recipe__title">{recipe.name}</span>
          {recipe.isChefPick && (
            <span className="chef-badge">
              <SparklesIcon aria-hidden="true" /> Chef
            </span>
          )}
        </div>
        <div className="expanded-recipe__meta">
          <span><ClockIcon aria-hidden="true" /> {recipe.cookTime} min</span>
          <span><ChefHatIcon aria-hidden="true" /> {recipe.difficulty}</span>
          <span><UsersIcon aria-hidden="true" /> {recipe.servings} servings</span>
        </div>
      </button>

      <MatchBar pct={recipe.matchPct} className="expanded-recipe__match-bar" />

      <div className="expanded-recipe__body">
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

        <p className="section-label">Steps</p>
        <div className="step-list">
          {recipe.steps.map((step, i) => (
            <div key={i} className="step-row-sm">
              <div className="step-num-sm" aria-hidden="true">{i + 1}</div>
              <p className="step-text-sm">{step}</p>
            </div>
          ))}
        </div>

        {confirmingDelete ? (
          <div className="delete-confirm">
            <p className="delete-confirm__prompt">Remove this recipe?</p>
            <div className="expanded-cta-row">
              <button
                className="btn btn--secondary"
                onClick={onCancelDelete}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn--danger btn--flex2"
                onClick={onConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Removing…' : 'Yes, remove'}
              </button>
            </div>
          </div>
        ) : (
          <div className="expanded-cta-row">
            <button
              className="btn btn--primary btn--flex2"
              onClick={onCook}
              disabled={cooking}
            >
              <ChefHatIcon aria-hidden="true" /> {cooking ? 'Cooking…' : 'Cook this'}
            </button>
            <button className="btn btn--danger" onClick={onDelete}>
              <TrashIcon aria-hidden="true" /> Delete
            </button>
          </div>
        )}
      </div>
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
    ingredients: (r.ingredients ?? []).map(ing => ({
      name: ing.name, quantity: ing.quantity, unit: ing.unit,
      inPantry: ing.in_pantry ?? false,
    })),
    steps: (r.steps ?? []).map(s => (typeof s === 'string' ? s : s.instruction)),
  };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon(props)    { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>; }
function ClockIcon(props)     { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>; }
function ChefHatIcon(props)   { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" /><line x1="6" y1="17" x2="18" y2="17" /></svg>; }
function UsersIcon(props)     { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>; }
function SparklesIcon(props)  { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" /></svg>; }
function TrashIcon(props)     { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>; }
function CheckCircleIcon({ className, ...props }) { return <svg className={className} {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>; }
function AlertCircleIcon({ className, ...props }) { return <svg className={className} {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>; }
