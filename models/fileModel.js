const { DataTypes, Model } = require('sequelize');


/**
 * This model defines the 'files' table for tracking file metadata.
 * It stores information such as file name, S3 path, size, and user ownership.
 * @param {*} sequelize 
 * @returns {Model} - The sequelize model that represents the files table
 */
module.exports = (sequelize) => {
  const File = sequelize.define('File', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    upload_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    file_size: {  // New field for file size
      type: DataTypes.INTEGER,  // Size in bytes
      allowNull: false,
    },
    content_type: {  // New field for content type
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_extension: {  // New field for content type
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiration_date: {  // New field for expiration date
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    timestamps: false,  // Disables createdAt and updatedAt fields
  });

  return File;
};
