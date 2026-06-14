/**
 * Saved-recipes routes — /api/v1/saved
 *
 * GET    /api/v1/saved            → list saved recipes for the authenticated user
 * POST   /api/v1/saved            → save a recipe (body: { recipeId })
 * DELETE /api/v1/saved/:recipeId  → unsave a recipe
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';

const router = Router();

router.use(verifyFirebaseToken);

// GET /api/v1/saved
router.get('/', async (_req, res, next) => {
  try {
    // TODO: join saved_recipes with recipes for req.user.uid
    res.json({ saved: [], message: 'saved list placeholder' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/saved
router.post('/', async (req, res, next) => {
  try {
    // TODO: insert into saved_recipes, handle duplicate gracefully
    res.status(201).json({ recipeId: req.body.recipeId, message: 'saved create placeholder' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/saved/:recipeId
router.delete('/:recipeId', async (req, res, next) => {
  try {
    // TODO: delete from saved_recipes where user_id = req.user.uid
    res.json({ recipeId: req.params.recipeId, message: 'saved delete placeholder' });
  } catch (err) {
    next(err);
  }
});

export default router;
