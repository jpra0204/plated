/**
 * Pantry routes — /api/v1/pantry
 *
 * GET    /api/v1/pantry          → list active pantry items for the authenticated user
 * POST   /api/v1/pantry          → add a single pantry item
 * PATCH  /api/v1/pantry/:id      → update quantity / unit
 * DELETE /api/v1/pantry/:id      → soft delete
 * POST   /api/v1/pantry/voice    → submit voice transcript → returns parsed items array
 * POST   /api/v1/pantry/bulk     → add multiple items at once (voice "Add all")
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';

const router = Router();

router.use(verifyFirebaseToken);

// GET /api/v1/pantry
router.get('/', async (_req, res, next) => {
  try {
    // TODO: fetch pantry items for req.user.uid from DB where deleted_at IS NULL
    res.json({ items: [], message: 'pantry list placeholder' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/pantry/voice — must be declared before /:id to avoid conflict
router.post('/voice', async (req, res, next) => {
  try {
    // TODO: call voice.parseTranscript(req.body.transcript) via Gemini,
    //       then run through pantryMatch.matchIngredients against ingredient catalogue
    res.json({ items: [], message: 'pantry/voice placeholder' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/pantry/bulk
router.post('/bulk', async (req, res, next) => {
  try {
    // TODO: validate req.body.items array, bulk insert into pantry_items
    res.status(201).json({ inserted: 0, message: 'pantry/bulk placeholder' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/pantry
router.post('/', async (req, res, next) => {
  try {
    // TODO: validate body, insert into pantry_items
    res.status(201).json({ item: req.body, message: 'pantry create placeholder' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/pantry/:id
router.patch('/:id', async (req, res, next) => {
  try {
    // TODO: validate ownership, update row
    res.json({ id: req.params.id, updates: req.body, message: 'pantry update placeholder' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/pantry/:id
router.delete('/:id', async (req, res, next) => {
  try {
    // TODO: validate ownership, set deleted_at = NOW()
    res.json({ id: req.params.id, message: 'pantry delete placeholder' });
  } catch (err) {
    next(err);
  }
});

export default router;
