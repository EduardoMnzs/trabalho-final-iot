const { getModels, SECTORS, time } = require('@parking/shared');
const { Sequelize } = require('sequelize');

async function takeSnapshot() {
  const { Spot, SectorSnapshot } = getModels();
  const now = time.nowSim();
  // Arredonda para o minuto simulado
  const tsBucket = new Date(Math.floor(now.getTime() / 60000) * 60000);

  const rows = await Spot.findAll({
    attributes: [
      'sectorId',
      [Sequelize.fn('COUNT', Sequelize.col('spot_id')), 'total'],
      [
        Sequelize.literal(`SUM(CASE WHEN current_state = 'OCCUPIED' THEN 1 ELSE 0 END)`),
        'occ',
      ],
    ],
    group: ['sectorId'],
    raw: true,
  });

  const bySector = new Map(rows.map((r) => [r.sectorId, r]));
  for (const s of SECTORS) {
    const r = bySector.get(s) || { total: 0, occ: 0 };
    const total = parseInt(r.total, 10) || 0;
    const occ = parseInt(r.occ, 10) || 0;
    const free = total - occ;
    const rate = total > 0 ? occ / total : 0;
    await SectorSnapshot.upsert({
      ts: tsBucket,
      sectorId: s,
      occupiedCount: occ,
      freeCount: free,
      occupancyRate: rate.toFixed(3),
    });
  }
}

module.exports = { takeSnapshot };
