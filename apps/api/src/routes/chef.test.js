import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

const TEST_UID = 'test-firebase-uid-chef-5-4';

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

// vi.mock is hoisted before variable declarations, so use vi.hoisted() to
// create the mock fns in the same temporal zone as the factory.
const { mockBuildChefPrompt, mockGenerated, mockGenerateConcept, mockGenerateRecipeImage, MOCK_CONCEPT } = vi.hoisted(() => {
  const mockGenerated = {
    name: 'Test Omelette',
    cook_time_mins: 10,
    difficulty: 'easy',
    servings: 2,
    cuisine: 'French',
    ingredients: [
      { name: 'Eggs',   quantity: 3, unit: 'pcs', in_pantry: true },
      { name: 'Butter', quantity: 10, unit: 'g',  in_pantry: false },
    ],
    steps: [
      { step_number: 1, instruction: 'Beat eggs.' },
      { step_number: 2, instruction: 'Cook in butter.' },
    ],
  };
  const MOCK_CONCEPT = { name: 'Test Omelette', cuisine: 'French', hero_ingredient: 'Eggs' };
  return {
    mockBuildChefPrompt: vi.fn().mockResolvedValue(mockGenerated),
    mockGenerated,
    mockGenerateConcept: vi.fn().mockResolvedValue(MOCK_CONCEPT),
    mockGenerateRecipeImage: vi.fn().mockResolvedValue(null),
    MOCK_CONCEPT,
  };
});

vi.mock('../services/gemini.js', () => ({
  buildChefPrompt: mockBuildChefPrompt,
  buildVoiceParsePrompt: vi.fn(),
  generateConcept: mockGenerateConcept,
  generateRecipeImage: mockGenerateRecipeImage,
}));

const { mockUploadRecipeImage } = vi.hoisted(() => ({
  mockUploadRecipeImage: vi.fn().mockResolvedValue(null),
}));

vi.mock('../services/imageStorage.js', () => ({
  uploadRecipeImage: mockUploadRecipeImage,
}));

import db from '../db/index.js';
import chefRoutes from './chef.js';

// ── App ───────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/v1/chef', chefRoutes);

// ── Fixtures ──────────────────────────────────────────────────────────────────

let testUserId;

const VALID_FILTERS = {
  mealType: 'Lunch',
  cookTime: '30 min',
  difficulty: 'Easy',
  cuisine: 'French',
  servings: 2,
  notes: '',
};

beforeAll(async () => {
  const [user] = await db('users')
    .insert({ firebase_uid: TEST_UID, email: 'test-chef@plated.test' })
    .onConflict('firebase_uid').merge(['email'])
    .returning('*');
  testUserId = user.id;

  await db('dietary_preferences').insert({ user_id: user.id }).onConflict('user_id').ignore();

  // Seed a pantry item so pantry_snapshot is non-empty
  await db('pantry_items').insert({
    user_id: user.id, name: 'Eggs', category: 'dairy', quantity: 6, unit: 'pcs',
  });
});

afterAll(async () => {
  // Clean up generations + linked recipes (steps + ingredients cascade via FK ON DELETE CASCADE)
  const gens = await db('chef_generations').where({ user_id: testUserId }).select('recipe_id');
  const recipeIds = gens.map(g => g.recipe_id).filter(Boolean);

  await db('saved_recipes').where({ user_id: testUserId }).del();
  await db('chef_generations').where({ user_id: testUserId }).del();

  if (recipeIds.length) {
    await db('recipe_steps').whereIn('recipe_id', recipeIds).del();
    await db('recipe_ingredients').whereIn('recipe_id', recipeIds).del();
    await db('recipes').whereIn('id', recipeIds).del();
  }

  await db('pantry_items').where({ user_id: testUserId }).del();
  await db('dietary_preferences').where({ user_id: testUserId }).del();
  await db('users').where({ id: testUserId }).del();
  await db.destroy();
});

beforeEach(() => {
  mockBuildChefPrompt.mockResolvedValue(mockGenerated);
  mockGenerateConcept.mockResolvedValue(MOCK_CONCEPT);
  mockGenerateRecipeImage.mockResolvedValue(null);
  mockUploadRecipeImage.mockResolvedValue(null);
});

const AUTH = { Authorization: 'Bearer test-token' };

// ── POST /generate ────────────────────────────────────────────────────────────

describe('POST /api/v1/chef/generate', () => {
  it('returns 401 when auth header is missing', async () => {
    const res = await request(app).post('/api/v1/chef/generate').send({ filters: VALID_FILTERS });
    expect(res.status).toBe(401);
  });

  it('returns 400 when required filter fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: { mealType: 'Lunch' } }); // missing cookTime, difficulty, servings
    expect(res.status).toBe(400);
  });

  it('returns 201 with generationId and recipe on success', async () => {
    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('generationId');
    expect(res.body).toHaveProperty('recipe');
    expect(res.body.recipe.name).toBe('Test Omelette');
  });

  it('recipe is saved as is_public=false (pending approval)', async () => {
    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });
    expect(res.status).toBe(201);

    const recipe = await db('recipes').where({ id: res.body.recipe.id }).first();
    expect(recipe.is_public).toBe(false);
    expect(recipe.source).toBe('chef_ai');
  });

  it('recipe includes ingredients and steps', async () => {
    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });
    expect(res.body.recipe.ingredients).toHaveLength(2);
    expect(res.body.recipe.steps).toHaveLength(2);
    expect(res.body.recipe.ingredients[0].name).toBe('Eggs');
    expect(res.body.recipe.steps[0].instruction).toBe('Beat eggs.');
  });

  it('persists a chef_generation row with status=success', async () => {
    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });
    const gen = await db('chef_generations').where({ id: res.body.generationId }).first();
    expect(gen).toBeDefined();
    expect(gen.status).toBe('success');
    expect(gen.recipe_id).toBe(res.body.recipe.id);
    expect(gen.user_id).toBe(testUserId);
  });

  it('pantry_snapshot in generation reflects pantry at time of generation', async () => {
    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });
    const gen = await db('chef_generations').where({ id: res.body.generationId }).first();
    const snapshot = gen.pantry_snapshot;
    expect(Array.isArray(snapshot)).toBe(true);
    expect(snapshot.some(i => i.name === 'Eggs')).toBe(true);
  });

  it('passes previousRecipeIds from earlier generations to buildChefPrompt', async () => {
    // First generation
    const first = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });
    const firstRecipeId = first.body.recipe.id;

    mockBuildChefPrompt.mockClear();

    // Second generation — should pass firstRecipeId as a previousRecipeId
    await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });

    expect(mockBuildChefPrompt).toHaveBeenCalledOnce();
    const callArgs = mockBuildChefPrompt.mock.calls[0][0];
    expect(callArgs.previousRecipeIds).toContain(firstRecipeId);
  });

  it('stores retryOf when provided', async () => {
    const first = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });
    const firstGenId = first.body.generationId;

    const second = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS, retryOf: firstGenId });
    expect(second.status).toBe(201);

    const gen = await db('chef_generations').where({ id: second.body.generationId }).first();
    expect(gen.retry_of).toBe(firstGenId);
  });

  it('returns 502 when Gemini returns null', async () => {
    mockBuildChefPrompt.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });
    expect(res.status).toBe(502);
  });

  // ── I5: Concept → Parallel (recipe + image) flow ─────────────────────────────

  it('calls generateConcept before buildChefPrompt', async () => {
    const callOrder = [];
    mockGenerateConcept.mockImplementation(async () => {
      callOrder.push('concept');
      return MOCK_CONCEPT;
    });
    mockBuildChefPrompt.mockImplementation(async () => {
      callOrder.push('recipe');
      return mockGenerated;
    });

    await request(app).post('/api/v1/chef/generate').set(AUTH).send({ filters: VALID_FILTERS });

    expect(callOrder[0]).toBe('concept');
    expect(callOrder).toContain('recipe');
  });

  it('passes concept constraints to buildChefPrompt', async () => {
    mockBuildChefPrompt.mockClear();

    await request(app).post('/api/v1/chef/generate').set(AUTH).send({ filters: VALID_FILTERS });

    expect(mockBuildChefPrompt).toHaveBeenCalledOnce();
    const callArgs = mockBuildChefPrompt.mock.calls[0][0];
    expect(callArgs.concept).toEqual(MOCK_CONCEPT);
  });

  it('attaches image_url to recipe when image generation and upload succeed', async () => {
    const fakeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAUA';
    const fakeUrl = 'https://storage.googleapis.com/plated-recipe-images/recipes/test.webp';
    mockGenerateRecipeImage.mockResolvedValueOnce(fakeBase64);
    mockUploadRecipeImage.mockResolvedValueOnce(fakeUrl);

    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });

    expect(res.status).toBe(201);
    // Verify the recipe row in the DB has the image_url set.
    const recipe = await db('recipes').where({ id: res.body.recipe.id }).first();
    expect(recipe.image_url).toBe(fakeUrl);
    // uploadRecipeImage was called with the recipe's ID.
    expect(mockUploadRecipeImage).toHaveBeenCalledWith(res.body.recipe.id, fakeBase64);
  });

  it('proceeds with image_url null when image generation returns null', async () => {
    mockGenerateRecipeImage.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });

    expect(res.status).toBe(201);
    const recipe = await db('recipes').where({ id: res.body.recipe.id }).first();
    expect(recipe.image_url).toBeNull();
    expect(mockUploadRecipeImage).not.toHaveBeenCalled();
  });

  it('proceeds with image_url null when image upload fails', async () => {
    mockGenerateRecipeImage.mockResolvedValueOnce('some-base64');
    mockUploadRecipeImage.mockResolvedValueOnce(null); // upload fails → null

    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });

    expect(res.status).toBe(201);
    const recipe = await db('recipes').where({ id: res.body.recipe.id }).first();
    expect(recipe.image_url).toBeNull();
  });

  it('proceeds with image_url null when image generation rejects (allSettled absorbs failure)', async () => {
    mockGenerateRecipeImage.mockRejectedValueOnce(new Error('Image gen exploded'));

    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });

    // Recipe must still succeed even if image gen throws.
    expect(res.status).toBe(201);
    expect(res.body.recipe.name).toBe('Test Omelette');
    const recipe = await db('recipes').where({ id: res.body.recipe.id }).first();
    expect(recipe.image_url).toBeNull();
  });

  // ── Cache-first behaviour ────────────────────────────────────────────────────
  // These tests use cuisines that are unlikely to collide with VALID_FILTERS
  // ('French') so seeded cache recipes do not bleed into approve-test
  // beforeEach generate calls.

  it('always calls Gemini when retryOf is set (Retry bypasses cache)', async () => {
    // Use a test-specific cuisine so this recipe does not match VALID_FILTERS.
    const RETRY_CUISINE = 'TestCacheRetry';
    const [cacheRecipe] = await db('recipes').insert({
      name:           'Cache Retry Bypass Fixture',
      source:         'chef_ai',
      meal_type:      'lunch',
      cuisine:        RETRY_CUISINE.toLowerCase(),
      difficulty:     'easy',
      cook_time_mins: 20,
      servings:       2,
      is_public:      true,
    }).returning('*');

    mockBuildChefPrompt.mockClear();

    const retryFilters = { ...VALID_FILTERS, cuisine: RETRY_CUISINE };

    const first = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: retryFilters });
    const firstGenId = first.body.generationId;

    mockBuildChefPrompt.mockClear();

    // Retry: should always call Gemini, never hit the cache.
    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: retryFilters, retryOf: firstGenId });

    expect(res.status).toBe(201);
    expect(mockBuildChefPrompt).toHaveBeenCalledOnce();
    // No explicit cleanup here — afterAll deletes all testUserId generations +
    // their referenced recipes (including cacheRecipe) in a single batch
    // statement that avoids self-referential FK issues.
  });

  it('always calls Gemini when Extra Notes are non-empty', async () => {
    // Use a test-specific cuisine so this recipe does not match VALID_FILTERS.
    const NOTES_CUISINE = 'TestCacheNotesBypass';
    const [cacheRecipe] = await db('recipes').insert({
      name:           'Cache Notes Bypass Fixture',
      source:         'chef_ai',
      meal_type:      'lunch',
      cuisine:        NOTES_CUISINE.toLowerCase(),
      difficulty:     'easy',
      cook_time_mins: 20,
      servings:       2,
      is_public:      true,
    }).returning('*');

    mockBuildChefPrompt.mockClear();

    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: { ...VALID_FILTERS, cuisine: NOTES_CUISINE, notes: 'make it spicy' } });

    expect(res.status).toBe(201);
    // Gemini must have been called because notes were non-empty.
    expect(mockBuildChefPrompt).toHaveBeenCalledOnce();

    // No generation points to cacheRecipe (cache was bypassed), so it can be
    // deleted immediately without FK complications.
    await db('recipes').where({ id: cacheRecipe.id }).del();
  });

  it('resolves "surprise" cuisine to a concrete cuisine before calling Gemini', async () => {
    mockBuildChefPrompt.mockClear();

    // Use non-empty notes to force a Gemini call and bypass the cache, so we
    // can inspect the filters actually passed to buildChefPrompt.
    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: { ...VALID_FILTERS, cuisine: 'surprise', notes: 'force-gemini-surprise' } });

    expect(res.status).toBe(201);
    expect(mockBuildChefPrompt).toHaveBeenCalledOnce();
    const { filters: calledFilters } = mockBuildChefPrompt.mock.calls[0][0];
    // The cuisine must be resolved to a concrete value — never 'surprise'.
    expect(calledFilters.cuisine).not.toBe('surprise');
    expect(typeof calledFilters.cuisine).toBe('string');
    expect(calledFilters.cuisine.length).toBeGreaterThan(0);
  });

  it('returns a cached recipe (no Gemini call) when a matching public recipe exists', async () => {
    // Use a test-specific cuisine so this recipe does not match VALID_FILTERS.
    const HIT_CUISINE = 'TestCacheHit';

    const [cacheRecipe] = await db('recipes').insert({
      name:           'Cache Hit Fixture Pasta',
      source:         'chef_ai',
      meal_type:      'lunch',
      cuisine:        HIT_CUISINE.toLowerCase(),
      difficulty:     'easy',
      cook_time_mins: 20,
      servings:       2,
      is_public:      true,
    }).returning('*');

    await db('recipe_ingredients').insert([
      { recipe_id: cacheRecipe.id, name: 'Eggs',   quantity: 3,  unit: 'pcs', sort_order: 1 },
      { recipe_id: cacheRecipe.id, name: 'Butter', quantity: 10, unit: 'g',   sort_order: 2 },
    ]);
    await db('recipe_steps').insert([
      { recipe_id: cacheRecipe.id, step_number: 1, instruction: 'Cache step one.' },
    ]);

    mockBuildChefPrompt.mockClear();

    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: { ...VALID_FILTERS, cuisine: HIT_CUISINE, notes: '' } });

    expect(res.status).toBe(201);
    // Gemini should NOT have been called — cache hit.
    expect(mockBuildChefPrompt).not.toHaveBeenCalled();
    expect(res.body).toHaveProperty('generationId');
    expect(res.body.recipe.id).toBe(cacheRecipe.id);
    expect(res.body.recipe.ingredients).toHaveLength(2);
    expect(res.body.recipe.steps).toHaveLength(1);

    // Generation row should be persisted pointing to the cached recipe.
    const gen = await db('chef_generations').where({ id: res.body.generationId }).first();
    expect(gen.recipe_id).toBe(cacheRecipe.id);
    expect(gen.status).toBe('success');

    // Let afterAll handle the full cascade cleanup (generations → steps →
    // ingredients → recipes) using its batch delete which avoids FK issues.
  });
});

// ── POST /:generationId/approve ───────────────────────────────────────────────

describe('POST /api/v1/chef/:generationId/approve', () => {
  let generationId;
  let recipeId;

  beforeEach(async () => {
    // Create a fresh generation for each approval test.
    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });
    generationId = res.body.generationId;
    recipeId = res.body.recipe.id;
  });

  it('returns 401 when auth header is missing', async () => {
    const res = await request(app)
      .post(`/api/v1/chef/${generationId}/approve`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent generationId', async () => {
    const res = await request(app)
      .post('/api/v1/chef/00000000-0000-0000-0000-000000000000/approve')
      .set(AUTH);
    expect(res.status).toBe(404);
  });

  it('returns 200 with savedRecipeId, recipe name, and navigateTo', async () => {
    const res = await request(app)
      .post(`/api/v1/chef/${generationId}/approve`)
      .set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('savedRecipeId');
    expect(res.body.recipe.name).toBe('Test Omelette');
    expect(res.body.navigateTo).toBe('/saved');
  });

  it('sets approved_at on the generation', async () => {
    await request(app).post(`/api/v1/chef/${generationId}/approve`).set(AUTH);
    const gen = await db('chef_generations').where({ id: generationId }).first();
    expect(gen.approved_at).not.toBeNull();
  });

  it('makes the recipe public after approval', async () => {
    await request(app).post(`/api/v1/chef/${generationId}/approve`).set(AUTH);
    const recipe = await db('recipes').where({ id: recipeId }).first();
    expect(recipe.is_public).toBe(true);
  });

  it('inserts a saved_recipes row with is_chef_pick=true', async () => {
    await request(app).post(`/api/v1/chef/${generationId}/approve`).set(AUTH);
    const saved = await db('saved_recipes')
      .where({ user_id: testUserId, recipe_id: recipeId })
      .first();
    expect(saved).toBeDefined();
    expect(saved.is_chef_pick).toBe(true);
  });

  it('returns 409 when the same generation is approved twice', async () => {
    await request(app).post(`/api/v1/chef/${generationId}/approve`).set(AUTH);
    const res = await request(app)
      .post(`/api/v1/chef/${generationId}/approve`)
      .set(AUTH);
    expect(res.status).toBe(409);
  });
});
