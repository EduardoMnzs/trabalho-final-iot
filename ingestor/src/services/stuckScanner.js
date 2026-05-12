const { getModels } = require('@parking/shared');
const { QueryTypes } = require('sequelize');
const config = require('../config');

// "Agora" = MAX(ts) de spot_events. Evita drift entre relógios simulados
// de containers; usa o tempo do dado real como referência.
async function getDataNow(sequelize) {
  const [row] = await sequelize.query(`SELECT MAX(ts) AS max_ts FROM spot_events`, {
    type: QueryTypes.SELECT,
  });
  if (row && row.max_ts) return new Date(row.max_ts);
  return null;
}

async function scanStuck() {
  const { sequelize, Spot, Incident } = getModels();
  const now = await getDataNow(sequelize);
  if (!now) return; // sem eventos ainda, nada a varrer
  const spots = await Spot.findAll();

  for (const spot of spots) {
    const idleSec = (now.getTime() - new Date(spot.lastChangeTs).getTime()) / 1000;
    if (idleSec < 0) continue; // spot mais novo que o pivô (raro: snapshot inconsistente)

    const threshold =
      spot.currentState === 'OCCUPIED'
        ? config.STUCK_OCCUPIED_THRESHOLD_SEC
        : config.STUCK_FREE_THRESHOLD_SEC;
    const type = spot.currentState === 'OCCUPIED' ? 'STUCK_OCCUPIED' : 'STUCK_FREE';

    const open = await Incident.findOne({
      where: { spotId: spot.spotId, type, status: 'OPEN' },
    });

    if (idleSec > threshold) {
      if (!open) {
        await Incident.create({
          type,
          severity: idleSec > 2 * threshold ? 'HIGH' : 'MEDIUM',
          sectorId: spot.sectorId,
          spotId: spot.spotId,
          tsOpen: now,
          status: 'OPEN',
          evidenceJson: {
            idleSec: Math.round(idleSec),
            since: spot.lastChangeTs,
            state: spot.currentState,
            thresholdSec: threshold,
          },
        });
      } else {
        await open.update({
          evidenceJson: {
            ...open.evidenceJson,
            idleSec: Math.round(idleSec),
          },
        });
      }
    } else if (open) {
      await open.update({ status: 'CLOSED', tsClose: now });
    }

    const oppositeType = type === 'STUCK_OCCUPIED' ? 'STUCK_FREE' : 'STUCK_OCCUPIED';
    const oppositeOpen = await Incident.findOne({
      where: { spotId: spot.spotId, type: oppositeType, status: 'OPEN' },
    });
    if (oppositeOpen) await oppositeOpen.update({ status: 'CLOSED', tsClose: now });
  }
}

module.exports = { scanStuck };
