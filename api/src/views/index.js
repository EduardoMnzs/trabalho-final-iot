function spotDto(spot) {
  return {
    spotId: spot.spotId,
    sectorId: spot.sectorId,
    state: spot.currentState,
    lastChangeTs: spot.lastChangeTs,
  };
}

function sectorAgg({ sectorId, occupiedCount, freeCount, lastUpdateTs }) {
  const total = occupiedCount + freeCount;
  return {
    sectorId,
    occupiedCount,
    freeCount,
    occupancyRate: total > 0 ? Number((occupiedCount / total).toFixed(3)) : 0,
    lastUpdateTs,
  };
}

function incidentDto(inc) {
  return {
    id: Number(inc.id),
    type: inc.type,
    severity: inc.severity,
    sectorId: inc.sectorId,
    spotId: inc.spotId,
    tsOpen: inc.tsOpen,
    tsClose: inc.tsClose,
    status: inc.status,
    evidence: inc.evidenceJson || null,
  };
}

module.exports = { spotDto, sectorAgg, incidentDto };
