import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const TEST_UID = 'test-firebase-uid-recipes-5-3';

vi.mock('../middleware/auth.js', () => ({
  default: (req, res, next) => {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'Missing or malformed Authorization header' } });
    }
    req.user = { uid: TEST_UID };
    return next();
  },
}));

import db from '../db/index.js';
import recipeRoutes, { getMealTypeForTime } from './recipes.js';

// ── App ───────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/v1/recipes', recipeRoutes);

// ── Fixtures ──────────────────────────────────────────────────────────────────

let testUserId;
let recipeA, recipeB, recipeC, recipePrivate;

/*
 * recipeA: 3 ingredients — "Eggs", "Milk", "Butter"
 * recipeB: 2 ingredients — "Eggs", "Flour"
 * recipeC: 2 ingredients — "Avocado", "Lime"
 * recipePrivate: is_public = false
 *
 * Pantry: Eggs + Milk → recipeA match = 67%, recipeB match = 50%, recipeC = 0%
 */
beforeAll(async () => {
  // User
  const [user] = await db('users')
    .insert({ firebase_uid: TEST_UID, email: 'test-recipes@plated.test' })
    .onConflict('firebase_uid').merge(['email'])
    .returning('*');
  testUserId = user.id;

  await db('dietary_preferences').insert({ user_id: user.id }).onConflict('user_id').ignore();

  // Recipes
  [recipeA] = await db('recipes').insert({
    name: 'French Omelette', source: 'manual', meal_type: 'breakfast',
    cuisine: 'French', difficulty: 'easy', cook_time_mins: 10, servings: 2, is_public: true,
  }).returning('*');

  [recipeB] = await db('recipes').insert({
    name: 'Pancakes', source: 'manual', meal_type: 'breakfast',
    cuisine: null, difficulty: 'easy', cook_time_mins: 20, servings: 4, is_public: true,
  }).returning('*');

  [recipeC] = await db('recipes').insert({
    name: 'Guacamole', source: 'manual', meal_type: 'snack',
    cuisine: 'Mexican', difficulty: 'easy', cook_time_mins: 5, servings: 2, is_public: true,
  }).returning('*');

  [recipePrivate] = await db('recipes').insert({
    name: 'Secret Stew', source: 'chef_ai', meal_type: 'dinner',
    cuisine: null, difficulty: 'medium', cook_time_mins: 60, servings: 4, is_public: false,
  }).returning('*');

  // Ingredients for recipeA: Eggs, Milk, Butter (3 items)
  await db('recipe_ingredients').insert([
    { recipe_id: recipeA.id, name: 'Eggs',   quantity: 2,   unit: 'pcs', sort_order: 1 },
    { recipe_id: recipeA.id, name: 'Milk',   quantity: 100, unit: 'ml',  sort_order: 2 },
    { recipe_id: recipeA.id, name: 'Butter', quantity: 10,  unit: 'g',   sort_order: 3 },
  ]);

  // Steps for recipeA
  await db('recipe_steps').insert([
    { recipe_id: recipeA.id, step_number: 1, instruction: 'Beat the eggs.' },
    { recipe_id: recipeA.id, step_number: 2, instruction: 'Heat butter in pan.' },
    { recipe_id: recipeA.id, step_number: 3, instruction: 'Pour eggs and cook.' },
  ]);

  // Ingredients for recipeB: Eggs, Flour (2 items)
  await db('recipe_ingredients').insert([
    { recipe_id: recipeB.id, name: 'Eggs',  quantity: 1,   unit: 'pcs', sort_order: 1 },
    { recipe_id: recipeB.id, name: 'Flour', quantity: 200, unit: 'g',   sort_order: 2 },
  ]);

  // Ingredients for recipeC: Avocado, Lime (2 items) — not in user's pantry
  await db('recipe_ingredients').insert([
    { recipe_id: recipeC.id, name: 'Avocado', quantity: 2, unit: 'pcs', sort_order: 1 },
    { recipe_id: recipeC.id, name: 'Lime',    quantity: 1, unit: 'pcs', sort_order: 2 },
  ]);

  // Ingredients for private recipe
  await db('recipe_ingredients').insert([
    { recipe_id: recipePrivate.id, name: 'Mystery ingredient', quantity: 1, unit: 'pcs', sort_order: 1 },
  ]);

  // Pantry: Eggs + Milk (matches 2/3 of recipeA, 1/2 of recipeB, 0/2 of recipeC)
  await db('pantry_items').insert([
    { user_id: user.id, name: 'Eggs', category: 'dairy',  quantity: 6,   unit: 'pcs' },
    { user_id: user.id, name: 'Milk', category: 'dairy',  quantity: 500, unit: 'ml' },
  ]);
});

afterAll(async () => {
  if (recipeA) {
    await db('recipe_steps').whereIn('recipe_id', [recipeA.id, recipeB.id, recipeC.id, recipePrivate.id]).del();
    await db('recipe_ingredients').whereIn('recipe_id', [recipeA.id, recipeB.id, recipeC.id, recipePrivate.id]).del();
    await db('recipes').whereIn('id', [recipeA.id, recipeB.id, recipeC.id, recipePrivate.id]).del();
  }
  if (testUserId) {
    await db('pantry_items').where({ user_id: testUserId }).del();
    await db('dietary_preferences').where({ user_id: testUserId }).del();
    await db('users').where({ id: testUserId }).del();
  }
  await db.destroy();
});

const AUTH = { Authorization: 'Bearer test-token' };

// ── getMealTypeForTime ────────────────────────────────────────────────────────

describe('getMealTypeForTime()', () => {
  it('returns breakfast before 11:00', () => {
    expect(getMealTypeForTime(0)).toBe('breakfast');
    expect(getMealTypeForTime(10)).toBe('breakfast');
  });
  it('returns lunch 11:00–14:59', () => {
    expect(getMealTypeForTime(11)).toBe('lunch');
    expect(getMealTypeForTime(14)).toBe('lunch');
  });
  it('returns dinner 15:00–20:59', () => {
    expect(getMealTypeForTime(15)).toBe('dinner');
    expect(getMealTypeForTime(20)).toBe('dinner');
  });
  it('returns snack 21:00–23:59', () => {
    expect(getMealTypeForTime(21)).toBe('snack');
    expect(getMealTypeForTime(23)).toBe('snack');
  });
});

// ── GET /trending ─────────────────────────────────────────────────────────────

describe('GET /api/v1/recipes/trending', () => {
  it('is public — returns 200 without auth', async () => {
    const res = await request(app).get('/api/v1/recipes/trending');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.recipes)).toBe(true);
  });

  it('returns at most 5 recipes', async () => {
    const res = await request(app).get('/api/v1/recipes/trending');
    expect(res.body.recipes.length).toBeLessThanOrEqual(5);
  });

  it('only includes public recipes', async () => {
    const res = await request(app).get('/api/v1/recipes/trending');
    const ids = res.body.recipes.map(r => r.id);
    expect(ids).not.toContain(recipePrivate.id);
  });

  it('recipe objects include expected fields', async () => {
    const res = await request(app).get('/api/v1/recipes/trending');
    if (res.body.recipes.length > 0) {
      const r = res.body.recipes[0];
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('name');
      expect(r).toHaveProperty('difficulty');
      expect(r).toHaveProperty('cook_time_mins');
    }
  });
});

// ── GET /suggestions ──────────────────────────────────────────────────────────

describe('GET /api/v1/recipes/suggestions', () => {
  it('returns 401 when auth header is missing', async () => {
    const res = await request(app).get('/api/v1/recipes/suggestions');
    expect(res.status).toBe(401);
  });

  it('returns 200 with a recipes array', async () => {
    const res = await request(app).get('/api/v1/recipes/suggestions').set(AUTH);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.recipes)).toBe(true);
  });

  it('only includes public recipes', async () => {
    const res = await request(app).get('/api/v1/recipes/suggestions').set(AUTH);
    const ids = res.body.recipes.map(r => r.id);
    expect(ids).not.toContain(recipePrivate.id);
  });

  it('each recipe has a match_pct field', async () => {
    const res = await request(app).get('/api/v1/recipes/suggestions').set(AUTH);
    for (const recipe of res.body.recipes) {
      expect(recipe).toHaveProperty('match_pct');
      expect(typeof recipe.match_pct).toBe('number');
    }
  });

  it('recipeA (2/3 pantry match = 67%) ranks above recipeB (1/2 = 50%)', async () => {
    const res = await request(app).get('/api/v1/recipes/suggestions').set(AUTH);
    const ids = res.body.recipes.map(r => r.id);
    expect(ids.indexOf(recipeA.id)).toBeLessThan(ids.indexOf(recipeB.id));
  });

  it('recipeB (50%) ranks above recipeC (0%)', async () => {
    const res = await request(app).get('/api/v1/recipes/suggestions').set(AUTH);
    const ids = res.body.recipes.map(r => r.id);
    expect(ids.indexOf(recipeB.id)).toBeLessThan(ids.indexOf(recipeC.id));
  });

  it('recipeA match_pct is 67 (2 of 3 ingredients in pantry)', async () => {
    const res = await request(app).get('/api/v1/recipes/suggestions').set(AUTH);
    const a = res.body.recipes.find(r => r.id === recipeA.id);
    expect(a.match_pct).toBe(67);
  });

  it('recipeC match_pct is 0 (no pantry items match)', async () => {
    const res = await request(app).get('/api/v1/recipes/suggestions').set(AUTH);
    const c = res.body.recipes.find(r => r.id === recipeC.id);
    expect(c.match_pct).toBe(0);
  });

  it('includes preferences in response', async () => {
    const res = await request(app).get('/api/v1/recipes/suggestions').set(AUTH);
    expect(res.body).toHaveProperty('preferences');
  });

  it('time-of-day: among equal-match-pct recipes, meal_type matching current hour ranks first', async () => {
    const hour = new Date().getHours();
    const todayMealType = getMealTypeForTime(hour);

    // Insert two zero-match recipes with different meal_types
    const [r1] = await db('recipes').insert({
      name: 'Test TOD Recipe A', source: 'manual',
      meal_type: todayMealType, difficulty: 'easy', cook_time_mins: 10, servings: 1, is_public: true,
    }).returning('*');
    const otherMealType = todayMealType === 'breakfast' ? 'dinner' : 'breakfast';
    const [r2] = await db('recipes').insert({
      name: 'Test TOD Recipe B', source: 'manual',
      meal_type: otherMealType, difficulty: 'easy', cook_time_mins: 10, servings: 1, is_public: true,
    }).returning('*');

    // No ingredients → both match 0% → time-of-day is tiebreaker

    const res = await request(app).get('/api/v1/recipes/suggestions').set(AUTH);
    const ids = res.body.recipes.map(r => r.id);

    // Both should be present
    expect(ids).toContain(r1.id);
    expect(ids).toContain(r2.id);

    // r1 (today's meal type) should rank before r2 among other 0% recipes
    // (recipeC is also 0% and has snack type — r1's position relative to recipeC may vary)
    // The key assertion: r1 appears before r2 when they're both 0%
    const r1Pos = ids.indexOf(r1.id);
    const r2Pos = ids.indexOf(r2.id);
    expect(r1Pos).toBeLessThan(r2Pos);

    await db('recipes').whereIn('id', [r1.id, r2.id]).del();
  });
});

// ── GET /:id ──────────────────────────────────────────────────────────────────

describe('GET /api/v1/recipes/:id', () => {
  it('returns 401 when auth header is missing', async () => {
    const res = await request(app).get(`/api/v1/recipes/${recipeA.id}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent UUID', async () => {
    const res = await request(app)
      .get('/api/v1/recipes/00000000-0000-0000-0000-000000000000')
      .set(AUTH);
    expect(res.status).toBe(404);
  });

  it('returns full recipe with ingredients and steps', async () => {
    const res = await request(app)
      .get(`/api/v1/recipes/${recipeA.id}`)
      .set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.recipe.name).toBe('French Omelette');
    expect(Array.isArray(res.body.recipe.ingredients)).toBe(true);
    expect(res.body.recipe.ingredients).toHaveLength(3);
    expect(Array.isArray(res.body.recipe.steps)).toBe(true);
    expect(res.body.recipe.steps).toHaveLength(3);
  });

  it('ingredients are ordered by sort_order', async () => {
    const res = await request(app)
      .get(`/api/v1/recipes/${recipeA.id}`)
      .set(AUTH);
    const names = res.body.recipe.ingredients.map(i => i.name);
    expect(names).toEqual(['Eggs', 'Milk', 'Butter']);
  });

  it('steps are ordered by step_number', async () => {
    const res = await request(app)
      .get(`/api/v1/recipes/${recipeA.id}`)
      .set(AUTH);
    const nums = res.body.recipe.steps.map(s => s.step_number);
    expect(nums).toEqual([1, 2, 3]);
  });

  it('returns 404 for non-public recipe when user has not saved it', async () => {
    const res = await request(app)
      .get(`/api/v1/recipes/${recipePrivate.id}`)
      .set(AUTH);
    expect(res.status).toBe(404);
  });

  it('returns private recipe detail when user has it saved', async () => {
    // Save the private recipe for the test user
    await db('saved_recipes').insert({
      user_id: testUserId,
      recipe_id: recipePrivate.id,
      is_chef_pick: true,
    }).onConflict(['user_id', 'recipe_id']).ignore();

    const res = await request(app)
      .get(`/api/v1/recipes/${recipePrivate.id}`)
      .set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.recipe.name).toBe('Secret Stew');

    await db('saved_recipes').where({ user_id: testUserId, recipe_id: recipePrivate.id }).del();
  });
});

// ── calculateMatch (unit tests) ───────────────────────────────────────────────

import { calculateMatch } from '../services/pantryMatch.js';

describe('calculateMatch()', () => {
  const pantry = [
    { name: 'Eggs' },
    { name: 'Milk' },
    { name: 'Butter' },
  ];

  it('returns 100 when all ingredients are in pantry', () => {
    expect(calculateMatch([{ name: 'Eggs' }, { name: 'Milk' }], pantry)).toBe(100);
  });

  it('returns 0 when no ingredients match', () => {
    expect(calculateMatch([{ name: 'Avocado' }, { name: 'Lime' }], pantry)).toBe(0);
  });

  it('is case-insensitive', () => {
    expect(calculateMatch([{ name: 'eggs' }, { name: 'MILK' }], pantry)).toBe(100);
  });

  it('returns 0 for empty ingredient list', () => {
    expect(calculateMatch([], pantry)).toBe(0);
  });

  it('returns 0 for empty pantry', () => {
    expect(calculateMatch([{ name: 'Eggs' }], [])).toBe(0);
  });

  it('rounds to nearest integer', () => {
    // 1 of 3 = 33.33% → 33
    expect(calculateMatch([{ name: 'Eggs' }, { name: 'Avocado' }, { name: 'Lime' }], pantry)).toBe(33);
  });
});
