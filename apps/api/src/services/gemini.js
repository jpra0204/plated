import { GoogleGenAI } from '@google/genai';

// Status codes from the Gemini API that are safe to retry (transient failures).
const RETRIABLE_CODES = new Set([429, 503]);
const FALLBACK_MODEL = 'gemini-2.5-flash-lite';

// [ASSUMPTION]: gemini-2.0-flash-preview-image-generation is the correct model
// name for Gemini's image-output generation via @google/genai (API key client).
// Imagen models (imagen-4.0-generate-001) require Vertex AI context and are NOT
// used here. If the model name changes or a GA model is released, update this
// constant only.
const IMAGE_GEN_MODEL = 'gemini-2.0-flash-preview-image-generation';

/** Maximum ms to wait for image generation before treating it as failed. */
const IMAGE_TIMEOUT_MS = 10_000;

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const ai = new GoogleGenAI({ apiKey });
  return { ai, modelName: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash' };
}

function extractJSON(text, isArray = false) {
  const pattern = isArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = text.match(pattern);
  if (!match) throw new Error('Gemini response contained no parseable JSON');
  return JSON.parse(match[0]);
}

/**
 * Call ai.models.generateContent with up to `retries` retries on transient
 * errors, then fall back to FALLBACK_MODEL if the primary model is still
 * unavailable. Delays between attempts: 1 s, 2 s (linear backoff).
 */
async function generateContent(ai, model, contents) {
  let lastErr;

  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 1000));
    try {
      return await ai.models.generateContent({ model, contents });
    } catch (err) {
      lastErr = err;
      if (!RETRIABLE_CODES.has(err.status ?? err.statusCode)) throw err;
      console.warn(`[gemini] ${model} attempt ${attempt + 1} failed (${err.status}), retrying…`);
    }
  }

  // Primary model exhausted — try fallback once if it's a different model.
  if (model !== FALLBACK_MODEL) {
    console.warn(`[gemini] falling back to ${FALLBACK_MODEL}`);
    return ai.models.generateContent({ model: FALLBACK_MODEL, contents });
  }

  throw lastErr;
}

/**
 * Build and send the Chef generation prompt.
 *
 * @param {object} params
 * @param {Array}  params.pantryItems        - User's active pantry items; each item includes
 *                                             { name, quantity, unit, category, expiry_date,
 *                                               days_until_expiry: number|null } where
 *                                             days_until_expiry is null when expiry is unknown
 * @param {object} params.filters            - { mealType, cookTime, difficulty, cuisine, servings, notes }
 * @param {object} params.preferences        - { vegetarian, glutenFree, highProtein }
 * @param {string[]} params.previousRecipeIds - Recipe IDs already seen this session
 * @param {{ name: string, cuisine: string, hero_ingredient: string }|null} [params.concept]
 *   Optional concept from generateConcept(); when provided, constrains the recipe
 *   to stay consistent with the chosen name/cuisine/hero_ingredient.
 * @returns {Promise<object>} Parsed recipe JSON from Gemini
 */
export async function buildChefPrompt({ pantryItems, filters, preferences, previousRecipeIds = [], concept = null }) {
  const prompt = `
You are a recipe generator. Generate ONE recipe using primarily the ingredients listed.

PANTRY INGREDIENTS:
${pantryItems.map(i => `- ${i.name} (${i.quantity} ${i.unit}${i.days_until_expiry != null ? `, expires in ${i.days_until_expiry} day${i.days_until_expiry === 1 ? '' : 's'}` : ''})`).join('\n')}
${
  // TODO: Pablo to provide freshness-weighting prompt language
  // days_until_expiry is now available per pantry item above (null when unknown).
  // When ready, add Gemini instructions here for how to prioritise
  // ingredients closer to expiry when selecting what to cook.
  ''
}
REQUIREMENTS:
- Meal type: ${filters.mealType}
- Cook time: ${filters.cookTime}
- Difficulty: ${filters.difficulty}
${filters.cuisine ? `- Cuisine: ${filters.cuisine}` : ''}
- Servings: ${filters.servings}
${filters.notes ? `- User notes: ${filters.notes}` : ''}
${concept ? `
RECIPE CONCEPT (keep the full recipe consistent with this):
- Name: ${concept.name}
- Cuisine: ${concept.cuisine}
- Hero ingredient: ${concept.hero_ingredient}
` : ''}
DIETARY PREFERENCES (apply strictly):
${preferences.vegetarian ? '- Vegetarian: no meat or fish' : ''}
${preferences.glutenFree ? '- Gluten-free: no gluten-containing ingredients' : ''}
${preferences.highProtein ? '- High protein: prioritise protein-rich ingredients' : ''}

${previousRecipeIds.length ? `DO NOT generate any of these recipes again (IDs already seen this session): ${previousRecipeIds.join(', ')}` : ''}

Respond ONLY with a valid JSON object in this exact shape:
{
  "name": "Recipe Name",
  "cook_time_mins": 30,
  "difficulty": "easy",
  "servings": 2,
  "cuisine": "Mediterranean",
  "ingredients": [
    { "name": "Tomatoes", "quantity": 3, "unit": "pcs", "in_pantry": true },
    { "name": "Cumin", "quantity": 1, "unit": "tsp", "in_pantry": false }
  ],
  "steps": [
    { "step_number": 1, "instruction": "Heat olive oil in a pan..." }
  ]
}
`.trim();

  const { ai, modelName } = getModel();
  const response = await generateContent(ai, modelName, prompt);
  return extractJSON(response.text, false);
}

/**
 * Build the concept extraction prompt.
 * Pure function — returns a prompt string asking Gemini to respond with ONLY
 * a small JSON object: { name, cuisine, hero_ingredient }.
 *
 * @param {Array}  pantryItems  - User's active pantry items; each item includes
 *                                { name, quantity, unit, days_until_expiry: number|null }
 * @param {object} filters      - { mealType, cookTime, difficulty, cuisine, servings, notes }
 * @param {object} preferences  - { vegetarian, glutenFree, highProtein }
 * @returns {string} The prompt string
 */
export function buildConceptPrompt(pantryItems, filters, preferences) {
  return `
You are a recipe concept generator. Choose ONE recipe concept that suits the ingredients and requirements below.

PANTRY INGREDIENTS:
${pantryItems.map(i => `- ${i.name} (${i.quantity} ${i.unit}${i.days_until_expiry != null ? `, expires in ${i.days_until_expiry} day${i.days_until_expiry === 1 ? '' : 's'}` : ''})`).join('\n')}

REQUIREMENTS:
- Meal type: ${filters.mealType}
- Cook time: ${filters.cookTime}
- Difficulty: ${filters.difficulty}
${filters.cuisine ? `- Cuisine: ${filters.cuisine}` : ''}
- Servings: ${filters.servings}
${filters.notes ? `- User notes: ${filters.notes}` : ''}

DIETARY PREFERENCES (apply strictly):
${preferences.vegetarian ? '- Vegetarian: no meat or fish' : ''}
${preferences.glutenFree ? '- Gluten-free: no gluten-containing ingredients' : ''}
${preferences.highProtein ? '- High protein: prioritise protein-rich ingredients' : ''}

Respond ONLY with a valid JSON object (no explanation, no markdown fences):
{
  "name": "Recipe Name",
  "cuisine": "Mediterranean",
  "hero_ingredient": "Chickpeas"
}
`.trim();
}

/**
 * Extract a recipe concept from Gemini: name, cuisine, and hero ingredient.
 * Lightweight / fast — used as the first call in the two-call generation flow.
 * Uses the same model config and retry logic as buildChefPrompt.
 *
 * @param {Array}  pantryItems  - User's active pantry items
 * @param {object} filters      - { mealType, cookTime, difficulty, cuisine, servings, notes }
 * @param {object} preferences  - { vegetarian, glutenFree, highProtein }
 * @returns {Promise<{ name: string, cuisine: string, hero_ingredient: string }>}
 */
export async function generateConcept(pantryItems, filters, preferences) {
  const prompt = buildConceptPrompt(pantryItems, filters, preferences);
  const { ai, modelName } = getModel();
  const response = await generateContent(ai, modelName, prompt);
  const parsed = extractJSON(response.text, false);
  return {
    name: parsed.name,
    cuisine: parsed.cuisine,
    hero_ingredient: parsed.hero_ingredient,
  };
}

/**
 * Generate a realistic food photo for a recipe concept using Gemini's image
 * output model. Never throws — returns null on any failure or timeout so that
 * a failed image never blocks recipe generation.
 *
 * @param {{ name: string, cuisine: string, hero_ingredient: string }} concept
 * @returns {Promise<string|null>} Base64-encoded image bytes (no data-URI prefix) or null.
 */
export async function generateRecipeImage(concept) {
  try {
    const { ai } = getModel();

    const prompt = `A realistic, appetizing food photo of ${concept.name}, a ${concept.cuisine} dish featuring ${concept.hero_ingredient}. Professional food photography, natural lighting, close-up.`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Image generation timed out')), IMAGE_TIMEOUT_MS)
    );

    // [ASSUMPTION]: Image generation via generateContent + responseModalities is
    // the correct API for non-Vertex @google/genai clients. The response carries
    // image data in candidates[0].content.parts[].inlineData.data (base64).
    const genPromise = ai.models.generateContent({
      model: IMAGE_GEN_MODEL,
      contents: prompt,
      config: { responseModalities: ['IMAGE'] },
    });

    const response = await Promise.race([genPromise, timeoutPromise]);

    const parts = response?.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return part.inlineData.data;
      }
    }

    console.warn('[gemini] generateRecipeImage: response contained no image data');
    return null;
  } catch (err) {
    console.error('[gemini] generateRecipeImage failed:', err?.message ?? err);
    return null;
  }
}

/**
 * Parse a voice transcript into structured pantry items via Gemini.
 *
 * @param {string} transcript - Raw transcript from Web Speech API
 * @returns {Promise<Array<{name: string, quantity: number, unit: string}>>}
 */
export async function buildVoiceParsePrompt(transcript) {
  const prompt = `
Parse this spoken ingredient list into structured JSON.
Infer quantities and units from context (e.g. "6 eggs" → pcs, "500g of rice" → g).
If unit cannot be inferred, default to "g" for solids, "ml" for liquids.

Transcript: "${transcript}"

Respond ONLY with a JSON array:
[
  { "name": "Eggs", "quantity": 6, "unit": "pcs" },
  { "name": "Rice", "quantity": 500, "unit": "g" }
]
`.trim();

  const { ai, modelName } = getModel();
  const response = await generateContent(ai, modelName, prompt);
  return extractJSON(response.text, true);
}

/**
 * Parse a natural-language pantry update (e.g. "used 2 eggs and half the rice")
 * against the user's current pantry and return quantity deltas.
 *
 * @param {string} transcript
 * @param {Array<{id: number, name: string, quantity: number, unit: string}>} pantryItems
 * @returns {Promise<Array<{id: number, name: string, newQuantity: number, unit: string}>>}
 */
export async function parseVoiceSync(transcript, pantryItems) {
  const pantryList = pantryItems
    .map(i => `- id:${i.id} "${i.name}" current: ${i.quantity} ${i.unit}`)
    .join('\n');

  const prompt = `
The user has spoken a pantry update after cooking. Parse their statement and return
new quantities for the mentioned pantry items.

Current pantry:
${pantryList}

User said: "${transcript}"

Rules:
- Natural language: "used 2 eggs" → subtract 2 from eggs current quantity
- "half the X" → subtract half of X's current quantity, rounded to nearest step
- Command style: "eggs minus 2, rice minus 100g" → explicit subtraction per item
- Only include items actually mentioned — omit everything else
- newQuantity must be >= 0 (clamp to 0 if calculation would go negative)
- Match item names case-insensitively; fuzzy match is fine
- Use the item id and unit from the pantry list above

Respond ONLY with a JSON array (empty array if nothing could be parsed):
[
  { "id": 1, "name": "Eggs", "newQuantity": 4, "unit": "pcs" }
]
`.trim();

  const { ai, modelName } = getModel();
  const response = await generateContent(ai, modelName, prompt);
  return extractJSON(response.text, true);
}
