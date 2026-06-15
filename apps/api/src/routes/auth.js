/**
 * Auth routes — /api/v1/auth
 *
 * POST /api/v1/auth/sync
 *   Called by the client immediately after Firebase sign-in.
 *   Should upsert the Firebase user into the `users` table and return the
 *   app-side user profile.
 *
 * No verifyFirebaseToken here — this route IS the sync handshake so we verify
 * the token manually inside the handler (or trust the client's Firebase UID
 * after verifying the token).
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';

const router = Router();

// POST /api/v1/auth/sync
router.post('/sync', verifyFirebaseToken, async (req, res, next) => {
  try {
    // TODO: upsert req.user into `users` table via Knex
    // const user = await upsertUser(req.user);

    res.status(200).json({
      message: 'auth/sync placeholder — not yet implemented',
      uid: req.user.uid,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
