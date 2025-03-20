'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('File', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      upload_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      file_size: {  // New field for file size
        type: Sequelize.INTEGER,  // Size in bytes
        allowNull: false,
      },
      content_type: {  // New field for content type
        type: Sequelize.STRING,
        allowNull: false,
      },
      file_extension: {  // New field for content type
        type: Sequelize.STRING,
        allowNull: false,
      },
      expiration_date: {  // New field for expiration date
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('File');
  },
};