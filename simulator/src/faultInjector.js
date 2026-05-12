const http = require('http');
const { SECTORS } = require('@parking/shared');
const { FAULT_MODES } = require('./spot');

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => (buf += c));
    req.on('end', () => {
      if (!buf) return resolve({});
      try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function startInjector({ port, spotsById }) {
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true }));
      }

      if (req.method === 'GET' && req.url === '/state') {
        const out = {};
        for (const [id, s] of spotsById) {
          out[id] = { state: s.state, fault: s.fault, forceFill: s.forceFill };
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(out));
      }

      if (req.method === 'POST' && req.url === '/reset') {
        for (const s of spotsById.values()) {
          s.state = 'FREE';
          s.fault = 'normal';
          s.forceFill = false;
          s.nextChangeSimMs = null;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, resetSpots: spotsById.size }));
      }

      if (req.method === 'POST' && req.url === '/inject') {
        const body = await readJsonBody(req);
        const { spotId, sectorId, mode } = body || {};

        if (!mode) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'mode is required' }));
        }

        if (sectorId) {
          if (!SECTORS.includes(sectorId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: `unknown sectorId ${sectorId}` }));
          }
          const affected = [];
          for (const [id, s] of spotsById) {
            if (s.sectorId !== sectorId) continue;
            if (mode === 'fill') { s.setForceFill(true); affected.push(id); }
            else if (mode === 'normal') { s.setForceFill(false); s.setFault('normal'); affected.push(id); }
            else if (FAULT_MODES.includes(mode)) { s.setFault(mode); affected.push(id); }
            else {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: `unknown mode ${mode}` }));
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: true, sectorId, mode, affected: affected.length }));
        }

        if (spotId) {
          const s = spotsById.get(spotId);
          if (!s) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: `unknown spotId ${spotId}` }));
          }
          if (mode === 'fill') s.setForceFill(true);
          else if (mode === 'normal') { s.setForceFill(false); s.setFault('normal'); }
          else if (FAULT_MODES.includes(mode)) s.setFault(mode);
          else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: `unknown mode ${mode}` }));
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: true, spotId, mode }));
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'spotId or sectorId is required' }));
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err.message || err) }));
    }
  });
  server.listen(port, () => {
    console.log(`[simulator] fault-injector HTTP on :${port}`);
  });
  return server;
}

module.exports = { startInjector };
