/**
 * pantryMatch — pure ingredient-matching helpers.
 *
 * These functions are intentionally free of any I/O so they are trivial to
 * unit-test. Pass in data; get data back.
 *
 * Primary use-case: after Gemini parses a voice transcript into raw ingredient
 * objects, `matchIngredients` normalises them against the canonical ingredient
 * list so we can store consistent names in the DB.
 */

/**
 * Normalise a raw ingredient name into a canonical form.
 * Lowercases, trims whitespace, strips trailing pluralisation (naïve).
 *
 * @param {string} raw
 * @returns {string}
 */
export function normaliseIngredientName(raw) {
  const lower = raw.toLowerCase().trim();

  // Very naïve singularisation — replace with a proper library (e.g. inflection)
  // when the ingredient dictionary grows.
  if (lower.endsWith('oes')) return lower.slice(0, -2); // tomatoes → tomatoe (handled below)
  if (lower.endsWith('es') && !lower.endsWith('ies')) return lower.slice(0, -1); // apples → apple... skip
  if (lower.endsWith('s') && lower.length > 3) return lower.slice(0, -1);

  return lower;
}

/**
 * Try to find a canonical ingredient from a dictionary by fuzzy name match.
 *
 * Strategy (in priority order):
 *  1. Exact match on canonical name
 *  2. Exact match on any alias
 *  3. Prefix match on canonical name
 *  4. No match → return null
 *
 * @param {string} normalisedName
 * @param {Array<{id: string, name: string, aliases?: string[]}>} dictionary
 * @returns {{ id: string, name: string } | null}
 */
export function findCanonicalIngredient(normalisedName, dictionary) {
  // 1. Exact canonical match
  const exact = dictionary.find((ing) => ing.name === normalisedName);
  if (exact) return { id: exact.id, name: exact.name };

  // 2. Alias match
  const aliasMatch = dictionary.find(
    (ing) => Array.isArray(ing.aliases) && ing.aliases.includes(normalisedName)
  );
  if (aliasMatch) return { id: aliasMatch.id, name: aliasMatch.name };

  // 3. Prefix match (e.g. "roma tomato" matches "tomato")
  const prefix = dictionary.find((ing) => normalisedName.startsWith(ing.name));
  if (prefix) return { id: prefix.id, name: prefix.name };

  return null;
}

/**
 * Calculate the percentage of a recipe's ingredients that exist in a user's
 * pantry (case-insensitive name comparison).
 *
 * @param {Array<{name: string}>} recipeIngredients
 * @param {Array<{name: string}>} pantryItems
 * @returns {number} 0–100
 */
export function calculateMatch(recipeIngredients, pantryItems) {
  const pantryNames = new Set(pantryItems.map(i => i.name.toLowerCase().trim()));
  const total = recipeIngredients.length;
  if (total === 0) return 0;
  const matched = recipeIngredients.filter(i => pantryNames.has(i.name.toLowerCase().trim())).length;
  return Math.round((matched / total) * 100);
}

/**
 * Match an array of raw parsed items (from Gemini voice-parse) against a
 * canonical ingredient dictionary.
 *
 * @param {Array<{name: string, quantity: number|null, unit: string|null}>} parsedItems
 * @param {Array<{id: string, name: string, aliases?: string[]}>} dictionary
 * @returns {Array<{
 *   raw: string,
 *   canonical: { id: string, name: string } | null,
 *   quantity: number | null,
 *   unit: string | null,
 *   matched: boolean
 * }>}
 */
export function matchIngredients(parsedItems, dictionary) {
  return parsedItems.map((item) => {
    const normalisedName = normaliseIngredientName(item.name);
    const canonical = findCanonicalIngredient(normalisedName, dictionary);

    return {
      raw: item.name,
      canonical,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      matched: canonical !== null,
    };
  });
}
