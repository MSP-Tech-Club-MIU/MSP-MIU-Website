const path = require('path');
const { Op } = require('sequelize');
const { Board, Department, Season, User } = require('../models');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const {
  resolveSeasonFilter,
  seasonInclude,
  resolveSeasonIdForWrite,
  getDefaultSeasonId
} = require('../utils/seasonFilter');
const { r2, PutObjectCommand } = require('../config/cloud');
const { sendBoardActivationEmailForMember } = require('../utils/boardActivationEmail');
const {
  syncUserFromBoard,
  demoteUserIfNoCurrentBoard
} = require('../utils/boardUserSync');

const POSITION_VALUES = ['President', 'Vice President', 'Head', 'Co-Head', 'Founder'];

function hasActiveAccount(user) {
  return Boolean(user && (user.is_active || user.password_hash));
}

async function attachAccountStatus(boardMembers) {
  const emails = [
    ...new Set(
      boardMembers
        .map((m) => (m.email ? String(m.email).trim() : null))
        .filter(Boolean)
    )
  ];
  const userIds = [
    ...new Set(
      boardMembers
        .map((m) => (m.user_id != null && m.user_id !== '' ? Number(m.user_id) : null))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  ];

  const orClauses = [];
  if (emails.length) orClauses.push({ email: { [Op.in]: emails } });
  if (userIds.length) orClauses.push({ user_id: { [Op.in]: userIds } });

  const users = orClauses.length
    ? await User.findAll({
        where: { [Op.or]: orClauses },
        attributes: ['user_id', 'email', 'is_active', 'password_hash']
      })
    : [];

  const userById = new Map(users.map((u) => [Number(u.user_id), u]));
  const userByEmail = new Map(
    users
      .filter((u) => u.email)
      .map((u) => [String(u.email).trim().toLowerCase(), u])
  );

  return boardMembers.map((member) => {
    const json = typeof member.toJSON === 'function' ? member.toJSON() : { ...member };
    const linked = json.user_id != null ? userById.get(Number(json.user_id)) : null;
    const emailKey = json.email ? String(json.email).trim().toLowerCase() : null;
    const byEmail = emailKey ? userByEmail.get(emailKey) : null;
    return {
      ...json,
      has_active_account: hasActiveAccount(linked) || hasActiveAccount(byEmail)
    };
  });
}

async function findBoardMembershipForUser(userId) {
  const members = await Board.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name'],
        required: false
      },
      seasonInclude()
    ],
    order: [
      ['board_id', 'DESC']
    ]
  });

  if (!members.length) return null;

  const defaultSeasonId = await getDefaultSeasonId();
  if (defaultSeasonId != null) {
    const current = members.find((m) => m.season_id === defaultSeasonId);
    if (current) return current;
  }
  return members[0];
}

const getBoard = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const includeHidden = req.query.includeHidden === 'true';
    // Hidden members only for authenticated board/admin (token optional on public GET)
    if (includeHidden) {
      const authHeader = req.headers.authorization || '';
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Auth required to include hidden members' });
      }
    }

    const seasonFilter = await resolveSeasonFilter(req.query);
    const where = { ...seasonFilter.where };
    if (!includeHidden) {
      where.is_visible = true;
    }

    const include = [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name'],
        required: false
      }
    ];
    if (seasonFilter.includeSeason) {
      include.push(seasonInclude());
    }

    const { rows, count: total } = await Board.findAndCountAll({
      where,
      include,
      order: [
        ['sort_order', 'ASC'],
        ['board_id', 'ASC']
      ],
      limit,
      offset,
      distinct: true
    });

    // Account status is admin-only (includeHidden requires auth)
    const data = includeHidden ? await attachAccountStatus(rows) : rows;

    res.json({
      success: true,
      data,
      count: data.length,
      pagination: paginationMeta({ page, limit, total })
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    console.error(err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
};

const createBoardMember = async (req, res) => {
  try {
    const {
      full_name,
      position,
      department_id,
      year,
      email,
      university_id,
      faculty,
      user_id,
      photo_url,
      linkedin_url,
      github_url,
      sort_order,
      is_visible
    } = req.body;

    if (!full_name || !String(full_name).trim()) {
      return res.status(400).json({ success: false, error: 'full_name is required' });
    }
    if (!position || !POSITION_VALUES.includes(position)) {
      return res.status(400).json({
        success: false,
        error: `position must be one of: ${POSITION_VALUES.join(', ')}`
      });
    }

    if (
      (position === 'Head' || position === 'Co-Head') &&
      (department_id == null || department_id === '')
    ) {
      return res.status(400).json({
        success: false,
        error: `department_id is required for ${position} (Meet the Board hierarchy)`
      });
    }

    const season_id = await resolveSeasonIdForWrite(req.body, req.query);
    const season = await Season.findByPk(season_id);
    let yearValue = year != null && String(year).trim() ? String(year).trim() : null;
    if (!yearValue && season) {
      yearValue = `${season.start_year}/${season.end_year}`;
    }
    if (!yearValue) {
      return res.status(400).json({ success: false, error: 'year is required (e.g. 2025-2026)' });
    }

    const member = await Board.create({
      full_name: String(full_name).trim(),
      position,
      department_id: department_id != null && department_id !== '' ? Number(department_id) : null,
      year: yearValue,
      season_id,
      email: email || null,
      university_id: university_id || null,
      faculty: faculty != null && String(faculty).trim() ? String(faculty).trim() : null,
      user_id: user_id != null && user_id !== '' ? Number(user_id) : null,
      photo_url: photo_url || null,
      linkedin_url: linkedin_url || null,
      github_url: github_url || null,
      sort_order: Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
      is_visible: is_visible === undefined ? true : Boolean(is_visible)
    });

    try {
      await syncUserFromBoard(member);
    } catch (syncErr) {
      console.error('Board user sync failed after create:', syncErr);
    }

    let activationEmail = null;
    if (member.email) {
      try {
        const { sendEmail } = await import('../utils/email.mjs');
        const result = await sendBoardActivationEmailForMember(member, sendEmail);
        activationEmail = result;
      } catch (emailErr) {
        console.error('Board activation email failed:', emailErr);
        activationEmail = {
          success: false,
          error: emailErr.message || 'Failed to send activation email'
        };
      }
    }

    const payload = { success: true, data: member };
    if (activationEmail) {
      payload.activationEmail = activationEmail;
      if (!activationEmail.success && !activationEmail.skipped) {
        payload.warning = activationEmail.error || 'Board member created but activation email failed';
      }
    }
    res.status(201).json(payload);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Error creating board member:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create board member' });
  }
};

const updateBoardMember = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Board.findByPk(id);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Board member not found' });
    }

    const fields = [
      'full_name',
      'position',
      'department_id',
      'year',
      'email',
      'university_id',
      'faculty',
      'user_id',
      'photo_url',
      'linkedin_url',
      'github_url',
      'sort_order',
      'is_visible'
    ];

    const updates = {};
    for (const field of fields) {
      if (req.body[field] === undefined) continue;
      if (field === 'position' && !POSITION_VALUES.includes(req.body[field])) {
        return res.status(400).json({
          success: false,
          error: `position must be one of: ${POSITION_VALUES.join(', ')}`
        });
      }
      if (['department_id', 'user_id', 'sort_order'].includes(field)) {
        const raw = req.body[field];
        updates[field] =
          raw === null || raw === '' ? (field === 'sort_order' ? 0 : null) : Number(raw);
      } else if (field === 'is_visible') {
        updates[field] = Boolean(req.body[field]);
      } else if (field === 'full_name' || field === 'year' || field === 'faculty') {
        const raw = req.body[field];
        updates[field] =
          raw === null || raw === ''
            ? (field === 'faculty' ? null : String(raw || '').trim())
            : String(raw).trim();
      } else {
        updates[field] = req.body[field] || null;
      }
    }

    if (req.body.season_id !== undefined) {
      updates.season_id = await resolveSeasonIdForWrite(req.body, req.query);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const previousUserId = member.user_id;
    const previousDepartmentId = member.department_id;
    const previousPosition = member.position;

    await member.update(updates);
    await member.reload();

    try {
      await syncUserFromBoard(member);
      const userIdDiffers =
        previousUserId != null &&
        Number(previousUserId) !== Number(member.user_id ?? NaN);
      const positionOrDeptChanged =
        previousPosition !== member.position ||
        Number(previousDepartmentId ?? NaN) !== Number(member.department_id ?? NaN);
      const userUnlinked = previousUserId != null && member.user_id == null;
      if (
        previousUserId != null &&
        (userIdDiffers || (positionOrDeptChanged && userUnlinked))
      ) {
        await demoteUserIfNoCurrentBoard(previousUserId);
      }
    } catch (syncErr) {
      console.error('Board user sync failed after update:', syncErr);
    }

    res.json({ success: true, data: member });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Error updating board member:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update board member' });
  }
};

const deleteBoardMember = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Board.findByPk(id);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Board member not found' });
    }
    const userId = member.user_id;
    await member.destroy();
    try {
      if (userId != null) {
        await demoteUserIfNoCurrentBoard(userId);
      }
    } catch (syncErr) {
      console.error('Board user demote failed after delete:', syncErr);
    }
    res.json({ success: true, message: 'Board member deleted' });
  } catch (error) {
    console.error('Error deleting board member:', error);
    res.status(500).json({ success: false, error: 'Failed to delete board member' });
  }
};

const getMyBoardMembership = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const member = await findBoardMembershipForUser(userId);
    if (!member) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: member });
  } catch (error) {
    console.error('Error fetching own board membership:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch board membership' });
  }
};

const updateMyBoardPhoto = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const member = await findBoardMembershipForUser(userId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'No board membership linked to your account'
      });
    }

    const photoFile = req.file || null;
    let photo_url = null;

    if (photoFile) {
      if (!photoFile.mimetype?.startsWith('image/')) {
        return res.status(400).json({
          success: false,
          error: 'Meet the Board photo must be an image file'
        });
      }

      const ext = path.extname(photoFile.originalname) || '.png';
      const unique = `${Date.now()}_${Math.random().toString(36).substring(2)}${ext}`;
      const key = `Images/board_${userId}_${unique}`;

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: key,
          Body: photoFile.buffer,
          ContentType: photoFile.mimetype
        })
      );

      photo_url = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;
    } else if (req.body.photo_url !== undefined) {
      photo_url =
        req.body.photo_url === null || req.body.photo_url === ''
          ? null
          : String(req.body.photo_url).trim();
    } else {
      return res.status(400).json({
        success: false,
        error: 'Provide a photo file or photo_url'
      });
    }

    await member.update({ photo_url });
    await member.reload({
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['department_id', 'name'],
          required: false
        },
        seasonInclude()
      ]
    });
    res.json({ success: true, data: member });
  } catch (error) {
    console.error('Error updating own board photo:', error);
    res.status(500).json({ success: false, error: 'Failed to update Meet the Board photo' });
  }
};

/**
 * Send a board account activation email to a single board member.
 */
const sendBoardActivationEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Board.findByPk(id);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Board member not found' });
    }

    const { sendEmail } = await import('../utils/email.mjs');
    const result = await sendBoardActivationEmailForMember(member, sendEmail);

    if (result.skipped) {
      return res.status(400).json({
        success: false,
        error: result.reason || 'Board member already has an active account',
        data: result
      });
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send activation email',
        data: result
      });
    }

    res.json({
      success: true,
      message: `Board account activation email sent to ${result.email}`,
      data: result
    });
  } catch (error) {
    console.error('Error sending board activation email:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send board activation email'
    });
  }
};

module.exports = {
  getBoard,
  createBoardMember,
  updateBoardMember,
  deleteBoardMember,
  getMyBoardMembership,
  updateMyBoardPhoto,
  sendBoardActivationEmail
};
