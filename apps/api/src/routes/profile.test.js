import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

const TEST_UID = 'test-firebase-uid-profile-5-5';

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
import profileRoutes from './profile.js';

const app = express();
app.use(express.json());
app.use('/api/v1/profile', profileRoutes);

let testUserId;
let recipeId;

beforeAll(async () => {
  const [user] = await db('users')
    .insert({
      firebase_uid: TEST_UID,
      email:        'test-profile@plated.test',
      display_name: 'Test User',
      cooked_count: 3,
    })
    .onConflict('firebase_uid').merge(['email', 'display_name', 'cooked_count'])
    .returning('*');
  testUserId = user.id;

  await db('dietary_preferences').insert({ user_id: user.id }).onConflict('user_id').ignore();

  // Seed a recipe + 2 pantry items + 1 saved recipe for stats.
  const [recipe] = await db('recipes').insert({
    name: 'Profile Test Recipe', source: 'manual', meal_type: 'lunch',
    difficulty: 'easy', cook_time_mins: 15, servings: 2, is_public: true,
  }).returning('*');
  recipeId = recipe.id;

  await db('pantry_items').insert([
    { user_id: user.id, name: 'Apple',  category: 'produce', quantity: 3, unit: 'pcs' },
    { user_id: user.id, name: 'Banana', category: 'produce', quantity: 2, unit: 'pcs' },
  ]);

  await db('saved_recipes').insert({ user_id: user.id, recipe_id: recipeId });
});

afterAll(async () => {
  // Only runs if user still exists (DELETE test creates a separate user).
  if (recipeId) {
    await db('saved_recipes').where({ recipe_id: recipeId }).del();
    await db('recipes').where({ id: recipeId }).del();
  }
  if (testUserId) {
    await db('pantry_items').where({ user_id: testUserId }).del();
    await db('dietary_preferences').where({ user_id: testUserId }).del();
    await db('users').where({ id: testUserId }).del();
  }
  await db.destroy();
});

const AUTH = { Authorization: 'Bearer test-token' };

// ── GET / ─────────────────────────────────────────────────────────────────────

describe('GET /api/v1/profile', () => {
  it('returns 401 when auth header is missing', async () => {
    const res = await request(app).get('/api/v1/profile');
    expect(res.status).toBe(401);
  });

  it('returns 200 with profile object', async () => {
    const res = await request(app).get('/api/v1/profile').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('profile');
  });

  it('includes core user fields', async () => {
    const res = await request(app).get('/api/v1/profile').set(AUTH);
    const { profile } = res.body;
    expect(profile.email).toBe('test-profile@plated.test');
    expect(profile.displayName).toBe('Test User');
    expect(profile.cookedCount).toBe(3);
  });

  it('includes accurate pantryCount (2 active items)', async () => {
    const res = await request(app).get('/api/v1/profile').set(AUTH);
    expect(res.body.profile.pantryCount).toBe(2);
  });

  it('includes accurate savedCount (1 saved recipe)', async () => {
    const res = await request(app).get('/api/v1/profile').set(AUTH);
    expect(res.body.profile.savedCount).toBe(1);
  });

  it('includes dietary preferences', async () => {
    const res = await request(app).get('/api/v1/profile').set(AUTH);
    expect(res.body.profile).toHaveProperty('preferences');
    expect(res.body.profile.preferences).toHaveProperty('vegetarian');
    expect(res.body.profile.preferences).toHaveProperty('glutenFree');
  });
});

// ── PATCH /preferences ────────────────────────────────────────────────────────

describe('PATCH /api/v1/profile/preferences', () => {
  it('returns 401 when auth header is missing', async () => {
    const res = await request(app).patch('/api/v1/profile/preferences').send({ vegetarian: true });
    expect(res.status).toBe(401);
  });

  it('updates dietary preferences and returns them', async () => {
    const res = await request(app)
      .patch('/api/v1/profile/preferences')
      .set(AUTH)
      .send({ vegetarian: true, glutenFree: false, highProtein: true });
    expect(res.status).toBe(200);
    expect(res.body.preferences.vegetarian).toBe(true);
    expect(res.body.preferences.glutenFree).toBe(false);
    expect(res.body.preferences.highProtein).toBe(true);
  });

  it('only updates provided fields (partial update)', async () => {
    // Set a known state.
    await db('dietary_preferences').where({ user_id: testUserId })
      .update({ vegetarian: false, high_protein: false });

    await request(app)
      .patch('/api/v1/profile/preferences')
      .set(AUTH)
      .send({ vegetarian: true }); // only update vegetarian

    const prefs = await db('dietary_preferences').where({ user_id: testUserId }).first();
    expect(prefs.vegetarian).toBe(true);
    expect(prefs.high_protein).toBe(false); // unchanged
  });

  it('persists changes in DB', async () => {
    await request(app)
      .patch('/api/v1/profile/preferences')
      .set(AUTH)
      .send({ macroTracking: true });

    const prefs = await db('dietary_preferences').where({ user_id: testUserId }).first();
    expect(prefs.macro_tracking).toBe(true);
  });
});

// ── PATCH / ───────────────────────────────────────────────────────────────────

describe('PATCH /api/v1/profile', () => {
  it('returns 401 when auth header is missing', async () => {
    const res = await request(app).patch('/api/v1/profile').send({ displayName: 'New Name' });
    expect(res.status).toBe(401);
  });

  it('updates displayName and returns updated profile', async () => {
    const res = await request(app)
      .patch('/api/v1/profile')
      .set(AUTH)
      .send({ displayName: 'Updated User' });
    expect(res.status).toBe(200);
    expect(res.body.profile.displayName).toBe('Updated User');
  });

  it('updates city and roleLabel', async () => {
    const res = await request(app)
      .patch('/api/v1/profile')
      .set(AUTH)
      .send({ city: 'Barcelona', roleLabel: 'Chef' });
    expect(res.status).toBe(200);
    expect(res.body.profile.city).toBe('Barcelona');
    expect(res.body.profile.roleLabel).toBe('Chef');
  });

  it('persists changes in DB', async () => {
    await request(app)
      .patch('/api/v1/profile')
      .set(AUTH)
      .send({ displayName: 'Persisted Name' });

    const user = await db('users').where({ id: testUserId }).first();
    expect(user.display_name).toBe('Persisted Name');
  });
});

// ── DELETE / ──────────────────────────────────────────────────────────────────
// NOTE: this describe block runs last — the DELETE test removes the main test
// user. afterAll handles the already-deleted state gracefully (no-ops).

describe('DELETE /api/v1/profile', () => {
  it('returns 401 when auth header is missing', async () => {
    const res = await request(app).delete('/api/v1/profile');
    expect(res.status).toBe(401);
  });

  it('deletes the user account and returns 204', async () => {
    const res = await request(app).delete('/api/v1/profile').set(AUTH);
    expect(res.status).toBe(204);

    const deleted = await db('users').where({ id: testUserId }).first();
    expect(deleted).toBeUndefined();
  });
});
