/* eslint-disable react/prop-types */
import { useState } from 'react';
import MatchBar from './MatchBar.jsx';
import PantryTag from './PantryTag.jsx';

/**
 * RecipeCard — collapsed list row that expands into a full detail card.
 *
 * Props:
 *   recipe       object   — recipe data (see fakeData.js for shape)
 *   actions      array    — [{ label, icon: Component, onClick, variant }]
 *                           rendered as CTA buttons in expanded state
 *   defaultExpanded bool  — start expanded (default false)
 *   showMatchPill bool    — show match pill in collapsed row (Home screen)
 */

export default function RecipeCard({
  recipe,
  actions = [],
  defaultExpanded = false,
  showMatchPill = true,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (expanded) {
    return <ExpandedCard recipe={recipe} actions={actions} onCollapse={() => setExpanded(false)} />;
  }

  return <CollapsedRow recipe={recipe} onExpand={() => setExpanded(true)} showMatchPill={showMatchPill} />;
}

// ── Collapsed row ─────────────────────────────────────────────────────────────

function CollapsedRow({ recipe, onExpand, showMatchPill }) {
  return (
    <div className="recipe-card__row" onClick={onExpand} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onExpand()}
      aria-label={`View ${recipe.name}`}
    >
      <div className="recipe-card__thumb" aria-hidden="true" />
      <div className="recipe-card__info">
        <div className="recipe-card__name">{recipe.name}</div>
        <div className="recipe-card__meta">
          <ClockIcon aria-hidden="true" />
          {recipe.cookTime} min · {recipe.difficulty}
        </div>
      </div>
      {showMatchPill && (
        <span className="recipe-card__match-pill">{recipe.matchPct}% match</span>
      )}
    </div>
  );
}

// ── Expanded card ─────────────────────────────────────────────────────────────

function ExpandedCard({ recipe, actions, onCollapse }) {
  return (
    <div className="recipe-card--expanded">
      {/* Header */}
      <button className="recipe-card__expanded-header" onClick={onCollapse} aria-label="Collapse recipe">
        <div className="recipe-card__expanded-title">{recipe.name}</div>
        <div className="recipe-card__expanded-meta">
          <span><ClockIcon aria-hidden="true" /> {recipe.cookTime} min</span>
          <span><ChefHatIcon aria-hidden="true" /> {recipe.difficulty}</span>
          <span><UsersIcon aria-hidden="true" /> {recipe.servings} servings</span>
        </div>
      </button>

      {/* Match bar */}
      <MatchBar pct={recipe.matchPct} className="recipe-card__match-bar" />

      {/* Body */}
      <div className="recipe-card__expanded-body">
        {/* Ingredients */}
        <p className="section-label">Ingredients</p>
        <div className="recipe-card__ing-list">
          {recipe.ingredients.map((ing, i) => (
            <div key={i} className="recipe-card__ing-row">
              <div className="recipe-card__ing-left">
                {ing.inPantry
                  ? <CheckCircleIcon className="icon--green" aria-hidden="true" />
                  : <AlertCircleIcon className="icon--amber" aria-hidden="true" />}
                {ing.name}
              </div>
              <div className="recipe-card__ing-right">
                <span className="recipe-card__ing-qty">{ing.quantity} {ing.unit}</span>
                <PantryTag variant={ing.inPantry ? 'in-pantry' : 'missing'} />
              </div>
            </div>
          ))}
        </div>

        {/* Steps */}
        <p className="section-label">Steps</p>
        <div className="recipe-card__steps">
          {recipe.steps.map((step, i) => (
            <div key={i} className="recipe-card__step-row">
              <div className="recipe-card__step-num" aria-hidden="true">{i + 1}</div>
              <p className="recipe-card__step-text">{step}</p>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        {actions.length > 0 && (
          <div className="recipe-card__cta-row">
            {actions.map(({ label, icon: Icon, onClick, variant = 'primary' }, i) => (
              <button
                key={i}
                className={`btn btn--${variant} recipe-card__cta-btn`}
                onClick={onClick}
              >
                {Icon && <Icon aria-hidden="true" />}
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inline icons ─────────────────────────────────────────────────────────────

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

// Export icon helpers so pages can use them in action arrays
export { ChefHatIcon, CheckCircleIcon };
