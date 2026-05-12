const express = require('express');
const path = require('path');
const routes = require('./routes');

function buildApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.use((req, _res, next) => {
    req._startedAt = Date.now();
    next();
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/v1', routes);

  const publicDir = path.join(__dirname, 'public');
  app.use('/dashboard', express.static(publicDir, { index: 'index.html' }));
  app.use(express.static(publicDir, { index: 'index.html' }));

  app.use((err, _req, res, _next) => {
    console.error('[api] error', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
  });

  return app;
}

module.exports = { buildApp };
