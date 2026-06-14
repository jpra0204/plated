/**
 * Knex instance — single shared connection pool for the whole API process.
 *
 * Import this wherever you need to query the DB:
 *   import db from '../db/index.js';
 *   const rows = await db('users').where({ firebase_uid: uid }).first();
 */

import knex from 'knex';

if (!process.env.DATABASE_URL) {
  console.warn('[db] DATABASE_URL is not set — database calls will fail');
}

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    // Required when connecting to Supabase / cloud Postgres over TLS
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: '../../db/migrations',
  },
  seeds: {
    directory: '../../db/seeds',
  },
});

export default db;
