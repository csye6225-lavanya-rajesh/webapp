const StatsD = require('hot-shots');
const logger = require('./logger');

const statsd = new StatsD({
  host: 'localhost',
  port: 8125,
  prefix: 'webapp.',
  errorHandler: (error) => {
    logger.error('StatsD error:', error);
  },
  telegraf: true // Use Telegraf format for tags
});

// Simplified metric helpers
function trackApiCall(apiName, duration) {
  statsd.increment(`api.${apiName}.count`);
  statsd.timing(`api.${apiName}.duration`, duration);
}

function trackDbQuery(queryName, duration) {
  statsd.increment(`db.${queryName}.count`);
  statsd.timing(`db.${queryName}.duration`, duration);
}

function trackS3Operation(operation, duration) {
  statsd.increment(`s3.${operation}.count`);
  statsd.timing(`s3.${operation}.duration`, duration);
}

module.exports = { statsd, trackApiCall, trackDbQuery, trackS3Operation };