const { Department } = require('../models');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { departmentHasWhatsApp } = require('../utils/emailTemplates/defaults');
const logger = require('../utils/logger');

const normalizeWhatsAppUrl = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const createDepartment = async (req, res) => {
  try {
    const { name, whatsapp_group_url } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const trimmedName = String(name).trim();
    const payload = { name: trimmedName };
    if (whatsapp_group_url !== undefined) {
      if (!departmentHasWhatsApp(trimmedName) && normalizeWhatsAppUrl(whatsapp_group_url)) {
        return res.status(400).json({
          success: false,
          error: `${trimmedName} does not have a WhatsApp group link`
        });
      }
      payload.whatsapp_group_url = departmentHasWhatsApp(trimmedName)
        ? normalizeWhatsAppUrl(whatsapp_group_url)
        : null;
    }
    const dept = await Department.create(payload);
    res.status(201).json({ success: true, data: dept });
  } catch (error) {
    logger.error('Error creating department:', error);
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Department name already exists' });
    }
    res.status(500).json({ success: false, error: error.message || 'Failed to create department' });
  }
};

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
    logger.error('Error fetching departments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch departments' });
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
    const trimmedName = String(req.body.name).trim();
    const updates = { name: trimmedName };

    if (req.body.whatsapp_group_url !== undefined) {
      if (!departmentHasWhatsApp(trimmedName) && normalizeWhatsAppUrl(req.body.whatsapp_group_url)) {
        return res.status(400).json({
          success: false,
          error: `${trimmedName} does not have a WhatsApp group link`
        });
      }
      updates.whatsapp_group_url = departmentHasWhatsApp(trimmedName)
        ? normalizeWhatsAppUrl(req.body.whatsapp_group_url)
        : null;
    } else if (!departmentHasWhatsApp(trimmedName)) {
      updates.whatsapp_group_url = null;
    }

    await dept.update(updates);
    res.json({ success: true, data: dept });
  } catch (error) {
    logger.error('Error updating department:', error);
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
    logger.error('Error deleting department:', error);
    if (error?.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete department while members, board roles, or applications still reference it'
      });
    }
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
