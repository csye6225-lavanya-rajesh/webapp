const express = require('express');
const db = require('./models'); // Import the models from the models folder

const app = express();
const port = 8080;

// Middleware to parse JSON bodies
app.use(express.json());

// Route to check health (Only GET method allowed)
app.get('/healthz', (req, res) => {
  // Check if request includes a payload
  if (Object.keys(req.body).length > 0) {
    return res.status(400).send(); // Return HTTP 400 Bad Request if there's any payload
  }

  // Insert a record into the HealthCheck table
  db.HealthCheck.create({
    status: 'OK',
    datetime: new Date().toISOString() // Save timestamp in UTC
  })
    .then(() => {
      res.status(200) // HTTP 200 OK
        .set('Cache-Control', 'no-cache, no-store, must-revalidate') // Prevent caching
        .send(); // No payload in response
    })
    .catch(err => {
      console.error('Error creating health check entry:', err);
      res.status(503) // HTTP 503 Service Unavailable
        .set('Cache-Control', 'no-cache, no-store, must-revalidate') // Prevent caching
        .send(); // No payload in response
    });
});

// Explicitly blocks unsupported HTTP methods
app.all('/healthz', (req, res) => {
  res.status(405) // Method Not Allowed
    .set('Cache-Control', 'no-cache, no-store, must-revalidate') // Prevent caching
    .send(); // No payload in response
});

// Starting the server
app.listen(port, () => {
  // Displays the server port
  console.log(`Server is running at http://localhost:${port}`);
});