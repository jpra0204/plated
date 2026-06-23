/**
 * Chef (AI generation) routes — /api/v1/chef
 *
 * POST /api/v1/chef/generate              → trigger Gemini generation, returns recipe
 * POST /api/v1/chef/:generationId/approve → approve result → saved to saved_recipes
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';

const router = Router();

router.use(verifyFirebaseToken);

// POST /api/v1/chef/generate
router.post('/generate', async (req, res, next) => {
  try {
    // TODO: load user's pantry, load dietary prefs, check chef_generations for
    //       previousRecipeIds, call gemini.buildChefPrompt, parse JSON response,
    //       insert into recipes + recipe_ingredients + recipe_steps,
    //       insert chef_generations row (status: 'success'), return generationId + recipe
    res.status(202).json({ generationId: null, recipe: null, message: 'chef/generate placeholder' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/chef/:generationId/approve
router.post('/:generationId/approve', async (req, res, next) => {
  try {
    // TODO: verify generationId belongs to req.user, set approved_at on chef_generations,
    //       insert into saved_recipes (is_chef_pick: true)
    res.json({ generationId: req.params.generationId, message: 'chef/approve placeholder' });
  } catch (err) {
    next(err);
  }
});

export default router;
