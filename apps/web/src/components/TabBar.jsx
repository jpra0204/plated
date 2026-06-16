import { NavLink, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore.js';

/**
 * TabBar — persistent bottom navigation.
 *
 * Auth-aware:
 *  - When the user is signed in, the 5th tab shows "Profile".
 *  - When signed out, it shows "Sign in" and links to /auth.
 *
 * Hidden entirely on /auth (full-screen layout).
 */

export default function TabBar() {
  const { pathname } = useLocation();
  const { user } = useAuthStore();

  if (pathname === '/auth') return null;

  const tabs = [
    { to: '/',        end: true,  label: 'Home',    icon: HomeIcon },
    { to: '/chef',              label: 'Chef',    icon: SparklesIcon },
    { to: '/pantry',            label: 'Pantry',  icon: BasketIcon },
    { to: '/saved',             label: 'Saved',   icon: BookmarkIcon },
    {
      to: user ? '/profile' : '/auth',
      label: user ? 'Profile' : 'Sign in',
      icon: user ? ProfileIcon : SignInIcon,
    },
  ];

  return (
    <nav className="tab-bar" aria-label="Main navigation">
      {tabs.map(({ to, end, label, icon: Icon }) => (
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

// ── Icons ──────────────────────────────────────────────────────────────────────

function HomeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function SparklesIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" />
      <path d="M5 3 L5.8 5.2 L8 6 L5.8 6.8 L5 9 L4.2 6.8 L2 6 L4.2 5.2 Z" />
      <path d="M19 17 L19.6 18.8 L21 19 L19.6 19.6 L19 21 L18.4 19.6 L17 19 L18.4 18.4 Z" />
    </svg>
  );
}

function BasketIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
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

function ProfileIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function SignInIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}
