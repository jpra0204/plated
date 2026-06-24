/**
 * Auth routes — /api/v1/auth
 *
 * POST /api/v1/auth/sync
 *   Called immediately after Firebase sign-in.
 *   Upserts the Firebase user into `users`, ensures a `dietary_preferences`
 *   row exists, and returns the full profile.
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';
import db from '../db/index.js';

const router = Router();

router.post('/sync', verifyFirebaseToken, async (req, res, next) => {
  try {
    const { uid, email, name, picture } = req.user;

    // Upsert user row — update mutable fields on conflict, preserve the rest.
    const [user] = await db('users')
      .insert({
        firebase_uid: uid,
        email:        email ?? '',
        display_name: name  ?? null,
        avatar_url:   picture ?? null,
        updated_at:   db.fn.now(),
      })
      .onConflict('firebase_uid')
      .merge(['email', 'display_name', 'avatar_url', 'updated_at'])
      .returning('*');

    // Ensure a dietary_preferences row exists (created with defaults on first sync).
    await db('dietary_preferences')
      .insert({ user_id: user.id })
      .onConflict('user_id')
      .ignore();

    const prefs = await db('dietary_preferences').where({ user_id: user.id }).first();

    return res.json({
      id:           user.id,
      firebaseUid:  user.firebase_uid,
      email:        user.email,
      displayName:  user.display_name,
      avatarUrl:    user.avatar_url,
      roleLabel:    user.role_label,
      cookedCount:  user.cooked_count,
      createdAt:    user.created_at,
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

export default router;
