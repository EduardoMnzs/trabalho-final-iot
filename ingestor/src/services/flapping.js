const { Op } = require('sequelize');
const { getModels } = require('@parking/shared');
const config = require('../config');

// Usa o ts do próprio evento como âncora de tempo simulado.
// Evita drift entre relógios simulados de containers diferentes.
async function checkFlapping({ spotId, sectorId, eventTs }) {
  const { SpotEvent, Incident } = getModels();
  const now = new Date(eventTs);
  const windowStart = new Date(now.getTime() - config.FLAPPING_WINDOW_SEC * 1000);

  const count = await SpotEvent.count({
    where: {
      spotId,
      ts: { [Op.gt]: windowStart, [Op.lte]: now },
    },
  });

  const open = await Incident.findOne({
    where: { spotId, type: 'FLAPPING', status: 'OPEN' },
  });

  if (count > config.FLAPPING_MAX_TRANSITIONS) {
    const severity = count > 2 * config.FLAPPING_MAX_TRANSITIONS ? 'HIGH' : 'MEDIUM';
    const evidence = {
      transitions: count,
      windowSec: config.FLAPPING_WINDOW_SEC,
      windowStart: windowStart.toISOString(),
      detectedAt: now.toISOString(),
    };
    if (!open) {
      await Incident.create({
        type: 'FLAPPING',
        severity,
        sectorId,
        spotId,
        tsOpen: now,
        status: 'OPEN',
        evidenceJson: evidence,
      });
      return { opened: true };
    }
    await open.update({ evidenceJson: evidence, severity });
    return { updated: true };
  }

  if (open) {
    const opened = new Date(open.tsOpen).getTime();
    if (now.getTime() - opened > config.FLAPPING_COOLDOWN_SEC * 1000) {
      await open.update({ status: 'CLOSED', tsClose: now });
      return { closed: true };
    }
  }

  return { noop: true };
}

module.exports = { checkFlapping };
