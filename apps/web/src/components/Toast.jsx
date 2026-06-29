import { useEffect, useRef, useState } from 'react';

/**
 * Toast — auto-dismissing notification bar.
 *
 * Props:
 *   message   string               — text to display
 *   visible   boolean              — controlled visibility trigger (rising edge shows toast)
 *   onDismiss () => void           — called after the toast finishes hiding
 *   duration  number               — ms before auto-dismiss (default 3000)
 *   variant   'default'|'success'  — 'success' → green background, top position, checkmark
 */
export default function Toast({
  message,
  visible,
  onDismiss,
  duration = 3000,
  variant = 'default',
}) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow]       = useState(false);
  const hideTimer = useRef(null);

  useEffect(() => {
    if (!visible) return;

    setMounted(true);
    // Allow one frame for the element to mount before adding the visible class
    const enterFrame = requestAnimationFrame(() => setShow(true));

    hideTimer.current = setTimeout(() => {
      setShow(false);
      // Wait for the CSS transition to finish before unmounting
      setTimeout(() => { setMounted(false); onDismiss?.(); }, 280);
    }, duration);

    return () => {
      cancelAnimationFrame(enterFrame);
      clearTimeout(hideTimer.current);
    };
  }, [visible, duration, onDismiss]);

  if (!mounted) return null;

  const classes = [
    'toast',
    show              ? 'toast--visible' : '',
    variant === 'success' ? 'toast--success' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} role="status" aria-live="polite">
      {variant === 'success' && <CheckIcon className="toast__icon" aria-hidden="true" />}
      <span className="toast__message">{message}</span>
    </div>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
