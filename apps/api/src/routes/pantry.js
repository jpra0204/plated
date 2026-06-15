/**
 * Pantry routes — /api/v1/pantry
 *
 * GET    /api/v1/pantry          → list all items for the authenticated user
 * POST   /api/v1/pantry          → add a new pantry item (or batch via array body)
 * PATCH  /api/v1/pantry/:id      → update quantity / unit / expiry
 * DELETE /api/v1/pantry/:id      → remove an item
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';

const router = Router();

// All pantry routes require auth
router.use(verifyFirebaseToken);

// GET /api/v1/pantry
router.get('/', async (_req, res, next) => {
  try {
    // TODO: fetch pantry items for req.user.uid from DB
    res.json({ items: [], message: 'pantry list placeholder' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/pantry
router.post('/', async (req, res, next) => {
  try {
    // TODO: validate body, insert into `pantry_items`
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
    // TODO: validate ownership, delete row
    res.json({ id: req.params.id, message: 'pantry delete placeholder' });
  } catch (err) {
    next(err);
  }
});

export default router;
