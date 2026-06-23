/**
 * Recipe routes — /api/v1/recipes
 *
 * GET /api/v1/recipes/trending    → [public] random selection, no auth required
 * GET /api/v1/recipes/suggestions → pantry-matched, ranked — auth required
 * GET /api/v1/recipes/:id         → recipe detail with ingredients + steps — auth required
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';

const router = Router();

// GET /api/v1/recipes/trending — public, no auth
router.get('/trending', async (_req, res, next) => {
  try {
    // TODO: return a random selection of public recipes from DB
    res.json({ recipes: [], message: 'recipes/trending placeholder' });
  } catch (err) {
    next(err);
  }
});

// All routes below require auth
router.use(verifyFirebaseToken);

// GET /api/v1/recipes/suggestions — must be before /:id
router.get('/suggestions', async (_req, res, next) => {
  try {
    // TODO: load user's pantry, run pantryMatch, rank by match_pct DESC + meal_type
    //       (match_pct DESC, CASE WHEN meal_type = $timeOfDayMealType THEN 0 ELSE 1 END)
    res.json({ recipes: [], message: 'recipes/suggestions placeholder' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/recipes/:id
router.get('/:id', async (req, res, next) => {
  try {
    // TODO: fetch recipe + recipe_ingredients + recipe_steps, check is_public or ownership
    res.json({ id: req.params.id, recipe: null, message: 'recipe detail placeholder' });
  } catch (err) {
    next(err);
  }
});

export default router;
