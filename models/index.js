require('dotenv').config();

const Sequelize = require('sequelize');
// Gets the URL from the env variables
const sequelize = new Sequelize(process.env.DATABASE_URL, { 
  dialect: 'postgres', 
  // Disables SQL logging for cleaner output
  logging: false, 
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Imports the HealthCheck model
db.HealthCheck = require('./healthCheck')(sequelize, Sequelize.DataTypes);

// Outputs if the model is synced with the database
// For testing purposes
db.sequelize.sync().then(() => {
  console.log('Database synced!');
}).catch(err => {
  console.error('Error syncing database:', err);
});

module.exports = db;
