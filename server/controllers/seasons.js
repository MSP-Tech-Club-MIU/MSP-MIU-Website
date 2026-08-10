const Season = require('../models/Season');
const Board = require('../models/Board');
const {
  parseSeasonLabel,
  serializeSeason,
  getDefaultSeason
} = require('../utils/seasonFilter');
const {
  validateInitialBoardMembers,
  seasonHasAdminEligibleBoard
} = require('../utils/adminEligibleBoard');

/**
 * GET /seasons — list seasons for selectors
 * Query: includeInactive=true (admin only) to include hidden seasons
 */
const listSeasons = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '') === 'true';
    if (includeInactive && !req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to list inactive seasons'
      });
    }
    const where = includeInactive ? {} : { is_active: true };
    const seasons = await Season.findAll({
      where,
      order: [
        ['is_default', 'DESC'],
        ['start_year', 'DESC'],
        ['sort_order', 'ASC'],
        ['season_id', 'DESC']
      ]
    });

    const defaultSeason = seasons.find((s) => s.is_default) || (await getDefaultSeason());

    return res.json({
      success: true,
      data: seasons.map(serializeSeason),
      default_season_id: defaultSeason ? defaultSeason.season_id : null,
      count: seasons.length
    });
  } catch (error) {
    console.error('listSeasons error:', error);
    return res.status(500).json({ success: false, error: 'Failed to list seasons' });
  }
};

/**
 * GET /seasons/current
 */
const getCurrentSeason = async (req, res) => {
  try {
    const season = await getDefaultSeason();
    if (!season) {
      return res.status(404).json({ success: false, error: 'No default season configured' });
    }
    return res.json({
      success: true,
      data: serializeSeason(season),
      season_id: season.season_id
    });
  } catch (error) {
    console.error('getCurrentSeason error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get current season' });
  }
};

/**
 * POST /seasons — admin create
 * Body: { label: "26/27", is_default?, is_active?, sort_order?, board_members: [...] }
 * Requires at least one admin-eligible board member with linked user_id.
 */
const createSeason = async (req, res) => {
  const transaction = await Season.sequelize.transaction();
  try {
    const parsed = parseSeasonLabel(req.body?.label);
    if (!parsed) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Invalid label. Use format NN/NN where end year is start+1 (e.g. 25/26).'
      });
    }

    const existing = await Season.findOne({
      where: { label: parsed.label },
      transaction
    });
    if (existing) {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: 'Season already exists' });
    }

    const seasonYear = `${parsed.start_year}-${parsed.end_year}`;
    const boardValidation = validateInitialBoardMembers(
      req.body?.board_members,
      seasonYear
    );
    if (!boardValidation.ok) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: boardValidation.error });
    }

    const makeDefault = !!req.body?.is_default;
    if (makeDefault) {
      await Season.update(
        { is_default: false },
        { where: { is_default: true }, transaction }
      );
    }

    const season = await Season.create(
      {
        label: parsed.label,
        start_year: parsed.start_year,
        end_year: parsed.end_year,
        is_default: makeDefault,
        is_active: req.body?.is_active !== false,
        sort_order: Number.isFinite(Number(req.body?.sort_order))
          ? Number(req.body.sort_order)
          : 0
      },
      { transaction }
    );

    // Ensure at least one default
    if (!makeDefault) {
      const anyDefault = await Season.findOne({
        where: { is_default: true },
        transaction
      });
      if (!anyDefault) {
        await season.update({ is_default: true }, { transaction });
      }
    }

    const createdBoard = [];
    for (const member of boardValidation.members) {
      const row = await Board.create(
        {
          ...member,
          season_id: season.season_id,
          year: member.year || seasonYear
        },
        { transaction }
      );
      createdBoard.push(row);
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      data: serializeSeason(season),
      board: createdBoard,
      message: 'Season created with initial board members'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('createSeason error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create season' });
  }
};

/**
 * PUT /seasons/:id
 */
const updateSeason = async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const season = await Season.findByPk(id);
    if (!season) {
      return res.status(404).json({ success: false, error: 'Season not found' });
    }

    const updates = {};
    if (req.body?.label !== undefined) {
      const parsed = parseSeasonLabel(req.body.label);
      if (!parsed) {
        return res.status(400).json({
          success: false,
          error: 'Invalid label. Use format NN/NN where end year is start+1 (e.g. 25/26).'
        });
      }
      const clash = await Season.findOne({ where: { label: parsed.label } });
      if (clash && clash.season_id !== season.season_id) {
        return res.status(409).json({ success: false, error: 'Season label already in use' });
      }
      updates.label = parsed.label;
      updates.start_year = parsed.start_year;
      updates.end_year = parsed.end_year;
    }
    if (req.body?.is_active !== undefined) {
      updates.is_active = !!req.body.is_active;
    }
    if (req.body?.sort_order !== undefined) {
      updates.sort_order = Number(req.body.sort_order) || 0;
    }

    await season.update(updates);
    return res.json({
      success: true,
      data: serializeSeason(season),
      message: 'Season updated'
    });
  } catch (error) {
    console.error('updateSeason error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update season' });
  }
};

/**
 * POST /seasons/:id/set-default
 * Blocked unless the season already has an admin-eligible board member.
 */
const setDefaultSeason = async (req, res) => {
  const transaction = await Season.sequelize.transaction();
  try {
    const id = parseInt(String(req.params.id), 10);
    const season = await Season.findByPk(id, { transaction });
    if (!season) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Season not found' });
    }

    const hasAdmin = await seasonHasAdminEligibleBoard(id, { transaction });
    if (!hasAdmin) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error:
          'Cannot set as default: this season needs at least one board member who is President, Vice President, or Head of Software Development / Technical Training, linked to a user account. Add them on the Board tab first.'
      });
    }

    await Season.update(
      { is_default: false },
      { where: { is_default: true }, transaction }
    );
    await season.update({ is_default: true, is_active: true }, { transaction });
    await transaction.commit();

    return res.json({
      success: true,
      data: serializeSeason(season),
      message: `${season.label} is now the current season`
    });
  } catch (error) {
    await transaction.rollback();
    console.error('setDefaultSeason error:', error);
    return res.status(500).json({ success: false, error: 'Failed to set default season' });
  }
};

module.exports = {
  listSeasons,
  getCurrentSeason,
  createSeason,
  updateSeason,
  setDefaultSeason
};
