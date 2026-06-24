/**
 * Pantry routes — /api/v1/pantry
 *
 * GET    /api/v1/pantry       → list active items for the authenticated user
 * POST   /api/v1/pantry       → add one item
 * PATCH  /api/v1/pantry/:id   → update quantity / unit
 * DELETE /api/v1/pantry/:id   → soft delete
 * POST   /api/v1/pantry/voice → parse voice transcript (stub — see step 5.2)
 * POST   /api/v1/pantry/bulk  → bulk insert (stub — see step 5.2)
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';
import db from '../db/index.js';

const router = Router();
router.use(verifyFirebaseToken);

/** Resolve the DB user row from the Firebase UID on req.user. */
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

    const items = await db('pantry_items')
      .where({ user_id: user.id })
      .whereNull('deleted_at')
      .orderBy('added_at', 'desc')
      .select('id', 'ingredient_id', 'name', 'category', 'quantity', 'unit', 'added_at', 'updated_at');

    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

// ── POST /voice ───────────────────────────────────────────────────────────────
// Must be declared before /:id to avoid route conflict.

router.post('/voice', async (_req, res) => {
  res.json({ items: [], message: 'pantry/voice — implemented in step 5.2' });
});

// ── POST /bulk ────────────────────────────────────────────────────────────────

router.post('/bulk', async (_req, res) => {
  res.status(201).json({ inserted: 0, message: 'pantry/bulk — implemented in step 5.2' });
});

// ── POST / ────────────────────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const { name, category, quantity, unit, ingredient_id } = req.body;

    if (!name || !category || quantity == null || !unit) {
      return res.status(400).json({
        error: { message: 'name, category, quantity, and unit are required.' },
      });
    }

    const user = await getUser(req, res);
    if (!user) return;

    const [item] = await db('pantry_items')
      .insert({
        user_id:       user.id,
        ingredient_id: ingredient_id ?? null,
        name,
        category,
        quantity,
        unit,
      })
      .returning('*');

    return res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /:id ────────────────────────────────────────────────────────────────

router.patch('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = await db('pantry_items')
      .where({ id: req.params.id, user_id: user.id })
      .whereNull('deleted_at')
      .first();

    if (!existing) {
      return res.status(404).json({ error: { message: 'Pantry item not found.' } });
    }

    const updates = { updated_at: db.fn.now() };
    if (req.body.quantity != null) updates.quantity = req.body.quantity;
    if (req.body.unit     != null) updates.unit     = req.body.unit;

    const [item] = await db('pantry_items')
      .where({ id: req.params.id })
      .update(updates)
      .returning('*');

    return res.json({ item });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = await db('pantry_items')
      .where({ id: req.params.id, user_id: user.id })
      .whereNull('deleted_at')
      .first();

    if (!existing) {
      return res.status(404).json({ error: { message: 'Pantry item not found.' } });
    }

    await db('pantry_items')
      .where({ id: req.params.id })
      .update({ deleted_at: db.fn.now() });

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
