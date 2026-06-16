import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard.jsx';
import Toast from '../components/Toast.jsx';
import { FAKE_STATS, FAKE_SUGGESTIONS } from '../data/fakeData.js';

/**
 * Home — three states from home_screen_v2 wireframe:
 *   'default'  → hero card + stats + collapsed suggestion list
 *   'expanded' → a recipe card expanded inline
 *   'post-cook'→ toast shown, stats updated, suggestion list trimmed
 */

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(FAKE_STATS);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const handleCook = useCallback((recipe) => {
    const removed = recipe.ingredients.filter(i => i.inPantry).length;
    setStats(s => ({ ...s, pantryCount: Math.max(0, s.pantryCount - removed) }));
    setToastMsg(`Cooked! Removed ${removed} ingredient${removed !== 1 ? 's' : ''} from your pantry.`);
    setToastVisible(true);
  }, []);

  const handleSave = useCallback(() => {
    setToastMsg('Recipe saved to your collection.');
    setToastVisible(true);
  }, []);

  const greeting = getGreeting();

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">
          {greeting}, {/* TODO: replace with user.displayName */}Jamie
        </h1>
        <button className="icon-btn" aria-label="Notifications">
          <BellIcon />
        </button>
      </div>

      <Toast
        message={toastMsg}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />

      {/* Hero card */}
      <div className="hero-card">
        <h2 className="hero-card__title">What can I cook today?</h2>
        <p className="hero-card__body">
          You have {stats.pantryCount} items in your pantry. Let Chef find something delicious.
        </p>
        <button className="hero-card__cta" onClick={() => navigate('/chef')}>
          <SparklesIcon aria-hidden="true" /> Open Chef
        </button>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <BasketIcon className="stat-card__icon" aria-hidden="true" />
          <span className="stat-card__value">{stats.pantryCount}</span>
          <span className="stat-card__label">Pantry items</span>
        </div>
        <div className="stat-card">
          <BookmarkIcon className="stat-card__icon" aria-hidden="true" />
          <span className="stat-card__value">{stats.savedCount}</span>
          <span className="stat-card__label">Saved recipes</span>
        </div>
      </div>

      {/* Suggestion list */}
      <p className="section-label">Suggested for you</p>
      <div className="suggestion-list">
        {FAKE_SUGGESTIONS.map((recipe, idx) => (
          <div key={recipe.id}>
            {idx > 0 && <div className="divider" />}
            <RecipeCard
              recipe={recipe}
              showMatchPill
              actions={[
                {
                  label: 'Cook this',
                  icon: ChefHatIcon,
                  onClick: () => handleCook(recipe),
                  variant: 'primary',
                },
                {
                  label: 'Save',
                  icon: BookmarkIcon,
                  onClick: handleSave,
                  variant: 'secondary',
                },
              ]}
            />
          </div>
        ))}
      </div>

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

// ── Icons ─────────────────────────────────────────────────────────────────────

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

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

function ChefHatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" /><line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  );
}
