/**
 * Cook routes — /api/v1/cook
 *
 * POST /api/v1/cook  → "Cook this" action:
 *   - soft-delete pantry items whose names match recipe ingredients (case-insensitive)
 *   - increment users.cooked_count by 1
 *   Both in a single DB transaction.
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';
import db from '../db/index.js';

const router = Router();
router.use(verifyFirebaseToken);

async function getUser(req, res) {
  const user = await db('users').where({ firebase_uid: req.user.uid }).first();
  if (!user) {
    res.status(401).json({ error: { message: 'User not registered. Call /auth/sync first.' } });
    return null;
  }
  return user;
}

// ── POST / ────────────────────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { recipeId } = req.body;
    if (!recipeId) {
      return res.status(400).json({ error: { message: 'recipeId is required.' } });
    }

    const recipe = await db('recipes').where({ id: recipeId }).first();
    if (!recipe) {
      return res.status(404).json({ error: { message: 'Recipe not found.' } });
    }

    const recipeIngredients = await db('recipe_ingredients')
      .where({ recipe_id: recipeId })
      .select('name');

    const { cookedCount, removedItems } = await db.transaction(async trx => {
      // Find pantry items matching recipe ingredient names (case-insensitive).
      const ingredientNames = recipeIngredients.map(i => i.name.toLowerCase().trim());

      const matchedPantryItems = await trx('pantry_items')
        .where({ user_id: user.id })
        .whereNull('deleted_at')
        .whereRaw('LOWER(TRIM(name)) = ANY(?)', [ingredientNames])
        .select('id', 'name');

      // Soft-delete matched items.
      if (matchedPantryItems.length > 0) {
        await trx('pantry_items')
          .whereIn('id', matchedPantryItems.map(i => i.id))
          .update({ deleted_at: trx.fn.now() });
      }

      // Increment cooked_count.
      const [updatedUser] = await trx('users')
        .where({ id: user.id })
        .increment('cooked_count', 1)
        .returning('cooked_count');

      return {
        cookedCount: updatedUser.cooked_count,
        removedItems: matchedPantryItems.map(i => ({ id: i.id, name: i.name })),
      };
    });

    return res.json({ cookedCount, removedItems });
  } catch (err) {
    next(err);
  }
});

export default router;
