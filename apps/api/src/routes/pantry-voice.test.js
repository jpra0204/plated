import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

const TEST_UID = 'test-firebase-uid-voice-5-2';

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

// Mock parseTranscript so tests never hit Gemini.
// Default mock: returns two unmatched items.
vi.mock('../services/voice.js', () => ({
  parseTranscript: vi.fn().mockResolvedValue([
    { raw: 'Eggs', canonical: null, quantity: 6,   unit: 'pcs', matched: false },
    { raw: 'Rice', canonical: null, quantity: 500, unit: 'g',   matched: false },
  ]),
}));

import { parseTranscript } from '../services/voice.js';
import db from '../db/index.js';
import pantryRoutes from './pantry.js';

// ── Test app ──────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/v1/pantry', pantryRoutes);

// ── Fixtures ──────────────────────────────────────────────────────────────────

let testUserId;

beforeAll(async () => {
  const [user] = await db('users')
    .insert({ firebase_uid: TEST_UID, email: 'test-voice@plated.test' })
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
  await db('pantry_items').where({ user_id: testUserId }).del();
  // Reset mock to default between tests.
  parseTranscript.mockResolvedValue([
    { raw: 'Eggs', canonical: null, quantity: 6,   unit: 'pcs', matched: false },
    { raw: 'Rice', canonical: null, quantity: 500, unit: 'g',   matched: false },
  ]);
});

const AUTH = { Authorization: 'Bearer test-token' };

// ── POST /voice ───────────────────────────────────────────────────────────────

describe('POST /api/v1/pantry/voice', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app)
      .post('/api/v1/pantry/voice')
      .send({ transcript: '6 eggs and 500g rice' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when transcript is missing', async () => {
    const res = await request(app)
      .post('/api/v1/pantry/voice')
      .set(AUTH)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when transcript is an empty string', async () => {
    const res = await request(app)
      .post('/api/v1/pantry/voice')
      .set(AUTH)
      .send({ transcript: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns parsed items array on success', async () => {
    const res = await request(app)
      .post('/api/v1/pantry/voice')
      .set(AUTH)
      .send({ transcript: '6 eggs and 500g rice' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items).toHaveLength(2);
  });

  it('maps unmatched items to name=raw, category=other', async () => {
    const res = await request(app)
      .post('/api/v1/pantry/voice')
      .set(AUTH)
      .send({ transcript: '6 eggs' });
    const eggs = res.body.items[0];
    expect(eggs.name).toBe('Eggs');
    expect(eggs.category).toBe('other');
    expect(Number(eggs.quantity)).toBe(6);
    expect(eggs.unit).toBe('pcs');
    expect(eggs.ingredient_id).toBeNull();
  });

  it('uses defaults when quantity/unit are null', async () => {
    parseTranscript.mockResolvedValueOnce([
      { raw: 'Oregano', canonical: null, quantity: null, unit: null, matched: false },
    ]);
    const res = await request(app)
      .post('/api/v1/pantry/voice')
      .set(AUTH)
      .send({ transcript: 'some oregano' });
    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(1);
    expect(res.body.items[0].unit).toBe('pcs');
  });

  it('returns empty items array when Gemini returns nothing', async () => {
    parseTranscript.mockResolvedValueOnce([]);
    const res = await request(app)
      .post('/api/v1/pantry/voice')
      .set(AUTH)
      .send({ transcript: 'blah blah' });
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('enriches matched items with catalogue name and category', async () => {
    // Seed a real ingredient and use its ID so the route can enrich it.
    const [ing] = await db('ingredients')
      .insert({
        name:            'Tomato',
        name_normalized: 'tomato',
        category:        'produce',
        default_unit:    'pcs',
        is_countable:    true,
      })
      .onConflict('name_normalized')
      .merge(['category'])
      .returning('*');

    parseTranscript.mockResolvedValueOnce([
      { raw: 'tomatoes', canonical: { id: ing.id, name: 'tomato' }, quantity: 3, unit: 'pcs', matched: true },
    ]);

    const res = await request(app)
      .post('/api/v1/pantry/voice')
      .set(AUTH)
      .send({ transcript: '3 tomatoes' });
    expect(res.status).toBe(200);
    expect(res.body.items[0].name).toBe('Tomato');
    expect(res.body.items[0].category).toBe('produce');
    expect(res.body.items[0].ingredient_id).toBe(ing.id);

    await db('ingredients').where({ id: ing.id }).del();
  });
});

// ── POST /bulk ────────────────────────────────────────────────────────────────

describe('POST /api/v1/pantry/bulk', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app)
      .post('/api/v1/pantry/bulk')
      .send({ items: [{ name: 'Eggs', category: 'dairy', quantity: 6, unit: 'pcs' }] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when items array is empty', async () => {
    const res = await request(app)
      .post('/api/v1/pantry/bulk')
      .set(AUTH)
      .send({ items: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 when items is not an array', async () => {
    const res = await request(app)
      .post('/api/v1/pantry/bulk')
      .set(AUTH)
      .send({ items: 'bad' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when an item is missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/pantry/bulk')
      .set(AUTH)
      .send({ items: [{ name: 'Eggs' }] }); // missing category, quantity, unit
    expect(res.status).toBe(400);
  });

  it('inserts all items and returns 201 with count', async () => {
    const res = await request(app)
      .post('/api/v1/pantry/bulk')
      .set(AUTH)
      .send({
        items: [
          { name: 'Eggs',  category: 'dairy',  quantity: 6,   unit: 'pcs' },
          { name: 'Rice',  category: 'grains', quantity: 500, unit: 'g' },
          { name: 'Onion', category: 'produce',quantity: 2,   unit: 'pcs' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(3);
    expect(res.body.items).toHaveLength(3);
  });

  it('persists items in the database', async () => {
    await request(app)
      .post('/api/v1/pantry/bulk')
      .set(AUTH)
      .send({
        items: [
          { name: 'Milk', category: 'dairy', quantity: 1, unit: 'L' },
        ],
      });

    const rows = await db('pantry_items')
      .where({ user_id: testUserId })
      .whereNull('deleted_at');
    expect(rows.some(r => r.name === 'Milk')).toBe(true);
  });

  it('is transactional — all items inserted together', async () => {
    const before = await db('pantry_items').where({ user_id: testUserId }).whereNull('deleted_at').count('* as n').first();
    const beforeCount = Number(before.n);

    await request(app)
      .post('/api/v1/pantry/bulk')
      .set(AUTH)
      .send({
        items: [
          { name: 'Apple',  category: 'produce', quantity: 4,   unit: 'pcs' },
          { name: 'Butter', category: 'dairy',   quantity: 250, unit: 'g' },
        ],
      });

    const after = await db('pantry_items').where({ user_id: testUserId }).whereNull('deleted_at').count('* as n').first();
    expect(Number(after.n)).toBe(beforeCount + 2);
  });
});
