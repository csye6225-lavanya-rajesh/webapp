require("dotenv").config();
const { Sequelize } = require("sequelize");

// Check if DATABASE_URL is provided
let sequelize;

if (process.env.DATABASE_URL) {
  // Use the DATABASE_URL from environment if it's provided (for both local and production)
  console.log("Connecting using DATABASE_URL...");
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: process.env.DB_DIALECT || 'postgres',  // Default to 'postgres' if DB_DIALECT is not set
    logging: false,  // Disable SQL logging for cleaner output
  });
} else {
  // Fallback to using individual environment variables for connecting to RDS
  console.log("Connecting to RDS...");
  sequelize = new Sequelize(
    process.env.DB_NAME,  // Database name
    process.env.DB_USER,  // Database username
    process.env.DB_PASSWORD,  // Database password
    {
      host: process.env.DB_HOST,  // RDS endpoint or localhost
      dialect: 'postgres',  // Database type
      port: process.env.DB_PORT || 5432,  // Default PostgreSQL port
      logging: false,  // Disable SQL logging for cleaner output
      dialectOptions: {
        ssl: {
          require: true,  // Enforce SSL connection
          rejectUnauthorized: false // Allow self-signed certificates (if necessary)
        }
      }
    }
);
}

// Define models
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models here
db.HealthCheck = require("./healthCheck")(sequelize, Sequelize.DataTypes);
db.File = require('./fileModel')(sequelize);

// Test the connection
sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch((error) => {
    console.error('Unable to connect to the database:', error);
  });

// Sync models (caution with force: true in production, use for development)
db.sequelize
  .sync({ force: false })  // Set force to false for production
  .then(() => {
    console.log("Database synced!");
  })
  .catch((err) => {
    console.error("Error syncing database:", err);
  });

// Export the sequelize instance and db models
module.exports = db;
