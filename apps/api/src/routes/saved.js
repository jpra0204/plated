/**
 * Saved-recipes routes — /api/v1/saved
 *
 * GET    /api/v1/saved     → list saved recipes with pantry match %
 * POST   /api/v1/saved     → save a recipe (body: { recipeId })
 * DELETE /api/v1/saved/:id → soft-delete a saved-recipe row
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';
import db from '../db/index.js';
import { calculateMatch } from '../services/pantryMatch.js';

const router = Router();
router.use(verifyFirebaseToken);

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

    const saved = await db('saved_recipes')
      .where({ 'saved_recipes.user_id': user.id })
      .whereNull('saved_recipes.deleted_at')
      .join('recipes', 'recipes.id', 'saved_recipes.recipe_id')
      .orderBy('saved_recipes.saved_at', 'desc')
      .select(
        'saved_recipes.id as saved_id',
        'saved_recipes.is_chef_pick',
        'saved_recipes.saved_at',
        'recipes.id',
        'recipes.name',
        'recipes.meal_type',
        'recipes.cuisine',
        'recipes.difficulty',
        'recipes.cook_time_mins',
        'recipes.servings',
        'recipes.image_url',
      );

    if (saved.length === 0) return res.json({ recipes: [] });

    const ids = saved.map(r => r.id);
    const [pantryItems, allIngredients, allSteps] = await Promise.all([
      db('pantry_items').where({ user_id: user.id }).whereNull('deleted_at').select('name'),
      db('recipe_ingredients').whereIn('recipe_id', ids).orderBy('sort_order').select('recipe_id', 'name', 'quantity', 'unit'),
      db('recipe_steps').whereIn('recipe_id', ids).orderBy('step_number').select('recipe_id', 'step_number', 'instruction'),
    ]);

    const pantrySet = new Set(pantryItems.map(i => i.name.toLowerCase().trim()));

    const ingByRecipe = {};
    for (const ing of allIngredients) {
      (ingByRecipe[ing.recipe_id] ??= []).push({
        name: ing.name, quantity: ing.quantity, unit: ing.unit,
        in_pantry: pantrySet.has(ing.name.toLowerCase().trim()),
      });
    }

    const stepByRecipe = {};
    for (const s of allSteps) {
      (stepByRecipe[s.recipe_id] ??= []).push({ step_number: s.step_number, instruction: s.instruction });
    }

    const recipes = saved.map(r => ({
      ...r,
      match_pct: calculateMatch(ingByRecipe[r.id] ?? [], pantryItems),
      ingredients: ingByRecipe[r.id] ?? [],
      steps: stepByRecipe[r.id] ?? [],
    }));

    return res.json({ recipes });
  } catch (err) {
    next(err);
  }
});

// ── POST / ────────────────────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { recipeId } = req.body;
    if (!recipeId) {
      return res.status(400).json({ error: { message: 'recipeId is required.' } });
    }

    const recipe = await db('recipes').where({ id: recipeId, is_public: true }).first();
    if (!recipe) {
      return res.status(404).json({ error: { message: 'Recipe not found.' } });
    }

    const [row] = await db('saved_recipes')
      .insert({ user_id: user.id, recipe_id: recipeId, is_chef_pick: false })
      .onConflict(['user_id', 'recipe_id'])
      .merge({ deleted_at: null })   // un-delete if previously removed
      .returning('*');

    return res.status(201).json({ savedRecipe: row });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const row = await db('saved_recipes')
      .where({ id: req.params.id, user_id: user.id })
      .whereNull('deleted_at')
      .first();

    if (!row) {
      return res.status(404).json({ error: { message: 'Saved recipe not found.' } });
    }

    await db('saved_recipes').where({ id: req.params.id }).update({ deleted_at: db.fn.now() });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
