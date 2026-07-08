import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore.js';
import '../styles/landing.css';

const IMAGES = [
  '/landing/image-1.jpg',
  '/landing/image-2.jpg',
  '/landing/image-3.jpg',
  '/landing/image-4.jpg',
  '/landing/image-5.jpg',
];

// Positions match wireframe fan layout exactly.
const FAN_POSITIONS = [
  { rotate: 0,   top: 14, left: 115, scale: 1.15, z: 5 },
  { rotate: -18, top: 34, left: 48,  scale: 0.95, z: 4 },
  { rotate: 18,  top: 34, left: 182, scale: 0.95, z: 3 },
  { rotate: -34, top: 60, left: -22, scale: 0.9,  z: 2 },
  { rotate: 34,  top: 60, left: 252, scale: 0.9,  z: 1 },
];

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}

/**
 * Landing — public marketing page at `/`.
 * No tab bar (TabBar checks pathname and returns null for `/`).
 *
 * Structure matches wireframe landing_page.html:
 *   1. Hero — eyebrow, h1, subhead, Sign In CTA, Coming soon text, fan of dish photos
 *   2. Explainer — How it works, 3 feature steps with icons
 *   3. Demo — See it in action, 4 screenshot placeholders (dark bg)
 *   4. Footer
 *
 * CTA routing: authenticated → /home, unauthenticated → /auth
 */
export default function Landing() {
  const navigate = useNavigate();
  const { status } = useAuthStore();
  const [order, setOrder] = useState([0, 1, 2, 3, 4]);

  const ctaDestination = status === 'authenticated' ? '/home' : '/auth';

  function handleCta() { navigate(ctaDestination); }
  function cycleFan() { setOrder(prev => [...prev.slice(1), prev[0]]); }

  return (
    <div className="landing">

      {/* ── Nav bar ────────────────────────────────────────────────────── */}
      <header className="landing-nav">
        <span className="landing-nav__wordmark">Plated</span>
        <button className="landing-nav__signin" onClick={handleCta}>Sign In</button>
      </header>

      {/* ── Section 1: Hero ────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero__eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
          AI-powered kitchen
        </div>

        <h1 className="landing-hero__headline">What can I cook today?</h1>

        <p className="landing-hero__subhead">
          Plated turns whatever&apos;s in your pantry into a recipe in seconds, no scrolling required.
        </p>

        <button className="landing-cta-btn" onClick={handleCta}>
          Sign In <ArrowRightIcon />
        </button>

        <p className="landing-hero__coming-soon">Coming soon to iOS &amp; Android</p>

        {/* Fan of dish photos — click to cycle */}
        <div className="landing-fan-wrap">
          <div className="landing-fan-glow" aria-hidden="true" />
          <div
            className="landing-fan"
            onClick={cycleFan}
            role="button"
            tabIndex={0}
            aria-label="Tap to browse dish photos"
            onKeyDown={e => e.key === 'Enter' && cycleFan()}
          >
            {IMAGES.map((src, i) => {
              const rank = order.indexOf(i);
              const pos  = FAN_POSITIONS[rank];
              return (
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="landing-fan__card"
                  style={{
                    top:       pos.top,
                    left:      pos.left,
                    transform: `rotate(${pos.rotate}deg) scale(${pos.scale})`,
                    zIndex:    pos.z,
                    boxShadow: `0 ${14 + pos.z * 4}px ${24 + pos.z * 4}px -10px rgba(43,36,32,0.35)`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 2: Explainer ───────────────────────────────────────── */}
      <section className="landing-explainer">
        <div className="landing-explainer__header">
          <p className="landing-explainer__eyebrow">How it works</p>
          <h2 className="landing-explainer__headline">Your pantry, turned into dinner</h2>
          <p className="landing-explainer__subhead">
            Add what you have, and Plated Chef, our built-in AI, does the rest. No more staring into the fridge.
          </p>
        </div>

        <div className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature__icon landing-feature__icon--red">
              {/* Scan icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
            </div>
            <div>
              <p className="landing-feature__title">Log it however you like</p>
              <p className="landing-feature__desc">Take a picture, say it out loud, or type it in — your pantry stays up to date.</p>
            </div>
          </div>

          <div className="landing-feature">
            <div className="landing-feature__icon landing-feature__icon--green">
              {/* Sparkles icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
            </div>
            <div>
              <p className="landing-feature__title">Chef finds the match</p>
              <p className="landing-feature__desc">Get recipes ranked by how much you already have on hand, missing items called out upfront.</p>
            </div>
          </div>

          <div className="landing-feature">
            <div className="landing-feature__icon landing-feature__icon--red">
              {/* Chef hat icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
            </div>
            <div>
              <p className="landing-feature__title">Cook, then repeat</p>
              <p className="landing-feature__desc">Choose a recipe and your pantry updates itself, ready for tomorrow&apos;s &ldquo;what can I cook.&rdquo;</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Demo / See it in action (dark bg) ──────────────── */}
      <section className="landing-demo">
        <div className="landing-demo__header">
          <p className="landing-demo__eyebrow">See it in action</p>
          <h2 className="landing-demo__headline">From pantry to plate,<br />in seconds</h2>
        </div>

        <div className="landing-demo__steps">
          {[
            { n: 1, title: 'Add to your pantry',      desc: 'Scan a barcode, speak your grocery list, or type it in — whatever\'s fastest.' },
            { n: 2, title: 'See what you\'ve got',    desc: 'Every ingredient, organized and searchable at a glance.' },
            { n: 3, title: 'Ask Chef for a recipe',   desc: 'Set meal type, time, and difficulty — Chef takes it from there.' },
            { n: 4, title: 'Get your recipe, instantly', desc: 'Full ingredient match, missing items flagged, steps ready to cook.' },
          ].map(({ n, title, desc }) => (
            <div key={n} className="landing-demo__step">
              <div className="landing-demo__step-header">
                <span className="landing-demo__step-num">{n}</span>
                <span className="landing-demo__step-title">{title}</span>
              </div>
              {/* Screenshot placeholder — real screenshots to be added later */}
              <div className="landing-demo__screenshot" role="img" aria-label={`Screenshot: ${title}`} />
              <p className="landing-demo__step-desc">{desc}</p>
            </div>
          ))}
        </div>

        <div className="landing-demo__cta">
          <button className="landing-cta-btn" onClick={handleCta}>
            Sign In <ArrowRightIcon />
          </button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <p className="landing-footer__copy">&copy; 2026 Plated. All rights reserved.</p>
      </footer>

    </div>
  );
}
