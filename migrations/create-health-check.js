'use strict';
/** @type {import('sequelize-cli').Migration} */
// Using sequelize to create the database entries and tables
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('HealthChecks', {
      // Creates the database table columns
      // CheckID stores the id number and datetime stores the time of request completion
      checkId: {  
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      datetime: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // The table is deleted from the database if the migration is reverted
    await queryInterface.dropTable('HealthChecks');
  },
};
