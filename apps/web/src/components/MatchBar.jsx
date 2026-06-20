/**
 * MatchBar — horizontal progress bar showing pantry match %.
 *
 * Colour thresholds (from saved_and_profile_v2.html):
 *   ≥ 75 % → green  (--color-match-high-*)
 *   40–74 % → sage  (--color-match-mid-*)
 *   < 40 %  → amber (--color-match-low-*)
 */

function getThreshold(pct) {
  if (pct >= 75) return 'high';
  if (pct >= 40) return 'mid';
  return 'low';
}

export default function MatchBar({ pct, className = '' }) {
  const tier = getThreshold(pct);

  return (
    <div className={`match-bar-wrap ${className}`}>
      <div className="match-bar-track">
        <div
          className={`match-bar-fill match-bar-fill--${tier}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className={`match-bar-label match-bar-label--${tier}`}>
        {pct}% in pantry
      </span>
    </div>
  );
}
