const { DataTypes, Model } = require('sequelize');
/**
 * This model defines the health check table for tracking the records
 * It has two columns checkId and datetime
 * @param {*} sequelize 
 * @returns {Model} - The sequelize model that represents the health check table
 */
module.exports = (sequelize) => {
  const HealthCheck = sequelize.define('HealthCheck', {
    checkId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    timestamps: false, // Disables createdAt and updatedAt fields
  });

  return HealthCheck;
};
