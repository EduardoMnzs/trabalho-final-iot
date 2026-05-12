const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "Incident",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      type: {
        type: DataTypes.ENUM("STUCK_OCCUPIED", "STUCK_FREE", "FLAPPING"),
        allowNull: false,
      },
      severity: {
        type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH"),
        allowNull: false,
        defaultValue: "MEDIUM",
      },
      sectorId: {
        type: DataTypes.STRING(1),
        allowNull: false,
        field: "sector_id",
      },
      spotId: { type: DataTypes.STRING(8), allowNull: true, field: "spot_id" },
      tsOpen: { type: DataTypes.DATE, allowNull: false, field: "ts_open" },
      tsClose: { type: DataTypes.DATE, allowNull: true, field: "ts_close" },
      status: {
        type: DataTypes.ENUM("OPEN", "CLOSED"),
        allowNull: false,
        defaultValue: "OPEN",
      },
      evidenceJson: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: "evidence_json",
      },
    },
    {
      tableName: "incidents",
      timestamps: false,
      indexes: [
        { fields: ["status"] },
        { fields: ["spot_id", "ts_open"] },
        { fields: ["type", "status"] },
      ],
    },
  );
