const { getModels, SECTORS } = require('@parking/shared');

async function sectorAggregates() {
  const { Spot } = getModels();
  const spots = await Spot.findAll({ order: [['sectorId', 'ASC'], ['spotId', 'ASC']] });
  const bySector = new Map(SECTORS.map((s) => [s, { sectorId: s, spots: [], occupied: 0, free: 0, lastUpdate: null }]));
  for (const spot of spots) {
    const agg = bySector.get(spot.sectorId);
    if (!agg) continue;
    agg.spots.push(spot);
    if (spot.currentState === 'OCCUPIED') agg.occupied += 1;
    else agg.free += 1;
    const t = new Date(spot.lastChangeTs).getTime();
    if (!agg.lastUpdate || t > agg.lastUpdate.getTime()) agg.lastUpdate = new Date(t);
  }
  return Array.from(bySector.values());
}

module.exports = { sectorAggregates };
