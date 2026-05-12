const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "SectorSnapshot",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      ts: { type: DataTypes.DATE, allowNull: false },
      sectorId: {
        type: DataTypes.STRING(1),
        allowNull: false,
        field: "sector_id",
      },
      occupiedCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "occupied_count",
      },
      freeCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "free_count",
      },
      occupancyRate: {
        type: DataTypes.DECIMAL(4, 3),
        allowNull: false,
        field: "occupancy_rate",
      },
    },
    {
      tableName: "sector_snapshots",
      timestamps: false,
      indexes: [
        { unique: true, fields: ["ts", "sector_id"] },
        { fields: ["sector_id", "ts"] },
      ],
    },
  );
