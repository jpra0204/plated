/**
 * Knex configuration file — used by the `knex` CLI for migrations and seeds.
 * The application itself uses src/db/index.js (same config, instantiated there).
 *
 * Usage:
 *   npm run migrate          → knex migrate:latest
 *   npm run migrate:rollback → knex migrate:rollback
 *   npm run seed             → knex seed:run
 */

import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Knex changes CWD to this file's directory before loading it, so we must
// resolve .env relative to the file location rather than relying on CWD.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/** @type {import('knex').Knex.Config} */
const config = {
  client: 'pg',

  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },

  pool: { min: 2, max: 10 },

  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
    // Use ES module-compatible stub format
    stub: './migrations/.stub.js',
    extension: 'js',
  },

  seeds: {
    directory: './seeds',
    extension: 'js',
  },
};

export default config;
