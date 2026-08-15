/**
 * Structured, leveled logger for the MSP-MIU backend.
 * Production → single-line JSON on stdout/stderr (Render-friendly).
 * Development → human-readable lines with level prefixes.
 */

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
  silent: 100
};

const SENSITIVE_KEYS = [
  'password',
  'password_hash',
  'token',
  'secret',
  'key',
  'api_key',
  'authorization',
  'access_token',
  'refresh_token',
  'jwt'
];

const isSensitiveKey = (key) =>
  SENSITIVE_KEYS.some((sk) => String(key).toLowerCase().includes(sk));

/**
 * Deep-redact sensitive fields from plain objects (shallow recursion).
 * @param {*} value
 * @param {number} [depth]
 * @returns {*}
 */
const redact = (value, depth = 0) => {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }
  if (typeof value !== 'object') return value;
  if (value instanceof Error) return value;

  const out = {};
  for (const key of Object.keys(value)) {
    if (isSensitiveKey(key)) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = redact(value[key], depth + 1);
    }
  }
  return out;
};

/**
 * Sanitize error object to remove sensitive information
 * @param {Error} error
 * @returns {Object|null}
 */
const sanitizeError = (error) => {
  if (!error) return null;

  const sanitized = {
    name: error.name || 'Error',
    message: error.message || 'An error occurred',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };

  if (error.code != null) sanitized.code = error.code;

  if (error.data && typeof error.data === 'object') {
    sanitized.data = redact(error.data);
  }

  return sanitized;
};

/**
 * Get client IP address from request
 * @param {Object} req
 * @returns {string}
 */
const getClientIp = (req) => {
  if (!req) return 'unknown';

  return (
    req.ip ||
    (req.connection && req.connection.remoteAddress) ||
    (req.socket && req.socket.remoteAddress) ||
    (req.headers && req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : null) ||
    'unknown'
  );
};

/** In-memory ring buffer for the admin log viewer (lost on restart). */
const BUFFER_MAX = Math.min(
  Math.max(Number(process.env.LOG_BUFFER_SIZE) || 500, 50),
  5000
);
const logBuffer = [];
let logSeq = 0;
/** Runtime override; null means use LOG_LEVEL / NODE_ENV defaults. */
let runtimeLogLevel = null;

const resolveMinLevelName = () => {
  if (runtimeLogLevel && Object.prototype.hasOwnProperty.call(LEVELS, runtimeLogLevel)) {
    return runtimeLogLevel;
  }
  const fromEnv = (process.env.LOG_LEVEL || '').toLowerCase().trim();
  if (fromEnv && Object.prototype.hasOwnProperty.call(LEVELS, fromEnv)) {
    return fromEnv;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

const resolveMinLevel = () => LEVELS[resolveMinLevelName()];

const isProduction = () => process.env.NODE_ENV === 'production';

const pushToBuffer = (entry) => {
  logBuffer.push(entry);
  if (logBuffer.length > BUFFER_MAX) {
    logBuffer.splice(0, logBuffer.length - BUFFER_MAX);
  }
};

/**
 * Recent buffered log entries (newest last). Filters are optional.
 * @param {{ level?: string, type?: string, q?: string, limit?: number, sinceId?: number }} [opts]
 */
const getRecentLogs = (opts = {}) => {
  const limit = Math.min(Math.max(Number(opts.limit) || 200, 1), BUFFER_MAX);
  const minLevelNum =
    opts.level && LEVELS[opts.level] != null ? LEVELS[opts.level] : null;
  const typeFilter = opts.type ? String(opts.type).toLowerCase() : null;
  const q = opts.q ? String(opts.q).toLowerCase() : null;
  const sinceId = opts.sinceId != null ? Number(opts.sinceId) : null;

  let rows = logBuffer;
  if (sinceId != null && !Number.isNaN(sinceId)) {
    rows = rows.filter((e) => e.id > sinceId);
  }
  if (minLevelNum != null) {
    rows = rows.filter((e) => (LEVELS[e.level] || 0) >= minLevelNum);
  }
  if (typeFilter) {
    rows = rows.filter((e) => String(e.type || '').toLowerCase() === typeFilter);
  }
  if (q) {
    rows = rows.filter((e) => {
      try {
        return JSON.stringify(e).toLowerCase().includes(q);
      } catch {
        return String(e.msg || '').toLowerCase().includes(q);
      }
    });
  }

  const sliced = rows.slice(-limit);
  return {
    entries: sliced,
    totalBuffered: logBuffer.length,
    bufferMax: BUFFER_MAX,
    returned: sliced.length
  };
};

const clearLogBuffer = () => {
  logBuffer.length = 0;
};

const getLogLevel = () => ({
  level: resolveMinLevelName(),
  runtimeOverride: runtimeLogLevel,
  envLevel: (process.env.LOG_LEVEL || '').toLowerCase().trim() || null,
  nodeEnv: process.env.NODE_ENV || null,
  bufferMax: BUFFER_MAX,
  bufferCount: logBuffer.length,
  levels: Object.keys(LEVELS)
});

/**
 * Set runtime log level (does not rewrite process.env permanently).
 * @param {string} level
 * @returns {{ ok: boolean, error?: string, ... }}
 */
const setLogLevel = (level) => {
  const name = String(level || '')
    .toLowerCase()
    .trim();
  if (!Object.prototype.hasOwnProperty.call(LEVELS, name)) {
    return {
      ok: false,
      error: `Invalid level. Use one of: ${Object.keys(LEVELS).join(', ')}`
    };
  }
  runtimeLogLevel = name;
  return { ok: true, ...getLogLevel() };
};

/**
 * Normalize log arguments into { msg, meta, err }.
 * Supports:
 *   log('msg')
 *   log('msg', { meta })
 *   log('msg', err)
 *   log('msg', err, { meta })
 *   log('msg', { err, ...meta })
 */
const normalizeArgs = (message, arg2, arg3) => {
  let msg = message == null ? '' : String(message);
  let meta = {};
  let err = null;

  if (arg2 instanceof Error) {
    err = arg2;
    if (arg3 && typeof arg3 === 'object' && !(arg3 instanceof Error)) {
      meta = { ...arg3 };
    }
  } else if (arg2 && typeof arg2 === 'object') {
    meta = { ...arg2 };
    if (meta.err instanceof Error) {
      err = meta.err;
      delete meta.err;
    } else if (meta.error instanceof Error) {
      err = meta.error;
      delete meta.error;
    }
  }

  return { msg, meta: redact(meta), err };
};

const formatDevLine = (level, time, msg, fields) => {
  const prefix = `[${level.toUpperCase()}]`;
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return `${prefix} ${time} ${msg}`;
  }
  let metaStr;
  try {
    metaStr = JSON.stringify(fields);
  } catch {
    metaStr = String(fields);
  }
  return `${prefix} ${time} ${msg} ${metaStr}`;
};

const write = (level, bindings, message, arg2, arg3) => {
  const minLevel = resolveMinLevel();
  const levelNum = LEVELS[level];
  if (levelNum < minLevel) return;

  const time = new Date().toISOString();
  const { msg, meta, err } = normalizeArgs(message, arg2, arg3);

  const fields = {
    ...bindings,
    ...meta
  };

  if (err) {
    fields.err = sanitizeError(err);
  }

  const record = {
    id: ++logSeq,
    level,
    time,
    msg,
    ...fields
  };

  pushToBuffer(record);

  const stream = levelNum >= LEVELS.error ? process.stderr : process.stdout;

  if (isProduction()) {
    const { id, ...rest } = record;
    stream.write(`${JSON.stringify(rest)}\n`);
  } else {
    const { id, level: lvl, time: t, msg: m, ...restFields } = record;
    stream.write(`${formatDevLine(lvl, t, m, restFields)}\n`);
  }
};

const createLogger = (bindings = {}) => {
  const logAt = (level) => (message, arg2, arg3) => {
    write(level, bindings, message, arg2, arg3);
  };

  return {
    debug: logAt('debug'),
    info: logAt('info'),
    warn: logAt('warn'),
    error: logAt('error'),
    fatal: logAt('fatal'),
    child(childBindings = {}) {
      return createLogger({ ...bindings, ...childBindings });
    }
  };
};

const root = createLogger();

const { debug, info, warn, error, fatal, child } = root;

/**
 * Log audit event (login attempts, security events, etc.)
 * @param {string} event
 * @param {Object} details
 * @param {Object} req
 */
const logAuditEvent = (event, details = {}, req = null) => {
  const clientIp = req ? getClientIp(req) : 'unknown';
  const userAgent =
    req && req.headers && req.headers['user-agent']
      ? req.headers['user-agent']
      : 'unknown';

  info(event, {
    type: 'audit',
    event,
    clientIp,
    userAgent,
    ...details
  });
};

/**
 * Log error securely without exposing sensitive information
 * @param {string} context
 * @param {Error} errObj
 * @param {Object} additionalInfo
 * @param {Object} req
 */
const logError = (context, errObj, additionalInfo = {}, req = null) => {
  const clientIp = req ? getClientIp(req) : 'unknown';

  error(context, errObj instanceof Error ? errObj : new Error(String(errObj)), {
    type: 'error',
    context,
    clientIp,
    ...additionalInfo
  });
};

/**
 * Log security event
 * @param {string} event
 * @param {Object} details
 * @param {Object} req
 */
const logSecurityEvent = (event, details = {}, req = null) => {
  logAuditEvent(`SECURITY_${event}`, { type: 'security', ...details }, req);
};

module.exports = {
  LEVELS,
  debug,
  info,
  warn,
  error,
  fatal,
  child,
  createLogger,
  logAuditEvent,
  logError,
  logSecurityEvent,
  sanitizeError,
  getClientIp,
  redact,
  getRecentLogs,
  clearLogBuffer,
  getLogLevel,
  setLogLevel,
  // Convenience: allow `const logger = require('./logger'); logger.info(...)`
  ...root
};
