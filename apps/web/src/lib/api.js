/**
 * api.js — thin fetch wrapper that injects the Firebase auth token and
 * normalises errors into thrown objects.
 *
 * All API calls in the app should go through these helpers so auth headers
 * are always present and error handling is consistent.
 *
 * Usage:
 *   import { get, post, patch, del } from '../lib/api.js';
 *
 *   const pantry = await get('/api/v1/pantry');
 *   const result = await post('/api/v1/pantry', { name: 'Eggs', quantity: 12 });
 */

import { auth } from './firebase.js';
import useAuthStore from '../stores/authStore.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Build request headers, injecting the current Firebase ID token if present.
 * @param {Record<string, string>} [extra] - Additional headers to merge in
 * @returns {Record<string, string>}
 */
function buildHeaders(extra = {}) {
  const token = useAuthStore.getState().token;

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/**
 * Core fetch wrapper.
 * On 401: force-refreshes the Firebase token and retries once.
 * If the retry also fails with 401, clears auth and redirects to /auth.
 *
 * @param {string} path
 * @param {RequestInit} [options]
 * @param {boolean} [_isRetry] - internal flag to prevent infinite loops
 * @returns {Promise<unknown>} Parsed JSON body
 * @throws {{ status: number, message: string, body: unknown }} On non-2xx
 */
async function request(path, options = {}, _isRetry = false) {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options.headers ?? {}),
    },
  });

  // On 401, try a silent token refresh then retry once before giving up.
  if (response.status === 401 && !_isRetry) {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      try {
        const freshToken = await firebaseUser.getIdToken(true);
        useAuthStore.getState().setUser(firebaseUser, freshToken);
        return request(path, options, true);
      } catch {
        // Token refresh itself failed — fall through to force-logout below.
      }
    }
    // No current user or refresh failed: clear state and send to login.
    useAuthStore.getState().clearAuth();
    window.location.href = '/auth';
    return;
  }

  let body;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    const message =
      (typeof body === 'object' && body?.error?.message) ||
      (typeof body === 'string' && body) ||
      `HTTP ${response.status}`;

    const err = new Error(message);
    err.status = response.status;
    err.body = body;
    throw err;
  }

  return body;
}

// ── Convenience methods ───────────────────────────────────────────────────────

/** GET request */
export const get = (path, options) =>
  request(path, { method: 'GET', ...options });

/** POST request with JSON body */
export const post = (path, data, options) =>
  request(path, { method: 'POST', body: JSON.stringify(data), ...options });

/** PATCH request with JSON body */
export const patch = (path, data, options) =>
  request(path, { method: 'PATCH', body: JSON.stringify(data), ...options });

/** DELETE request (optionally with a JSON body for bulk operations) */
export const del = (path, data, options) =>
  request(path, { method: 'DELETE', ...(data ? { body: JSON.stringify(data) } : {}), ...options });
