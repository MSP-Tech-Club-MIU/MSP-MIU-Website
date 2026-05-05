const { CompetitionAnnouncement, Competition, User } = require('../models');
const { broadcastCompetitionAnnouncementEmails } = require('../services/competitionAnnouncementBroadcast');
const { Op } = require('sequelize');

/**
 * Get all announcements for a specific competition
 * GET /api/competitions/:competitionId/announcements
 */
const getCompetitionAnnouncements = async (req, res) => {
  try {
    const { competitionId } = req.params;
    const { includeInactive } = req.query;

    // Verify competition exists
    const competition = await Competition.findByPk(competitionId);
    if (!competition) {
      return res.status(404).json({
        success: false,
        error: 'Competition not found'
      });
    }

    const whereClause = { competition_id: competitionId };

    // Only show active announcements by default (unless admin/board requests all)
    if (!includeInactive || includeInactive !== 'true') {
      whereClause.is_active = true;
    }

    const announcements = await CompetitionAnnouncement.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['user_id', 'full_name', 'email'],
        required: false
      }],
      order: [['created_at', 'DESC']]
    });

    return res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Error fetching competition announcements:', error);
    console.error('Error message:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch competition announcements'
    });
  }
};

/**
 * Get a specific competition announcement by ID
 * GET /api/competitions/:competitionId/announcements/:announcementId
 */
const getCompetitionAnnouncementById = async (req, res) => {
  try {
    const { competitionId, announcementId } = req.params;

    const announcement = await CompetitionAnnouncement.findOne({
      where: {
        announcement_id: announcementId,
        competition_id: competitionId
      },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['user_id', 'full_name', 'email'],
        required: false
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
    console.error('Error fetching competition announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch competition announcement'
    });
  }
};

/**
 * Create a new competition announcement and broadcast to competitors
 * POST /api/competitions/:competitionId/announcements
 * Requires: admin or board role
 * Body: { title, message, send_email }
 */
const createCompetitionAnnouncement = async (req, res) => {
  try {
    const { competitionId } = req.params;
    const { title, message, send_email, target_type, target_team_id, target_user_id } = req.body;
    const userId = req.user.user_id;

    // Verify competition exists
    const competition = await Competition.findByPk(competitionId);
    if (!competition) {
      return res.status(404).json({
        success: false,
        error: 'Competition not found'
      });
    }

    // Validation
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: title and message'
      });
    }

    // Create announcement
    const announcement = await CompetitionAnnouncement.create({
      competition_id: competitionId,
      title,
      message,
      created_by: userId,
      send_email: send_email === true || send_email === 'true' || send_email === 1,
      target_type: target_type || 'all',
      target_team_id: target_team_id || null,
      target_user_id: target_user_id || null,
      is_active: true
    });

    // Fetch created announcement with creator info
    const createdAnnouncement = await CompetitionAnnouncement.findByPk(announcement.announcement_id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['user_id', 'full_name', 'email'],
        required: false
      }]
    });

    // Broadcast emails if send_email is true
    if (createdAnnouncement.send_email) {
      try {
        await broadcastCompetitionAnnouncementEmails(createdAnnouncement, competition);
      } catch (emailError) {
        console.error('Error broadcasting announcement emails:', emailError);
        // Don't fail the request, just log the error
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Competition announcement created successfully' + (createdAnnouncement.send_email ? ' and emails sent to competitors' : ''),
      data: createdAnnouncement
    });
  } catch (error) {
    console.error('Error creating competition announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create competition announcement'
    });
  }
};

/**
 * Update a competition announcement
 * PUT /api/competitions/:competitionId/announcements/:announcementId
 * Requires: admin or board role
 */
const updateCompetitionAnnouncement = async (req, res) => {
  try {
    const { competitionId, announcementId } = req.params;
    const { title, message, is_active, target_type, target_team_id, target_user_id } = req.body;

    const announcement = await CompetitionAnnouncement.findOne({
      where: {
        announcement_id: announcementId,
        competition_id: competitionId
      }
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Update fields if provided
    if (title !== undefined) announcement.title = title;
    if (message !== undefined) announcement.message = message;
    if (is_active !== undefined) {
      announcement.is_active = is_active === true || is_active === 'true' || is_active === 1;
    }
    if (target_type !== undefined) announcement.target_type = target_type;
    if (target_team_id !== undefined) announcement.target_team_id = target_team_id;
    if (target_user_id !== undefined) announcement.target_user_id = target_user_id;

    await announcement.save();

    const updatedAnnouncement = await CompetitionAnnouncement.findByPk(announcementId, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['user_id', 'full_name', 'email'],
        required: false
      }]
    });

    return res.json({
      success: true,
      message: 'Competition announcement updated successfully',
      data: updatedAnnouncement
    });
  } catch (error) {
    console.error('Error updating competition announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update competition announcement'
    });
  }
};

/**
 * Delete a competition announcement (soft delete)
 * DELETE /api/competitions/:competitionId/announcements/:announcementId
 * Requires: admin or board role
 */
const deleteCompetitionAnnouncement = async (req, res) => {
  try {
    const { competitionId, announcementId } = req.params;

    const announcement = await CompetitionAnnouncement.findOne({
      where: {
        announcement_id: announcementId,
        competition_id: competitionId
      }
    });

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
      message: 'Competition announcement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting competition announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete competition announcement'
    });
  }
};

/**
 * Resend announcement emails to all competitors
 * POST /api/competitions/:competitionId/announcements/:announcementId/resend-emails
 * Requires: admin or board role
 */
const resendCompetitionAnnouncementEmails = async (req, res) => {
  try {
    const { competitionId, announcementId } = req.params;

    // Verify competition exists
    const competition = await Competition.findByPk(competitionId);
    if (!competition) {
      return res.status(404).json({
        success: false,
        error: 'Competition not found'
      });
    }

    const announcement = await CompetitionAnnouncement.findOne({
      where: {
        announcement_id: announcementId,
        competition_id: competitionId
      },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['user_id', 'full_name', 'email'],
        required: false
      }]
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    // Send emails
    try {
      await broadcastCompetitionAnnouncementEmails(announcement, competition);
    } catch (emailError) {
      console.error('Error resending announcement emails:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Failed to resend announcement emails'
      });
    }

    return res.json({
      success: true,
      message: 'Announcement emails resent successfully to all competitors'
    });
  } catch (error) {
    console.error('Error resending competition announcement emails:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resend announcement emails'
    });
  }
};

module.exports = {
  getCompetitionAnnouncements,
  getCompetitionAnnouncementById,
  createCompetitionAnnouncement,
  updateCompetitionAnnouncement,
  deleteCompetitionAnnouncement,
  resendCompetitionAnnouncementEmails
};
