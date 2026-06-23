/**
 * User profile routes — /api/v1/profile
 *
 * GET   /api/v1/profile              → get profile + stats + dietary preferences
 * PATCH /api/v1/profile              → update display name, city, role_label
 * PATCH /api/v1/profile/preferences  → update dietary preference toggles
 * DELETE /api/v1/profile             → delete account + cascade all user data
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';

const router = Router();

router.use(verifyFirebaseToken);

// GET /api/v1/profile
router.get('/', async (_req, res, next) => {
  try {
    // TODO: fetch users row + dietary_preferences row + cooked_count,
    //       pantry item count, saved recipe count
    res.json({ profile: null, message: 'profile get placeholder' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/profile/preferences — must be before PATCH /
router.patch('/preferences', async (req, res, next) => {
  try {
    // TODO: upsert dietary_preferences row for req.user (one row per user)
    //       body: { vegetarian, glutenFree, highProtein, macroTracking }
    res.json({ updates: req.body, message: 'profile/preferences update placeholder' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/profile
router.patch('/', async (req, res, next) => {
  try {
    // TODO: validate body, update users table (display_name, city, role_label)
    res.json({ updates: req.body, message: 'profile update placeholder' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/profile
router.delete('/', async (_req, res, next) => {
  try {
    // TODO: delete user row — FK CASCADE handles all child rows
    res.json({ message: 'profile delete placeholder' });
  } catch (err) {
    next(err);
  }
});

export default router;
