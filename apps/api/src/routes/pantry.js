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
import { trace, SpanStatusCode } from '@opentelemetry/api';
import verifyFirebaseToken from '../middleware/auth.js';
import db from '../db/index.js';
import { parseTranscript } from '../services/voice.js';

const tracer = trace.getTracer('plated-api');

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

router.post('/voice', async (req, res, next) => {
  return tracer.startActiveSpan('pantry.voice_parse', async (span) => {
  try {
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      span.end();
      return res.status(400).json({ error: { message: 'transcript is required.' } });
    }

    span.setAttribute('voice.transcript_length', transcript.trim().length);

    const user = await getUser(req, res);
    if (!user) { span.end(); return; }

    const catalogue = await db('ingredients').select('id', 'name', 'name_normalized', 'category');
    const dictionary = catalogue.map(i => ({ id: i.id, name: i.name_normalized }));
    const catalogueById = Object.fromEntries(catalogue.map(i => [i.id, i]));

    const matched = await parseTranscript(transcript.trim(), dictionary);

    const items = matched.map(m => {
      const entry = m.canonical ? catalogueById[m.canonical.id] : null;
      return {
        name:          entry?.name      ?? m.raw,
        quantity:      m.quantity       ?? 1,
        unit:          m.unit           ?? 'pcs',
        category:      entry?.category  ?? 'other',
        ingredient_id: entry?.id        ?? null,
      };
    });

    span.setAttribute('voice.items_parsed', items.length);
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
    return res.json({ items });
  } catch (err) {
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
    next(err);
  }
  }); // tracer.startActiveSpan
});

// ── POST /bulk ────────────────────────────────────────────────────────────────

router.post('/bulk', async (req, res, next) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: { message: 'items must be a non-empty array.' } });
    }

    for (const item of items) {
      if (!item.name || !item.category || item.quantity == null || !item.unit) {
        return res.status(400).json({
          error: { message: 'Each item requires name, category, quantity, and unit.' },
        });
      }
    }

    const rows = items.map(item => ({
      user_id:       user.id,
      ingredient_id: item.ingredient_id ?? null,
      name:          item.name,
      category:      item.category,
      quantity:      item.quantity,
      unit:          item.unit,
    }));

    const inserted = await db.transaction(trx => trx('pantry_items').insert(rows).returning('*'));

    return res.status(201).json({ inserted: inserted.length, items: inserted });
  } catch (err) {
    next(err);
  }
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
