const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "Spot",
    {
      spotId: { type: DataTypes.STRING(8), primaryKey: true, field: "spot_id" },
      sectorId: {
        type: DataTypes.STRING(1),
        allowNull: false,
        field: "sector_id",
      },
      currentState: {
        type: DataTypes.ENUM("FREE", "OCCUPIED"),
        allowNull: false,
        defaultValue: "FREE",
        field: "current_state",
      },
      lastChangeTs: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "last_change_ts",
      },
      lastEventId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "last_event_id",
      },
    },
    {
      tableName: "spots",
      timestamps: false,
      indexes: [{ fields: ["sector_id"] }, { fields: ["current_state"] }],
    },
  );
