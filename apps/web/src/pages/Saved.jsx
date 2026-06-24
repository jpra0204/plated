/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react';
import MatchBar from '../components/MatchBar.jsx';
import PantryTag from '../components/PantryTag.jsx';
import Toast from '../components/Toast.jsx';
import { FAKE_SAVED } from '../data/fakeData.js';

/**
 * Saved — list + expanded card, from saved_and_profile_v2 wireframe.
 *
 * States:
 *   'list'     → collapsed recipe cards with match bar
 *   expandedId → one recipe expanded inline (click to expand/collapse)
 */

const FILTERS = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Chef picks'];

export default function Saved() {
  const [search, setSearch]         = useState('');
  const [activeFilter, setFilter]   = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [recipes, setRecipes]       = useState(FAKE_SAVED);
  const [toast, setToast]           = useState({ visible: false, msg: '' });

  function showToast(msg) { setToast({ visible: true, msg }); }

  const filtered = useMemo(() => {
    let list = recipes;
    if (search) list = list.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
    if (activeFilter === 'Chef picks') list = list.filter(r => r.isChefPick);
    else if (activeFilter !== 'All') list = list.filter(r => r.mealType === activeFilter);
    return list;
  }, [recipes, search, activeFilter]);

  function handleCook(recipe) {
    showToast(`Cooked! Removed ${recipe.ingredients.filter(i => i.inPantry).length} ingredients from your pantry.`);
    setExpandedId(null);
  }

  function handleDelete(id) {
    setRecipes(rs => rs.filter(r => r.id !== id));
    setExpandedId(null);
    showToast('Recipe removed from saved.');
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Saved recipes</h1>
        <span className="page-count">{recipes.length} recipes</span>
      </div>

      <Toast message={toast.msg} visible={toast.visible} onDismiss={() => setToast(t => ({ ...t, visible: false }))} />

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

      {/* Recipe list */}
      {filtered.length === 0 && (
        <p className="empty-state">No saved recipes match your filters.</p>
      )}

      {filtered.map(recipe =>
        expandedId === recipe.id ? (
          <ExpandedRecipe
            key={recipe.id}
            recipe={recipe}
            onCollapse={() => setExpandedId(null)}
            onCook={() => handleCook(recipe)}
            onDelete={() => handleDelete(recipe.id)}
          />
        ) : (
          <CollapsedRecipe
            key={recipe.id}
            recipe={recipe}
            onExpand={() => setExpandedId(recipe.id)}
          />
        )
      )}

      <div className="page-bottom" />
    </div>
  );
}

// ── Collapsed recipe card ─────────────────────────────────────────────────────

function CollapsedRecipe({ recipe, onExpand }) {
  return (
    <div className="recipe-card" onClick={onExpand} role="button" tabIndex={0}
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

function ExpandedRecipe({ recipe, onCollapse, onCook, onDelete }) {
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

        <div className="expanded-cta-row">
          <button className="btn btn--primary btn--flex2" onClick={onCook}>
            <ChefHatIcon aria-hidden="true" /> Cook this
          </button>
          <button className="btn btn--danger" onClick={onDelete}>
            <TrashIcon aria-hidden="true" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
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
