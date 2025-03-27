const { healthCheck } = require("../models");
const logger = require("../cloudwatch/logger");
const { statsd } = require("../cloudwatch/metrics");

/**
 * Health check endpoint
 * Returns 200 OK if successful
 * Returns 405 Method Not Allowed if different HTTP methods 
 * Returns 503 Service Unavailable if an error occurs during the process
 */
exports.healthCheck = async (req, res) => {
  const apiStart = Date.now();
  const endpoint = '/healthcheck';

  try {
    logger.info('Health check request received', {
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Only allow GET requests
    if (req.method !== "GET") {
      logger.warn('Invalid HTTP method for health check endpoint', { 
        method: req.method,
        allowedMethod: 'GET',
        status: 'method_not_allowed'
      });
      statsd.increment('api.healthcheck.invalid_method');
      return res.status(405)
        .set("Cache-Control", "no-cache")
        .end();
    }

    // Validate no extra parameters
    if (Object.keys(req.body).length > 0 || Object.keys(req.query).length > 0 || Object.keys(req.params).length > 0) {
      logger.warn('Health check request contained unexpected parameters', {
        bodyParams: Object.keys(req.body),
        queryParams: Object.keys(req.query),
        routeParams: Object.keys(req.params),
        status: 'bad_request'
      });
      statsd.increment('api.healthcheck.invalid_parameters');
      return res.status(400)
        .set("Cache-Control", "no-cache")
        .end();
    }

    // Database health check
    const dbStart = Date.now();
    logger.debug('Starting database health check operation');
    
    const checkRecord = await healthCheck.create({ datetime: new Date() });
    
    const dbDuration = Date.now() - dbStart;
    logger.info('Database health check completed successfully', {
      operation: 'database_check',
      recordId: checkRecord.id,
      duration: dbDuration
    });
    
    statsd.timing('db.healthcheck.create.duration', dbDuration);
    statsd.increment('db.healthcheck.create.success');

    // Successful response
    const totalDuration = Date.now() - apiStart;
    logger.info('Health check completed successfully', {
      status: 'success',
      totalDuration,
      componentsChecked: ['database']
    });
    
    statsd.increment('api.healthcheck.success');
    statsd.timing('api.healthcheck.duration', totalDuration);
    
    res.status(200)
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .set("Pragma", "no-cache")
      .set("X-Content-Type-Options", "nosniff")
      .end();
  } catch (error) {
    const errorDuration = Date.now() - apiStart;
    logger.error('Health check failed', { 
      error: error.message, 
      stack: error.stack,
      operation: 'health_check',
      failedComponent: 'database',
      duration: errorDuration,
      status: 'service_unavailable'
    });
    
    statsd.increment('api.healthcheck.error');
    statsd.increment('db.healthcheck.create.error');
    statsd.timing('api.healthcheck.duration', errorDuration);
    
    res.status(503)
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .set("Pragma", "no-cache")
      .set("X-Content-Type-Options", "nosniff")
      .end();
  }
};