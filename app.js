require("dotenv").config();
const express = require("express");
const db = require("./models");
const multer = require("multer");
const path = require("path");
const { uploadFile, deleteFile, getFileMetadata } = require("./controllers/fileController");
const logger = require('./cloudwatch/logger');
const { statsd } = require('./cloudwatch/metrics');

const app = express();
const port = 8080;

// Set up multer storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to parse JSON bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const routeKey = req.originalUrl.split('?')[0];

  logger.info(`Request received`, {
    method: req.method,
    path: req.path,
    headers: req.headers
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`Response sent`, {
      status: res.statusCode,
      method: req.method,
      path: req.path,
      duration: `${duration}ms`
    });

    statsd.increment(`api.${req.method.toLowerCase()}.${routeKey.replace(/\//g, '_')}.count`);
    statsd.timing(`api.${req.method.toLowerCase()}.${routeKey.replace(/\//g, '_')}.duration`, duration);
  });

  next();
});

// Health check endpoint
app.get("/healthz", async (req, res) => {
  if (
    Object.keys(req.body).length > 0 ||
    Object.keys(req.query).length > 0 ||
    Object.keys(req.params).length > 0 ||
    req.headers["content-type"]
  ) {
    statsd.increment('api.healthz.invalid_request');
    return res.status(400).set("Cache-Control", "no-cache").end();
  }

  try {
    const dbStart = Date.now();
    await db.HealthCheck.create({
      status: "OK",
      datetime: new Date().toISOString(),
    });
    statsd.timing('db.healthcheck.create.duration', Date.now() - dbStart);
    statsd.increment('db.healthcheck.create.success');

    statsd.increment('api.healthz.success');
    res.status(200)
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .end();
  } catch (err) {
    logger.error("Health check failed", { error: err.message, stack: err.stack });
    statsd.increment('api.healthz.error');
    res.status(503)
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .end();
  }
});

app.get("/cicd", async (req, res) => {
  if (
    Object.keys(req.body).length > 0 ||
    Object.keys(req.query).length > 0 ||
    Object.keys(req.params).length > 0 ||
    req.headers["content-type"]
  ) {
    statsd.increment('api.healthz.invalid_request');
    return res.status(400).set("Cache-Control", "no-cache").end();
  }

  try {
    const dbStart = Date.now();
    await db.HealthCheck.create({
      status: "OK",
      datetime: new Date().toISOString(),
    });
    statsd.timing('db.healthcheck.create.duration', Date.now() - dbStart);
    statsd.increment('db.healthcheck.create.success');

    statsd.increment('api.healthz.success');
    res.status(200)
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .end();
  } catch (err) {
    logger.error("Health check failed", { error: err.message, stack: err.stack });
    statsd.increment('api.healthz.error');
    res.status(503)
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .end();
  }
});

// File upload endpoint
app.post('/v1/file', upload.single('profilePic'), async (req, res) => {
  const start = Date.now();
  try {
    await uploadFile(req, res);
    statsd.timing('api.file_upload.duration', Date.now() - start);
    statsd.increment('api.file_upload.success');
  } catch (error) {
    logger.error("File upload failed", { error: error.message, stack: error.stack });
    statsd.timing('api.file_upload.duration', Date.now() - start);
    statsd.increment('api.file_upload.error');
  }
});

// File delete endpoint
app.delete("/v1/file/:id", async (req, res) => {
  const start = Date.now();
  try {
    await deleteFile(req, res);
    statsd.timing('api.file_delete.duration', Date.now() - start);
    statsd.increment('api.file_delete.success');
  } catch (error) {
    logger.error("File delete failed", { error: error.message, stack: error.stack });
    statsd.timing('api.file_delete.duration', Date.now() - start);
    statsd.increment('api.file_delete.error');
  }
});

// File metadata endpoint
app.get("/v1/file/:id", async (req, res) => {
  const start = Date.now();
  try {
    await getFileMetadata(req, res);
    statsd.timing('api.file_metadata.duration', Date.now() - start);
    statsd.increment('api.file_metadata.success');
  } catch (error) {
    logger.error("File metadata retrieval failed", { error: error.message, stack: error.stack });
    statsd.timing('api.file_metadata.duration', Date.now() - start);
    statsd.increment('api.file_metadata.error');
  }
});

// Method not allowed handlers
app.all("/healthz", (req, res) => {
  logger.warn("Method not allowed", { method: req.method, path: req.path });
  statsd.increment('api.healthz.method_not_allowed');
  res.status(405).set('Cache-Control', 'no-cache').end();
});

app.all("/cicd", (req, res) => {
  logger.warn("Method not allowed", { method: req.method, path: req.path });
  statsd.increment('api.healthz.method_not_allowed');
  res.status(405).set('Cache-Control', 'no-cache').end();
});

app.all("/v1/file", (req, res) => {
  logger.warn("Method not allowed", { method: req.method, path: req.path });
  statsd.increment('api.file.method_not_allowed');
  res.status(405).set('Cache-Control', 'no-cache').end();
});

app.all("/v1/file/:id", (req, res) => {
  logger.warn("Method not allowed", { method: req.method, path: req.path });
  statsd.increment('api.file_id.method_not_allowed');
  res.status(405).set('Cache-Control', 'no-cache').end();
});

// Error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    logger.error('Invalid JSON', { error: err.message });
    statsd.increment('api.json_error');
    return res.status(400).set('Cache-Control', 'no-cache').end();
  }
  
  logger.error('Server error', { error: err.message, stack: err.stack });
  statsd.increment('api.server_error');
  res.status(500).set('Cache-Control', 'no-cache').end();
});

// Start server
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    logger.info(`Server started on port ${port}`);
  });
}

module.exports = app;