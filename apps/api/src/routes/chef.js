/**
 * Chef (AI chat) routes — /api/v1/chef
 *
 * POST /api/v1/chef/message       → send a chat message, get AI reply
 * POST /api/v1/chef/voice-parse   → parse a voice transcript into structured pantry items
 */

import { Router } from 'express';
import verifyFirebaseToken from '../middleware/auth.js';

const router = Router();

router.use(verifyFirebaseToken);

// POST /api/v1/chef/message
router.post('/message', async (req, res, next) => {
  try {
    // TODO: call gemini.buildChefPrompt with req.body.message + user context
    res.json({
      reply: 'Chef placeholder reply',
      message: 'chef/message placeholder — not yet implemented',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/chef/voice-parse
router.post('/voice-parse', async (req, res, next) => {
  try {
    // TODO: call gemini.buildVoiceParsePrompt with req.body.transcript
    //       then run result through pantryMatch.matchIngredients
    res.json({
      items: [],
      message: 'chef/voice-parse placeholder — not yet implemented',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
