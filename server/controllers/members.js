const { Member, Department } = require('../models');
const { Op } = require('sequelize');
const { parsePagination, paginationMeta } = require('../utils/pagination');

const getAllMembers = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, department_id, faculty } = req.query;
    const where = {};

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      where[Op.or] = [
        { full_name: { [Op.like]: q } },
        { email: { [Op.like]: q } },
        { university_id: { [Op.like]: q } }
      ];
    }
    if (department_id) where.department_id = Number(department_id);
    if (faculty) where.faculty = faculty;

    const { rows: members, count: total } = await Member.findAndCountAll({
      where,
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['department_id', 'name'],
          required: false
        }
      ],
      order: [['joined_at', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: members,
      count: members.length,
      pagination: paginationMeta({ page, limit, total })
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findByPk(id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['department_id', 'name'],
          required: false
        }
      ]
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    const allowed = [
      'full_name',
      'email',
      'faculty',
      'year',
      'phone_number',
      'department_id',
      'university_id',
      'schedule'
    ];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    await member.update(updates);
    await member.reload();
    res.json({ success: true, data: member });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update member' });
  }
};

const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findByPk(id);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    await member.destroy();

    res.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = {
  getAllMembers,
  getMemberById,
  updateMember,
  deleteMember
};
