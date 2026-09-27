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
  if (error.status != null) sanitized.status = error.status;

  // Preserve Sequelize / MySQL diagnostic details safely
  const sqlMessage = error.parent?.sqlMessage || error.original?.sqlMessage;
  const sqlCode = error.parent?.code || error.original?.code;
  if (sqlMessage) sanitized.sqlMessage = sqlMessage;
  if (sqlCode && !sanitized.code) sanitized.code = sqlCode;
  if (error.fields && typeof error.fields === 'object') {
    sanitized.fields = redact(error.fields);
  }
  if (error.table) sanitized.table = error.table;
  if (error.index) sanitized.index = error.index;
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    sanitized.validationErrors = error.errors.slice(0, 10).map((e) => ({
      field: e.path || e.field || undefined,
      message: e.message,
      type: e.type || e.validatorKey || undefined,
      value: isSensitiveKey(e.path || '') ? '[REDACTED]' : e.value
    }));
  }

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

const matchesTypeFilter = (entry, typeFilter) => {
  if (!typeFilter) return true;
  const t = String(entry.type || '').toLowerCase();
  const lvl = String(entry.level || '').toLowerCase();
  const path = String(entry.path || '').toLowerCase();
  const ctx = String(entry.context || '').toLowerCase();
  const evt = String(entry.event || '').toLowerCase();
  const msg = String(entry.msg || '').toLowerCase();
  const status = Number(entry.status);

  switch (typeFilter) {
    case 'error':
      return (
        t === 'error' ||
        lvl === 'error' ||
        lvl === 'fatal' ||
        Boolean(entry.err) ||
        (Number.isFinite(status) && status >= 500)
      );
    case 'http_error':
      return (
        (Number.isFinite(status) && status >= 400) ||
        entry.eligible === false ||
        lvl === 'warn' ||
        lvl === 'error' ||
        lvl === 'fatal'
      );
    case 'application':
      return (
        t === 'application' ||
        path.includes('/api/applications') ||
        ctx.startsWith('application') ||
        msg.includes('application')
      );
    case 'auth':
      return (
        t === 'auth' ||
        t === 'security' ||
        path.includes('/api/auth') ||
        path.includes('/api/users') ||
        ctx.startsWith('auth.') ||
        ctx.startsWith('user.') ||
        evt.includes('login') ||
        evt.includes('register') ||
        evt.includes('activat') ||
        evt.includes('password') ||
        evt.includes('token')
      );
    default:
      return t === typeFilter;
  }
};

/**
 * Recent buffered log entries (newest last). Filters are optional.
 * Supports level as:
 *   - 'debug' | 'info' | 'warn' | 'error' | 'fatal' (exact match when exact=true, or min level)
 *   - 'only:info' / 'exact:info' (exact level match)
 *   - 'min:warn' (minimum level match)
 * @param {{ level?: string, type?: string, q?: string, limit?: number, sinceId?: number }} [opts]
 */
const getRecentLogs = (opts = {}) => {
  const limit = Math.min(Math.max(Number(opts.limit) || 200, 1), BUFFER_MAX);
  const rawLevel = opts.level ? String(opts.level).toLowerCase().trim() : '';
  const typeFilter = opts.type ? String(opts.type).toLowerCase().trim() : null;
  const q = opts.q ? String(opts.q).toLowerCase().trim() : null;
  const sinceId = opts.sinceId != null ? Number(opts.sinceId) : null;

  const totalCounts = { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 };
  for (const e of logBuffer) {
    if (totalCounts[e.level] != null) totalCounts[e.level] += 1;
  }

  let rows = logBuffer;
  if (sinceId != null && !Number.isNaN(sinceId)) {
    rows = rows.filter((e) => e.id > sinceId);
  }

  if (rawLevel && rawLevel !== 'all') {
    if (rawLevel.startsWith('only:') || rawLevel.startsWith('exact:')) {
      const target = rawLevel.split(':')[1];
      if (LEVELS[target] != null) {
        rows = rows.filter((e) => e.level === target);
      }
    } else if (rawLevel.startsWith('min:')) {
      const target = rawLevel.split(':')[1];
      const minNum = LEVELS[target];
      if (minNum != null) {
        rows = rows.filter((e) => (LEVELS[e.level] || 0) >= minNum);
      }
    } else if (rawLevel.endsWith('+')) {
      const target = rawLevel.slice(0, -1);
      const minNum = LEVELS[target];
      if (minNum != null) {
        rows = rows.filter((e) => (LEVELS[e.level] || 0) >= minNum);
      }
    } else if (LEVELS[rawLevel] != null) {
      // Exact level match by default when a specific level is chosen
      rows = rows.filter((e) => e.level === rawLevel);
    }
  }

  if (typeFilter) {
    rows = rows.filter((e) => matchesTypeFilter(e, typeFilter));
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
    totalCounts,
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

  if ((level === 'error' || level === 'fatal') && !fields.type) {
    fields.type = 'error';
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

  const isFailure = /(FAIL|BLOCK|DENIED|REJECT|ERROR|INVALID|EXPIRED)/i.test(String(event || ''));
  const logFn = isFailure ? warn : info;

  logFn(event, {
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
  const clientIp = req ? getClientIp(req) : 'unknown';
  const userAgent =
    req && req.headers && req.headers['user-agent']
      ? req.headers['user-agent']
      : 'unknown';

  warn(`SECURITY_${event}`, {
    type: 'security',
    event: `SECURITY_${event}`,
    clientIp,
    userAgent,
    ...details
  });
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
