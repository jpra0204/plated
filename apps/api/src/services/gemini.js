import { GoogleGenAI } from '@google/genai';

// Status codes from the Gemini API that are safe to retry (transient failures).
const RETRIABLE_CODES = new Set([429, 503]);
const FALLBACK_MODEL = 'gemini-2.5-flash-lite';

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
 * @param {Array}  params.pantryItems        - User's active pantry items
 * @param {object} params.filters            - { mealType, cookTime, difficulty, cuisine, servings, notes }
 * @param {object} params.preferences        - { vegetarian, glutenFree, highProtein }
 * @param {string[]} params.previousRecipeIds - Recipe IDs already seen this session
 * @returns {Promise<object>} Parsed recipe JSON from Gemini
 */
export async function buildChefPrompt({ pantryItems, filters, preferences, previousRecipeIds = [] }) {
  const prompt = `
You are a recipe generator. Generate ONE recipe using primarily the ingredients listed.

PANTRY INGREDIENTS:
${pantryItems.map(i => `- ${i.name} (${i.quantity} ${i.unit})`).join('\n')}

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
