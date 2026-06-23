// telemetry MUST be the first import so OTel can patch modules at load time
import './telemetry.js';

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import requestLogger from './middleware/requestLogger.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import pantryRoutes from './routes/pantry.js';
import recipesRoutes from './routes/recipes.js';
import chefRoutes from './routes/chef.js';
import savedRoutes from './routes/saved.js';
import profileRoutes from './routes/profile.js';
import cookRoutes from './routes/cook.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Security & parsing ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Health check (no auth) ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'plated-api', ts: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/pantry', pantryRoutes);
app.use('/api/v1/recipes', recipesRoutes);
app.use('/api/v1/chef', chefRoutes);
app.use('/api/v1/saved', savedRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/cook', cookRoutes);

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});

export default app;
