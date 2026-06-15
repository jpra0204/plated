import { NavLink, useLocation } from 'react-router-dom';

/**
 * TabBar — persistent bottom navigation for the five main tabs.
 *
 * Hidden on the /auth route so the sign-in page gets a full-bleed layout.
 * Active tab is highlighted via NavLink's `isActive` flag + CSS class.
 */

const TABS = [
  {
    to: '/',
    end: true, // exact match — don't activate for /chef, /pantry, etc.
    label: 'Home',
    icon: HomeIcon,
  },
  {
    to: '/chef',
    label: 'Chef',
    icon: ChefIcon,
  },
  {
    to: '/pantry',
    label: 'Pantry',
    icon: PantryIcon,
  },
  {
    to: '/saved',
    label: 'Saved',
    icon: SavedIcon,
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: ProfileIcon,
  },
];

export default function TabBar() {
  const { pathname } = useLocation();

  // Don't render the tab bar on the auth screen
  if (pathname === '/auth') return null;

  return (
    <nav className="tab-bar" aria-label="Main navigation">
      {TABS.map(({ to, end, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            ['tab-bar__item', isActive ? 'tab-bar__item--active' : ''].join(' ').trim()
          }
          aria-label={label}
        >
          <Icon className="tab-bar__icon" aria-hidden="true" />
          <span className="tab-bar__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────
// Kept inline so there's no icon-library dependency. Swap for your icon set
// (Lucide, Heroicons, etc.) when the design is finalised.

function HomeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function ChefIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
      <line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  );
}

function PantryIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function SavedIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
    </svg>
  );
}

function ProfileIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
