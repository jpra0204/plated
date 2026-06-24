/**
 * Recipe routes — /api/v1/recipes
 *
 * GET /api/v1/recipes/trending    → [public] random 5 public recipes, no auth
 * GET /api/v1/recipes/suggestions → pantry-matched + time-of-day ranked, auth required
 * GET /api/v1/recipes/:id         → full detail (ingredients + steps), auth required
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';
import db from '../db/index.js';
import { calculateMatch } from '../services/pantryMatch.js';

const router = Router();

// ── GET /trending — public ────────────────────────────────────────────────────

router.get('/trending', async (_req, res, next) => {
  try {
    const recipes = await db('recipes')
      .where({ is_public: true })
      .orderByRaw('RANDOM()')
      .limit(5)
      .select('id', 'name', 'source', 'meal_type', 'cuisine', 'difficulty', 'cook_time_mins', 'servings', 'created_at');

    return res.json({ recipes });
  } catch (err) {
    next(err);
  }
});

// All routes below require auth
router.use(verifyFirebaseToken);

// ── GET /suggestions — must be declared before /:id ───────────────────────────

router.get('/suggestions', async (req, res, next) => {
  try {
    const user = await db('users').where({ firebase_uid: req.user.uid }).first();
    if (!user) {
      return res.status(401).json({ error: { message: 'User not registered. Call /auth/sync first.' } });
    }

    const [pantryItems, recipes, preferences] = await Promise.all([
      db('pantry_items').where({ user_id: user.id }).whereNull('deleted_at').select('name'),
      db('recipes').where({ is_public: true })
        .select('id', 'name', 'source', 'meal_type', 'cuisine', 'difficulty', 'cook_time_mins', 'servings'),
      db('dietary_preferences').where({ user_id: user.id }).first(),
    ]);

    if (recipes.length === 0) return res.json({ recipes: [] });

    const recipeIds = recipes.map(r => r.id);
    const allIngredients = await db('recipe_ingredients')
      .whereIn('recipe_id', recipeIds)
      .select('recipe_id', 'name');

    const ingByRecipe = {};
    for (const ing of allIngredients) {
      (ingByRecipe[ing.recipe_id] ??= []).push(ing);
    }

    const timeOfDayMealType = getMealTypeForTime();

    const ranked = recipes
      .map(recipe => ({
        ...recipe,
        match_pct: calculateMatch(ingByRecipe[recipe.id] ?? [], pantryItems),
      }))
      .sort((a, b) => {
        if (b.match_pct !== a.match_pct) return b.match_pct - a.match_pct;
        const aScore = a.meal_type === timeOfDayMealType ? 0 : 1;
        const bScore = b.meal_type === timeOfDayMealType ? 0 : 1;
        return aScore - bScore;
      });

    // Attach preferences so the frontend can surface dietary badges
    return res.json({ recipes: ranked, preferences: preferences ?? null });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const recipe = await db('recipes').where({ id: req.params.id }).first();
    if (!recipe) {
      return res.status(404).json({ error: { message: 'Recipe not found.' } });
    }

    // Non-public recipes are only accessible to users who have them saved.
    if (!recipe.is_public) {
      const user = await db('users').where({ firebase_uid: req.user.uid }).first();
      if (!user) {
        return res.status(401).json({ error: { message: 'User not registered. Call /auth/sync first.' } });
      }
      const saved = await db('saved_recipes')
        .where({ user_id: user.id, recipe_id: recipe.id })
        .whereNull('deleted_at')
        .first();
      if (!saved) {
        return res.status(404).json({ error: { message: 'Recipe not found.' } });
      }
    }

    const [ingredients, steps] = await Promise.all([
      db('recipe_ingredients')
        .where({ recipe_id: recipe.id })
        .orderBy('sort_order')
        .select('id', 'ingredient_id', 'name', 'quantity', 'unit', 'sort_order'),
      db('recipe_steps')
        .where({ recipe_id: recipe.id })
        .orderBy('step_number')
        .select('id', 'step_number', 'instruction'),
    ]);

    return res.json({ recipe: { ...recipe, ingredients, steps } });
  } catch (err) {
    next(err);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getMealTypeForTime(hour = new Date().getHours()) {
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

export default router;
