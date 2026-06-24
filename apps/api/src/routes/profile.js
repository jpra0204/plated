/**
 * User profile routes — /api/v1/profile
 *
 * GET   /api/v1/profile             → get profile + stats + dietary preferences
 * PATCH /api/v1/profile/preferences → update dietary preference toggles
 * PATCH /api/v1/profile             → update display name, city, role_label
 * DELETE /api/v1/profile            → delete account (FK CASCADE handles child rows)
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';
import db from '../db/index.js';

const router = Router();
router.use(verifyFirebaseToken);

async function getUser(req, res) {
  const user = await db('users').where({ firebase_uid: req.user.uid }).first();
  if (!user) {
    res.status(401).json({ error: { message: 'User not registered. Call /auth/sync first.' } });
    return null;
  }
  return user;
}

// ── GET / ─────────────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const [preferences, pantryRow, savedRow] = await Promise.all([
      db('dietary_preferences').where({ user_id: user.id }).first(),
      db('pantry_items').where({ user_id: user.id }).whereNull('deleted_at').count('* as n').first(),
      db('saved_recipes').where({ user_id: user.id }).whereNull('deleted_at').count('* as n').first(),
    ]);

    return res.json({
      profile: {
        id:          user.id,
        firebaseUid: user.firebase_uid,
        email:       user.email,
        displayName: user.display_name,
        city:        user.city,
        roleLabel:   user.role_label,
        avatarUrl:   user.avatar_url,
        cookedCount: user.cooked_count,
        createdAt:   user.created_at,
        pantryCount: Number(pantryRow.n),
        savedCount:  Number(savedRow.n),
        preferences: preferences ? {
          vegetarian:    preferences.vegetarian,
          glutenFree:    preferences.gluten_free,
          highProtein:   preferences.high_protein,
          macroTracking: preferences.macro_tracking,
        } : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /preferences — must be before PATCH / ───────────────────────────────

router.patch('/preferences', async (req, res, next) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { vegetarian, glutenFree, highProtein, macroTracking } = req.body;
    const updates = {};
    if (vegetarian    != null) updates.vegetarian     = Boolean(vegetarian);
    if (glutenFree    != null) updates.gluten_free    = Boolean(glutenFree);
    if (highProtein   != null) updates.high_protein   = Boolean(highProtein);
    if (macroTracking != null) updates.macro_tracking = Boolean(macroTracking);
    updates.updated_at = db.fn.now();

    const [prefs] = await db('dietary_preferences')
      .insert({ user_id: user.id, ...updates })
      .onConflict('user_id')
      .merge(Object.keys(updates))
      .returning('*');

    return res.json({
      preferences: {
        vegetarian:    prefs.vegetarian,
        glutenFree:    prefs.gluten_free,
        highProtein:   prefs.high_protein,
        macroTracking: prefs.macro_tracking,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH / ───────────────────────────────────────────────────────────────────

router.patch('/', async (req, res, next) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { displayName, city, roleLabel } = req.body;
    const updates = { updated_at: db.fn.now() };
    if (displayName !== undefined) updates.display_name = displayName;
    if (city        !== undefined) updates.city         = city;
    if (roleLabel   !== undefined) updates.role_label   = roleLabel;

    const [updated] = await db('users').where({ id: user.id }).update(updates).returning('*');

    return res.json({
      profile: {
        id:          updated.id,
        displayName: updated.display_name,
        city:        updated.city,
        roleLabel:   updated.role_label,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE / ──────────────────────────────────────────────────────────────────

router.delete('/', async (req, res, next) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    await db('users').where({ id: user.id }).del();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
