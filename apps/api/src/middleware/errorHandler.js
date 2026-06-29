/**
 * Central Express error handler.
 * Must be registered LAST (after all routes) in index.js.
 *
 * Recognises a handful of well-known error shapes:
 *   - err.status / err.statusCode  → HTTP status to return
 *   - err.expose === true          → message is safe to send to the client
 *
 * Everything else becomes a 500 with a generic message so we don't leak
 * stack traces in production.
 */

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  // Only honour err.status when the error was explicitly constructed by our own code
  // (err.expose === true). Third-party errors (e.g. Gemini ApiError with status 404)
  // must not bleed through to the client — they become 500.
  const status = err.expose && err.status >= 400 && err.status < 600
    ? err.status
    : 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Always log the full error server-side
  console.error('[error]', err);

  const message =
    status < 500 || err.expose
      ? err.message
      : 'Internal server error';

  res.status(status).json({
    error: {
      message,
      // Include stack trace in non-production environments for easier debugging
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
};

export default errorHandler;
