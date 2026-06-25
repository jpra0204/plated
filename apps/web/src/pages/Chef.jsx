 
import { useState } from 'react';
import PantryTag from '../components/PantryTag.jsx';
import Toast from '../components/Toast.jsx';
import { FAKE_CHEF_RESULT, FAKE_STATS } from '../data/fakeData.js';

/**
 * Chef — three states from chef_wireframes.html:
 *   'input'      → filter chips, servings stepper, notes, "Chef it" button
 *   'generating' → spinner + loading copy
 *   'result'     → recipe detail + missing banner + Approve / Retry buttons
 */

const MEAL_TYPES  = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const COOK_TIMES  = ['Under 15 min', '30 min', '1 hr+'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const CUISINES = [
  '', 'Italian', 'Mediterranean', 'Asian', 'Mexican', 'French', 'Indian', 'Middle Eastern',
];

export default function Chef() {
  const [view, setView] = useState('input'); // 'input' | 'generating' | 'result'

  const [filters, setFilters] = useState({
    mealType: 'Lunch',
    cookTime: '30 min',
    difficulty: 'Easy',
    cuisine: '',
    servings: 2,
    notes: '',
  });
  const [toastVisible, setToastVisible] = useState(false);

  function setFilter(key, val) {
    setFilters(f => ({ ...f, [key]: val }));
  }

  function handleChefIt() {
    setView('generating');
    // Simulate API latency (remove when real endpoint is wired)
    setTimeout(() => setView('result'), 1800);
  }

  function handleApprove() {
    setToastVisible(true);
    setView('input');
  }

  function handleRetry() {
    setView('generating');
    setTimeout(() => setView('result'), 1800);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">
          Chef <span className="ai-badge">AI</span>
        </h1>
        {view === 'result' && (
          <button className="text-btn text-btn--primary" onClick={() => setView('input')}>
            <AdjustIcon aria-hidden="true" /> Adjust
          </button>
        )}
      </div>

      <Toast
        message="Recipe approved and saved to your collection!"
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />

      {view === 'input' && (
        <InputState filters={filters} setFilter={setFilter} onSubmit={handleChefIt} />
      )}
      {view === 'generating' && <GeneratingState />}
      {view === 'result' && (
        <ResultState recipe={FAKE_CHEF_RESULT} onApprove={handleApprove} onRetry={handleRetry} />
      )}

      <div className="page-bottom" />
    </div>
  );
}

// ── Input state ───────────────────────────────────────────────────────────────

function InputState({ filters, setFilter, onSubmit }) {
  return (
    <>
      <div className="pantry-note">
        <BasketIcon aria-hidden="true" />
        <span>Using {FAKE_STATS.pantryCount} pantry items to generate your recipe</span>
      </div>

      <ChipGroup
        label="Meal type"
        options={MEAL_TYPES}
        value={filters.mealType}
        onChange={v => setFilter('mealType', v)}
      />

      <ChipGroup
        label="Cook time"
        options={COOK_TIMES}
        value={filters.cookTime}
        onChange={v => setFilter('cookTime', v)}
      />

      <ChipGroup
        label="Difficulty"
        options={DIFFICULTIES}
        value={filters.difficulty}
        onChange={v => setFilter('difficulty', v)}
      />

      <div>
        <p className="section-label">
          Cuisine <span className="section-label-optional">— optional</span>
        </p>
        <select
          className="form-select"
          value={filters.cuisine}
          onChange={e => setFilter('cuisine', e.target.value)}
          aria-label="Cuisine"
        >
          {CUISINES.map(c => (
            <option key={c} value={c}>{c || 'Select a cuisine…'}</option>
          ))}
        </select>
      </div>

      <div className="divider" />

      {/* Servings stepper */}
      <div className="card card--row">
        <div>
          <div className="card__title">Servings</div>
          <div className="card__subtitle">How many plates?</div>
        </div>
        <div className="stepper">
          <button
            className="stepper__btn"
            aria-label="Decrease servings"
            onClick={() => setFilter('servings', Math.max(1, filters.servings - 1))}
          >−</button>
          <span className="stepper__val">{filters.servings}</span>
          <button
            className="stepper__btn"
            aria-label="Increase servings"
            onClick={() => setFilter('servings', Math.min(12, filters.servings + 1))}
          >+</button>
        </div>
      </div>

      <div>
        <p className="section-label">
          Extra notes <span className="section-label-optional">— optional</span>
        </p>
        <textarea
          className="notes-field"
          placeholder="e.g. make it spicy, no cilantro, high protein…"
          value={filters.notes}
          onChange={e => setFilter('notes', e.target.value)}
          rows={3}
          aria-label="Extra notes for Chef"
        />
        <p className="form-hint">Chef will figure out the rest</p>
      </div>

      <button className="btn btn--primary btn--large btn--full" onClick={onSubmit}>
        <SparklesIcon aria-hidden="true" /> Chef it
      </button>
    </>
  );
}

// ── Generating state ──────────────────────────────────────────────────────────

function GeneratingState() {
  return (
    <div className="generating-state">
      <div className="spinner" aria-label="Generating recipe…" role="status" />
      <p className="generating-state__title">Chef is cooking…</p>
      <p className="generating-state__sub">Finding the best recipe from your pantry</p>
    </div>
  );
}

// ── Result state ──────────────────────────────────────────────────────────────

function ResultState({ recipe, onApprove, onRetry }) {
  const missing = recipe.ingredients.filter(i => !i.inPantry);

  return (
    <>
      {/* Recipe header */}
      <div className="result-header">
        <div className="result-header__title">{recipe.name}</div>
        <div className="result-header__meta">
          <span><ClockIcon aria-hidden="true" /> {recipe.cookTime} min</span>
          <span><ChefHatIcon aria-hidden="true" /> {recipe.difficulty}</span>
          <span><UsersIcon aria-hidden="true" /> {recipe.servings} servings</span>
        </div>
      </div>

      {/* Missing ingredients banner */}
      {missing.length > 0 && (
        <div className="missing-banner">
          <div className="missing-banner__left">
            <CartIcon aria-hidden="true" />
            <span>{missing.length} ingredient{missing.length !== 1 ? 's' : ''} missing from your pantry</span>
          </div>
          <button className="missing-banner__btn">Add to list</button>
        </div>
      )}

      {/* Ingredients */}
      <p className="section-label">Ingredients</p>
      <div className="card card--list">
        {recipe.ingredients.map((ing, i) => (
          <div key={i} className="ing-row">
            <div className="ing-row__left">
              {ing.inPantry
                ? <CheckCircleIcon className="icon--green" aria-hidden="true" />
                : <AlertCircleIcon className="icon--amber" aria-hidden="true" />}
              {ing.name}
            </div>
            <div className="ing-row__right">
              <span className="ing-qty">{ing.quantity} {ing.unit}</span>
              <PantryTag variant={ing.inPantry ? 'in-pantry' : 'missing'} />
              {!ing.inPantry && (
                <button className="add-list-btn" aria-label={`Add ${ing.name} to shopping list`}>
                  + Add
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Steps */}
      <p className="section-label">Steps</p>
      <div className="card">
        <div className="step-list">
          {recipe.steps.map((step, i) => (
            <div key={i} className="step-row">
              <div className="step-num" aria-hidden="true">{i + 1}</div>
              <p className="step-text">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="cta-row">
        <button className="btn btn--primary" onClick={onApprove}>
          <CheckIcon aria-hidden="true" /> Approve
        </button>
        <button className="btn btn--secondary" onClick={onRetry}>
          <RefreshIcon aria-hidden="true" /> Retry
        </button>
      </div>
      <p className="approve-hint">Approving saves this recipe to your collection</p>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ChipGroup({ label, options, value, onChange }) {
  return (
    <div>
      <p className="section-label">{label}</p>
      <div className="chips-row">
        {options.map(opt => (
          <button
            key={opt}
            className={`chip ${value === opt ? 'chip--active' : ''}`}
            onClick={() => onChange(opt)}
            aria-pressed={value === opt}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function AdjustIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" /><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" /></svg>;
}
function SparklesIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" /></svg>;
}
function BasketIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
}
function ClockIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}
function ChefHatIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" /><line x1="6" y1="17" x2="18" y2="17" /></svg>;
}
function UsersIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function CartIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>;
}
function CheckCircleIcon({ className, ...props }) {
  return <svg className={className} {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}
function AlertCircleIcon({ className, ...props }) {
  return <svg className={className} {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}
function CheckIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function RefreshIcon(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>;
}
