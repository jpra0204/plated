/**
 * Firebase JWT verification middleware.
 *
 * Expects an `Authorization: Bearer <id_token>` header.
 * On success, attaches the decoded token to `req.user` and calls next().
 * On failure, responds with 401.
 *
 * TODO: initialise firebase-admin with service account credentials from env
 *       and replace the stub below with a real verifyIdToken call.
 */

// import { initializeApp, getApps, cert } from 'firebase-admin/app';
// import { getAuth } from 'firebase-admin/auth';

// ── Firebase Admin initialisation (lazy singleton) ────────────────────────────
// function getFirebaseAuth() {
//   if (!getApps().length) {
//     initializeApp({
//       credential: cert({
//         projectId: process.env.FIREBASE_PROJECT_ID,
//         clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//         privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//       }),
//     });
//   }
//   return getAuth();
// }

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization ?? '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'Missing or malformed Authorization header' } });
    }

    // const idToken = authHeader.slice(7);
    // const decodedToken = await getFirebaseAuth().verifyIdToken(idToken);
    // req.user = decodedToken;

    // ── STUB: remove once Firebase Admin is wired up ──────────────────────────
    req.user = { uid: 'stub-uid', email: 'stub@example.com' };
    // ─────────────────────────────────────────────────────────────────────────

    return next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Invalid or expired token', detail: err.message } });
  }
};

export default verifyFirebaseToken;
