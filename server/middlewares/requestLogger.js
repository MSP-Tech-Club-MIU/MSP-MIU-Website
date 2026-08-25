/**
 * HTTP request logging middleware.
 * Logs method, path, status, duration_ms, and client IP.
 */

const logger = require('../utils/logger');
const { getClientIp } = logger;

const SKIP_PREFIXES = [
  '/api/docs',
  '/api/admin/logs',
  '/favicon.ico'
];

const shouldSkip = (req) => {
  const path = req.originalUrl || req.url || '';
  return SKIP_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)
  );
};

/**
 * Express middleware — mount early after body parsers.
 */
const requestLogger = (req, res, next) => {
  if (shouldSkip(req)) {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const duration_ms = Number(durationNs) / 1e6;
    const status = res.statusCode;
    const meta = {
      type: 'http',
      method: req.method,
      path: req.originalUrl || req.url,
      status,
      duration_ms: Math.round(duration_ms * 100) / 100,
      clientIp: getClientIp(req)
    };

    const msg = `${req.method} ${req.originalUrl || req.url} ${status}`;

    if (status >= 500) {
      logger.error(msg, meta);
    } else if (status >= 400) {
      logger.warn(msg, meta);
    } else {
      logger.info(msg, meta);
    }
  });

  next();
};

module.exports = requestLogger;
