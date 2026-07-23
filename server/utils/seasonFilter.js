const Season = require('../models/Season');

const SEASON_LABEL_RE = /^\d{2}\/\d{2}$/;

/**
 * Parse season_id query param.
 * @returns {{ mode: 'all' } | { mode: 'id', seasonId: number } | { mode: 'current' }}
 */
function parseSeasonQuery(query = {}) {
  const raw = query.season_id ?? query.season;
  if (raw === undefined || raw === null || raw === '' || raw === 'current') {
    return { mode: 'current' };
  }
  if (String(raw).toLowerCase() === 'all') {
    return { mode: 'all' };
  }
  const id = parseInt(String(raw), 10);
  if (!Number.isFinite(id) || id < 1) {
    return { mode: 'current' };
  }
  return { mode: 'id', seasonId: id };
}

async function getDefaultSeason() {
  const season = await Season.findOne({
    where: { is_default: true },
    order: [['season_id', 'ASC']]
  });
  if (season) return season;

  // Fallback: most recent active, or any
  const fallback = await Season.findOne({
    where: { is_active: true },
    order: [['start_year', 'DESC'], ['season_id', 'DESC']]
  });
  return fallback || (await Season.findOne({ order: [['season_id', 'DESC']] }));
}

async function getDefaultSeasonId() {
  const season = await getDefaultSeason();
  return season ? season.season_id : null;
}

/**
 * Resolve where clause fragment for season filtering.
 * @returns {Promise<{ where: object, includeSeason: boolean, season: object|null }>}
 */
async function resolveSeasonFilter(query = {}) {
  const parsed = parseSeasonQuery(query);

  if (parsed.mode === 'all') {
    return { where: {}, includeSeason: true, season: null, mode: 'all' };
  }

  if (parsed.mode === 'id') {
    const season = await Season.findByPk(parsed.seasonId);
    if (!season) {
      const err = new Error('Season not found');
      err.status = 404;
      throw err;
    }
    return {
      where: { season_id: season.season_id },
      includeSeason: false,
      season,
      mode: 'id'
    };
  }

  const season = await getDefaultSeason();
  if (!season) {
    return { where: {}, includeSeason: false, season: null, mode: 'current' };
  }
  return {
    where: { season_id: season.season_id },
    includeSeason: false,
    season,
    mode: 'current'
  };
}

/**
 * Sequelize include for Season when listing with season_id=all.
 */
function seasonInclude(required = false) {
  return {
    model: Season,
    as: 'season',
    attributes: ['season_id', 'label', 'start_year', 'end_year', 'is_default'],
    required
  };
}

/**
 * Resolve season_id for create/update. Defaults to active season.
 */
async function resolveSeasonIdForWrite(body = {}, query = {}) {
  const raw = body.season_id ?? query.season_id;
  if (raw !== undefined && raw !== null && raw !== '' && String(raw).toLowerCase() !== 'all' && String(raw).toLowerCase() !== 'current') {
    const id = parseInt(String(raw), 10);
    if (!Number.isFinite(id) || id < 1) {
      const err = new Error('Invalid season_id');
      err.status = 400;
      throw err;
    }
    const season = await Season.findByPk(id);
    if (!season) {
      const err = new Error('Season not found');
      err.status = 404;
      throw err;
    }
    return season.season_id;
  }

  const defaultId = await getDefaultSeasonId();
  if (!defaultId) {
    const err = new Error('No default season configured');
    err.status = 500;
    throw err;
  }
  return defaultId;
}

function parseSeasonLabel(label) {
  if (!SEASON_LABEL_RE.test(String(label || ''))) {
    return null;
  }
  const [a, b] = String(label).split('/').map((x) => parseInt(x, 10));
  const start_year = 2000 + a;
  const end_year = 2000 + b;
  if (end_year !== start_year + 1) {
    return null;
  }
  return { label: String(label), start_year, end_year };
}

function serializeSeason(season) {
  if (!season) return null;
  const plain = typeof season.toJSON === 'function' ? season.toJSON() : season;
  return {
    season_id: plain.season_id,
    label: plain.label,
    start_year: plain.start_year,
    end_year: plain.end_year,
    is_default: !!plain.is_default,
    is_active: plain.is_active !== undefined ? !!plain.is_active : true,
    sort_order: plain.sort_order ?? 0
  };
}

module.exports = {
  SEASON_LABEL_RE,
  parseSeasonQuery,
  getDefaultSeason,
  getDefaultSeasonId,
  resolveSeasonFilter,
  seasonInclude,
  resolveSeasonIdForWrite,
  parseSeasonLabel,
  serializeSeason
};
