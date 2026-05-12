const { getModels, time } = require('@parking/shared');
const config = require('../config');

async function scanStuck() {
  const { Spot, Incident } = getModels();
  const now = time.nowSim();
  const spots = await Spot.findAll();

  for (const spot of spots) {
    const idleMs = now.getTime() - new Date(spot.lastChangeTs).getTime();
    const idleSec = idleMs / 1000;
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

    // Também fecha incidentes do tipo "oposto" automaticamente quando o spot voltou a alternar.
    const oppositeType = type === 'STUCK_OCCUPIED' ? 'STUCK_FREE' : 'STUCK_OCCUPIED';
    const oppositeOpen = await Incident.findOne({
      where: { spotId: spot.spotId, type: oppositeType, status: 'OPEN' },
    });
    if (oppositeOpen) await oppositeOpen.update({ status: 'CLOSED', tsClose: now });
  }
}

module.exports = { scanStuck };
