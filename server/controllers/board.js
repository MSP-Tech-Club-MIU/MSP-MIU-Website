const path = require('path');
const { Board, Department, Season } = require('../models');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const {
  resolveSeasonFilter,
  seasonInclude,
  resolveSeasonIdForWrite,
  getDefaultSeasonId
} = require('../utils/seasonFilter');
const { r2, PutObjectCommand } = require('../config/cloud');

const POSITION_VALUES = ['President', 'Vice President', 'Head', 'Co-Head', 'Founder'];

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

    res.json({
      success: true,
      data: rows,
      count: rows.length,
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
      yearValue = `${season.start_year}-${season.end_year}`;
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

    let activationEmail = null;
    if (member.email) {
      try {
        const { sendEmail } = await import('../utils/email.mjs');
        const { sendBoardActivationEmailForMember } = require('../utils/boardActivationEmail');
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

    await member.update(updates);
    await member.reload();
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
    await member.destroy();
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

module.exports = {
  getBoard,
  createBoardMember,
  updateBoardMember,
  deleteBoardMember,
  getMyBoardMembership,
  updateMyBoardPhoto
};
