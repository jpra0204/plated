import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';

const BUCKET_NAME = 'plated-recipe-images';
const PUBLIC_URL_BASE = `https://storage.googleapis.com/${BUCKET_NAME}`;

/**
 * Convert a base64-encoded image to WebP and upload it to Google Cloud Storage.
 *
 * The file is stored at `recipes/{recipeId}.webp` with an immutable cache
 * header so CDN edges and browsers never re-fetch the same image.
 *
 * On any failure the error is logged and `null` is returned — a failed image
 * upload must NEVER block recipe generation.
 *
 * @param {string} recipeId       - Recipe UUID used as the GCS object name.
 * @param {string} base64ImageData - Base64-encoded image (no data-URI prefix).
 * @returns {Promise<string|null>} Public URL on success, null on failure.
 */
export async function uploadRecipeImage(recipeId, base64ImageData) {
  try {
    const inputBuffer = Buffer.from(base64ImageData, 'base64');

    // Convert to WebP for consistent format and smaller file sizes.
    const webpBuffer = await sharp(inputBuffer).webp().toBuffer();

    const gcsPath = `recipes/${recipeId}.webp`;

    // [ASSUMPTION] Storage() is instantiated inside the function (not at module
    // level) so that credentials are resolved at call time, matching the lazy
    // initialisation pattern used in gemini.js. ADC is expected to be configured
    // in the deployment environment (Cloud Run service account or GOOGLE_APPLICATION_CREDENTIALS).
    const storage = new Storage();
    const file = storage.bucket(BUCKET_NAME).file(gcsPath);

    await file.save(webpBuffer, {
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    return `${PUBLIC_URL_BASE}/${gcsPath}`;
  } catch (err) {
    console.error('[imageStorage] Failed to upload recipe image:', err);
    return null;
  }
}
