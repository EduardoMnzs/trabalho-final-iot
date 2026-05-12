const { getModels } = require('./models');
const { seedSpots } = require('./migrate');

// TRUNCATE em todas as tabelas de dados, mantendo o schema, e recria os 90 spots.
async function resetData() {
  const { sequelize } = getModels();
  await sequelize.query(
    `TRUNCATE TABLE spot_events, sector_snapshots, incidents, recommendations_log, spots RESTART IDENTITY CASCADE;`,
  );
  await seedSpots();
}

module.exports = { resetData };
