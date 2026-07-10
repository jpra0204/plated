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

// ── OTel mock (I8) ────────────────────────────────────────────────────────────
// Expose the image child span so individual tests can assert on its calls.
const { mockImageSpan, mockStartSpan } = vi.hoisted(() => {
  const mockImageSpan = {
    setAttribute:    vi.fn(),
    recordException: vi.fn(),
    end:             vi.fn(),
  };
  const mockStartSpan = vi.fn(() => mockImageSpan);
  return { mockImageSpan, mockStartSpan };
});

vi.mock('@opentelemetry/api', () => {
  // Minimal parent-span stub — existing tests don't assert on parent span calls.
  const noop = () => {};
  const parentSpan = {
    setAttributes:   noop,
    setAttribute:    noop,
    setStatus:       noop,
    recordException: noop,
    end:             noop,
  };
  return {
    trace: {
      getTracer: () => ({
        startActiveSpan: (_name, fn) => fn(parentSpan),
        startSpan:       mockStartSpan,
      }),
    },
    SpanStatusCode: { OK: 1, ERROR: 2 },
  };
});

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

  // Remove stale test-fixture recipes that might be left over from previous test
  // runs in a persistent DB (e.g. a Docker volume that survives between sessions).
  // All test-specific cuisines in this file use toLowerCase() before storage, so
  // they are always stored as 'testcache...'. Deleting by prefix is safe because
  // no production fixture uses this namespace.
  await db('recipes').whereLike('cuisine', 'testcache%').del();
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
  // Clear call history so assertions like not.toHaveBeenCalled() only see calls
  // from the CURRENT test, not leftovers from a previous test.
  mockGenerateRecipeImage.mockClear();
  mockUploadRecipeImage.mockClear();
  // Reset OTel image-span mocks between tests (I8).
  mockStartSpan.mockClear();
  mockImageSpan.setAttribute.mockClear();
  mockImageSpan.recordException.mockClear();
  mockImageSpan.end.mockClear();
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

  it('proceeds with image_url null when image generation rejects (IIFE catch absorbs failure)', async () => {
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

  // ── I8: OTel child span for image generation ─────────────────────────────────

  it('starts a chef.generate.image child span on every generate request', async () => {
    await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });

    expect(mockStartSpan).toHaveBeenCalledWith('chef.generate.image');
    expect(mockImageSpan.end).toHaveBeenCalled();
  });

  it('records image_generation.duration_ms as a non-negative number', async () => {
    await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });

    const durationCall = mockImageSpan.setAttribute.mock.calls.find(
      ([key]) => key === 'image_generation.duration_ms',
    );
    expect(durationCall).toBeDefined();
    expect(typeof durationCall[1]).toBe('number');
    expect(durationCall[1]).toBeGreaterThanOrEqual(0);
  });

  it('sets image_generation.success=true when image is generated and uploaded', async () => {
    mockGenerateRecipeImage.mockResolvedValueOnce('some-base64');
    mockUploadRecipeImage.mockResolvedValueOnce('https://storage.example.com/img.webp');

    await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });

    expect(mockImageSpan.setAttribute).toHaveBeenCalledWith('image_generation.success', true);
    expect(mockImageSpan.end).toHaveBeenCalled();
  });

  it('sets image_generation.success=false when generateRecipeImage returns null', async () => {
    // Default mock already returns null for generateRecipeImage.
    await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });

    expect(mockImageSpan.setAttribute).toHaveBeenCalledWith('image_generation.success', false);
    expect(mockImageSpan.end).toHaveBeenCalled();
  });

  it('sets image_generation.success=false when uploadRecipeImage returns null', async () => {
    mockGenerateRecipeImage.mockResolvedValueOnce('some-base64');
    mockUploadRecipeImage.mockResolvedValueOnce(null);

    await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });

    expect(mockImageSpan.setAttribute).toHaveBeenCalledWith('image_generation.success', false);
    expect(mockImageSpan.end).toHaveBeenCalled();
  });

  it('calls recordException on image span and does not fail the overall request when generateRecipeImage throws', async () => {
    const imgErr = new Error('Image generation exploded');
    mockGenerateRecipeImage.mockRejectedValueOnce(imgErr);

    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: VALID_FILTERS });

    // Request must still succeed — image failure is non-fatal.
    expect(res.status).toBe(201);
    expect(mockImageSpan.recordException).toHaveBeenCalledWith(imgErr);
    expect(mockImageSpan.setAttribute).toHaveBeenCalledWith('image_generation.success', false);
    expect(mockImageSpan.end).toHaveBeenCalled();
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

  // ── I6: Cache-first routing verification ─────────────────────────────────────

  it('cache hit: generateConcept, generateRecipeImage, and uploadRecipeImage are NOT called', async () => {
    // Use a unique cuisine so this fixture cannot collide with other tests.
    const HIT_NO_CALLS_CUISINE = 'TestCacheHitNoCalls';

    const [cacheRecipe] = await db('recipes').insert({
      name:           'Cache Hit No-Calls Fixture',
      source:         'chef_ai',
      meal_type:      'lunch',
      cuisine:        HIT_NO_CALLS_CUISINE.toLowerCase(),
      difficulty:     'easy',
      cook_time_mins: 20,
      servings:       2,
      is_public:      true,
    }).returning('*');

    await db('recipe_ingredients').insert([
      { recipe_id: cacheRecipe.id, name: 'Eggs', quantity: 3, unit: 'pcs', sort_order: 1 },
    ]);
    await db('recipe_steps').insert([
      { recipe_id: cacheRecipe.id, step_number: 1, instruction: 'Cache no-calls step.' },
    ]);

    mockGenerateConcept.mockClear();
    mockGenerateRecipeImage.mockClear();
    mockUploadRecipeImage.mockClear();

    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: { ...VALID_FILTERS, cuisine: HIT_NO_CALLS_CUISINE, notes: '' } });

    expect(res.status).toBe(201);
    // None of the I5 generation functions must be called on a cache hit.
    expect(mockGenerateConcept).not.toHaveBeenCalled();
    expect(mockGenerateRecipeImage).not.toHaveBeenCalled();
    expect(mockUploadRecipeImage).not.toHaveBeenCalled();
    // afterAll handles cleanup via the cascade batch delete.
  });

  it('cache hit: returns the cached recipe image_url unchanged', async () => {
    // [ASSUMPTION]: image_url is SELECTed by findCachedRecipe and spread into
    // the response so the front-end always receives the existing image on a
    // cache hit without any image-generation work.
    const HIT_IMAGE_CUISINE = 'TestCacheHitImageUrl';
    const CACHED_IMAGE_URL = 'https://storage.googleapis.com/plated-recipe-images/recipes/cached-fixture.webp';

    const [cacheRecipe] = await db('recipes').insert({
      name:           'Cache Hit Image URL Fixture',
      source:         'chef_ai',
      meal_type:      'lunch',
      cuisine:        HIT_IMAGE_CUISINE.toLowerCase(),
      difficulty:     'easy',
      cook_time_mins: 20,
      servings:       2,
      is_public:      true,
      image_url:      CACHED_IMAGE_URL,
    }).returning('*');

    await db('recipe_ingredients').insert([
      { recipe_id: cacheRecipe.id, name: 'Eggs', quantity: 3, unit: 'pcs', sort_order: 1 },
    ]);
    await db('recipe_steps').insert([
      { recipe_id: cacheRecipe.id, step_number: 1, instruction: 'Cache image step.' },
    ]);

    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: { ...VALID_FILTERS, cuisine: HIT_IMAGE_CUISINE, notes: '' } });

    expect(res.status).toBe(201);
    // The cached image_url must be returned as-is — no new image is generated.
    expect(res.body.recipe.image_url).toBe(CACHED_IMAGE_URL);
    // afterAll handles cleanup.
  });

  it('cache miss: generateConcept, buildChefPrompt, and generateRecipeImage are all called', async () => {
    // Use a unique cuisine with no matching public recipe to guarantee a real
    // cache miss (the cache is consulted but returns null).
    const MISS_CUISINE = 'TestCacheMissExplicitNoPublicRecipe';

    mockGenerateConcept.mockClear();
    mockBuildChefPrompt.mockClear();
    mockGenerateRecipeImage.mockClear();

    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: { ...VALID_FILTERS, cuisine: MISS_CUISINE, notes: '' } });

    expect(res.status).toBe(201);
    // The full I5 two-call flow must fire on a cache miss.
    expect(mockGenerateConcept).toHaveBeenCalledOnce();
    expect(mockBuildChefPrompt).toHaveBeenCalledOnce();
    expect(mockGenerateRecipeImage).toHaveBeenCalledOnce();
  });

  it('retry: generateConcept is called (cache is bypassed even when a matching public recipe exists)', async () => {
    // Seed a cacheable recipe, first generate (which may hit cache), then verify
    // that a Retry always calls generateConcept regardless of cache state.
    const RETRY_CONCEPT_CUISINE = 'TestCacheRetryConceptCheck';

    const [cacheRecipe] = await db('recipes').insert({
      name:           'Retry Concept Check Fixture',
      source:         'chef_ai',
      meal_type:      'lunch',
      cuisine:        RETRY_CONCEPT_CUISINE.toLowerCase(),
      difficulty:     'easy',
      cook_time_mins: 20,
      servings:       2,
      is_public:      true,
    }).returning('*');

    await db('recipe_ingredients').insert([
      { recipe_id: cacheRecipe.id, name: 'Eggs', quantity: 3, unit: 'pcs', sort_order: 1 },
    ]);
    await db('recipe_steps').insert([
      { recipe_id: cacheRecipe.id, step_number: 1, instruction: 'Retry concept step.' },
    ]);

    // First request (may return from cache — that is fine for this test).
    const first = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: { ...VALID_FILTERS, cuisine: RETRY_CONCEPT_CUISINE, notes: '' } });
    const firstGenId = first.body.generationId;

    mockGenerateConcept.mockClear();
    mockBuildChefPrompt.mockClear();

    // Retry must bypass cache and invoke the full I5 flow.
    const res = await request(app)
      .post('/api/v1/chef/generate')
      .set(AUTH)
      .send({ filters: { ...VALID_FILTERS, cuisine: RETRY_CONCEPT_CUISINE, notes: '' }, retryOf: firstGenId });

    expect(res.status).toBe(201);
    expect(mockGenerateConcept).toHaveBeenCalledOnce();
    expect(mockBuildChefPrompt).toHaveBeenCalledOnce();
    // afterAll handles cleanup.
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
