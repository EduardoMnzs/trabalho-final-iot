const { getModels, SECTORS } = require('@parking/shared');
const { sectorAggregates } = require('../services/sectorService');
const { spotDto, sectorAgg } = require('../views');

async function listSectors(_req, res, next) {
  try {
    const aggs = await sectorAggregates();
    const sectors = aggs.map((a) =>
      sectorAgg({
        sectorId: a.sectorId,
        occupiedCount: a.occupied,
        freeCount: a.free,
        lastUpdateTs: a.lastUpdate,
      }),
    );
    res.json({ ts: new Date().toISOString(), sectors });
  } catch (e) { next(e); }
}

function notFound(res, message) {
  return res.status(404).json({ error: { code: 'NOT_FOUND', message } });
}

async function spotsBySector(req, res, next) {
  try {
    const sectorId = req.params.sectorId;
    if (!SECTORS.includes(sectorId)) return notFound(res, `unknown sectorId ${sectorId}`);
    const { Spot } = getModels();
    const rows = await Spot.findAll({ where: { sectorId }, order: [['spotId', 'ASC']] });
    res.json({ sectorId, spots: rows.map(spotDto) });
  } catch (e) { next(e); }
}

async function freeSpotsBySector(req, res, next) {
  try {
    const sectorId = req.params.sectorId;
    if (!SECTORS.includes(sectorId)) return notFound(res, `unknown sectorId ${sectorId}`);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '10', 10) || 10, 100));
    const { Spot } = getModels();
    const rows = await Spot.findAll({
      where: { sectorId, currentState: 'FREE' },
      order: [['lastChangeTs', 'ASC']],
      limit,
    });
    res.json({
      sectorId,
      count: rows.length,
      spots: rows.map((s) => ({ spotId: s.spotId, freeSince: s.lastChangeTs })),
    });
  } catch (e) { next(e); }
}

module.exports = { listSectors, spotsBySector, freeSpotsBySector };
