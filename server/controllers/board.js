const { Board, Department } = require('../models');
const { parsePagination, paginationMeta } = require('../utils/pagination');

const POSITION_VALUES = ['President', 'Vice President', 'Head', 'Co-Head', 'Founder'];

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
    const where = {};
    if (!includeHidden) {
      where.is_visible = true;
    }

    const { rows, count: total } = await Board.findAndCountAll({
      where,
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['department_id', 'name'],
          required: false
        }
      ],
      order: [
        ['sort_order', 'ASC'],
        ['board_id', 'ASC']
      ],
      limit,
      offset
    });

    res.json({
      success: true,
      data: rows,
      count: rows.length,
      pagination: paginationMeta({ page, limit, total })
    });
  } catch (err) {
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
    if (!year || !String(year).trim()) {
      return res.status(400).json({ success: false, error: 'year is required (e.g. 2025-2026)' });
    }

    const member = await Board.create({
      full_name: String(full_name).trim(),
      position,
      department_id: department_id != null && department_id !== '' ? Number(department_id) : null,
      year: String(year).trim(),
      email: email || null,
      university_id: university_id || null,
      user_id: user_id != null && user_id !== '' ? Number(user_id) : null,
      photo_url: photo_url || null,
      linkedin_url: linkedin_url || null,
      github_url: github_url || null,
      sort_order: Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
      is_visible: is_visible === undefined ? true : Boolean(is_visible)
    });

    res.status(201).json({ success: true, data: member });
  } catch (error) {
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
      } else if (field === 'full_name' || field === 'year') {
        updates[field] = String(req.body[field]).trim();
      } else {
        updates[field] = req.body[field] || null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    await member.update(updates);
    await member.reload();
    res.json({ success: true, data: member });
  } catch (error) {
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

module.exports = {
  getBoard,
  createBoardMember,
  updateBoardMember,
  deleteBoardMember
};
