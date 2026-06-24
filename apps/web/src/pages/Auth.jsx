import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '../lib/firebase.js';
import { post } from '../lib/api.js';
import useAuthStore from '../stores/authStore.js';

/**
 * Auth — sign-in / create account, full-screen layout (no tab bar).
 *
 * Modes:  'signin' | 'signup'
 * Validation: client-side first, then Firebase error codes mapped to messages.
 */

const GOOGLE_PROVIDER = new GoogleAuthProvider();

/** Map Firebase Auth error codes → user-facing messages. */
function firebaseErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

function validate(mode, { email, password, confirmPassword }) {
  const errors = {};
  if (!email) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }
  if (mode === 'signup' && !confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (mode === 'signup' && confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return errors;
}

/** After Firebase sign-in, sync the user to the backend and update the store. */
async function syncAndStore(firebaseUser) {
  const idToken = await firebaseUser.getIdToken();
  useAuthStore.getState().setUser(firebaseUser, idToken);

  try {
    const profile = await post('/api/v1/auth/sync');
    useAuthStore.getState().setProfile(profile);
  } catch {
    // Sync failure is non-fatal at this stage — backend is partially implemented.
  }
}

export default function Auth() {
  const navigate = useNavigate();
  const { intendedDestination, setIntendedDestination } = useAuthStore();

  const [mode, setMode] = useState('signin');
  const [fields, setFields] = useState({ email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function setField(key, val) {
    setFields(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
    if (authError) setAuthError('');
  }

  function afterAuth() {
    const dest = intendedDestination ?? '/';
    setIntendedDestination(null);
    navigate(dest, { replace: true });
  }

  async function handleGoogle() {
    setAuthError('');
    setLoading(true);
    try {
      const credential = await signInWithPopup(auth, GOOGLE_PROVIDER);
      await syncAndStore(credential.user);
      afterAuth();
    } catch (err) {
      // User closed the popup — not an error worth showing
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setAuthError(firebaseErrorMessage(err.code));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(mode, fields);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setAuthError('');
    setLoading(true);
    try {
      const fn = mode === 'signin' ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
      const credential = await fn(auth, fields.email, fields.password);
      await syncAndStore(credential.user);
      afterAuth();
    } catch (err) {
      setAuthError(firebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode(m => m === 'signin' ? 'signup' : 'signin');
    setErrors({});
    setAuthError('');
    setFields({ email: '', password: '', confirmPassword: '' });
  }

  return (
    <div className="auth-screen">
      {/* Logo / wordmark */}
      <div className="auth-logo" aria-label="Plated">
        <PlatedLogo />
        <span className="auth-logo__name">Plated</span>
      </div>

      <div className="auth-card">
        <h2 className="auth-card__title">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="auth-card__sub">
          {mode === 'signin'
            ? 'Sign in to see what you can cook today.'
            : 'Track your pantry and get AI-powered recipes.'}
        </p>

        {/* Google SSO */}
        <button className="btn-google" onClick={handleGoogle} disabled={loading}>
          <GoogleIcon aria-hidden="true" />
          Continue with Google
        </button>

        {/* Divider */}
        <div className="auth-divider">
          <div className="auth-divider__line" />
          <span className="auth-divider__label">or</span>
          <div className="auth-divider__line" />
        </div>

        {/* Firebase-level error (shown above the submit button) */}
        {authError && <p className="auth-error" role="alert">{authError}</p>}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label className="form-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              className={`auth-input ${errors.email ? 'auth-input--error' : ''}`}
              placeholder="you@example.com"
              value={fields.email}
              onChange={e => setField('email', e.target.value)}
              autoComplete="email"
              inputMode="email"
              disabled={loading}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <div className="auth-input-wrap">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                className={`auth-input auth-input--with-toggle ${errors.password ? 'auth-input--error' : ''}`}
                placeholder="Min. 8 characters"
                value={fields.password}
                onChange={e => setField('password', e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                disabled={loading}
              />
              <button
                type="button"
                className="auth-input__toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          {mode === 'signup' && (
            <div className="form-field">
              <label className="form-label" htmlFor="auth-confirm">Confirm password</label>
              <input
                id="auth-confirm"
                type="password"
                className={`auth-input ${errors.confirmPassword ? 'auth-input--error' : ''}`}
                placeholder="Repeat your password"
                value={fields.confirmPassword}
                onChange={e => setField('confirmPassword', e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
              {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
            </div>
          )}

          <button
            type="submit"
            className="btn btn--primary btn--large btn--full"
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            {loading
              ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
              : (mode === 'signin' ? 'Sign in' : 'Create account')}
          </button>
        </form>

        <p className="auth-toggle">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button className="auth-toggle__btn" onClick={toggleMode} disabled={loading}>
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>

      <button className="auth-skip" onClick={() => navigate('/')} disabled={loading}>
        Maybe later
      </button>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlatedLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="var(--color-primary)" />
      <path d="M16 8c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="white" />
      <path d="M16 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" fill="white" />
    </svg>
  );
}

function GoogleIcon(props) {
  return (
    <svg {...props} width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

function EyeIcon(props)    { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>; }
function EyeOffIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>; }
