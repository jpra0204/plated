import { useState, useEffect, useCallback, useRef } from 'react';

const MEAL_WINDOWS = [
  { id: 'breakfast', label: 'After breakfast',   startHr: 7,  endHr: 9  },
  { id: 'lunch',     label: 'After lunch',        startHr: 12, endHr: 15 },
  { id: 'dinner',    label: 'After dinner',       startHr: 19, endHr: 21 },
];

const LS_LAST_SEEN  = 'plated_last_seen';
const LS_SYNC_SHOWN = 'plated_sync_shown';  // JSON: { windowId, date }
const GAP_MS        = 30 * 60 * 1000;       // 30-minute inactivity gap

function getActiveWindow() {
  const hr = new Date().getHours();
  return MEAL_WINDOWS.find(w => hr >= w.startHr && hr < w.endHr) ?? null;
}

function shouldTrigger(win) {
  if (!win) return false;
  const today = new Date().toDateString();
  try {
    const cap = JSON.parse(localStorage.getItem(LS_SYNC_SHOWN) ?? 'null');
    if (cap?.windowId === win.id && cap?.date === today) return false;
  } catch { /* ignore */ }
  const lastSeen = parseInt(localStorage.getItem(LS_LAST_SEEN) ?? '0', 10);
  return lastSeen === 0 || Date.now() - lastSeen >= GAP_MS;
}

function markShown(windowId) {
  localStorage.setItem(LS_SYNC_SHOWN, JSON.stringify({ windowId, date: new Date().toDateString() }));
}

function touchLastSeen() {
  localStorage.setItem(LS_LAST_SEEN, String(Date.now()));
}

/**
 * Trigger logic for the pantry sync reminder modal.
 *
 * Shows once per qualifying meal window per day, only after a 30+ min session gap.
 * Does not trigger if the pantry is empty.
 *
 * @param {{ isAuthenticated: boolean, pantryCount: number }} opts
 * @returns {{ shouldShow: boolean, dismiss: () => void, mealLabel: string }}
 */
export default function usePantrySync({ isAuthenticated, pantryCount }) {
  const [shouldShow, setShouldShow] = useState(false);
  const [mealLabel, setMealLabel]   = useState('Meal time check-in');
  const shownRef = useRef(false);

  const tryTrigger = useCallback(() => {
    if (!isAuthenticated || pantryCount === 0 || shownRef.current) return;
    const win = getActiveWindow();
    if (!shouldTrigger(win)) { touchLastSeen(); return; }
    shownRef.current = true;
    markShown(win.id);
    setMealLabel(win.label);
    setShouldShow(true);
    touchLastSeen();
  }, [isAuthenticated, pantryCount]);

  // Fire on login / pantry load
  useEffect(() => {
    tryTrigger();
  }, [tryTrigger]);

  // Fire on tab / app focus (session resume)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') tryTrigger();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [tryTrigger]);

  // Keep last-seen timestamp fresh while the tab is active
  useEffect(() => {
    touchLastSeen();
    const interval = setInterval(touchLastSeen, 60_000);
    return () => clearInterval(interval);
  }, []);

  function dismiss() {
    setShouldShow(false);
  }

  return { shouldShow, dismiss, mealLabel };
}
