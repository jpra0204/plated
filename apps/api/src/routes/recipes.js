/**
 * Recipe routes — /api/v1/recipes
 *
 * GET  /api/v1/recipes            → list recipes (paginated, filterable)
 * GET  /api/v1/recipes/:id        → get a single recipe
 * POST /api/v1/recipes/generate   → generate recipes from current pantry via Gemini
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';

const router = Router();

router.use(verifyFirebaseToken);

// GET /api/v1/recipes
router.get('/', async (_req, res, next) => {
  try {
    // TODO: fetch paginated recipes for req.user.uid
    res.json({ recipes: [], message: 'recipes list placeholder' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/recipes/:id
router.get('/:id', async (req, res, next) => {
  try {
    // TODO: fetch single recipe, check ownership or public flag
    res.json({ id: req.params.id, recipe: null, message: 'recipe detail placeholder' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/recipes/generate
router.post('/generate', async (_req, res, next) => {
  try {
    // TODO: load user's pantry, call gemini.buildChefPrompt, parse response, persist
    res.status(202).json({ message: 'recipe generation placeholder — not yet implemented' });
  } catch (err) {
    next(err);
  }
});

export default router;
