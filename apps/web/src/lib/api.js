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
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<unknown>} Parsed JSON body
 * @throws {{ status: number, message: string, body: unknown }} On non-2xx
 */
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options.headers ?? {}),
    },
  });

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

/** DELETE request */
export const del = (path, options) =>
  request(path, { method: 'DELETE', ...options });
