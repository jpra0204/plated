/**
 * Chef (AI generation) routes — /api/v1/chef
 *
 * POST /api/v1/chef/generate              → trigger Gemini generation, returns recipe
 * POST /api/v1/chef/:generationId/approve → approve result → saved to saved_recipes
 */

import { Router } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import verifyFirebaseToken from '../middleware/auth.js';
import db from '../db/index.js';
import { buildChefPrompt } from '../services/gemini.js';
import { findCachedRecipe } from '../services/recipeCache.js';

const tracer = trace.getTracer('plated-api');

const router = Router();
router.use(verifyFirebaseToken);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getUser(req, res) {
  const user = await db('users').where({ firebase_uid: req.user.uid }).first();
  if (!user) {
    res.status(401).json({ error: { message: 'User not registered. Call /auth/sync first.' } });
    return null;
  }
  return user;
}

// ── POST /generate ────────────────────────────────────────────────────────────

router.post('/generate', async (req, res, next) => {
  return tracer.startActiveSpan('chef.generate', async (span) => {
  try {
    const user = await getUser(req, res);
    if (!user) { span.end(); return; }

    const { filters = {}, retryOf = null } = req.body;

    if (!filters.mealType || !filters.cookTime || !filters.difficulty || filters.servings == null) {
      span.end();
      return res.status(400).json({
        error: { message: 'filters.mealType, filters.cookTime, filters.difficulty, and filters.servings are required.' },
      });
    }

    // Load pantry + preferences + previous recipe IDs in parallel.
    const [pantryItems, preferences, previousGenerations] = await Promise.all([
      db('pantry_items').where({ user_id: user.id }).whereNull('deleted_at')
        .select('name', 'quantity', 'unit', 'category'),
      db('dietary_preferences').where({ user_id: user.id }).first(),
      db('chef_generations').where({ user_id: user.id, status: 'success' }).whereNotNull('recipe_id')
        .select('recipe_id'),
    ]);

    span.setAttributes({
      'user.id':         String(user.id),
      'chef.meal_type':  filters.mealType ?? '',
      'chef.pantry_size': pantryItems.length,
    });

    const previousRecipeIds = previousGenerations.map(g => g.recipe_id);

    // ── Cache-first lookup ────────────────────────────────────────────────────
    // Skip the cache on Retry (retryOf is set) or when Extra Notes are
    // non-empty, matching the product spec exactly.
    if (!retryOf && !filters.notes?.trim()) {
      const cached = await findCachedRecipe(
        db,
        {
          mealType:    filters.mealType,
          cookTime:    filters.cookTime,
          difficulty:  filters.difficulty,
          cuisine:     filters.cuisine ?? null,
          servings:    filters.servings,
          preferences: preferences ?? {},
        },
        pantryItems,
      );

      if (cached) {
        // Create a chef_generations row so that:
        //  (a) generationId is valid for the /approve endpoint, and
        //  (b) the cached recipe_id enters previousRecipeIds for future
        //      Retries, preventing Gemini from re-generating the same dish.
        const [newGeneration] = await db('chef_generations').insert({
          user_id:         user.id,
          recipe_id:       cached.recipe.id,
          filters:         JSON.stringify(filters),
          pantry_snapshot: JSON.stringify(pantryItems),
          status:          'success',
          retry_of:        null,
        }).returning('*');

        span.setAttribute('chef.cache_hit', true);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();

        return res.status(201).json({
          generationId: newGeneration.id,
          recipe: {
            ...cached.recipe,
            servings:    cached.servings,
            ingredients: cached.ingredients,
            steps:       cached.steps,
          },
        });
      }
    }
    // ── End cache lookup ──────────────────────────────────────────────────────

    // Call Gemini.
    const generated = await buildChefPrompt({
      pantryItems,
      filters,
      preferences: preferences ?? {},
      previousRecipeIds,
    });

    if (!generated || !generated.name) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'AI generation failed' });
      span.end();
      return res.status(502).json({ error: { message: 'AI generation failed — invalid response.' } });
    }

    // Persist everything in one transaction.
    const { generation, recipe } = await db.transaction(async trx => {
      const [newRecipe] = await trx('recipes').insert({
        name:          generated.name,
        source:        'chef_ai',
        meal_type:     filters.mealType?.toLowerCase() ?? null,
        cuisine:       generated.cuisine ?? null,
        difficulty:    generated.difficulty ?? null,
        cook_time_mins: generated.cook_time_mins ?? null,
        servings:      generated.servings ?? null,
        is_public:     false,   // private until approved
      }).returning('*');

      if (generated.ingredients?.length) {
        await trx('recipe_ingredients').insert(
          generated.ingredients.map((ing, idx) => ({
            recipe_id:    newRecipe.id,
            name:         ing.name,
            quantity:     ing.quantity ?? null,
            unit:         ing.unit ?? null,
            sort_order:   idx + 1,
          }))
        );
      }

      if (generated.steps?.length) {
        await trx('recipe_steps').insert(
          generated.steps.map(step => ({
            recipe_id:   newRecipe.id,
            step_number: step.step_number,
            instruction: step.instruction,
          }))
        );
      }

      const [newGeneration] = await trx('chef_generations').insert({
        user_id:         user.id,
        recipe_id:       newRecipe.id,
        filters:         JSON.stringify(filters),
        pantry_snapshot: JSON.stringify(pantryItems),
        status:          'success',
        retry_of:        retryOf ?? null,
      }).returning('*');

      return { generation: newGeneration, recipe: newRecipe };
    });

    // Load full recipe detail for the response.
    const [ingredients, steps] = await Promise.all([
      db('recipe_ingredients').where({ recipe_id: recipe.id }).orderBy('sort_order').select('id', 'name', 'quantity', 'unit'),
      db('recipe_steps').where({ recipe_id: recipe.id }).orderBy('step_number').select('id', 'step_number', 'instruction'),
    ]);

    const pantrySet = new Set(pantryItems.map(i => i.name.toLowerCase().trim()));
    const ingredientsWithPantry = ingredients.map(ing => ({
      ...ing,
      in_pantry: pantrySet.has(ing.name.toLowerCase().trim()),
    }));

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
    return res.status(201).json({
      generationId: generation.id,
      recipe: { ...recipe, ingredients: ingredientsWithPantry, steps },
    });
  } catch (err) {
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
    next(err);
  }
  }); // tracer.startActiveSpan
});

// ── POST /:generationId/approve ───────────────────────────────────────────────

router.post('/:generationId/approve', async (req, res, next) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const generation = await db('chef_generations')
      .where({ id: req.params.generationId, user_id: user.id, status: 'success' })
      .first();

    if (!generation) {
      return res.status(404).json({ error: { message: 'Generation not found.' } });
    }
    if (generation.approved_at) {
      return res.status(409).json({ error: { message: 'Generation already approved.' } });
    }

    const { savedRecipe } = await db.transaction(async trx => {
      // Mark generation approved.
      await trx('chef_generations')
        .where({ id: generation.id })
        .update({ approved_at: trx.fn.now() });

      // Make the recipe visible.
      await trx('recipes').where({ id: generation.recipe_id }).update({ is_public: true });

      // Add to saved_recipes.
      const [saved] = await trx('saved_recipes').insert({
        user_id:     user.id,
        recipe_id:   generation.recipe_id,
        is_chef_pick: true,
      }).onConflict(['user_id', 'recipe_id']).merge(['is_chef_pick']).returning('*');

      return { savedRecipe: saved };
    });

    const recipe = await db('recipes').where({ id: generation.recipe_id }).first();

    return res.json({
      savedRecipeId: savedRecipe.id,
      recipe: { id: recipe.id, name: recipe.name },
      navigateTo: '/saved',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
