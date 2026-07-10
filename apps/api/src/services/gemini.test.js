import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock is hoisted by Vitest before imports — @google/genai is mocked before
// gemini.js is evaluated, so getModel() will receive the mock constructor.
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
}));

import { buildConceptPrompt, generateConcept } from './gemini.js';
import { GoogleGenAI } from '@google/genai';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SAMPLE_PANTRY = [
  { name: 'Eggs',    quantity: 6,   unit: 'pcs', days_until_expiry: 3    },
  { name: 'Spinach', quantity: 100, unit: 'g',   days_until_expiry: null },
  { name: 'Feta',    quantity: 200, unit: 'g',   days_until_expiry: 7    },
];

const SAMPLE_FILTERS = {
  mealType:   'Lunch',
  cookTime:   '30 min',
  difficulty: 'Easy',
  cuisine:    'Mediterranean',
  servings:   2,
  notes:      '',
};

const SAMPLE_PREFS = {
  vegetarian:  true,
  glutenFree:  false,
  highProtein: false,
};

// ── Test setup ────────────────────────────────────────────────────────────────

let mockGenContent;

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  mockGenContent = vi.fn();
  // Use a regular function (not arrow) so Vitest can call it as a constructor.
  GoogleGenAI.mockImplementation(function () {
    return { models: { generateContent: mockGenContent } };
  });
});

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
});

// ── buildConceptPrompt ────────────────────────────────────────────────────────

describe('buildConceptPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildConceptPrompt(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('includes all pantry item names', () => {
    const prompt = buildConceptPrompt(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);
    expect(prompt).toContain('Eggs');
    expect(prompt).toContain('Spinach');
    expect(prompt).toContain('Feta');
  });

  it('includes days_until_expiry when known', () => {
    const prompt = buildConceptPrompt(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);
    expect(prompt).toContain('expires in 3 days');
    expect(prompt).toContain('expires in 7 days');
  });

  it('uses singular "day" when days_until_expiry is 1', () => {
    const pantry = [{ name: 'Milk', quantity: 1, unit: 'L', days_until_expiry: 1 }];
    const prompt = buildConceptPrompt(pantry, SAMPLE_FILTERS, SAMPLE_PREFS);
    expect(prompt).toContain('expires in 1 day');
    expect(prompt).not.toContain('expires in 1 days');
  });

  it('omits expiry info when days_until_expiry is null', () => {
    const prompt = buildConceptPrompt(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);
    const lines = prompt.split('\n');
    const spinachLine = lines.find(l => l.includes('Spinach'));
    expect(spinachLine).toBeDefined();
    expect(spinachLine).not.toContain('expires');
  });

  it('includes filter values (mealType, cookTime, difficulty, servings)', () => {
    const prompt = buildConceptPrompt(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);
    expect(prompt).toContain('Lunch');
    expect(prompt).toContain('30 min');
    expect(prompt).toContain('Easy');
    expect(prompt).toContain('2');
  });

  it('includes cuisine when provided', () => {
    const prompt = buildConceptPrompt(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);
    expect(prompt).toContain('Mediterranean');
  });

  it('omits the cuisine line when cuisine is empty string', () => {
    const noC = { ...SAMPLE_FILTERS, cuisine: '' };
    const prompt = buildConceptPrompt(SAMPLE_PANTRY, noC, SAMPLE_PREFS);
    expect(prompt).not.toMatch(/Cuisine:/);
  });

  it('includes user notes when provided', () => {
    const withNotes = { ...SAMPLE_FILTERS, notes: 'Make it spicy' };
    const prompt = buildConceptPrompt(SAMPLE_PANTRY, withNotes, SAMPLE_PREFS);
    expect(prompt).toContain('Make it spicy');
  });

  it('includes the required JSON shape with name, cuisine, hero_ingredient', () => {
    const prompt = buildConceptPrompt(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);
    expect(prompt).toContain('"name"');
    expect(prompt).toContain('"cuisine"');
    expect(prompt).toContain('"hero_ingredient"');
  });

  it('instructs Gemini to respond ONLY with JSON', () => {
    const prompt = buildConceptPrompt(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);
    expect(prompt).toContain('ONLY');
    expect(prompt).toContain('JSON');
  });

  it('includes active vegetarian preference', () => {
    const prompt = buildConceptPrompt(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);
    expect(prompt.toLowerCase()).toContain('vegetarian');
  });

  it('does not mention inactive dietary preferences', () => {
    // glutenFree: false, highProtein: false in SAMPLE_PREFS
    const prompt = buildConceptPrompt(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);
    expect(prompt.toLowerCase()).not.toContain('gluten');
    expect(prompt.toLowerCase()).not.toContain('protein');
  });

  it('includes highProtein when active', () => {
    const prefs = { ...SAMPLE_PREFS, vegetarian: false, highProtein: true };
    const prompt = buildConceptPrompt(SAMPLE_PANTRY, SAMPLE_FILTERS, prefs);
    expect(prompt.toLowerCase()).toContain('protein');
  });
});

// ── generateConcept ───────────────────────────────────────────────────────────

describe('generateConcept', () => {
  it('returns { name, cuisine, hero_ingredient } on a clean JSON response', async () => {
    mockGenContent.mockResolvedValue({
      text: '{"name":"Greek Omelette","cuisine":"Greek","hero_ingredient":"Feta"}',
    });

    const result = await generateConcept(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);

    expect(result).toEqual({
      name:            'Greek Omelette',
      cuisine:         'Greek',
      hero_ingredient: 'Feta',
    });
  });

  it('tolerates JSON embedded in surrounding text', async () => {
    mockGenContent.mockResolvedValue({
      text: 'Here is your concept: {"name":"Shakshuka","cuisine":"Middle Eastern","hero_ingredient":"Eggs"} Enjoy!',
    });

    const result = await generateConcept(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);
    expect(result.name).toBe('Shakshuka');
    expect(result.cuisine).toBe('Middle Eastern');
    expect(result.hero_ingredient).toBe('Eggs');
  });

  it('extracts only the three expected fields even if Gemini returns extras', async () => {
    mockGenContent.mockResolvedValue({
      text: '{"name":"Salad","cuisine":"Italian","hero_ingredient":"Spinach","extra":"ignored"}',
    });

    const result = await generateConcept(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);
    expect(Object.keys(result)).toEqual(['name', 'cuisine', 'hero_ingredient']);
  });

  it('throws when Gemini response contains no parseable JSON', async () => {
    mockGenContent.mockResolvedValue({ text: 'Sorry, I cannot help with that.' });

    await expect(
      generateConcept(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS),
    ).rejects.toThrow('Gemini response contained no parseable JSON');
  });

  it('throws when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(
      generateConcept(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS),
    ).rejects.toThrow('GEMINI_API_KEY is not configured');
  });

  it('throws when GEMINI_API_KEY is the placeholder value', async () => {
    process.env.GEMINI_API_KEY = 'your-gemini-api-key';

    await expect(
      generateConcept(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS),
    ).rejects.toThrow('GEMINI_API_KEY is not configured');
  });

  it('calls Gemini exactly once per invocation (no spurious retries on success)', async () => {
    mockGenContent.mockResolvedValue({
      text: '{"name":"Pasta","cuisine":"Italian","hero_ingredient":"Tomatoes"}',
    });

    await generateConcept(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS);
    expect(mockGenContent).toHaveBeenCalledTimes(1);
  });

  it('propagates Gemini API errors', async () => {
    const apiError = Object.assign(new Error('API quota exceeded'), { status: 429 });
    // Mock three attempts failing (retry logic) plus the fallback, all fail.
    mockGenContent.mockRejectedValue(apiError);

    await expect(
      generateConcept(SAMPLE_PANTRY, SAMPLE_FILTERS, SAMPLE_PREFS),
    ).rejects.toThrow('API quota exceeded');
  });
});
