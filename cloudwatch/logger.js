const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ 
      filename: '/var/log/csye6225.log',
      maxsize: 1024 * 1024 * 5, // 5MB
      maxFiles: 5
    })
  ]
});

// In production, disable console logging
if (process.env.NODE_ENV === 'production') {
  logger.remove(winston.transports.Console);
}

module.exports = logger;