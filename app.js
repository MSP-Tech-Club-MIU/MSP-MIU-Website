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

// Simple CORS configuration - allow all origins for now
// Note: If app is being decommissioned, this minimal setup is sufficient
app.use(cors());
// Use Express built-in JSON parser instead of body-parser (removes util._extend deprecation warning)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import API routes from server
const apiRoutes = require("./server/server");

// OpenAPI / Swagger UI (canonical spec: docs/openapi.yaml)
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const swaggerDocument = YAML.load(path.join(__dirname, "docs/openapi.yaml"));
app.get("/api/docs.json", (req, res) => {
  res.json(swaggerDocument);
});
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: "MSP-MIU API Docs",
    swaggerOptions: { persistAuthorization: true },
    // Auto-authorize after successful login (functions cannot go in swaggerOptions JSON)
    customJsStr: `
(function () {
  function authorize(token) {
    if (!token || !window.ui) return;
    try {
      window.ui.preauthorizeApiKey("bearerAuth", token);
    } catch (e) {}
    try {
      window.ui.authActions.authorize({
        bearerAuth: {
          name: "bearerAuth",
          schema: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
          value: token
        }
      });
    } catch (e2) {}
  }
  function tokenFromBody(text) {
    try {
      var data = JSON.parse(text);
      return data.token || (data.data && data.data.token) || null;
    } catch (e) {
      return null;
    }
  }
  function maybeCapture(url, status, text) {
    if (status < 200 || status >= 300) return;
    if (!/\\/(auth|users)\\/login/i.test(String(url || ""))) return;
    authorize(tokenFromBody(text));
  }
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function () {
      var input = arguments[0];
      var url = typeof input === "string" ? input : (input && input.url) || "";
      return origFetch.apply(this, arguments).then(function (response) {
        if (/\\/(auth|users)\\/login/i.test(url) && response.ok) {
          response.clone().text().then(function (text) { maybeCapture(url, response.status, text); });
        }
        return response;
      });
    };
  }
  var OrigXHR = window.XMLHttpRequest;
  if (OrigXHR) {
    window.XMLHttpRequest = function () {
      var xhr = new OrigXHR();
      var open = xhr.open;
      xhr.open = function (method, url) {
        xhr.__swaggerUrl = url;
        return open.apply(xhr, arguments);
      };
      xhr.addEventListener("load", function () {
        maybeCapture(xhr.__swaggerUrl, xhr.status, xhr.responseText);
      });
      return xhr;
    };
  }
})();
`,
  })
);

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
  // Exclude API routes from catch-all
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Missing static files must NOT return text/html (breaks script tags with "wrong MIME type")
  if (req.path.startsWith('/assets/') || req.path.startsWith('/uploads/')) {
    return res.status(404).type('text/plain').send('Not found');
  }
  // Avoid SPA fallback for typical asset URLs (wrong path, stale chunk name, etc.)
  if (/\.(js|mjs|cjs|css|map|json|woff2?|ttf|ico|png|jpe?g|gif|svg|webp|webmanifest)$/i.test(req.path)) {
    return res.status(404).type('text/plain').send('Not found');
  }
  res.sendFile(path.join(__dirname, "client/public/index.html"));
});

const { runAutoSubmitExpiredAttempts } = require("./server/services/quizAttemptLifecycle");

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  setInterval(() => {
    runAutoSubmitExpiredAttempts().catch((err) =>
      console.error("[quiz-auto-submit]", err)
    );
  }, 60_000);
  setTimeout(() => {
    runAutoSubmitExpiredAttempts().catch((err) =>
      console.error("[quiz-auto-submit]", err)
    );
  }, 10_000);
});

module.exports = app;
