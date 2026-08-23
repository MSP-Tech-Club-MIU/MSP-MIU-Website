const logger = require('../utils/logger');
const { logAdminAction } = require('../utils/adminNotification');
const {
  getRecentLogs,
  clearLogBuffer,
  getLogLevel,
  setLogLevel,
  logAuditEvent,
  logError
} = logger;

/**
 * GET /api/admin/logs
 * Query: level, type, q, limit, sinceId
 */
const listLogs = (req, res) => {
  try {
    const { level, type, q, limit, sinceId } = req.query;
    const result = getRecentLogs({
      level: level || undefined,
      type: type || undefined,
      q: q || undefined,
      limit: limit ? Number(limit) : 200,
      sinceId: sinceId != null ? Number(sinceId) : undefined
    });

    res.json({
      success: true,
      data: {
        ...result,
        meta: getLogLevel()
      }
    });
  } catch (error) {
    logError('admin.logs.list', error, {}, req);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

/**
 * GET /api/admin/logs/meta
 */
const getLogsMeta = (req, res) => {
  try {
    res.json({ success: true, data: getLogLevel() });
  } catch (error) {
    logError('admin.logs.meta', error, {}, req);
    res.status(500).json({ error: 'Failed to fetch log settings' });
  }
};

/**
 * PATCH /api/admin/logs/level
 * Body: { level: 'debug'|'info'|... }
 */
const patchLogLevel = async (req, res) => {
  try {
    const { level } = req.body || {};
    const result = setLogLevel(level);
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    logAuditEvent(
      'LOG_LEVEL_CHANGED',
      {
        level: result.level,
        changed_by: req.user?.user_id
      },
      req
    );

    await logAdminAction(
      'log_level_changed',
      `Changed server log level to "${result.level}"`,
      req,
      'admin_logs'
    );

    res.json({
      success: true,
      message: `Log level set to ${result.level}`,
      data: result
    });
  } catch (error) {
    logError('admin.logs.setLevel', error, {}, req);
    res.status(500).json({ error: 'Failed to update log level' });
  }
};

/**
 * DELETE /api/admin/logs
 * Clears the in-memory buffer.
 */
const clearLogs = async (req, res) => {
  try {
    clearLogBuffer();
    logAuditEvent(
      'LOG_BUFFER_CLEARED',
      { cleared_by: req.user?.user_id },
      req
    );

    await logAdminAction(
      'log_buffer_cleared',
      'Cleared in-memory server log buffer',
      req,
      'admin_logs'
    );

    res.json({
      success: true,
      message: 'Log buffer cleared',
      data: getLogLevel()
    });
  } catch (error) {
    logError('admin.logs.clear', error, {}, req);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
};

module.exports = {
  listLogs,
  getLogsMeta,
  patchLogLevel,
  clearLogs
};
