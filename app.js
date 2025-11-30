require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const PORT = process.env.PORT;

// Suppress util._extend deprecation warning from dependencies
// This warning comes from transitive dependencies (likely from older versions of body-parser 
// used by other packages) and doesn't affect functionality since we're using Express's built-in JSON parser
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning, type, code, ctor) {
  // Suppress only the util._extend deprecation warning
  if (typeof warning === 'string' && warning.includes('util._extend')) {
    return; // Suppress this specific warning
  }
  // Emit all other warnings normally
  return originalEmitWarning.call(this, warning, type, code, ctor);
};

const app = express();

// CORS configuration for web and mobile apps
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:5173', // Vite dev server
      'http://localhost:3000', // Backend dev server
      'https://msp-miu.tech', // Production website
      'capacitor://localhost', // Capacitor iOS
      'ionic://localhost', // Ionic iOS
      'http://localhost', // Capacitor Android
      'https://localhost', // Capacitor Android HTTPS
    ];
    
    // Allow if origin is in allowed list or if it's a mobile app (no origin)
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
// Use Express built-in JSON parser instead of body-parser (removes util._extend deprecation warning)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import API routes from server
const apiRoutes = require("./server/server");

// API routes
app.use("/api", apiRoutes);

// Serve uploaded files (profile pictures, etc.)
app.use("/uploads", express.static(path.join(__dirname, "server/uploads")));

// Serve static files from the React app build directory (assets, images, etc.)
app.use(express.static(path.join(__dirname, "client/public")));

// Serve assets with explicit path to ensure images are accessible
app.use("/assets", express.static(path.join(__dirname, "client/public/assets")));

// Catch-all handler: send back React's index.html file for any non-API routes
// This must be last to not interfere with static file serving
app.get("*", (req, res) => {
  // Don't serve index.html for asset requests
  if (req.path.startsWith('/assets/') || req.path.startsWith('/uploads/')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, "client/public/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
