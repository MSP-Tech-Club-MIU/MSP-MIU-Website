require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const PORT = process.env.PORT;

const app = express();

// HTTPS redirect middleware
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

app.use(cors());
app.use(bodyParser.json());

// Import API routes from server
const apiRoutes = require("./server/server");

// API routes
app.use("/api", apiRoutes);

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, "client/public")));

// Catch-all handler: send back React's index.html file for any non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/public/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
