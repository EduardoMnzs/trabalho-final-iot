const { sectorAggregates } = require('../services/sectorService');
const { spotDto, sectorAgg } = require('../views');

async function getMap(_req, res, next) {
  try {
    const aggs = await sectorAggregates();
    const sectors = aggs.map((a) => ({
      ...sectorAgg({
        sectorId: a.sectorId,
        occupiedCount: a.occupied,
        freeCount: a.free,
        lastUpdateTs: a.lastUpdate,
      }),
      spots: a.spots.map(spotDto),
    }));
    res.json({ ts: new Date().toISOString(), sectors });
  } catch (e) { next(e); }
}

module.exports = { getMap };
