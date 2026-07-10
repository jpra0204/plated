import { vi, describe, it, expect, beforeEach } from 'vitest';

// vi.hoisted() runs before any vi.mock() factory, so these refs are available
// inside the factory closures below.
const {
  mockSave,
  mockFile,
  mockBucket,
  mockStorageConstructor,
  mockToBuffer,
  mockWebp,
  mockSharp,
} = vi.hoisted(() => {
  const mockSave = vi.fn().mockResolvedValue(undefined);
  const mockFile = vi.fn(() => ({ save: mockSave }));
  const mockBucket = vi.fn(() => ({ file: mockFile }));
  // Must use a regular function (not an arrow function) so it can be called
  // with `new Storage()` — arrow functions cannot be constructors.
  const mockStorageConstructor = vi.fn(function () { return { bucket: mockBucket }; });

  const mockToBuffer = vi.fn().mockResolvedValue(Buffer.from('fake-webp-data'));
  const mockWebp = vi.fn(() => ({ toBuffer: mockToBuffer }));
  const mockSharp = vi.fn(() => ({ webp: mockWebp }));

  return {
    mockSave,
    mockFile,
    mockBucket,
    mockStorageConstructor,
    mockToBuffer,
    mockWebp,
    mockSharp,
  };
});

vi.mock('@google-cloud/storage', () => ({
  Storage: mockStorageConstructor,
}));

vi.mock('sharp', () => ({
  default: mockSharp,
}));

import { uploadRecipeImage } from './imageStorage.js';

const RECIPE_ID = 'abc-123';
const FAKE_BASE64 = Buffer.from('fake-image-bytes').toString('base64');
const EXPECTED_URL =
  'https://storage.googleapis.com/plated-recipe-images/recipes/abc-123.webp';

beforeEach(() => {
  vi.clearAllMocks();
  // Restore default success behaviour before each test.
  mockSave.mockResolvedValue(undefined);
  mockToBuffer.mockResolvedValue(Buffer.from('fake-webp-data'));
});

describe('uploadRecipeImage', () => {
  it('converts the input to WebP via sharp', async () => {
    await uploadRecipeImage(RECIPE_ID, FAKE_BASE64);

    const expectedInputBuffer = Buffer.from(FAKE_BASE64, 'base64');
    expect(mockSharp).toHaveBeenCalledWith(expect.any(Buffer));
    // Verify the buffer passed to sharp is the decoded base64 data.
    const actualBuffer = mockSharp.mock.calls[0][0];
    expect(actualBuffer).toEqual(expectedInputBuffer);

    expect(mockWebp).toHaveBeenCalledOnce();
    expect(mockToBuffer).toHaveBeenCalledOnce();
  });

  it('uploads to the correct GCS path — recipes/{recipeId}.webp', async () => {
    await uploadRecipeImage(RECIPE_ID, FAKE_BASE64);

    expect(mockBucket).toHaveBeenCalledWith('plated-recipe-images');
    expect(mockFile).toHaveBeenCalledWith(`recipes/${RECIPE_ID}.webp`);
  });

  it('saves with WebP content-type and immutable cache-control header', async () => {
    await uploadRecipeImage(RECIPE_ID, FAKE_BASE64);

    expect(mockSave).toHaveBeenCalledOnce();
    const [, saveOptions] = mockSave.mock.calls[0];
    expect(saveOptions.metadata.contentType).toBe('image/webp');
    expect(saveOptions.metadata.cacheControl).toBe(
      'public, max-age=31536000, immutable',
    );
  });

  it('returns the correct public URL on success', async () => {
    const result = await uploadRecipeImage(RECIPE_ID, FAKE_BASE64);
    expect(result).toBe(EXPECTED_URL);
  });

  it('returns null when sharp throws (WebP conversion failure)', async () => {
    mockSharp.mockImplementationOnce(() => {
      throw new Error('sharp conversion error');
    });

    const result = await uploadRecipeImage(RECIPE_ID, FAKE_BASE64);
    expect(result).toBeNull();
  });

  it('returns null when GCS save fails', async () => {
    mockSave.mockRejectedValueOnce(new Error('GCS upload failed'));

    const result = await uploadRecipeImage(RECIPE_ID, FAKE_BASE64);
    expect(result).toBeNull();
  });

  it('does not throw on failure — always resolves', async () => {
    mockSave.mockRejectedValueOnce(new Error('network error'));

    await expect(uploadRecipeImage(RECIPE_ID, FAKE_BASE64)).resolves.toBeNull();
  });

  it('logs an error message on failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSave.mockRejectedValueOnce(new Error('GCS upload failed'));

    await uploadRecipeImage(RECIPE_ID, FAKE_BASE64);

    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(consoleSpy.mock.calls[0][0]).toMatch(/\[imageStorage\]/);
    consoleSpy.mockRestore();
  });

  it('uses a different recipeId correctly in the path and URL', async () => {
    const otherId = 'xyz-789';
    const result = await uploadRecipeImage(otherId, FAKE_BASE64);

    expect(mockFile).toHaveBeenCalledWith(`recipes/${otherId}.webp`);
    expect(result).toBe(
      `https://storage.googleapis.com/plated-recipe-images/recipes/${otherId}.webp`,
    );
  });
});
