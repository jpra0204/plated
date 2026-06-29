import { GoogleGenAI } from '@google/genai';

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
  const response = await ai.models.generateContent({ model: modelName, contents: prompt });
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
  const response = await ai.models.generateContent({ model: modelName, contents: prompt });
  return extractJSON(response.text, true);
}
