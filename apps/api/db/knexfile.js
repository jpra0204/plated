/**
 * Knex configuration file — used by the `knex` CLI for migrations and seeds.
 * The application itself uses src/db/index.js (same config, instantiated there).
 *
 * Usage:
 *   npm run migrate          → knex migrate:latest
 *   npm run migrate:rollback → knex migrate:rollback
 *   npm run seed             → knex seed:run
 */

import 'dotenv/config';

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
