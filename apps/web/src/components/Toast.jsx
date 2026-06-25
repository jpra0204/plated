 
import { useEffect, useState } from 'react';

/**
 * Toast — auto-dismissing notification bar.
 *
 * Props:
 *   message  string        — text to display
 *   visible  boolean       — controlled visibility
 *   onDismiss () => void   — called when the toast disappears
 *   duration number        — ms before auto-dismiss (default 3000)
 *   variant  'default'|'success' — 'success' shows green checkmark icon
 */

export default function Toast({
  message,
  visible,
  onDismiss,
  duration = 3000,
  variant = 'success',
}) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
    if (!visible) return;
    const t = setTimeout(() => {
      setShow(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(t);
  }, [visible, duration, onDismiss]);

  if (!show) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      {variant === 'success' && (
        <CheckIcon className="toast__icon" aria-hidden="true" />
      )}
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
