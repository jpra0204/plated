/**
 * Gemini service — wraps Google Vertex AI (Gemini) calls.
 *
 * Two exported prompt-builders let callers construct the correct prompt for
 * each use-case, keeping the LLM interaction isolated in one place.
 *
 * TODO: replace stubs with real VertexAI calls once credentials are wired up.
 *
 * import { VertexAI } from '@google-cloud/vertexai';
 *
 * const vertexAI = new VertexAI({
 *   project: process.env.GOOGLE_CLOUD_PROJECT,
 *   location: process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1',
 * });
 *
 * const model = vertexAI.getGenerativeModel({
 *   model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-exp',
 * });
 */

/**
 * Build and send a "chef" prompt — given a user message and their pantry,
 * ask Gemini to suggest recipes or answer cooking questions.
 *
 * @param {object} params
 * @param {string} params.message         - The user's chat message
 * @param {Array}  params.pantryItems     - Current pantry items for the user
 * @param {Array}  [params.history]       - Prior conversation turns (optional)
 * @returns {Promise<string>} The model's text reply
 */
export async function buildChefPrompt({ message, pantryItems, history = [] }) {
  // TODO: implement real Gemini call
  //
  // const systemInstruction = `You are Plated, a friendly AI chef assistant.
  // The user's current pantry contains: ${JSON.stringify(pantryItems)}.
  // Suggest recipes they can make and answer cooking questions conversationally.`;
  //
  // const result = await model.generateContent({
  //   systemInstruction,
  //   contents: [
  //     ...history,
  //     { role: 'user', parts: [{ text: message }] },
  //   ],
  // });
  // return result.response.candidates[0].content.parts[0].text;

  void message;
  void pantryItems;
  void history;
  return '[buildChefPrompt] stub — not yet implemented';
}

/**
 * Build and send a "voice parse" prompt — given a raw voice transcript,
 * ask Gemini to extract structured pantry items from natural language.
 *
 * @param {object} params
 * @param {string} params.transcript  - Raw transcript from speech recognition
 * @returns {Promise<Array<{name: string, quantity: number|null, unit: string|null}>>}
 */
export async function buildVoiceParsePrompt({ transcript }) {
  // TODO: implement real Gemini call
  //
  // const prompt = `Extract all food/ingredient mentions from this transcript and
  // return a JSON array of objects with keys: name, quantity (number or null),
  // unit (string or null). Transcript: "${transcript}"`;
  //
  // const result = await model.generateContent(prompt);
  // const text = result.response.candidates[0].content.parts[0].text;
  // return JSON.parse(text);

  void transcript;
  return [];
}
