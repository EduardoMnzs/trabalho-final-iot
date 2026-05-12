const { resetData } = require('@parking/shared');

async function postJson(url) {
  // Node 20+ tem fetch nativo
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    return r.ok;
  } catch (e) {
    return false;
  }
}

async function runReset({ simulatorUrl, log }) {
  log('reset: truncating data tables + reseeding spots...');
  await resetData();
  log('reset: db cleaned');
  if (simulatorUrl) {
    const ok = await postJson(`${simulatorUrl.replace(/\/$/, '')}/reset`);
    log(ok ? 'reset: simulator state cleared' : 'reset: simulator unreachable (ignored)');
  }
}

module.exports = { runReset };
