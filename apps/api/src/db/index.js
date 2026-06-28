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

/**
 * Parse DATABASE_URL into Knex connection params manually.
 *
 * We do this instead of passing connectionString directly because pg's
 * pg-connection-string uses new URL() internally, which rejects passwords
 * containing special characters and rejects empty-host Unix socket URLs
 * (the format Cloud Run uses for Cloud SQL: postgresql://user:pass@/db?host=/cloudsql/...).
 *
 * Handles:
 *   TCP:    postgresql://user:pass@host:5432/dbname
 *   Socket: postgresql://user:pass@/dbname?host=/cloudsql/project:region:instance
 */
function parseConnection() {
  const url = process.env.DATABASE_URL;
  if (!url) return {};

  // Greedy (.+) before @ backtracks correctly even when password contains @ or /
  const m = url.match(/^postgres(?:ql)?:\/\/([^:]+):(.+)@([^/]*)\/([^?]*)(?:\?(.*))?$/);
  if (!m) {
    console.warn('[db] Could not parse DATABASE_URL');
    return {};
  }

  const [, user, rawPassword, hostPort, database, queryStr] = m;
  const password = decodeURIComponent(rawPassword);
  const socketPath = new URLSearchParams(queryStr ?? '').get('host');

  if (socketPath) {
    // Cloud Run + Cloud SQL Unix socket — no SSL, proxy handles encryption
    return { user, password, database, host: socketPath };
  }

  const [host, port] = hostPort.split(':');
  return {
    user,
    password,
    database,
    host: host || 'localhost',
    port: port ? Number(port) : 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
}

const db = knex({
  client: 'pg',
  connection: parseConnection(),
  pool: { min: 2, max: 10 },
  migrations: {
    tableName: 'knex_migrations',
    directory: '../../db/migrations',
  },
  seeds: {
    directory: '../../db/seeds',
  },
});

export default db;
