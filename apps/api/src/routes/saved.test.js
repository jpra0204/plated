import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

const TEST_UID = 'test-firebase-uid-saved-5-5';

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
import savedRoutes from './saved.js';

const app = express();
app.use(express.json());
app.use('/api/v1/saved', savedRoutes);

let testUserId;
let recipeId;

beforeAll(async () => {
  const [user] = await db('users')
    .insert({ firebase_uid: TEST_UID, email: 'test-saved@plated.test' })
    .onConflict('firebase_uid').merge(['email'])
    .returning('*');
  testUserId = user.id;

  await db('dietary_preferences').insert({ user_id: user.id }).onConflict('user_id').ignore();

  // Seed a public recipe with two ingredients.
  const [recipe] = await db('recipes').insert({
    name: 'Saved Test Recipe', source: 'manual', meal_type: 'dinner',
    difficulty: 'easy', cook_time_mins: 20, servings: 2, is_public: true,
  }).returning('*');
  recipeId = recipe.id;

  await db('recipe_ingredients').insert([
    { recipe_id: recipeId, name: 'Eggs',  quantity: 2, unit: 'pcs', sort_order: 1 },
    { recipe_id: recipeId, name: 'Flour', quantity: 200, unit: 'g', sort_order: 2 },
  ]);

  // Seed one pantry item (Eggs) so match_pct = 50%.
  await db('pantry_items').insert({
    user_id: user.id, name: 'Eggs', category: 'dairy', quantity: 6, unit: 'pcs',
  });
});

afterAll(async () => {
  if (recipeId) {
    await db('saved_recipes').where({ recipe_id: recipeId }).del();
    await db('recipe_ingredients').where({ recipe_id: recipeId }).del();
    await db('recipes').where({ id: recipeId }).del();
  }
  if (testUserId) {
    await db('pantry_items').where({ user_id: testUserId }).del();
    await db('dietary_preferences').where({ user_id: testUserId }).del();
    await db('users').where({ id: testUserId }).del();
  }
  await db.destroy();
});

beforeEach(async () => {
  await db('saved_recipes').where({ user_id: testUserId }).del();
});

const AUTH = { Authorization: 'Bearer test-token' };

// ── GET / ─────────────────────────────────────────────────────────────────────

describe('GET /api/v1/saved', () => {
  it('returns 401 when auth header is missing', async () => {
    const res = await request(app).get('/api/v1/saved');
    expect(res.status).toBe(401);
  });

  it('returns empty array when nothing saved', async () => {
    const res = await request(app).get('/api/v1/saved').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.recipes).toEqual([]);
  });

  it('returns saved recipes with recipe fields', async () => {
    await db('saved_recipes').insert({ user_id: testUserId, recipe_id: recipeId });
    const res = await request(app).get('/api/v1/saved').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.recipes).toHaveLength(1);
    expect(res.body.recipes[0].name).toBe('Saved Test Recipe');
    expect(res.body.recipes[0]).toHaveProperty('saved_id');
  });

  it('calculates match_pct (Eggs in pantry → 1/2 = 50%)', async () => {
    await db('saved_recipes').insert({ user_id: testUserId, recipe_id: recipeId });
    const res = await request(app).get('/api/v1/saved').set(AUTH);
    expect(res.body.recipes[0].match_pct).toBe(50);
  });

  it('excludes soft-deleted saved recipes', async () => {
    await db('saved_recipes').insert({
      user_id: testUserId, recipe_id: recipeId, deleted_at: new Date(),
    });
    const res = await request(app).get('/api/v1/saved').set(AUTH);
    expect(res.body.recipes).toHaveLength(0);
  });
});

// ── POST / ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/saved', () => {
  it('returns 401 when auth header is missing', async () => {
    const res = await request(app).post('/api/v1/saved').send({ recipeId });
    expect(res.status).toBe(401);
  });

  it('returns 400 when recipeId is missing', async () => {
    const res = await request(app).post('/api/v1/saved').set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for a non-existent recipeId', async () => {
    const res = await request(app)
      .post('/api/v1/saved')
      .set(AUTH)
      .send({ recipeId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(404);
  });

  it('saves a recipe and returns 201', async () => {
    const res = await request(app).post('/api/v1/saved').set(AUTH).send({ recipeId });
    expect(res.status).toBe(201);
    expect(res.body.savedRecipe).toHaveProperty('id');
    expect(res.body.savedRecipe.recipe_id).toBe(recipeId);
    expect(res.body.savedRecipe.is_chef_pick).toBe(false);
  });

  it('saving again un-deletes a previously removed recipe', async () => {
    // Save and then soft-delete.
    const [row] = await db('saved_recipes').insert({
      user_id: testUserId, recipe_id: recipeId, deleted_at: new Date(),
    }).returning('*');

    await request(app).post('/api/v1/saved').set(AUTH).send({ recipeId });

    const updated = await db('saved_recipes').where({ id: row.id }).first();
    expect(updated.deleted_at).toBeNull();
  });
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

describe('DELETE /api/v1/saved/:id', () => {
  it('returns 401 when auth header is missing', async () => {
    const [row] = await db('saved_recipes')
      .insert({ user_id: testUserId, recipe_id: recipeId }).returning('*');
    const res = await request(app).delete(`/api/v1/saved/${row.id}`);
    expect(res.status).toBe(401);
  });

  it('soft-deletes the saved recipe and returns 204', async () => {
    const [row] = await db('saved_recipes')
      .insert({ user_id: testUserId, recipe_id: recipeId }).returning('*');
    const res = await request(app).delete(`/api/v1/saved/${row.id}`).set(AUTH);
    expect(res.status).toBe(204);
    const updated = await db('saved_recipes').where({ id: row.id }).first();
    expect(updated.deleted_at).not.toBeNull();
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app)
      .delete('/api/v1/saved/00000000-0000-0000-0000-000000000000')
      .set(AUTH);
    expect(res.status).toBe(404);
  });
});
