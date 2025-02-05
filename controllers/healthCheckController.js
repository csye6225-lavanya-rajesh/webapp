const { healthCheck } = require('../models');

/**
 * Health check endpoint
 * Returns 200 OK if successful
 * Returns 405 Method Not Allowed if different HTTP methods 
 * Returns 503 Service Unavailable if an error occurs during the process
 * @param {*} req 
 * @param {*} res 
 * @returns {void}
 */
exports.healthCheck = async (req, res) => {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).set('Cache-Control', 'no-cache').end(); // No response body
    }

    // Ensure no request body, query params, or URL params are present
    if (Object.keys(req.body).length > 0 || Object.keys(req.query).length > 0 || Object.keys(req.params).length > 0) {
      return res.status(400).set('Cache-Control', 'no-cache').end(); // No response body
    }

    // Inserts a new health check record
    await healthCheck.create({ datetime: new Date() });

    // Return 200 OK without any response body
    res.status(200)
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('X-Content-Type-Options', 'nosniff')
      .end(); // No response body
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503)
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('X-Content-Type-Options', 'nosniff')
      .end(); // No response body
  }
};