import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env before any test workers start so DATABASE_URL is available
// when the Knex instance is created at module import time.
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

export default defineConfig({
  test: {
    // Run test files sequentially to avoid DB contention between suites.
    fileParallelism: false,
  },
});
