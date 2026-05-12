const SECTORS = ["A", "B", "C"];
const SPOTS_PER_SECTOR = 30;

function allSpotIds() {
  const out = [];
  for (const s of SECTORS) {
    for (let i = 1; i <= SPOTS_PER_SECTOR; i++) {
      out.push(`${s}-${String(i).padStart(2, "0")}`);
    }
  }
  return out;
}

const STATES = ["FREE", "OCCUPIED"];
const INCIDENT_TYPES = ["STUCK_OCCUPIED", "STUCK_FREE", "FLAPPING"];
const INCIDENT_SEVERITY = ["LOW", "MEDIUM", "HIGH"];
const INCIDENT_STATUS = ["OPEN", "CLOSED"];

module.exports = {
  SECTORS,
  SPOTS_PER_SECTOR,
  allSpotIds,
  STATES,
  INCIDENT_TYPES,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
};
