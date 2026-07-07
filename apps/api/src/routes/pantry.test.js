import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock Firebase auth middleware — checked before any import that uses it.
// The mock preserves the "no Bearer token → 401" behaviour so we can test
// that path without a real Firebase connection.
const TEST_UID = 'test-firebase-uid-pantry-5-1';

vi.mock('../middleware/auth.js', () => ({
  default: (req, res, next) => {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: 'Missing or malformed Authorization header' } });
    }
    req.user = { uid: TEST_UID };
    return next();
  },
}));

// Static imports resolved after mock is hoisted.
import db from '../db/index.js';
import pantryRoutes from './pantry.js';

// ── Minimal test app ──────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/v1/pantry', pantryRoutes);

// ── Test user setup ───────────────────────────────────────────────────────────

let testUserId;

beforeAll(async () => {
  const [user] = await db('users')
    .insert({ firebase_uid: TEST_UID, email: 'test-pantry@plated.test' })
    .onConflict('firebase_uid')
    .merge(['email'])
    .returning('*');
  testUserId = user.id;
});

afterAll(async () => {
  await db('pantry_items').where({ user_id: testUserId }).del();
  await db('dietary_preferences').where({ user_id: testUserId }).del();
  await db('users').where({ id: testUserId }).del();
  await db.destroy();
});

beforeEach(async () => {
  // Clean slate for each test.
  await db('pantry_items').where({ user_id: testUserId }).del();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const AUTH = { Authorization: 'Bearer test-token' };

async function seedItem(overrides = {}) {
  const [item] = await db('pantry_items')
    .insert({
      user_id:  testUserId,
      name:     'Tomato',
      category: 'produce',
      quantity: 3,
      unit:     'pcs',
      ...overrides,
    })
    .returning('*');
  return item;
}

// ── GET / ─────────────────────────────────────────────────────────────────────

describe('GET /api/v1/pantry', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/api/v1/pantry');
    expect(res.status).toBe(401);
  });

  it('returns an empty list when pantry is empty', async () => {
    const res = await request(app).get('/api/v1/pantry').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('returns active pantry items', async () => {
    await seedItem({ name: 'Eggs', category: 'dairy', quantity: 6, unit: 'pcs' });
    const res = await request(app).get('/api/v1/pantry').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toBe('Eggs');
  });

  it('excludes soft-deleted items', async () => {
    const item = await seedItem();
    await db('pantry_items').where({ id: item.id }).update({ deleted_at: new Date() });
    const res = await request(app).get('/api/v1/pantry').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

// ── POST / ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/pantry', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app)
      .post('/api/v1/pantry')
      .send({ name: 'Eggs', category: 'dairy', quantity: 6, unit: 'pcs' });
    expect(res.status).toBe(401);
  });

  it('creates a pantry item and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/pantry')
      .set(AUTH)
      .send({ name: 'Rice', category: 'grains', quantity: 500, unit: 'g' });
    expect(res.status).toBe(201);
    expect(res.body.item.name).toBe('Rice');
    expect(res.body.item.unit).toBe('g');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/pantry')
      .set(AUTH)
      .send({ name: 'Eggs' }); // missing category, quantity, unit
    expect(res.status).toBe(400);
  });
});

// ── PATCH /:id ────────────────────────────────────────────────────────────────

describe('PATCH /api/v1/pantry/:id', () => {
  it('updates quantity and unit', async () => {
    const item = await seedItem();
    const res = await request(app)
      .patch(`/api/v1/pantry/${item.id}`)
      .set(AUTH)
      .send({ quantity: 10, unit: 'kg' });
    expect(res.status).toBe(200);
    expect(Number(res.body.item.quantity)).toBe(10);
    expect(res.body.item.unit).toBe('kg');
  });

  it('returns 404 for a non-existent item', async () => {
    const res = await request(app)
      .patch('/api/v1/pantry/00000000-0000-0000-0000-000000000000')
      .set(AUTH)
      .send({ quantity: 10 });
    expect(res.status).toBe(404);
  });

  it('returns 404 when item belongs to another user (ownership check)', async () => {
    const [otherUser] = await db('users')
      .insert({ firebase_uid: 'other-uid-patch-test', email: 'other-patch@plated.test' })
      .onConflict('firebase_uid').merge(['email'])
      .returning('*');
    const [otherItem] = await db('pantry_items')
      .insert({ user_id: otherUser.id, name: 'Rice', category: 'grains', quantity: 500, unit: 'g' })
      .returning('*');

    const res = await request(app)
      .patch(`/api/v1/pantry/${otherItem.id}`)
      .set(AUTH)
      .send({ quantity: 1000 });
    expect(res.status).toBe(404);

    await db('pantry_items').where({ id: otherItem.id }).del();
    await db('users').where({ id: otherUser.id }).del();
  });
});

// ── DELETE /bulk ──────────────────────────────────────────────────────────────

describe('DELETE /api/v1/pantry/bulk', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const item = await seedItem();
    const res = await request(app)
      .delete('/api/v1/pantry/bulk')
      .send({ ids: [item.id] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when ids is missing', async () => {
    const res = await request(app)
      .delete('/api/v1/pantry/bulk')
      .set(AUTH)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when ids is an empty array', async () => {
    const res = await request(app)
      .delete('/api/v1/pantry/bulk')
      .set(AUTH)
      .send({ ids: [] });
    expect(res.status).toBe(400);
  });

  it('soft-deletes all specified items and returns 204', async () => {
    const item1 = await seedItem({ name: 'BulkItem A' });
    const item2 = await seedItem({ name: 'BulkItem B' });
    const item3 = await seedItem({ name: 'BulkItem C' }); // not in the request

    const res = await request(app)
      .delete('/api/v1/pantry/bulk')
      .set(AUTH)
      .send({ ids: [item1.id, item2.id] });
    expect(res.status).toBe(204);

    const deleted = await db('pantry_items').whereIn('id', [item1.id, item2.id]).select();
    expect(deleted.every(r => r.deleted_at !== null)).toBe(true);

    // item3 must remain untouched
    const untouched = await db('pantry_items').where({ id: item3.id }).first();
    expect(untouched.deleted_at).toBeNull();
  });

  it('silently ignores IDs belonging to another user', async () => {
    const [otherUser] = await db('users')
      .insert({ firebase_uid: 'other-uid-bulk-del', email: 'other-bulk-del@plated.test' })
      .onConflict('firebase_uid').merge(['email'])
      .returning('*');
    const [otherItem] = await db('pantry_items')
      .insert({ user_id: otherUser.id, name: 'OtherBulk', category: 'produce', quantity: 1, unit: 'pcs' })
      .returning('*');

    const res = await request(app)
      .delete('/api/v1/pantry/bulk')
      .set(AUTH)
      .send({ ids: [otherItem.id] });
    expect(res.status).toBe(204); // no error — just a no-op

    const row = await db('pantry_items').where({ id: otherItem.id }).first();
    expect(row.deleted_at).toBeNull();

    await db('pantry_items').where({ id: otherItem.id }).del();
    await db('users').where({ id: otherUser.id }).del();
  });

  it('updates last_pantry_update with type: delete', async () => {
    const item = await seedItem({ name: 'LastUpdateTest' });
    await request(app)
      .delete('/api/v1/pantry/bulk')
      .set(AUTH)
      .send({ ids: [item.id] });

    const user = await db('users').where({ id: testUserId }).first();
    expect(user.last_pantry_update?.type).toBe('delete');
    expect(user.last_pantry_update?.updated_at).toBeTruthy();
  });
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

describe('DELETE /api/v1/pantry/:id', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const item = await seedItem();
    const res = await request(app).delete(`/api/v1/pantry/${item.id}`);
    expect(res.status).toBe(401);
  });

  it('soft-deletes the item (deleted_at is set, row still exists)', async () => {
    const item = await seedItem();
    const res = await request(app)
      .delete(`/api/v1/pantry/${item.id}`)
      .set(AUTH);
    expect(res.status).toBe(204);

    const row = await db('pantry_items').where({ id: item.id }).first();
    expect(row).toBeDefined();
    expect(row.deleted_at).not.toBeNull();
  });

  it('returns 404 for a non-existent item', async () => {
    const res = await request(app)
      .delete('/api/v1/pantry/00000000-0000-0000-0000-000000000000')
      .set(AUTH);
    expect(res.status).toBe(404);
  });

  it('returns 404 after item is already soft-deleted', async () => {
    const item = await seedItem();
    await db('pantry_items').where({ id: item.id }).update({ deleted_at: new Date() });
    const res = await request(app)
      .delete(`/api/v1/pantry/${item.id}`)
      .set(AUTH);
    expect(res.status).toBe(404);
  });
});
