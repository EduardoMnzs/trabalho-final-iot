const { getModels, SECTORS, time } = require('@parking/shared');
const { Sequelize } = require('sequelize');
const config = require('../config');

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

function pct(x) {
  return (x * 100).toFixed(0);
}

async function compute(fromSector) {
  const stats = await sectorStats();
  const from = stats[fromSector];
  const ts = time.nowSim().toISOString();

  if (!from) {
    return {
      fromSector,
      recommendedSector: null,
      reason: `Unknown sector ${fromSector}`,
      ts,
      data: { stats },
    };
  }

  if (from.rate < config.RECOMMENDATION_THRESHOLD) {
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
  if (mqttClient) {
    mqttClient.publish('campus/parking/recommendations', JSON.stringify(result), {
      qos: 1,
      retain: true,
    });
  }
}

const cooldownByFromSector = new Map();

async function maybeTrigger(sectorId, mqttClient) {
  const last = cooldownByFromSector.get(sectorId) || 0;
  if (Date.now() - last < config.RECOMMENDATION_COOLDOWN_SEC * 1000) return null;

  const result = await compute(sectorId);
  if (!result.recommendedSector) return null;

  cooldownByFromSector.set(sectorId, Date.now());
  await logAndPublish(result, mqttClient);
  return result;
}

module.exports = { compute, logAndPublish, maybeTrigger };
