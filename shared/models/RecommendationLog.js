const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "RecommendationLog",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      ts: { type: DataTypes.DATE, allowNull: false },
      fromSector: {
        type: DataTypes.STRING(1),
        allowNull: false,
        field: "from_sector",
      },
      recommendedSector: {
        type: DataTypes.STRING(1),
        allowNull: true,
        field: "recommended_sector",
      },
      reason: { type: DataTypes.TEXT, allowNull: false },
      dataJson: { type: DataTypes.JSONB, allowNull: true, field: "data_json" },
    },
    {
      tableName: "recommendations_log",
      timestamps: false,
      indexes: [{ fields: ["from_sector", "ts"] }],
    },
  );
