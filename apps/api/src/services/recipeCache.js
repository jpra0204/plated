/**
 * recipeCache — cache-first recipe lookup for the Chef generation flow.
 *
 * `findCachedRecipe` is the main export. It queries the `recipes` table for
 * candidates matching meal_type, cook_time_mins (range), difficulty, and
 * cuisine, then ranks results by pantry-ingredient overlap, and scales the
 * winning recipe's ingredient quantities to the user's requested servings.
 *
 * The function accepts `db` (a Knex instance) as its first argument so it
 * can be injected in tests without module-level mocking.
 */

/**
 * Map the frontend cookTime string to a cook_time_mins integer range.
 * The frontend uses a fixed three-option chip group; any unknown value
 * is treated as an open range (see assumption below).
 *
 * @param {string} cookTime  e.g. 'Under 15 min' | '30 min' | '1 hr+'
 * @returns {{ min?: number, max?: number }}
 */
export function parseCookTimeRange(cookTime) {
  switch (cookTime) {
    case 'Under 15 min':
      return { max: 14 };
    case '30 min':
      return { min: 15, max: 45 };
    case '1 hr+':
      return { min: 46 };
    default:
      // [ASSUMPTION]: Unknown cookTime strings (or null/undefined) are treated
      // as an open range — no cook_time_mins filter is applied. This keeps the
      // lookup permissive rather than returning zero candidates for
      // unrecognised values (e.g. if new options are added to the frontend
      // before this map is updated).
      return {};
  }
}

/**
 * Look up the best matching cached recipe for the given Chef filters.
 *
 * Returns null (cache miss) when:
 *  - Any dietary preference is active (vegetarian / gluten_free / high_protein).
 *  - No public recipes match the filter combination.
 *
 * On a hit, ingredient quantities are scaled proportionally to the user's
 * requested servings before being returned. The in-DB recipe row is NOT
 * mutated; scaling is applied only to the returned payload.
 *
 * @param {import('knex').Knex} db
 * @param {object}       params
 * @param {string}       params.mealType    - e.g. 'Lunch'
 * @param {string}       params.cookTime    - frontend chip value, e.g. '30 min'
 * @param {string}       params.difficulty  - e.g. 'Easy'
 * @param {string|null}  params.cuisine     - e.g. 'French', or '' / null for any
 * @param {number}       params.servings    - user-requested servings (for scaling)
 * @param {object}       params.preferences - { vegetarian, gluten_free, high_protein, ... }
 * @param {Array<{name: string}>} pantryItems  user's active pantry items
 * @returns {Promise<{
 *   recipe: object,
 *   ingredients: Array<{id: string, name: string, quantity: number|null, unit: string|null, in_pantry: boolean}>,
 *   steps: Array<{id: string, step_number: number, instruction: string}>,
 *   servings: number
 * }|null>}
 */
export async function findCachedRecipe(
  db,
  { mealType, cookTime, difficulty, cuisine, servings, preferences },
  pantryItems,
) {
  // [ASSUMPTION]: When any dietary preference is active (vegetarian,
  // gluten_free, or high_protein), the cache is bypassed and Gemini is always
  // called. The `recipes` table carries no dietary-compliance flags, so we
  // cannot verify that a cached recipe satisfies the user's current
  // preferences. Adding dietary_tags to the `recipes` table would unlock
  // caching for preference users; that requires a schema change deferred to a
  // future step.
  const prefs = preferences ?? {};
  if (prefs.vegetarian || prefs.gluten_free || prefs.high_protein) {
    return null;
  }

  const range = parseCookTimeRange(cookTime);

  // Base query — public recipes only; case-insensitive text matches so that
  // filter chips ('Easy') align with whatever case Gemini stored ('easy').
  let query = db('recipes')
    .where({ is_public: true })
    .whereRaw('LOWER(meal_type) = ?', [(mealType ?? '').toLowerCase()])
    .whereRaw('LOWER(difficulty) = ?', [(difficulty ?? '').toLowerCase()]);

  // cuisine is optional: '' or null means "any cuisine — don't filter".
  if (cuisine && cuisine.trim() !== '') {
    query = query.whereRaw('LOWER(cuisine) = ?', [cuisine.toLowerCase()]);
  }

  // cook_time_mins range (both bounds are optional — see parseCookTimeRange).
  if (range.min != null) query = query.where('cook_time_mins', '>=', range.min);
  if (range.max != null) query = query.where('cook_time_mins', '<=', range.max);

  const candidates = await query.select(
    'id', 'name', 'source', 'meal_type', 'cuisine', 'difficulty',
    'cook_time_mins', 'servings', 'is_public', 'image_url', 'created_at',
  );

  if (candidates.length === 0) return null;

  // Fetch recipe_ingredients for all candidates in a single query.
  const ids = candidates.map(r => r.id);
  const allIngredients = await db('recipe_ingredients')
    .whereIn('recipe_id', ids)
    .orderBy('sort_order')
    .select('recipe_id', 'id', 'name', 'quantity', 'unit', 'sort_order');

  // Group ingredients by recipe_id for O(1) access.
  /** @type {Record<string, Array>} */
  const ingByRecipe = {};
  for (const ing of allIngredients) {
    (ingByRecipe[ing.recipe_id] ??= []).push(ing);
  }

  // Rank candidates by pantry-ingredient overlap (count of recipe ingredient
  // names that exist in the user's current pantry, case-insensitive).
  // Ties are resolved by taking the first result (candidates preserve
  // query-result order — no further tie-break is needed per the spec).
  const pantryNames = new Set(pantryItems.map(i => i.name.toLowerCase().trim()));

  let best = null;
  let bestScore = -1;

  for (const recipe of candidates) {
    const ings = ingByRecipe[recipe.id] ?? [];
    const score = ings.filter(
      ing => pantryNames.has(ing.name.toLowerCase().trim()),
    ).length;

    if (score > bestScore) {
      bestScore = score;
      best = { recipe, ingredients: ings };
    }
  }

  if (!best) return null;

  // Scale ingredient quantities proportionally to the user's requested servings.
  // [ASSUMPTION]: Scaling is purely linear (multiply by servings/storedServings).
  // A recipe stored with 0 servings (data anomaly) is left unscaled (factor=1)
  // to avoid division by zero.
  const storedServings = best.recipe.servings ?? 0;
  const scaleFactor = storedServings > 0 ? servings / storedServings : 1;

  const scaledIngredients = best.ingredients.map(ing => ({
    id:        ing.id,
    name:      ing.name,
    quantity:  ing.quantity != null
      ? Math.round(ing.quantity * scaleFactor * 1000) / 1000
      : null,
    unit:       ing.unit,
    sort_order: ing.sort_order,
    in_pantry:  pantryNames.has(ing.name.toLowerCase().trim()),
  }));

  // Fetch steps for the winning recipe (not batched earlier to avoid
  // loading steps for every candidate).
  const steps = await db('recipe_steps')
    .where({ recipe_id: best.recipe.id })
    .orderBy('step_number')
    .select('id', 'step_number', 'instruction');

  return {
    recipe:      best.recipe,
    ingredients: scaledIngredients,
    steps,
    servings,   // user-requested value (not the stored servings)
  };
}
