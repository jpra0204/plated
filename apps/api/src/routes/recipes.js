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

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getMealTypeForTime(hour = new Date().getHours()) {
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

// Fetch ingredients + steps for a set of recipe IDs and attach them to the
// recipe objects. Mutates the passed-in array in-place and returns it.
async function attachIngredientsAndSteps(recipes, { withPantrySet } = {}) {
  if (recipes.length === 0) return recipes;

  const ids = recipes.map(r => r.id);
  const [ingredients, steps] = await Promise.all([
    db('recipe_ingredients')
      .whereIn('recipe_id', ids)
      .orderBy('sort_order')
      .select('recipe_id', 'name', 'quantity', 'unit'),
    db('recipe_steps')
      .whereIn('recipe_id', ids)
      .orderBy('step_number')
      .select('recipe_id', 'step_number', 'instruction'),
  ]);

  const ingMap = {};
  for (const ing of ingredients) {
    (ingMap[ing.recipe_id] ??= []).push({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      ...(withPantrySet
        ? { in_pantry: withPantrySet.has(ing.name.toLowerCase().trim()) }
        : {}),
    });
  }

  const stepMap = {};
  for (const step of steps) {
    (stepMap[step.recipe_id] ??= []).push({
      step_number: step.step_number,
      instruction: step.instruction,
    });
  }

  for (const r of recipes) {
    r.ingredients = ingMap[r.id] ?? [];
    r.steps = stepMap[r.id] ?? [];
  }

  return recipes;
}

// ── GET /trending — public ────────────────────────────────────────────────────

router.get('/trending', async (_req, res, next) => {
  try {
    const recipes = await db('recipes')
      .where({ is_public: true })
      .orderByRaw('RANDOM()')
      .limit(5)
      .select('id', 'name', 'source', 'meal_type', 'cuisine', 'difficulty', 'cook_time_mins', 'servings', 'image_url', 'created_at');

    await attachIngredientsAndSteps(recipes);

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
        .select('id', 'name', 'source', 'meal_type', 'cuisine', 'difficulty', 'cook_time_mins', 'servings', 'image_url'),
      db('dietary_preferences').where({ user_id: user.id }).first(),
    ]);

    if (recipes.length === 0) return res.json({ recipes: [] });

    const pantrySet = new Set(pantryItems.map(i => i.name.toLowerCase().trim()));

    // Attach ingredients (with in_pantry flag) and steps before ranking
    await attachIngredientsAndSteps(recipes, { withPantrySet: pantrySet });

    const timeOfDayMealType = getMealTypeForTime();

    const ranked = recipes
      .map(recipe => ({
        ...recipe,
        match_pct: calculateMatch(recipe.ingredients, pantryItems),
      }))
      .sort((a, b) => {
        if (b.match_pct !== a.match_pct) return b.match_pct - a.match_pct;
        const aScore = a.meal_type === timeOfDayMealType ? 0 : 1;
        const bScore = b.meal_type === timeOfDayMealType ? 0 : 1;
        return aScore - bScore;
      });

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

    const user = await db('users').where({ firebase_uid: req.user.uid }).first();
    if (!user) {
      return res.status(401).json({ error: { message: 'User not registered. Call /auth/sync first.' } });
    }

    // Fetch pantry items, ingredients, steps, and saved-recipe row in parallel
    const [pantryItems, ingredients, steps, savedRow] = await Promise.all([
      db('pantry_items').where({ user_id: user.id }).whereNull('deleted_at').select('name'),
      db('recipe_ingredients')
        .where({ recipe_id: recipe.id })
        .orderBy('sort_order')
        .select('id', 'ingredient_id', 'name', 'quantity', 'unit', 'sort_order'),
      db('recipe_steps')
        .where({ recipe_id: recipe.id })
        .orderBy('step_number')
        .select('id', 'step_number', 'instruction'),
      db('saved_recipes')
        .where({ user_id: user.id, recipe_id: recipe.id })
        .whereNull('deleted_at')
        .first(),
    ]);

    // Private recipes are only accessible if the user has saved them
    if (!recipe.is_public && !savedRow) {
      return res.status(404).json({ error: { message: 'Recipe not found.' } });
    }

    const pantrySet = new Set(pantryItems.map(i => i.name.toLowerCase().trim()));

    const ingredientsWithPantry = ingredients.map(ing => ({
      ...ing,
      in_pantry: pantrySet.has(ing.name.toLowerCase().trim()),
    }));

    return res.json({
      recipe: {
        ...recipe,
        ingredients: ingredientsWithPantry,
        steps,
        is_saved: !!savedRow,
        saved_id: savedRow?.id ?? null,
        match_pct: calculateMatch(ingredients, pantryItems),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
