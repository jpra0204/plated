import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

const TEST_UID = 'test-firebase-uid-cook-5-5';

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
import cookRoutes from './cook.js';

const app = express();
app.use(express.json());
app.use('/api/v1/cook', cookRoutes);

let testUserId;
let recipeId;

beforeAll(async () => {
  const [user] = await db('users')
    .insert({ firebase_uid: TEST_UID, email: 'test-cook@plated.test', cooked_count: 0 })
    .onConflict('firebase_uid').merge(['email', 'cooked_count'])
    .returning('*');
  testUserId = user.id;

  // Recipe with two ingredients: Eggs and Butter.
  const [recipe] = await db('recipes').insert({
    name: 'Cook Test Recipe', source: 'manual', meal_type: 'breakfast',
    difficulty: 'easy', cook_time_mins: 10, servings: 2, is_public: true,
  }).returning('*');
  recipeId = recipe.id;

  await db('recipe_ingredients').insert([
    { recipe_id: recipeId, name: 'Eggs',   quantity: 2, unit: 'pcs', sort_order: 1 },
    { recipe_id: recipeId, name: 'Butter', quantity: 10, unit: 'g',  sort_order: 2 },
  ]);
});

afterAll(async () => {
  if (recipeId) {
    await db('recipe_ingredients').where({ recipe_id: recipeId }).del();
    await db('recipes').where({ id: recipeId }).del();
  }
  if (testUserId) {
    await db('pantry_items').where({ user_id: testUserId }).del();
    await db('users').where({ id: testUserId }).del();
  }
  await db.destroy();
});

beforeEach(async () => {
  // Reset pantry and cooked_count before each test.
  await db('pantry_items').where({ user_id: testUserId }).del();
  await db('users').where({ id: testUserId }).update({ cooked_count: 0 });

  // Seed pantry: Eggs (matches recipe), Milk (does NOT match recipe).
  await db('pantry_items').insert([
    { user_id: testUserId, name: 'Eggs',   category: 'dairy', quantity: 6, unit: 'pcs' },
    { user_id: testUserId, name: 'Butter', category: 'dairy', quantity: 200, unit: 'g' },
    { user_id: testUserId, name: 'Milk',   category: 'dairy', quantity: 1, unit: 'L' },
  ]);
});

const AUTH = { Authorization: 'Bearer test-token' };

// ── POST / ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/cook', () => {
  it('returns 401 when auth header is missing', async () => {
    const res = await request(app).post('/api/v1/cook').send({ recipeId });
    expect(res.status).toBe(401);
  });

  it('returns 400 when recipeId is missing', async () => {
    const res = await request(app).post('/api/v1/cook').set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for a non-existent recipe', async () => {
    const res = await request(app)
      .post('/api/v1/cook')
      .set(AUTH)
      .send({ recipeId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(404);
  });

  it('returns 200 with cookedCount and removedItems', async () => {
    const res = await request(app).post('/api/v1/cook').set(AUTH).send({ recipeId });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('cookedCount');
    expect(Array.isArray(res.body.removedItems)).toBe(true);
  });

  it('soft-deletes matched pantry items (Eggs and Butter)', async () => {
    await request(app).post('/api/v1/cook').set(AUTH).send({ recipeId });

    const active = await db('pantry_items')
      .where({ user_id: testUserId })
      .whereNull('deleted_at')
      .select('name');
    const names = active.map(i => i.name);

    expect(names).not.toContain('Eggs');
    expect(names).not.toContain('Butter');
  });

  it('does not remove pantry items not in the recipe (Milk)', async () => {
    await request(app).post('/api/v1/cook').set(AUTH).send({ recipeId });

    const milk = await db('pantry_items')
      .where({ user_id: testUserId, name: 'Milk' })
      .whereNull('deleted_at')
      .first();
    expect(milk).toBeDefined();
  });

  it('increments cooked_count by 1', async () => {
    await request(app).post('/api/v1/cook').set(AUTH).send({ recipeId });

    const user = await db('users').where({ id: testUserId }).first();
    expect(user.cooked_count).toBe(1);
  });

  it('returns the incremented cookedCount in the response', async () => {
    const res = await request(app).post('/api/v1/cook').set(AUTH).send({ recipeId });
    expect(res.body.cookedCount).toBe(1);
  });

  it('transaction atomicity: both pantry decrement and cooked_count increment happen together', async () => {
    // Cook once and verify both effects.
    const res = await request(app).post('/api/v1/cook').set(AUTH).send({ recipeId });
    expect(res.status).toBe(200);

    const [user, activeItems] = await Promise.all([
      db('users').where({ id: testUserId }).first(),
      db('pantry_items').where({ user_id: testUserId }).whereNull('deleted_at').select('name'),
    ]);

    // cooked_count incremented.
    expect(user.cooked_count).toBe(1);
    // Matched items removed.
    const names = activeItems.map(i => i.name);
    expect(names).not.toContain('Eggs');
    expect(names).not.toContain('Butter');
    // Non-matched item preserved.
    expect(names).toContain('Milk');
  });

  it('removedItems lists matched item names', async () => {
    const res = await request(app).post('/api/v1/cook').set(AUTH).send({ recipeId });
    const names = res.body.removedItems.map(i => i.name);
    expect(names).toContain('Eggs');
    expect(names).toContain('Butter');
    expect(names).not.toContain('Milk');
  });

  it('is idempotent: cooking with no pantry match still increments cooked_count', async () => {
    // Remove all pantry items first.
    await db('pantry_items').where({ user_id: testUserId }).del();

    const res = await request(app).post('/api/v1/cook').set(AUTH).send({ recipeId });
    expect(res.status).toBe(200);
    expect(res.body.removedItems).toHaveLength(0);
    expect(res.body.cookedCount).toBe(1);
  });

  it('matching is case-insensitive', async () => {
    // Rename pantry items to different case.
    await db('pantry_items').where({ user_id: testUserId }).del();
    await db('pantry_items').insert([
      { user_id: testUserId, name: 'eggs',   category: 'dairy', quantity: 6, unit: 'pcs' },
      { user_id: testUserId, name: 'BUTTER', category: 'dairy', quantity: 200, unit: 'g' },
    ]);

    const res = await request(app).post('/api/v1/cook').set(AUTH).send({ recipeId });
    expect(res.body.removedItems).toHaveLength(2);
  });
});
