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
import { parseVoiceSync } from '../services/gemini.js';

const tracer = trace.getTracer('plated-api');

const router = Router();
router.use(verifyFirebaseToken);

/**
 * Write last_pantry_update on the users row.
 * Called after every pantry mutation (add / edit / delete).
 *
 * @param {object} dbOrTrx - knex instance or active transaction
 * @param {string} userId
 * @param {'add'|'edit'|'delete'} type
 */
async function setLastPantryUpdate(dbOrTrx, userId, type) {
  // [ASSUMPTION]: recipe_name is only meaningful for 'cook' type (set in cook.js).
  // For add/edit/delete we only record the type and timestamp.
  await dbOrTrx('users')
    .where({ id: userId })
    .update({
      last_pantry_update: JSON.stringify({
        type,
        updated_at: new Date().toISOString(),
      }),
    });
}

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
      .select('id', 'ingredient_id', 'name', 'category', 'quantity', 'unit', 'expiry_date', 'added_at', 'updated_at');

    // Expose last_pantry_update so the Pantry screen can render "Last updated …".
    // The pg client auto-parses JSONB columns into objects; null when never set.
    return res.json({ items, lastPantryUpdate: user.last_pantry_update ?? null });
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

    // Look up shelf_life_days for all provided ingredient_ids in one query.
    // [ASSUMPTION]: expiry_date is calculated as NOW() + shelf_life_days days (in JS),
    // not via a DB expression, for simplicity. Slight skew (~ms) vs server clock is acceptable.
    const ingredientIds = items.filter(i => i.ingredient_id).map(i => i.ingredient_id);
    let shelfLifeMap = {};
    if (ingredientIds.length > 0) {
      const ings = await db('ingredients')
        .whereIn('id', ingredientIds)
        .select('id', 'shelf_life_days');
      shelfLifeMap = Object.fromEntries(ings.map(i => [i.id, i.shelf_life_days]));
    }

    const rows = items.map(item => {
      let expiryDate = null;
      const sld = item.ingredient_id ? shelfLifeMap[item.ingredient_id] : null;
      if (sld) {
        const d = new Date();
        d.setDate(d.getDate() + sld);
        expiryDate = d.toISOString();
      }
      return {
        user_id:       user.id,
        ingredient_id: item.ingredient_id ?? null,
        name:          item.name,
        category:      item.category,
        quantity:      item.quantity,
        unit:          item.unit,
        expiry_date:   expiryDate,
      };
    });

    const inserted = await db.transaction(trx => trx('pantry_items').insert(rows).returning('*'));

    await setLastPantryUpdate(db, user.id, 'add');

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

    // Auto-calculate expiry_date from catalogue shelf_life_days when ingredient_id is provided.
    // [ASSUMPTION]: expiry_date = NOW() + shelf_life_days days, computed in JS for simplicity.
    let expiryDate = null;
    if (ingredient_id) {
      const ing = await db('ingredients')
        .where({ id: ingredient_id })
        .select('shelf_life_days')
        .first();
      if (ing?.shelf_life_days) {
        const d = new Date();
        d.setDate(d.getDate() + ing.shelf_life_days);
        expiryDate = d.toISOString();
      }
    }

    const [item] = await db('pantry_items')
      .insert({
        user_id:       user.id,
        ingredient_id: ingredient_id ?? null,
        name,
        category,
        quantity,
        unit,
        expiry_date:   expiryDate,
      })
      .returning('*');

    await setLastPantryUpdate(db, user.id, 'add');

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
    // expiry_date can be set to null (to clear it), so check key presence not value.
    if ('expiry_date' in req.body) updates.expiry_date = req.body.expiry_date ?? null;

    const [item] = await db('pantry_items')
      .where({ id: req.params.id })
      .update(updates)
      .returning('*');

    await setLastPantryUpdate(db, user.id, 'edit');

    return res.json({ item });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /bulk ──────────────────────────────────────────────────────────────
// Must be declared before /:id to avoid route collision.

router.delete('/bulk', async (req, res, next) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: { message: 'ids must be a non-empty array.' } });
    }

    // [ASSUMPTION]: IDs that don't belong to this user or are already soft-deleted
    // are silently ignored — the WHERE clause filters to only active, owned rows.
    // This avoids leaking whether an item exists for another user.
    await db.transaction(async trx => {
      await trx('pantry_items')
        .where({ user_id: user.id })
        .whereIn('id', ids)
        .whereNull('deleted_at')
        .update({ deleted_at: trx.fn.now() });
    });

    await setLastPantryUpdate(db, user.id, 'delete');

    return res.status(204).send();
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

    await setLastPantryUpdate(db, user.id, 'delete');

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── POST /voice-sync ───────────────────────────────────────────────────────────
// Must be declared before /:id to avoid route conflict — this is handled by
// file ordering (this section appears after /bulk which is already above /:id).

router.post('/voice-sync', async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: { message: 'transcript is required.' } });
    }

    const user = await getUser(req, res);
    if (!user) return;

    const pantryItems = await db('pantry_items')
      .where({ user_id: user.id })
      .whereNull('deleted_at')
      .select('id', 'name', 'quantity', 'unit', 'category');

    if (pantryItems.length === 0) {
      return res.json({ updates: [] });
    }

    const updates = await parseVoiceSync(transcript.trim(), pantryItems);
    return res.json({ updates });
  } catch (err) {
    next(err);
  }
});

export default router;
