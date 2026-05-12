const { Sequelize } = require("sequelize");

function createSequelize() {
  const url =
    process.env.DB_URL || "postgres://parking:parking@localhost:5432/parking";
  return new Sequelize(url, {
    dialect: "postgres",
    logging: false,
    pool: { max: 10, min: 0, idle: 10000, acquire: 30000 },
  });
}

module.exports = { createSequelize };
