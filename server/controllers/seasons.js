const Season = require('../models/Season');
const Board = require('../models/Board');
const User = require('../models/User');
const Department = require('../models/Department');
const { Op } = require('sequelize');
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

    const seasonYear = `${parsed.start_year}/${parsed.end_year}`;
    const boardValidation = validateInitialBoardMembers(
      req.body?.board_members,
      seasonYear
    );
    if (!boardValidation.ok) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: boardValidation.error });
    }

    // Pre-check FKs so we fail with a clear 400 instead of a MySQL 500
    const userIds = [
      ...new Set(
        boardValidation.members
          .map((m) => m.user_id)
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    ];
    if (userIds.length) {
      const users = await User.findAll({
        where: { user_id: { [Op.in]: userIds } },
        attributes: ['user_id'],
        transaction
      });
      const found = new Set(users.map((u) => u.user_id));
      const missing = userIds.filter((id) => !found.has(id));
      if (missing.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: `Unknown user_id(s): ${missing.join(', ')}. Search and select the person again so the linked user is valid.`
        });
      }
    }

    const deptIds = [
      ...new Set(
        boardValidation.members
          .map((m) => m.department_id)
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    ];
    if (deptIds.length) {
      const depts = await Department.findAll({
        where: { department_id: { [Op.in]: deptIds } },
        attributes: ['department_id'],
        transaction
      });
      const found = new Set(depts.map((d) => d.department_id));
      const missing = deptIds.filter((id) => !found.has(id));
      if (missing.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: `Unknown department_id(s): ${missing.join(', ')}. Pick a department from the list.`
        });
      }
    }

    // Reject leadership placeholder departments for Head / Co-Head
    for (let i = 0; i < boardValidation.members.length; i += 1) {
      const m = boardValidation.members[i];
      if (
        (m.position === 'Head' || m.position === 'Co-Head') &&
        [7, 8, 9].includes(Number(m.department_id))
      ) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: `Board member #${i + 1}: ${m.position} must use a real department (not President/VP/Founder).`
        });
      }
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
      try {
        const row = await Board.create(
          {
            full_name: member.full_name,
            position: member.position,
            department_id: member.department_id,
            year: member.year || seasonYear,
            season_id: season.season_id,
            email: member.email,
            university_id: member.university_id || null,
            faculty: member.faculty || null,
            user_id: member.user_id,
            photo_url: member.photo_url || null,
            linkedin_url: member.linkedin_url || null,
            github_url: member.github_url || null,
            sort_order: member.sort_order || 0,
            is_visible: member.is_visible !== false
          },
          { transaction }
        );
        createdBoard.push(row);
      } catch (memberErr) {
        const sqlMessage =
          memberErr.parent?.sqlMessage ||
          memberErr.original?.sqlMessage ||
          memberErr.message;
        const dup =
          memberErr.name === 'SequelizeUniqueConstraintError' ||
          /Duplicate entry/i.test(String(sqlMessage || ''));
        if (dup) {
          const err = new Error(
            `Could not add "${member.full_name}": board identity must be unique per season only. ` +
              `The database may still have a unique index on university ID / user ID. ` +
              `Run: npm run patch:board-multi-season — then try again. (${sqlMessage})`
          );
          err.name = 'SequelizeUniqueConstraintError';
          throw err;
        }
        const err = new Error(
          `Could not add board member "${member.full_name}": ${sqlMessage}`
        );
        err.name = memberErr.name;
        err.parent = memberErr.parent;
        err.original = memberErr.original;
        err.errors = memberErr.errors;
        throw err;
      }
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      data: serializeSeason(season),
      board: createdBoard,
      message: 'Season created with initial board members'
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {
      /* already finished */
    }
    console.error('createSeason error:', error);
    const sqlMessage = error.parent?.sqlMessage || error.original?.sqlMessage;
    const validationErrors = Array.isArray(error.errors)
      ? error.errors.map((e) => e.message).join('; ')
      : null;
    const detail = validationErrors || sqlMessage || error.message || 'Failed to create season';

    if (
      error.name === 'SequelizeValidationError' ||
      error.name === 'SequelizeUniqueConstraintError' ||
      error.name === 'SequelizeForeignKeyConstraintError'
    ) {
      return res.status(400).json({ success: false, error: detail });
    }

    return res.status(500).json({ success: false, error: detail });
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
