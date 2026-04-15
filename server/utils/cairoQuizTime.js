const { DateTime } = require('luxon');

const CAIRO_TZ = 'Africa/Cairo';

/**
 * Parse admin "local Cairo" datetime from `YYYY-MM-DDTHH:mm` or ISO with optional seconds.
 * Returns a JS Date in UTC for storage in MySQL DATETIME / Sequelize.
 */
function cairoLocalInputToUtc(input) {
  const s = String(input ?? '').trim();
  if (!s) {
    const err = new Error('Empty datetime');
    err.code = 'EMPTY';
    throw err;
  }
  const dt = DateTime.fromISO(s, { zone: CAIRO_TZ });
  if (!dt.isValid) {
    const err = new Error(`Invalid Cairo datetime: ${dt.invalidExplanation || 'unknown'}`);
    err.code = 'INVALID';
    throw err;
  }
  return dt.toUTC().toJSDate();
}

module.exports = { cairoLocalInputToUtc, CAIRO_TZ };
