const { Department } = require('../models');
const { parsePagination, paginationMeta } = require('../utils/pagination');

const getDepartments = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, count: total } = await Department.findAndCountAll({
      order: [['department_id', 'ASC']],
      limit,
      offset
    });
    res.json({
      success: true,
      data: rows,
      count: rows.length,
      pagination: paginationMeta({ page, limit, total })
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch departments' });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const dept = await Department.create({ name: String(name).trim() });
    res.status(201).json({ success: true, data: dept });
  } catch (error) {
    console.error('Error creating department:', error);
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Department name already exists' });
    }
    res.status(500).json({ success: false, error: error.message || 'Failed to create department' });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await Department.findByPk(id);
    if (!dept) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    if (req.body.name === undefined || !String(req.body.name).trim()) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    await dept.update({ name: String(req.body.name).trim() });
    res.json({ success: true, data: dept });
  } catch (error) {
    console.error('Error updating department:', error);
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Department name already exists' });
    }
    res.status(500).json({ success: false, error: error.message || 'Failed to update department' });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await Department.findByPk(id);
    if (!dept) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    await dept.destroy();
    res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete department (it may be in use)'
    });
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
