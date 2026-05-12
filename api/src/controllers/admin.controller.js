const { resetData } = require('@parking/shared');

const SIMULATOR_URL = process.env.SIMULATOR_URL || 'http://simulator:9000';

async function reset(_req, res, next) {
  try {
    await resetData();
    let simulatorReset = false;
    try {
      const r = await fetch(`${SIMULATOR_URL.replace(/\/$/, '')}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      simulatorReset = r.ok;
    } catch (_) {}
    res.json({ ok: true, dbReset: true, simulatorReset });
  } catch (e) { next(e); }
}

module.exports = { reset };
