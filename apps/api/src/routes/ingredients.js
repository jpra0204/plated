/**
 * Ingredients catalogue — /api/v1/ingredients
 *
 * GET /api/v1/ingredients  → public catalogue for autosuggest, no auth required
 */

import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const ingredients = await db('ingredients')
      .orderBy('name')
      .select('id', 'name', 'category', 'default_unit');

    return res.json({ ingredients });
  } catch (err) {
    next(err);
  }
});

export default router;
