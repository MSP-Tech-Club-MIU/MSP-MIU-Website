const { CompetitionAnnouncement, Competition, User } = require('../models');
const { broadcastCompetitionAnnouncementEmails } = require('../services/competitionAnnouncementBroadcast');
const { Op } = require('sequelize');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { logAdminAction } = require('../utils/adminNotification');
const { checkIsPresidentOrVicePresident } = require('../middlewares/adminAuth');
const logger = require('../utils/logger');

/**
 * Get all announcements for a specific competition
 * GET /api/competitions/:competitionId/announcements
 */
const getCompetitionAnnouncements = async (req, res) => {
  try {
    const { competitionId } = req.params;
    const { includeInactive, approval_status } = req.query;
    const isAdmin = Boolean(req.user && ['admin', 'board'].includes(req.user.role));

    // Verify competition exists
    const competition = await Competition.findByPk(competitionId);
    if (!competition) {
      return res.status(404).json({
        success: false,
        error: 'Competition not found'
      });
    }

    const whereClause = { competition_id: competitionId };

    // Public feed: active + approved only
    if (!isAdmin) {
      whereClause.is_active = true;
      whereClause.approval_status = 'approved';
    } else {
      if (!includeInactive || includeInactive !== 'true') {
        whereClause.is_active = true;
      }
      if (approval_status) {
        whereClause.approval_status = approval_status;
      }
    }

    const { page, limit, offset } = parsePagination(req.query);

    const { rows: announcements, count: total } = await CompetitionAnnouncement.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'approver',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
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
    logger.error('Error fetching competition announcements:', error);
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
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'approver',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        }
      ]
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
    logger.error('Error fetching competition announcement:', error);
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

    const willSendEmail = send_email === true || send_email === 'true' || send_email === 1;
    const isPresidentOrVP = await checkIsPresidentOrVicePresident(req);

    // Approval status decision:
    // Individual single competitor sends are always immediately approved.
    // Broadcasts (non-competitor: all or team) require President/VP approval to dispatch immediately.
    let approvalStatus = 'approved';
    let approvedBy = userId;
    let emailSent = false;
    let shouldBroadcastNow = false;

    if (willSendEmail) {
      if (target_type === 'competitor') {
        approvalStatus = 'approved';
        approvedBy = userId;
        emailSent = true;
        shouldBroadcastNow = true;
      } else if (isPresidentOrVP) {
        approvalStatus = 'approved';
        approvedBy = userId;
        emailSent = true;
        shouldBroadcastNow = true;
      } else {
        approvalStatus = 'pending';
        approvedBy = null;
        emailSent = false;
        shouldBroadcastNow = false;
      }
    }

    // Create announcement
    const announcement = await CompetitionAnnouncement.create({
      competition_id: competitionId,
      title: String(title).trim(),
      message: String(message).trim(),
      created_by: userId,
      send_email: willSendEmail,
      target_type: target_type || 'all',
      target_team_id: target_team_id || null,
      target_user_id: target_user_id || null,
      approval_status: approvalStatus,
      approved_by: approvedBy,
      email_sent: emailSent,
      is_active: true
    });

    // Broadcast emails if approved for immediate send
    if (shouldBroadcastNow) {
      try {
        await broadcastCompetitionAnnouncementEmails(announcement, competition);
      } catch (emailError) {
        logger.error('Error broadcasting announcement emails:', emailError);
      }
    }

    // Fetch created announcement with creator info
    const createdAnnouncement = await CompetitionAnnouncement.findByPk(announcement.announcement_id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'approver',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        }
      ]
    });

    await logAdminAction(
      'competition_announcement_created',
      `Created announcement "${createdAnnouncement.title}" for competition "${competition.title}" (${approvalStatus})`,
      req,
      'competition',
      competition.competition_id,
      competition.season_id
    );

    let responseMessage = 'Competition announcement created successfully';
    if (willSendEmail) {
      if (shouldBroadcastNow) {
        responseMessage = target_type === 'competitor'
          ? 'Competition message sent to competitor'
          : 'Competition announcement created and emails sent to competitors';
      } else {
        responseMessage = 'Competition announcement submitted and queued for President / Vice-President approval before email broadcast.';
      }
    }

    return res.status(201).json({
      success: true,
      message: responseMessage,
      data: createdAnnouncement
    });
  } catch (error) {
    logger.error('Error creating competition announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create competition announcement'
    });
  }
};

/**
 * Approve competition announcement and dispatch email broadcast (allows optional edits)
 * PUT /api/competitions/:competitionId/announcements/:announcementId/approve
 * Requires: President or Vice President role
 */
const approveCompetitionAnnouncement = async (req, res) => {
  try {
    const { competitionId, announcementId } = req.params;
    const userId = req.user.user_id;

    const isPresidentOrVP = await checkIsPresidentOrVicePresident(req);
    if (!isPresidentOrVP) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Competition announcement approval is restricted to President and Vice President roles.'
      });
    }

    const competition = await Competition.findByPk(competitionId);
    if (!competition) {
      return res.status(404).json({ success: false, error: 'Competition not found' });
    }

    const announcement = await CompetitionAnnouncement.findOne({
      where: {
        announcement_id: announcementId,
        competition_id: competitionId
      }
    });

    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    const {
      title,
      message,
      target_type,
      target_team_id,
      target_user_id
    } = req.body;

    if (title !== undefined) announcement.title = String(title).trim();
    if (message !== undefined) announcement.message = String(message).trim();
    if (target_type !== undefined) announcement.target_type = target_type;
    if (target_team_id !== undefined) announcement.target_team_id = target_team_id;
    if (target_user_id !== undefined) announcement.target_user_id = target_user_id;

    announcement.approval_status = 'approved';
    announcement.approved_by = userId;
    announcement.rejection_reason = null;
    announcement.email_sent = true;
    announcement.is_active = true;

    await announcement.save();

    if (announcement.send_email) {
      try {
        await broadcastCompetitionAnnouncementEmails(announcement, competition);
      } catch (emailError) {
        logger.error('Error broadcasting approved competition announcement emails:', emailError);
      }
    }

    const updatedAnnouncement = await CompetitionAnnouncement.findByPk(announcementId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'approver',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        }
      ]
    });

    await logAdminAction(
      'competition_announcement_approved',
      `Approved competition announcement "${updatedAnnouncement.title}" for competition "${competition.title}"`,
      req,
      'competition',
      competitionId,
      competition.season_id
    );

    return res.json({
      success: true,
      message: 'Competition announcement approved and email broadcast dispatched',
      data: updatedAnnouncement
    });
  } catch (error) {
    logger.error('Error approving competition announcement:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve competition announcement'
    });
  }
};

/**
 * Refuse competition announcement email broadcast
 * PUT /api/competitions/:competitionId/announcements/:announcementId/reject
 * Requires: President or Vice President role
 */
const rejectCompetitionAnnouncement = async (req, res) => {
  try {
    const { competitionId, announcementId } = req.params;
    const { reason } = req.body;
    const userId = req.user.user_id;

    const isPresidentOrVP = await checkIsPresidentOrVicePresident(req);
    if (!isPresidentOrVP) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Competition announcement refusal is restricted to President and Vice President roles.'
      });
    }

    const announcement = await CompetitionAnnouncement.findOne({
      where: {
        announcement_id: announcementId,
        competition_id: competitionId
      }
    });

    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    announcement.approval_status = 'rejected';
    announcement.approved_by = userId;
    announcement.rejection_reason = reason ? String(reason).trim() : null;

    await announcement.save();

    const updatedAnnouncement = await CompetitionAnnouncement.findByPk(announcementId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'approver',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        }
      ]
    });

    await logAdminAction(
      'competition_announcement_rejected',
      `Refused competition announcement "${updatedAnnouncement.title}"${reason ? `: ${reason}` : ''}`,
      req,
      'competition',
      competitionId
    );

    return res.json({
      success: true,
      message: 'Competition announcement email broadcast refused',
      data: updatedAnnouncement
    });
  } catch (error) {
    logger.error('Error rejecting competition announcement:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to refuse competition announcement'
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
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'approver',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        }
      ]
    });

    await logAdminAction(
      'competition_announcement_updated',
      `Updated announcement "${updatedAnnouncement.title}" in competition #${competitionId}`,
      req,
      'competition',
      competitionId
    );

    return res.json({
      success: true,
      message: 'Competition announcement updated successfully',
      data: updatedAnnouncement
    });
  } catch (error) {
    logger.error('Error updating competition announcement:', error);
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

    await logAdminAction(
      'competition_announcement_deleted',
      `Deleted announcement "${announcement.title}" in competition #${competitionId}`,
      req,
      'competition',
      competitionId
    );

    return res.json({
      success: true,
      message: 'Competition announcement deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting competition announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete competition announcement'
    });
  }
};

/**
 * Resend announcement emails to all competitors
 * POST /api/competitions/:competitionId/announcements/:announcementId/resend-emails
 * Requires: admin or board role (President/VP required if broadcast)
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

    if (announcement.target_type !== 'competitor') {
      const isPresidentOrVP = await checkIsPresidentOrVicePresident(req);
      if (!isPresidentOrVP) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Resending broadcast competition announcement emails requires President or Vice President approval.'
        });
      }
    }

    // Send emails
    try {
      await broadcastCompetitionAnnouncementEmails(announcement, competition);
    } catch (emailError) {
      logger.error('Error resending announcement emails:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Failed to resend announcement emails'
      });
    }

    await logAdminAction(
      'competition_announcement_emails_resent',
      `Resent emails for announcement "${announcement.title}" in competition "${competition.title}"`,
      req,
      'competition',
      competitionId,
      competition.season_id
    );

    return res.json({
      success: true,
      message: 'Announcement emails resent successfully to all competitors'
    });
  } catch (error) {
    logger.error('Error resending competition announcement emails:', error);
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
  approveCompetitionAnnouncement,
  rejectCompetitionAnnouncement,
  updateCompetitionAnnouncement,
  deleteCompetitionAnnouncement,
  resendCompetitionAnnouncementEmails
};
