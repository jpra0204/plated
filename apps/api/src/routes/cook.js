/**
 * Cook routes — /api/v1/cook
 *
 * POST /api/v1/cook  → "Cook this" action:
 *                       - soft-delete pantry items that appear in the recipe
 *                       - increment users.cooked_count
 *                       all in a single DB transaction
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';

const router = Router();

router.use(verifyFirebaseToken);

// POST /api/v1/cook
router.post('/', async (req, res, next) => {
  try {
    // TODO: within a transaction:
    //   1. verify req.body.recipeId exists and has ingredients
    //   2. soft-delete matching pantry_items (set deleted_at = NOW())
    //   3. increment users.cooked_count by 1
    //   return { cookedCount, removedItems }
    res.status(200).json({ cookedCount: null, removedItems: [], message: 'cook placeholder' });
  } catch (err) {
    next(err);
  }
});

export default router;
