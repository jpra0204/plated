/**
 * User profile routes — /api/v1/profile
 *
 * GET   /api/v1/profile           → get the authenticated user's profile
 * PATCH /api/v1/profile           → update display name, dietary prefs, etc.
 * DELETE /api/v1/profile          → delete account + cascade all user data
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';

const router = Router();

router.use(verifyFirebaseToken);

// GET /api/v1/profile
router.get('/', async (_req, res, next) => {
  try {
    // TODO: fetch user row by req.user.uid
    res.json({ profile: null, message: 'profile get placeholder' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/profile
router.patch('/', async (req, res, next) => {
  try {
    // TODO: validate body, update users table
    res.json({ updates: req.body, message: 'profile update placeholder' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/profile
router.delete('/', async (_req, res, next) => {
  try {
    // TODO: delete user + cascade via FK constraints
    res.json({ message: 'profile delete placeholder — not yet implemented' });
  } catch (err) {
    next(err);
  }
});

export default router;
