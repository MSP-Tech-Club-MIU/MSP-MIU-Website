/**
 * HTTP request logging middleware.
 * Logs method, path, status, duration_ms, client IP, and response error/rejection details.
 */

const logger = require('../utils/logger');
const { getClientIp, redact } = logger;

const SKIP_PREFIXES = [
  '/api/docs',
  '/api/admin/logs',
  '/favicon.ico',
  '/assets',
  '/uploads',
  '/robots.txt',
  '/sitemap.xml',
  '/og-image',
  '/msp-miu-logo.png'
];

const STATIC_EXT_RE = /\.(js|mjs|cjs|css|map|woff2?|ttf|ico|png|jpe?g|gif|svg|webp|webmanifest)$/i;

const shouldSkipAlways = (req) => {
  const path = req.originalUrl || req.url || '';
  return (
    path === '/api/admin/logs' ||
    path.startsWith('/api/admin/logs/') ||
    path.startsWith('/api/admin/logs?') ||
    path === '/api/docs' ||
    path.startsWith('/api/docs/') ||
    path.startsWith('/api/docs?') ||
    path === '/favicon.ico'
  );
};

const isStaticOrSpaNavigation = (req) => {
  const rawPath = (req.originalUrl || req.url || '').split('?')[0];
  if (rawPath.startsWith('/api/')) return false;
  if (STATIC_EXT_RE.test(rawPath)) return true;
  if (
    SKIP_PREFIXES.some(
      (prefix) => rawPath === prefix || rawPath.startsWith(`${prefix}/`)
    )
  ) {
    return true;
  }
  // Non-API GET requests are SPA HTML loads
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  return false;
};

/**
 * Express middleware — mount early after body parsers.
 */
const requestLogger = (req, res, next) => {
  if (shouldSkipAlways(req)) {
    return next();
  }

  const start = process.hrtime.bigint();
  let capturedBody = null;

  const origJson = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object') {
      capturedBody = body;
    }
    return origJson(body);
  };

  res.on('finish', () => {
    const status = res.statusCode;

    // Skip successful static file & SPA HTML loads so they don't flood the 500-entry buffer
    if (status < 400 && isStaticOrSpaNavigation(req)) {
      return;
    }

    const durationNs = process.hrtime.bigint() - start;
    const duration_ms = Number(durationNs) / 1e6;
    const path = req.originalUrl || req.url;

    const isBusinessRejection =
      capturedBody &&
      (capturedBody.eligible === false || capturedBody.success === false);

    const isErrorOrRejection = status >= 400 || isBusinessRejection;

    const meta = {
      type: 'http',
      method: req.method,
      path,
      status,
      duration_ms: Math.round(duration_ms * 100) / 100,
      clientIp: getClientIp(req)
    };

    if (req.user?.user_id) {
      meta.user_id = req.user.user_id;
    }

    let detailSuffix = '';
    if (isErrorOrRejection && capturedBody) {
      const errText =
        capturedBody.error ||
        capturedBody.message ||
        capturedBody.details ||
        null;
      if (errText) {
        meta.responseError = String(errText);
      }
      if (capturedBody.reason) {
        meta.reason = capturedBody.reason;
      }
      if (capturedBody.eligible === false) {
        meta.eligible = false;
      }
      if (capturedBody.details && capturedBody.details !== errText) {
        meta.details = capturedBody.details;
      }

      const summaryParts = [];
      if (capturedBody.reason) summaryParts.push(`[${capturedBody.reason}]`);
      if (errText) summaryParts.push(String(errText));
      if (summaryParts.length > 0) {
        detailSuffix = ` — ${summaryParts.join(' ')}`;
      }
    }

    if (
      isErrorOrRejection &&
      req.body &&
      typeof req.body === 'object' &&
      Object.keys(req.body).length > 0
    ) {
      meta.requestBody = redact(req.body);
    }

    const msg = `${req.method} ${path} ${status}${detailSuffix}`;

    if (status >= 500) {
      logger.error(msg, meta);
    } else if (status >= 400 || isBusinessRejection) {
      logger.warn(msg, meta);
    } else {
      logger.info(msg, meta);
    }
  });

  next();
};

module.exports = requestLogger;

