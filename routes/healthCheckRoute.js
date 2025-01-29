const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthCheckController');

// Gets health check method from the controller
router.get('/healthz', healthController.healthCheck);

// Catch-all for unsupported HTTP methods
router.all('/healthz', (req, res) => {
  res.status(405)
    .set('Cache-Control', 'no-cache')
    .end(); 
});

module.exports = router;