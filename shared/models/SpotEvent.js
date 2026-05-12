const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "SpotEvent",
    {
      eventId: { type: DataTypes.UUID, primaryKey: true, field: "event_id" },
      ts: { type: DataTypes.DATE, allowNull: false },
      receivedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "received_at",
      },
      sectorId: {
        type: DataTypes.STRING(1),
        allowNull: false,
        field: "sector_id",
      },
      spotId: { type: DataTypes.STRING(8), allowNull: false, field: "spot_id" },
      state: { type: DataTypes.ENUM("FREE", "OCCUPIED"), allowNull: false },
      source: { type: DataTypes.ENUM("sensor", "gateway"), allowNull: false },
      rawPayloadJson: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: "raw_payload_json",
      },
    },
    {
      tableName: "spot_events",
      timestamps: false,
      indexes: [{ fields: ["spot_id", "ts"] }, { fields: ["sector_id", "ts"] }],
    },
  );
