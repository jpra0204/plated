/**
 * Voice service — parses a Web Speech API transcript into structured pantry items.
 *
 * Used by POST /api/v1/pantry/voice.
 * Delegates the NLP work to Gemini via buildVoiceParsePrompt, then resolves
 * each returned item against the ingredient catalogue via pantryMatch.
 */

import { buildVoiceParsePrompt } from './gemini.js';
import { matchIngredients } from './pantryMatch.js';

/**
 * Parse a raw voice transcript into structured, catalogue-matched pantry items.
 *
 * @param {string} transcript - Raw transcript from Web Speech API
 * @param {Array}  dictionary - Ingredient catalogue rows from DB (for matching)
 * @returns {Promise<Array<{name, quantity, unit, ingredientId|null}>>}
 */
export async function parseTranscript(transcript, dictionary = []) {
  const parsed = await buildVoiceParsePrompt(transcript);
  if (!parsed.length) return [];
  return matchIngredients(parsed, dictionary);
}
