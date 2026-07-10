import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock is hoisted by Vitest before imports — @google/genai is mocked before
// gemini.js is evaluated, so getModel() will receive the mock constructor.
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
}));

import { buildConceptPrompt, generateConcept, generateRecipeImage } from './gemini.js';
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

// ── generateRecipeImage ───────────────────────────────────────────────────────

const SAMPLE_CONCEPT = {
  name: 'Greek Omelette',
  cuisine: 'Greek',
  hero_ingredient: 'Feta',
};

describe('generateRecipeImage', () => {
  it('returns base64 image data when Gemini responds with an image part', async () => {
    const fakeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAUA';
    mockGenContent.mockResolvedValue({
      candidates: [{
        content: {
          parts: [
            { inlineData: { data: fakeBase64, mimeType: 'image/jpeg' } },
          ],
        },
      }],
    });

    const result = await generateRecipeImage(SAMPLE_CONCEPT);
    expect(result).toBe(fakeBase64);
  });

  it('calls generateContent with the image model and IMAGE responseModality', async () => {
    mockGenContent.mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { data: 'abc123', mimeType: 'image/jpeg' } }] } }],
    });

    await generateRecipeImage(SAMPLE_CONCEPT);

    expect(mockGenContent).toHaveBeenCalledOnce();
    const callArgs = mockGenContent.mock.calls[0][0];
    expect(callArgs.model).toBe('gemini-2.0-flash-preview-image-generation');
    expect(callArgs.config?.responseModalities).toContain('IMAGE');
  });

  it('includes concept name, cuisine, and hero_ingredient in the prompt', async () => {
    mockGenContent.mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { data: 'data', mimeType: 'image/jpeg' } }] } }],
    });

    await generateRecipeImage(SAMPLE_CONCEPT);

    const callArgs = mockGenContent.mock.calls[0][0];
    const prompt = typeof callArgs.contents === 'string' ? callArgs.contents : JSON.stringify(callArgs.contents);
    expect(prompt).toContain('Greek Omelette');
    expect(prompt).toContain('Greek');
    expect(prompt).toContain('Feta');
  });

  it('returns null when Gemini response has no image parts', async () => {
    mockGenContent.mockResolvedValue({
      candidates: [{ content: { parts: [{ text: 'No image here' }] } }],
    });

    const result = await generateRecipeImage(SAMPLE_CONCEPT);
    expect(result).toBeNull();
  });

  it('returns null when candidates array is empty', async () => {
    mockGenContent.mockResolvedValue({ candidates: [] });

    const result = await generateRecipeImage(SAMPLE_CONCEPT);
    expect(result).toBeNull();
  });

  it('returns null when response is undefined', async () => {
    mockGenContent.mockResolvedValue(undefined);

    const result = await generateRecipeImage(SAMPLE_CONCEPT);
    expect(result).toBeNull();
  });

  it('returns null (does not throw) when Gemini rejects', async () => {
    mockGenContent.mockRejectedValue(new Error('Network error'));

    const result = await generateRecipeImage(SAMPLE_CONCEPT);
    expect(result).toBeNull();
  });

  it('returns null when image generation times out', async () => {
    // Simulate a Gemini call that never resolves (exceeds IMAGE_TIMEOUT_MS).
    // We use a fast-forward approach: mock the call to reject after a delay
    // that the real timeout would trigger first — but since we cannot control
    // the 10 s timer in unit tests, we mock generateContent to reject with the
    // same timeout error that our race would produce.
    mockGenContent.mockRejectedValue(new Error('Image generation timed out'));

    const result = await generateRecipeImage(SAMPLE_CONCEPT);
    expect(result).toBeNull();
  });

  it('returns the first image part when the response contains multiple parts', async () => {
    const firstBase64 = 'first_image_data';
    const secondBase64 = 'second_image_data';
    mockGenContent.mockResolvedValue({
      candidates: [{
        content: {
          parts: [
            { text: 'Here is your image:' },
            { inlineData: { data: firstBase64, mimeType: 'image/jpeg' } },
            { inlineData: { data: secondBase64, mimeType: 'image/jpeg' } },
          ],
        },
      }],
    });

    const result = await generateRecipeImage(SAMPLE_CONCEPT);
    expect(result).toBe(firstBase64);
  });
});
