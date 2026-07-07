import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseCookTimeRange, findCachedRecipe } from './recipeCache.js';
import db from '../db/index.js';

// ── parseCookTimeRange ────────────────────────────────────────────────────────
// Pure function — no DB required.

describe('parseCookTimeRange', () => {
  it('maps "Under 15 min" to { max: 14 }', () => {
    expect(parseCookTimeRange('Under 15 min')).toEqual({ max: 14 });
  });

  it('maps "30 min" to { min: 15, max: 45 }', () => {
    expect(parseCookTimeRange('30 min')).toEqual({ min: 15, max: 45 });
  });

  it('maps "1 hr+" to { min: 46 }', () => {
    expect(parseCookTimeRange('1 hr+')).toEqual({ min: 46 });
  });

  it('returns empty object for unknown values', () => {
    expect(parseCookTimeRange('2 hr')).toEqual({});
    expect(parseCookTimeRange('')).toEqual({});
    expect(parseCookTimeRange(undefined)).toEqual({});
  });
});

// ── findCachedRecipe ──────────────────────────────────────────────────────────
// Integration tests — requires a running PostgreSQL instance.
// If ECONNREFUSED is thrown, it is a pre-existing infra issue (no local DB).

const BASE_PARAMS = {
  mealType:    'Lunch',
  cookTime:    '30 min',
  difficulty:  'Easy',
  cuisine:     'Italian',
  servings:    2,
  preferences: {},
};

// IDs inserted during setup, cleaned up in afterAll.
let recipeIdA;
let recipeIdB;

beforeAll(async () => {
  // Recipe A — matches all BASE_PARAMS filters. cook_time_mins=20 (in 30 min bucket).
  [{ id: recipeIdA }] = await db('recipes').insert({
    name:          'Cache Test Pasta',
    source:        'chef_ai',
    meal_type:     'lunch',
    cuisine:       'italian',
    difficulty:    'easy',
    cook_time_mins: 20,
    servings:      2,
    is_public:     true,
  }).returning('id');

  await db('recipe_ingredients').insert([
    { recipe_id: recipeIdA, name: 'Spaghetti', quantity: 200, unit: 'g',   sort_order: 1 },
    { recipe_id: recipeIdA, name: 'Tomato',    quantity: 3,   unit: 'pcs', sort_order: 2 },
    { recipe_id: recipeIdA, name: 'Garlic',    quantity: 2,   unit: 'pcs', sort_order: 3 },
  ]);

  await db('recipe_steps').insert([
    { recipe_id: recipeIdA, step_number: 1, instruction: 'Boil water.' },
    { recipe_id: recipeIdA, step_number: 2, instruction: 'Cook pasta.' },
  ]);

  // Recipe B — same filters but only 1 ingredient matching pantry (lower overlap).
  [{ id: recipeIdB }] = await db('recipes').insert({
    name:          'Cache Test Risotto',
    source:        'chef_ai',
    meal_type:     'lunch',
    cuisine:       'italian',
    difficulty:    'easy',
    cook_time_mins: 30,
    servings:      4,
    is_public:     true,
  }).returning('id');

  await db('recipe_ingredients').insert([
    { recipe_id: recipeIdB, name: 'Arborio rice', quantity: 300, unit: 'g',  sort_order: 1 },
    { recipe_id: recipeIdB, name: 'Onion',        quantity: 1,   unit: 'pcs', sort_order: 2 },
  ]);
});

afterAll(async () => {
  // Clean up in dependency order.
  await db('recipe_steps').whereIn('recipe_id', [recipeIdA, recipeIdB]).del();
  await db('recipe_ingredients').whereIn('recipe_id', [recipeIdA, recipeIdB]).del();
  await db('recipes').whereIn('id', [recipeIdA, recipeIdB]).del();
  await db.destroy();
});

describe('findCachedRecipe', () => {
  it('returns null when a dietary preference is active', async () => {
    const result = await findCachedRecipe(
      db,
      { ...BASE_PARAMS, preferences: { vegetarian: true } },
      [],
    );
    expect(result).toBeNull();
  });

  it('returns null when gluten_free preference is active', async () => {
    const result = await findCachedRecipe(
      db,
      { ...BASE_PARAMS, preferences: { gluten_free: true } },
      [],
    );
    expect(result).toBeNull();
  });

  it('returns null when high_protein preference is active', async () => {
    const result = await findCachedRecipe(
      db,
      { ...BASE_PARAMS, preferences: { high_protein: true } },
      [],
    );
    expect(result).toBeNull();
  });

  it('returns null when no recipes match the filters', async () => {
    const result = await findCachedRecipe(
      db,
      { ...BASE_PARAMS, cuisine: 'NonExistentCuisine' },
      [],
    );
    expect(result).toBeNull();
  });

  it('returns null when meal_type does not match', async () => {
    const result = await findCachedRecipe(
      db,
      { ...BASE_PARAMS, mealType: 'Dinner' },
      [],
    );
    expect(result).toBeNull();
  });

  it('returns null when cookTime bucket excludes all candidates', async () => {
    // '1 hr+' maps to cook_time_mins >= 46; both test recipes are < 46.
    const result = await findCachedRecipe(
      db,
      { ...BASE_PARAMS, cookTime: '1 hr+' },
      [],
    );
    expect(result).toBeNull();
  });

  it('returns a recipe when filters match', async () => {
    const result = await findCachedRecipe(db, BASE_PARAMS, []);
    expect(result).not.toBeNull();
    expect(result.recipe.id).toBeDefined();
    expect(result.ingredients).toBeInstanceOf(Array);
    expect(result.steps).toBeInstanceOf(Array);
    expect(result.servings).toBe(BASE_PARAMS.servings);
  });

  it('ranks by pantry overlap — picks the recipe with more pantry matches', async () => {
    // Pantry includes Spaghetti, Tomato, Garlic → recipe A overlaps 3 items.
    // Recipe B has Arborio rice, Onion → overlaps 0 with this pantry.
    const pantry = [
      { name: 'Spaghetti' },
      { name: 'Tomato' },
      { name: 'Garlic' },
    ];
    const result = await findCachedRecipe(db, BASE_PARAMS, pantry);
    expect(result).not.toBeNull();
    expect(result.recipe.id).toBe(recipeIdA);
  });

  it('pantry matching is case-insensitive', async () => {
    const pantry = [{ name: 'SPAGHETTI' }, { name: 'tomato' }, { name: 'GARLIC' }];
    const result = await findCachedRecipe(db, BASE_PARAMS, pantry);
    expect(result).not.toBeNull();
    expect(result.recipe.id).toBe(recipeIdA);
  });

  it('scales ingredient quantities proportionally to requested servings', async () => {
    // BASE_PARAMS.servings = 2; recipe A stored with servings = 2 → scale = 1.
    const result = await findCachedRecipe(db, BASE_PARAMS, []);
    expect(result).not.toBeNull();
    const spaghetti = result.ingredients.find(i => i.name === 'Spaghetti');
    expect(spaghetti).toBeDefined();
    // 200g * (2/2) = 200g — no change.
    expect(spaghetti.quantity).toBe(200);
  });

  it('doubles quantities when requested servings is twice the stored value', async () => {
    // Request 4 servings; recipe A stored as 2 servings → scale = 2.
    const result = await findCachedRecipe(
      db,
      { ...BASE_PARAMS, servings: 4 },
      [],
    );
    expect(result).not.toBeNull();
    const spaghetti = result.ingredients.find(i => i.name === 'Spaghetti');
    expect(spaghetti.quantity).toBe(400); // 200 * 2
  });

  it('halves quantities when requested servings is half the stored value', async () => {
    // Request 1 serving; recipe A stored as 2 servings → scale = 0.5.
    const result = await findCachedRecipe(
      db,
      { ...BASE_PARAMS, servings: 1 },
      [],
    );
    expect(result).not.toBeNull();
    const spaghetti = result.ingredients.find(i => i.name === 'Spaghetti');
    expect(spaghetti.quantity).toBe(100); // 200 * 0.5
  });

  it('returns the user-requested servings value (not the stored servings)', async () => {
    const result = await findCachedRecipe(
      db,
      { ...BASE_PARAMS, servings: 6 },
      [],
    );
    expect(result.servings).toBe(6);
  });

  it('includes in_pantry flag on each ingredient', async () => {
    const pantry = [{ name: 'Spaghetti' }];
    const result = await findCachedRecipe(db, BASE_PARAMS, pantry);
    expect(result).not.toBeNull();
    const spaghetti = result.ingredients.find(i => i.name === 'Spaghetti');
    const tomato    = result.ingredients.find(i => i.name === 'Tomato');
    expect(spaghetti.in_pantry).toBe(true);
    expect(tomato.in_pantry).toBe(false);
  });

  it('includes recipe steps', async () => {
    const result = await findCachedRecipe(db, BASE_PARAMS, []);
    expect(result).not.toBeNull();
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps[0]).toHaveProperty('step_number');
    expect(result.steps[0]).toHaveProperty('instruction');
  });

  it('cuisine filter is case-insensitive', async () => {
    // Store "italian" (lowercase), filter with "Italian" (title case).
    const result = await findCachedRecipe(
      db,
      { ...BASE_PARAMS, cuisine: 'ITALIAN' },
      [],
    );
    expect(result).not.toBeNull();
  });

  it('skips cuisine filter when cuisine is empty string', async () => {
    // Empty cuisine → match any cuisine; should still find the Italian recipe.
    const result = await findCachedRecipe(
      db,
      { ...BASE_PARAMS, cuisine: '' },
      [],
    );
    expect(result).not.toBeNull();
  });

  it('picks recipe B when pantry only overlaps with recipe B ingredients', async () => {
    // Only 'Onion' in pantry → recipe B (has Onion) wins over recipe A (no Onion).
    const pantry = [{ name: 'Onion' }];
    const result = await findCachedRecipe(db, BASE_PARAMS, pantry);
    expect(result).not.toBeNull();
    expect(result.recipe.id).toBe(recipeIdB);
  });

  it('scales correctly for recipe B (stored as 4 servings)', async () => {
    // Request 2 servings; recipe B stored as 4 → scale = 0.5.
    const pantry = [{ name: 'Onion' }];
    const result = await findCachedRecipe(
      db,
      { ...BASE_PARAMS, servings: 2 },
      pantry,
    );
    expect(result).not.toBeNull();
    expect(result.recipe.id).toBe(recipeIdB);
    const rice = result.ingredients.find(i => i.name === 'Arborio rice');
    expect(rice.quantity).toBe(150); // 300 * (2/4) = 150
  });
});
