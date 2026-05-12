const { createSequelize } = require("../db");
const defineSpot = require("./Spot");
const defineSpotEvent = require("./SpotEvent");
const defineSectorSnapshot = require("./SectorSnapshot");
const defineIncident = require("./Incident");
const defineRecommendationLog = require("./RecommendationLog");

let cached = null;

function getModels() {
  if (cached) return cached;
  const sequelize = createSequelize();

  const Spot = defineSpot(sequelize);
  const SpotEvent = defineSpotEvent(sequelize);
  const SectorSnapshot = defineSectorSnapshot(sequelize);
  const Incident = defineIncident(sequelize);
  const RecommendationLog = defineRecommendationLog(sequelize);

  Spot.hasMany(SpotEvent, { foreignKey: "spotId", sourceKey: "spotId" });
  SpotEvent.belongsTo(Spot, { foreignKey: "spotId", targetKey: "spotId" });
  Spot.hasMany(Incident, { foreignKey: "spotId", sourceKey: "spotId" });
  Incident.belongsTo(Spot, { foreignKey: "spotId", targetKey: "spotId" });

  cached = {
    sequelize,
    Spot,
    SpotEvent,
    SectorSnapshot,
    Incident,
    RecommendationLog,
  };
  return cached;
}

module.exports = { getModels };
