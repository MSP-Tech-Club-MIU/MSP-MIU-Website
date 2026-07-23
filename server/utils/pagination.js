/**
 * Shared offset pagination helpers for list APIs.
 * Query: page (1-based), limit (default 20, max 100)
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * @param {object} query - req.query
 * @param {{ defaultLimit?: number, maxLimit?: number }} [options]
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(query = {}, options = {}) {
  const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = options.maxLimit ?? MAX_LIMIT;

  let page = parseInt(query.page, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * @param {{ page: number, limit: number, total: number }} args
 */
function paginationMeta({ page, limit, total }) {
  const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / limit);
  return {
    page,
    limit,
    total: safeTotal,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1 && totalPages > 0
  };
}

/**
 * Paginate an in-memory array (e.g. after cloud ListObjects).
 * @returns {{ rows: any[], total: number }}
 */
function paginateArray(items, { page, limit, offset }) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const rows = list.slice(offset, offset + limit);
  return { rows, total };
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePagination,
  paginationMeta,
  paginateArray
};
