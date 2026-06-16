import { useState } from 'react';
import { FAKE_USER, FAKE_STATS } from '../data/fakeData.js';

/**
 * Profile — from saved_and_profile_v2 wireframe.
 *
 * Sections:
 *   - Avatar + name + sub-label
 *   - Stats row (Saved / Pantry items / Cooked)
 *   - Dietary preferences (local toggle state only)
 *   - Account rows (Edit profile, Notifications, Log out)
 */

const PREFS_CONFIG = [
  { key: 'vegetarian', label: 'Vegetarian',    icon: LeafIcon },
  { key: 'glutenFree', label: 'Gluten-free',   icon: WheatIcon },
  { key: 'highProtein',label: 'High protein',  icon: BarbellIcon },
  { key: 'macroTracking', label: 'Macro tracking', icon: HeartIcon },
];

export default function Profile() {
  const [prefs, setPrefs] = useState({
    vegetarian:    false,
    glutenFree:    false,
    highProtein:   true,
    macroTracking: true,
  });

  function togglePref(key) {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <button className="icon-btn" aria-label="Settings">
          <SettingsIcon />
        </button>
      </div>

      {/* Avatar + name */}
      <div className="profile-header">
        <div className="profile-avatar" aria-label="Profile photo" />
        <div className="profile-name">{FAKE_USER.displayName}</div>
        <div className="profile-sub">{FAKE_USER.roleLabel} · {FAKE_USER.city}</div>
      </div>

      {/* Stats row */}
      <div className="profile-stats">
        <div className="p-stat">
          <div className="p-stat__val">{FAKE_STATS.savedCount}</div>
          <div className="p-stat__lbl">Saved</div>
        </div>
        <div className="p-stat">
          <div className="p-stat__val">{FAKE_STATS.pantryCount}</div>
          <div className="p-stat__lbl">Pantry items</div>
        </div>
        <div className="p-stat">
          <div className="p-stat__val">{FAKE_STATS.cookedCount}</div>
          <div className="p-stat__lbl">Cooked</div>
        </div>
      </div>

      {/* Dietary preferences */}
      <p className="section-label">Dietary preferences</p>
      <div className="info-note">
        <SparklesIcon aria-hidden="true" />
        <span>Chef uses these automatically. You can override them per generation on the Chef screen.</span>
      </div>
      <div className="card card--list-sm">
        {PREFS_CONFIG.map(({ key, label, icon: Icon }) => (
          <div key={key} className="pref-row">
            <div className="pref-row__left">
              <Icon aria-hidden="true" />
              {label}
            </div>
            <button
              className={`toggle ${prefs[key] ? 'toggle--on' : ''}`}
              role="switch"
              aria-checked={prefs[key]}
              aria-label={`${label} ${prefs[key] ? 'on' : 'off'}`}
              onClick={() => togglePref(key)}
            />
          </div>
        ))}
      </div>

      {/* Account rows */}
      <p className="section-label">Account</p>
      <div className="card card--list-sm">
        <div className="pref-row">
          <div className="pref-row__left">
            <UserIcon aria-hidden="true" /> Edit profile
          </div>
          <ChevronRightIcon className="pref-row__arrow" aria-hidden="true" />
        </div>
        <div className="pref-row">
          <div className="pref-row__left">
            <BellIcon aria-hidden="true" /> Notifications
          </div>
          <ChevronRightIcon className="pref-row__arrow" aria-hidden="true" />
        </div>
        <div className="pref-row pref-row--danger">
          <div className="pref-row__left pref-row__left--danger">
            <LogOutIcon aria-hidden="true" /> Log out
          </div>
        </div>
      </div>

      <div className="page-bottom" />
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SettingsIcon(props)           { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>; }
function SparklesIcon(props)           { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" /></svg>; }
function LeafIcon(props)               { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>; }
function WheatIcon(props)              { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M2 22 12 12" /><path d="M7 12c-.55-3.84 1.5-7.13 4-9 .5 2.5 2 4.9 2 7-2 .5-4 .5-6 2z" /><path d="M17 12c.55-3.84-1.5-7.13-4-9-.5 2.5-2 4.9-2 7 2 .5 4 .5 6 2z" /><path d="M12 22c0-4-1.5-7-3-9" /><path d="M12 22c0-4 1.5-7 3-9" /></svg>; }
function BarbellIcon(props)            { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="5" x2="6" y2="19" /><line x1="18" y1="5" x2="18" y2="19" /><line x1="2" y1="9" x2="6" y2="9" /><line x1="2" y1="15" x2="6" y2="15" /><line x1="18" y1="9" x2="22" y2="9" /><line x1="18" y1="15" x2="22" y2="15" /><line x1="6" y1="12" x2="18" y2="12" /></svg>; }
function HeartIcon(props)              { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>; }
function UserIcon(props)               { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>; }
function BellIcon(props)               { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>; }
function LogOutIcon(props)             { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>; }
function ChevronRightIcon({ className, ...props }) { return <svg className={className} {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>; }
