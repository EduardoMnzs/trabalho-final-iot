const { getModels } = require("./models");
const { allSpotIds } = require("./constants");

async function migrate({ force = false } = {}) {
  const { sequelize } = getModels();
  await sequelize.authenticate();
  await sequelize.sync({ force });
}

async function seedSpots() {
  const { Spot } = getModels();
  const now = new Date();
  const rows = allSpotIds().map((spotId) => ({
    spotId,
    sectorId: spotId.split("-")[0],
    currentState: "FREE",
    lastChangeTs: now,
    lastEventId: null,
  }));
  await Spot.bulkCreate(rows, { ignoreDuplicates: true });
}

module.exports = { migrate, seedSpots };
