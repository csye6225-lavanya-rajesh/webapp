require("dotenv").config();
const { Sequelize } = require("sequelize");
const logger = require('../cloudwatch/logger');
const { statsd } = require('../cloudwatch/metrics');

let sequelize;

// Database connection setup
if (process.env.DATABASE_URL) {
  logger.info("Connecting using DATABASE_URL");
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: (sql, timing) => {
      if (typeof timing === 'number') {
        statsd.timing('db.query.duration', timing);
        statsd.increment('db.query.count');
      }
    },
  });
} else {
  logger.info("Connecting to RDS...");
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      dialect: 'postgres',
      port: process.env.DB_PORT || 5432,
      logging: (sql, timing) => {
        if (typeof timing === 'number') {
          statsd.timing('db.query.duration', timing);
          statsd.increment('db.query.count');
        }
      },
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        }
      }
    }
  );
}

// Database models setup
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.HealthCheck = require("./healthCheck")(sequelize, Sequelize.DataTypes);
db.File = require('./fileModel')(sequelize);

// Test database connection
const connectStart = Date.now();
sequelize.authenticate()
  .then(() => {
    const duration = Date.now() - connectStart;
    logger.info('Database connection established');
    statsd.timing('db.connection.duration', duration);
    statsd.increment('db.connection.success');
  })
  .catch((error) => {
    const duration = Date.now() - connectStart;
    logger.error('Database connection failed', { 
      error: error.message,
      stack: error.stack
    });
    statsd.timing('db.connection.duration', duration);
    statsd.increment('db.connection.error');
  });

// Sync database models
const syncStart = Date.now();
db.sequelize.sync({ force: false })
  .then(() => {
    const duration = Date.now() - syncStart;
    logger.info("Database models synced");
    statsd.timing('db.sync.duration', duration);
    statsd.increment('db.sync.success');
  })
  .catch((err) => {
    const duration = Date.now() - syncStart;
    logger.error("Database sync failed", {
      error: err.message,
      stack: err.stack
    });
    statsd.timing('db.sync.duration', duration);
    statsd.increment('db.sync.error');
  });

module.exports = db;