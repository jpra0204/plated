import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore.js';
import '../styles/landing.css';

/**
 * Landing — public marketing page at `/`.
 *
 * Standalone page: no tab bar (TabBar checks pathname and returns null for `/`).
 *
 * CTA routing:
 *   - Authenticated visitors → /home
 *   - Unauthenticated visitors → /auth (Auth page already redirects to /home on success)
 *
 * [ASSUMPTION]: During status === 'loading' the CTA defaults to '/auth'. If the
 * user is actually authenticated, the Auth page will detect the session and
 * redirect them to /home without showing the auth UI.
 *
 * [ASSUMPTION]: The nav "Sign In" link uses the same auth-aware routing as the
 * hero CTA — clicking it while already authenticated routes to /home.
 *
 * [ASSUMPTION]: The page renders within the existing 480px app-shell (matching
 * the rest of the app). A full-width desktop layout is deferred to the
 * content/design pass mentioned in BUILD_PLAN.md A12.
 */
export default function Landing() {
  const navigate = useNavigate();
  const { status } = useAuthStore();

  // [ASSUMPTION]: 'loading' is treated the same as 'unauthenticated' for CTA routing.
  const isAuthenticated = status === 'authenticated';
  const ctaDestination = isAuthenticated ? '/home' : '/auth';

  function handleCta() {
    navigate(ctaDestination);
  }

  return (
    <div className="landing">

      {/* ── Nav bar ─────────────────────────────────────────────────────── */}
      <header className="landing-nav">
        <span className="landing-nav__wordmark">Plated</span>
        <button className="landing-nav__signin" onClick={handleCta}>
          Sign In
        </button>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="landing-hero">
        <p className="landing-hero__eyebrow">AI-powered kitchen</p>
        <h1 className="landing-hero__headline">Your pantry, turned into dinner</h1>
        <p className="landing-hero__subhead">From pantry to plate, in seconds</p>
        <p className="landing-hero__body">What can I cook today?</p>
        <button className="landing-cta-btn" onClick={handleCta}>
          Sign In
        </button>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="landing-section">
        <h2 className="landing-section__heading">How it works</h2>
        <ol className="landing-steps" aria-label="How Plated works">
          <li className="landing-step">
            <span className="landing-step__num" aria-hidden="true">1</span>
            <div>
              <p className="landing-step__title">Add to your pantry</p>
              <p className="landing-step__desc">
                Scan a barcode, speak your grocery list, or type it in — whatever&apos;s fastest.
              </p>
            </div>
          </li>
          <li className="landing-step">
            <span className="landing-step__num" aria-hidden="true">2</span>
            <div>
              <p className="landing-step__title">Ask Chef for a recipe</p>
              <p className="landing-step__desc">
                Set meal type, time, and difficulty — Chef takes it from there.
              </p>
            </div>
          </li>
          <li className="landing-step">
            <span className="landing-step__num" aria-hidden="true">3</span>
            <div>
              <p className="landing-step__title">Cook, then repeat</p>
              <p className="landing-step__desc">
                Full ingredient match, missing items flagged, steps ready to cook.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* ── See it in action ────────────────────────────────────────────── */}
      {/* [ASSUMPTION]: Grey rounded-rectangle placeholder until real screenshots are selected. */}
      <section className="landing-section">
        <h2 className="landing-section__heading">See it in action</h2>
        <div
          className="landing-screenshot-placeholder"
          role="img"
          aria-label="App screenshots — coming soon"
        >
          Screenshots coming soon
        </div>
      </section>

      {/* ── Coming soon ─────────────────────────────────────────────────── */}
      {/* [ASSUMPTION]: Badge placeholders shown side-by-side on mobile widths. */}
      <section className="landing-section">
        <h2 className="landing-section__heading">Coming soon to iOS &amp; Android</h2>
        <div className="landing-badges">
          <div className="landing-badge-placeholder" aria-label="App Store — coming soon">
            App Store
          </div>
          <div className="landing-badge-placeholder" aria-label="Google Play — coming soon">
            Google Play
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <p className="landing-footer__copy">&copy; 2026 Plated. All rights reserved.</p>
      </footer>

    </div>
  );
}
