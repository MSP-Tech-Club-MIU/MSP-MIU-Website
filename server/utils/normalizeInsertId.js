/**
 * Sequelize/MySQL INSERT can return a number, ResultSetHeader, or [rows, fields].
 * Normalize all of them into a numeric id.
 * @param {unknown} raw
 * @returns {number|null}
 */
function normalizeInsertId(raw) {
    if (raw == null) return null;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'bigint') return Number(raw);
    if (typeof raw === 'string' && /^\d+$/.test(raw)) return parseInt(raw, 10);
    if (typeof raw === 'object') {
        if (raw.insertId != null) return Number(raw.insertId);
        if (Array.isArray(raw) && raw.length > 0) return normalizeInsertId(raw[0]);
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

module.exports = {
    normalizeInsertId
};
