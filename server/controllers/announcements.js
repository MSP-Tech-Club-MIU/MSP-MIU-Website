const { Announcement, User } = require('../models');
const { Op } = require('sequelize');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { resolveSeasonFilter, seasonInclude, resolveSeasonIdForWrite } = require('../utils/seasonFilter');

/**
 * Notify all users by email.
 * Sends directly to each recipient so SMTP providers that mishandle
 * BCC-only deliveries still deliver to everyone reliably.
 */
async function broadcastNewAnnouncementEmails(announcement) {
  const users = await User.findAll({
    attributes: ['email']
  });
  const emails = [...new Set(users.map((u) => (u.email || '').trim()).filter(Boolean))];
  if (emails.length === 0) {
    console.log('Announcement email: no recipients (no users with email)');
    return;
  }

  const { sendEmail } = await import('../utils/email.mjs');
  const { buildAnnouncementEmail } = await import('../utils/announcementEmail.mjs');

  const { subject, text, html } = await buildAnnouncementEmail(announcement, {
    frontendUrl: process.env.FRONTEND_URL
  });

  for (const to of emails) {
    await sendEmail({
      to,
      subject,
      text,
      html,
      fromName: 'MSP MIU Announcements'
    });
  }
  console.log(`Announcement emails sent to ${emails.length} recipient(s)`);
}

/**
 * Get all active announcements
 * GET /api/announcements
 */
const getAllAnnouncements = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    const seasonFilter = await resolveSeasonFilter(req.query);

    const whereClause = { ...seasonFilter.where };
    
    // Only show active announcements by default (unless admin/board requests all)
    if (!includeInactive || includeInactive !== 'true') {
      whereClause.is_active = true;
    }

    const include = [{
      model: User,
      as: 'creator',
      attributes: ['user_id', 'full_name', 'email']
    }];
    if (seasonFilter.includeSeason) {
      include.push(seasonInclude());
    }

    const { rows: announcements, count: total } = await Announcement.findAndCountAll({
      where: whereClause,
      include,
      order: [
        ['priority', 'DESC'],
        ['announcement_date', 'DESC'],
        ['created_at', 'DESC']
      ],
      limit,
      offset,
      distinct: true
    });

    return res.json({
      success: true,
      data: announcements,
      count: announcements.length,
      pagination: paginationMeta({ page, limit, total })
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Error fetching announcements:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch announcements'
    });
  }
};

/**
 * Get announcement by ID
 * GET /api/announcements/:id
 */
const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByPk(id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['user_id', 'full_name', 'email']
      }]
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    return res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch announcement'
    });
  }
};

/**
 * Create a new announcement
 * POST /api/announcements
 * Requires: admin or board role
 */
const addAnnouncement = async (req, res) => {
  try {
    const { title, description, department, announcement_date, priority, send_email } = req.body;
    const userId = req.user.user_id;

    // Validation
    if (!title || !description || !department || !announcement_date) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: title, description, department, and announcement_date'
      });
    }

    // Validate date format
    const announcementDate = new Date(announcement_date);
    if (isNaN(announcementDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement_date format'
      });
    }

    const shouldSendEmail = send_email === true || send_email === 'true' || send_email === 1;

    const announcement = await Announcement.create({
      title,
      description,
      department,
      announcement_date: announcement_date,
      priority: priority === true || priority === 'true' || priority === 1,
      send_email: shouldSendEmail,
      created_by: userId,
      is_active: true,
      season_id: await resolveSeasonIdForWrite(req.body, req.query)
    });

    const createdAnnouncement = await Announcement.findByPk(announcement.announcement_id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['user_id', 'full_name', 'email']
      }]
    });

    if (createdAnnouncement.send_email) {
      await broadcastNewAnnouncementEmails(createdAnnouncement);
    }

    return res.status(201).json({
      success: true,
      message: createdAnnouncement.send_email
        ? 'Announcement created successfully and emails sent'
        : 'Announcement created successfully (website only)',
      data: createdAnnouncement
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Error creating announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create announcement'
    });
  }
};

/**
 * Update an announcement
 * PUT /api/announcements/:id
 * Requires: admin or board role
 */
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, department, announcement_date, priority, is_active } = req.body;

    const announcement = await Announcement.findByPk(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Update fields if provided
    if (title !== undefined) announcement.title = title;
    if (description !== undefined) announcement.description = description;
    if (department !== undefined) announcement.department = department;
    if (announcement_date !== undefined) {
      const announcementDate = new Date(announcement_date);
      if (isNaN(announcementDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid announcement_date format'
        });
      }
      announcement.announcement_date = announcement_date;
    }
    if (priority !== undefined) {
      announcement.priority = priority === true || priority === 'true' || priority === 1;
    }
    if (is_active !== undefined) {
      announcement.is_active = is_active === true || is_active === 'true' || is_active === 1;
    }

    await announcement.save();

    const updatedAnnouncement = await Announcement.findByPk(id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['user_id', 'full_name', 'email']
      }]
    });

    return res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: updatedAnnouncement
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update announcement'
    });
  }
};

/**
 * Delete an announcement (soft delete by setting is_active to false)
 * DELETE /api/announcements/:id
 * Requires: admin or board role
 */
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByPk(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Soft delete
    announcement.is_active = false;
    await announcement.save();

    return res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete announcement'
    });
  }
};

module.exports = {
  broadcastNewAnnouncementEmails,
  getAllAnnouncements,
  getAnnouncementById,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};

