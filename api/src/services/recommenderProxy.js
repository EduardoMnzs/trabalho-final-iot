const { Sequelize } = require('sequelize');
const { getModels, SECTORS } = require('@parking/shared');

const RECOMMENDATION_THRESHOLD = parseFloat(process.env.RECOMMENDATION_THRESHOLD || '0.9');

async function sectorStats() {
  const { Spot } = getModels();
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
  const map = {};
  for (const s of SECTORS) map[s] = { sectorId: s, total: 0, occ: 0, free: 0, rate: 0 };
  for (const r of rows) {
    const total = parseInt(r.total, 10) || 0;
    const occ = parseInt(r.occ, 10) || 0;
    map[r.sectorId] = {
      sectorId: r.sectorId,
      total,
      occ,
      free: total - occ,
      rate: total > 0 ? occ / total : 0,
    };
  }
  return map;
}

function pct(x) { return (x * 100).toFixed(0); }

async function compute(fromSector) {
  const stats = await sectorStats();
  const from = stats[fromSector];
  const ts = new Date().toISOString();
  if (!from) {
    return { fromSector, recommendedSector: null, reason: `Unknown sector ${fromSector}`, ts, data: { stats } };
  }
  if (from.rate < RECOMMENDATION_THRESHOLD) {
    return {
      fromSector,
      recommendedSector: null,
      reason: `Sector ${fromSector} at ${pct(from.rate)}% occupancy; no recommendation needed`,
      ts,
      data: { fromRate: from.rate, stats },
    };
  }
  const candidates = Object.values(stats).filter((s) => s.sectorId !== fromSector && s.free > 0);
  if (candidates.length === 0) {
    return {
      fromSector,
      recommendedSector: null,
      reason: `Sector ${fromSector} at ${pct(from.rate)}% occupancy; all other sectors are full`,
      ts,
      data: { fromRate: from.rate, stats },
    };
  }
  candidates.sort((a, b) => b.free - a.free || a.rate - b.rate);
  const best = candidates[0];
  return {
    fromSector,
    recommendedSector: best.sectorId,
    reason: `Sector ${fromSector} at ${pct(from.rate)}% occupancy; Sector ${best.sectorId} has ${best.free} free spots`,
    ts,
    data: { fromRate: from.rate, candidates, stats },
  };
}

async function logAndPublish(result, mqttClient) {
  const { RecommendationLog } = getModels();
  await RecommendationLog.create({
    ts: new Date(result.ts),
    fromSector: result.fromSector,
    recommendedSector: result.recommendedSector,
    reason: result.reason,
    dataJson: result.data || null,
  });
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish('campus/parking/recommendations', JSON.stringify(result), {
      qos: 1,
      retain: true,
    });
  }
}

module.exports = { compute, logAndPublish };
