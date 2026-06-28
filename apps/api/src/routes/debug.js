/**
 * TEMPORARY DEBUG ROUTE — delete this file once the Cloud SQL socket
 * ENOENT issue is resolved. Not auth-gated, not meant for production.
 *
 * Mount this in src/index.js with:
 *   import debugRoutes from './routes/_debug.js';
 *   app.use('/api/v1/_debug', debugRoutes);
 */

import express from 'express';
import fs from 'fs';

const router = express.Router();

router.get('/cloudsql', (req, res) => {
  const result = {
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    databaseUrlSet: !!process.env.DATABASE_URL,
    // Show DATABASE_URL with password masked, so we can eyeball the actual
    // value Cloud Run injected at runtime — not just what's in Secret Manager.
    databaseUrlMasked: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@')
      : null,
  };

  try {
    result.rootDirExists = fs.existsSync('/');
    result.rootDirContents = fs.readdirSync('/');
  } catch (e) {
    result.rootDirError = e.message;
  }

  try {
    result.cloudsqlDirExists = fs.existsSync('/cloudsql');
  } catch (e) {
    result.cloudsqlDirError = e.message;
  }

  if (result.cloudsqlDirExists) {
    try {
      result.cloudsqlContents = fs.readdirSync('/cloudsql');
    } catch (e) {
      result.cloudsqlReadError = e.message;
    }

    if (result.cloudsqlContents && result.cloudsqlContents.length > 0) {
      const instanceDir = result.cloudsqlContents[0];
      try {
        result.instanceDirContents = fs.readdirSync(`/cloudsql/${instanceDir}`);
      } catch (e) {
        result.instanceDirError = e.message;
      }

      try {
        const stat = fs.statSync(`/cloudsql/${instanceDir}`);
        result.instanceDirStat = {
          mode: stat.mode.toString(8),
          uid: stat.uid,
          gid: stat.gid,
        };
      } catch (e) {
        result.instanceDirStatError = e.message;
      }
    }
  }

  // Who is this process actually running as right now?
  try {
    result.processUid = process.getuid ? process.getuid() : 'n/a';
    result.processGid = process.getgid ? process.getgid() : 'n/a';
  } catch (e) {
    result.processIdError = e.message;
  }

  res.json(result);
});

export default router;