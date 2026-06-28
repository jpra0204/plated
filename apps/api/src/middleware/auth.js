import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Lazy singleton — safe to call multiple times (getApps() guards re-init).
function getFirebaseAuth() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // dotenv may preserve literal \n; replace to get real newlines.
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getAuth();
}

/**
 * Verifies the Firebase JWT in `Authorization: Bearer <token>`.
 * On success attaches the decoded token to `req.user` and calls next().
 * On failure responds 401.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization ?? '';

    if (!authHeader.startsWith('Bearer ')) {
      console.warn('[auth] 401 no-token', req.method, req.path);
      return res.status(401).json({ error: { message: 'Missing or malformed Authorization header' } });
    }

    const idToken = authHeader.slice(7);
    const decoded = await getFirebaseAuth().verifyIdToken(idToken);
    req.user = decoded;

    return next();
  } catch (err) {
    console.warn('[auth] 401 verify-failed', req.method, req.path, err.code, err.message);
    return res.status(401).json({ error: { message: 'Invalid or expired token', detail: err.message } });
  }
};

export default verifyFirebaseToken;
