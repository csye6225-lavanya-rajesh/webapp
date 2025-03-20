const express = require("express");
const db = require("./models"); // Import the models from the models folder
const multer = require("multer"); // For handling file uploads
const path = require("path"); // For handling file paths
const { uploadFile, deleteFile, getFileMetadata } = require("./controllers/fileController"); // Ensure getFileMetadata is imported

const app = express();
const port = 8080;

// Set up multer storage (you can use memoryStorage or diskStorage based on your needs)
const storage = multer.memoryStorage(); // Store files in memory (you can change to diskStorage if needed)
const upload = multer({ storage: storage }); // Initialize multer with storage settings

// Middleware to parse JSON bodies
app.use(express.json());

// Route to check health (Only GET method allowed)
app.get("/healthz", (req, res) => {
  if (
    Object.keys(req.body).length > 0 || // Rejects JSON body
    Object.keys(req.query).length > 0 || // Rejects query parameters
    Object.keys(req.params).length > 0 || // Rejects URL parameters
    req.headers["content-type"] // Rejects form-data, x-www-form-urlencoded
  ) {
    return res.status(400).set("Cache-Control", "no-cache").end(); // 400 Bad Request
  }

  // Insert a record into the HealthCheck table
  db.HealthCheck.create({
    status: "OK",
    datetime: new Date().toISOString(), // Save timestamp in UTC
  })
    .then(() => {
      res
        .status(200) // HTTP 200 OK
        .set("Cache-Control", "no-cache, no-store, must-revalidate") // Prevent caching
        .send(); // No payload in response
    })
    .catch((err) => {
      console.error("Error creating health check entry:", err);
      res
        .status(503) // HTTP 503 Service Unavailable
        .set("Cache-Control", "no-cache, no-store, must-revalidate") // Prevent caching
        .send(); // No payload in response
    });
});

// Route to upload file (using multer middleware)
app.post('/v1/file', (req, res, next) => {
  console.log("Multer middleware has been triggered");  // Log before the `uploadFile` function
  upload.single('profilePic')(req, res, next);
}, uploadFile); // Use next() to move to the next function
 // The file will be available as 'req.file'

// Route to delete file
app.delete("/v1/file/:id", deleteFile); // Delete file by ID

// Route to get file metadata (e.g., the S3 path)
app.get("/v1/file/:id", getFileMetadata); // Get file metadata by ID

// Explicitly blocks unsupported HTTP methods
app.all("/healthz", (req, res) => {
  res
    .status(405) // Method Not Allowed
    .set('Cache-Control', 'no-cache')
    .send(); 
});

app.all("/v1/file", (req, res) => {
  res
    .status(405) // Method Not Allowed
    .set('Cache-Control', 'no-cache')
    .send(); 
});

app.all("/v1/file/:id", (req, res) => {
  res
    .status(405) // Method Not Allowed
    .set('Cache-Control', 'no-cache')
    .send(); 
});

// Global error handler (for syntax errors, invalid JSON, etc.)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    return res
    .status(400)
    .set('Cache-Control', 'no-cache')
    .send(); 
  }
  next(err); // Continue to the next middleware if error isn't JSON-related
});

// Starting the server
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

module.exports = app;
