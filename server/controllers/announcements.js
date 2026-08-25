const { Announcement, User } = require('../models');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { resolveSeasonFilter, seasonInclude, resolveSeasonIdForWrite } = require('../utils/seasonFilter');
const {
  startAnnouncementEmailBroadcast,
  getAnnouncementEmailJob,
  publicJobView,
  runAnnouncementEmailJob,
  createAnnouncementEmailJob
} = require('../services/announcementEmailJob');
const { logAdminAction } = require('../utils/adminNotification');
const { checkIsPresidentOrVicePresident } = require('../middlewares/adminAuth');
const logger = require('../utils/logger');

const WEBSITE_TITLE_MAX = 50;
const WEBSITE_DESC_MAX = 220;
const EMAIL_TITLE_MAX = 120;
const EMAIL_DESC_MAX = 2000;
const CTA_LABEL_MAX = 80;
const CTA_URL_MAX = 512;

function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return value === true || value === 'true' || value === 1 || value === '1';
}

function normalizeCta(label, url) {
  const cta_label = label != null ? String(label).trim().slice(0, CTA_LABEL_MAX) : '';
  const cta_url = url != null ? String(url).trim().slice(0, CTA_URL_MAX) : '';
  return {
    cta_label: cta_label || null,
    cta_url: cta_url || null
  };
}

function isValidHttpUrl(value) {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Notify all users by email (awaits completion). Prefer startAnnouncementEmailBroadcast for HTTP.
 */
async function broadcastNewAnnouncementEmails(announcement) {
  const job = createAnnouncementEmailJob({
    announcementId: announcement?.announcement_id,
    title: announcement?.title
  });
  await runAnnouncementEmailJob(job.id, announcement);
  return publicJobView(getAnnouncementEmailJob(job.id));
}

/**
 * GET /api/announcements/email-jobs/:jobId
 */
const getAnnouncementEmailJobStatus = async (req, res) => {
  try {
    const job = getAnnouncementEmailJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Email job not found' });
    }
    return res.json({ success: true, data: publicJobView(job) });
  } catch (error) {
    logger.error('Error fetching announcement email job:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch email job'
    });
  }
};

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
    const adminView = req.query.forAdmin === 'true' || includeInactive === 'true';

    // Public feed: active + published to website + approved only
    if (!adminView) {
      whereClause.is_active = true;
      whereClause.publish_to_website = true;
      whereClause.approval_status = 'approved';
    } else {
      if (includeInactive !== 'true') {
        whereClause.is_active = true;
      }
      if (req.query.approval_status) {
        whereClause.approval_status = req.query.approval_status;
      }
    }

    const include = [
      {
        model: User,
        as: 'creator',
        attributes: ['user_id', 'full_name', 'email']
      },
      {
        model: User,
        as: 'approver',
        attributes: ['user_id', 'full_name', 'email']
      }
    ];
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
    logger.error('Error fetching announcements:', error);
    const detail = error.parent?.sqlMessage || error.message || 'Failed to fetch announcements';
    return res.status(500).json({
      success: false,
      error: detail
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
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['user_id', 'full_name', 'email']
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
    logger.error('Error fetching announcement:', error);
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
 *
 * Email broadcast: publish_to_website=false, send_email=true, CTA required
 * Website post: publish_to_website=true, send_email optional (default false)
 */
const addAnnouncement = async (req, res) => {
  try {
    const {
      title,
      description,
      department,
      announcement_date,
      priority,
      send_email,
      publish_to_website,
      cta_label,
      cta_url
    } = req.body;
    const userId = req.user.user_id;

    if (!title || !description || !department || !announcement_date) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: title, description, department, and announcement_date'
      });
    }

    const announcementDate = new Date(announcement_date);
    if (isNaN(announcementDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid announcement_date format'
      });
    }

    const publishToWebsite = parseBool(publish_to_website, true);
    // Mail-only broadcasts always email; website posts only when explicitly requested
    const shouldSendEmail = publishToWebsite
      ? parseBool(send_email, false)
      : true;

    const titleMax = publishToWebsite ? WEBSITE_TITLE_MAX : EMAIL_TITLE_MAX;
    const descMax = publishToWebsite ? WEBSITE_DESC_MAX : EMAIL_DESC_MAX;
    if (String(title).trim().length > titleMax) {
      return res.status(400).json({
        success: false,
        error: `Title must be at most ${titleMax} characters for ${publishToWebsite ? 'website' : 'email'} announcements`
      });
    }
    if (String(description).trim().length > descMax) {
      return res.status(400).json({
        success: false,
        error: `Description must be at most ${descMax} characters for ${publishToWebsite ? 'website' : 'email'} announcements`
      });
    }

    const cta = normalizeCta(cta_label, cta_url);
    if (!publishToWebsite) {
      if (!cta.cta_label || !cta.cta_url) {
        return res.status(400).json({
          success: false,
          error: 'CTA button label and URL are required for email broadcasts'
        });
      }
      if (!isValidHttpUrl(cta.cta_url)) {
        return res.status(400).json({
          success: false,
          error: 'CTA button URL must be a valid http(s) link'
        });
      }
    } else if (shouldSendEmail && cta.cta_url && !isValidHttpUrl(cta.cta_url)) {
      return res.status(400).json({
        success: false,
        error: 'CTA button URL must be a valid http(s) link'
      });
    } else if (shouldSendEmail && ((cta.cta_label && !cta.cta_url) || (!cta.cta_label && cta.cta_url))) {
      return res.status(400).json({
        success: false,
        error: 'Provide both CTA button label and URL, or leave both empty'
      });
    }

    const isPresidentOrVP = await checkIsPresidentOrVicePresident(req);

    let approvalStatus = 'approved';
    let approvedBy = userId;
    let emailSent = false;

    if (shouldSendEmail) {
      if (isPresidentOrVP) {
        approvalStatus = 'approved';
        approvedBy = userId;
        emailSent = true;
      } else {
        approvalStatus = 'pending';
        approvedBy = null;
        emailSent = false;
      }
    }

    const announcement = await Announcement.create({
      title: String(title).trim(),
      description: String(description).trim(),
      department,
      announcement_date,
      priority: parseBool(priority, false),
      send_email: shouldSendEmail,
      publish_to_website: publishToWebsite,
      cta_label: cta.cta_label,
      cta_url: cta.cta_url,
      created_by: userId,
      approval_status: approvalStatus,
      approved_by: approvedBy,
      email_sent: emailSent,
      is_active: true,
      season_id: await resolveSeasonIdForWrite(req.body, req.query)
    });

    const createdAnnouncement = await Announcement.findByPk(announcement.announcement_id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['user_id', 'full_name', 'email']
        }
      ]
    });

    await logAdminAction(
      'announcement_created',
      `Created announcement "${createdAnnouncement.title}" (${approvalStatus})`,
      req,
      'announcement',
      createdAnnouncement.announcement_id,
      createdAnnouncement.season_id
    );

    if (createdAnnouncement.send_email && isPresidentOrVP) {
      const emailJob = startAnnouncementEmailBroadcast(createdAnnouncement);
      let message = 'Website announcement posted; sending emails…';
      if (!publishToWebsite) {
        message = 'Email broadcast started; sending to members…';
      }
      return res.status(201).json({
        success: true,
        message,
        data: createdAnnouncement,
        emailJob
      });
    }

    if (createdAnnouncement.send_email && !isPresidentOrVP) {
      return res.status(201).json({
        success: true,
        message: 'Announcement submitted and queued for President / Vice-President approval before email broadcast.',
        data: createdAnnouncement
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Website announcement posted',
      data: createdAnnouncement
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    logger.error('Error creating announcement:', error);
    const detail = error.parent?.sqlMessage || error.message || 'Failed to create announcement';
    return res.status(500).json({
      success: false,
      error: detail
    });
  }
};

/**
 * Approve announcement and trigger email broadcast (allows optional edits)
 * PUT /api/announcements/:id/approve
 * Requires: President or Vice President role
 */
const approveAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const isPresidentOrVP = await checkIsPresidentOrVicePresident(req);
    if (!isPresidentOrVP) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Announcement approval is restricted to President and Vice President roles.'
      });
    }

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    const {
      title,
      description,
      department,
      announcement_date,
      priority,
      cta_label,
      cta_url
    } = req.body;

    if (title !== undefined) announcement.title = String(title).trim();
    if (description !== undefined) announcement.description = String(description).trim();
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
      announcement.priority = parseBool(priority, false);
    }
    if (cta_label !== undefined || cta_url !== undefined) {
      const cta = normalizeCta(
        cta_label !== undefined ? cta_label : announcement.cta_label,
        cta_url !== undefined ? cta_url : announcement.cta_url
      );
      if (cta.cta_url && !isValidHttpUrl(cta.cta_url)) {
        return res.status(400).json({
          success: false,
          error: 'CTA button URL must be a valid http(s) link'
        });
      }
      announcement.cta_label = cta.cta_label;
      announcement.cta_url = cta.cta_url;
    }

    const isWebsite = announcement.publish_to_website !== false;
    const titleMax = isWebsite ? WEBSITE_TITLE_MAX : EMAIL_TITLE_MAX;
    const descMax = isWebsite ? WEBSITE_DESC_MAX : EMAIL_DESC_MAX;
    if (String(announcement.title || '').trim().length > titleMax) {
      return res.status(400).json({
        success: false,
        error: `Title must be at most ${titleMax} characters for this announcement type`
      });
    }
    if (String(announcement.description || '').trim().length > descMax) {
      return res.status(400).json({
        success: false,
        error: `Description must be at most ${descMax} characters for this announcement type`
      });
    }

    announcement.approval_status = 'approved';
    announcement.approved_by = userId;
    announcement.rejection_reason = null;
    announcement.email_sent = true;
    announcement.is_active = true;

    await announcement.save();

    const updatedAnnouncement = await Announcement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['user_id', 'full_name', 'email']
        }
      ]
    });

    await logAdminAction(
      'announcement_approved',
      `Approved announcement "${updatedAnnouncement.title}" and initiated email broadcast`,
      req,
      'announcement',
      id,
      updatedAnnouncement.season_id
    );

    let emailJob = null;
    if (updatedAnnouncement.send_email || !updatedAnnouncement.publish_to_website) {
      emailJob = startAnnouncementEmailBroadcast(updatedAnnouncement);
    }

    return res.json({
      success: true,
      message: 'Announcement approved and email broadcast started',
      data: updatedAnnouncement,
      emailJob
    });
  } catch (error) {
    logger.error('Error approving announcement:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve announcement'
    });
  }
};

/**
 * Refuse / reject announcement email broadcast
 * PUT /api/announcements/:id/reject
 * Requires: President or Vice President role
 */
const rejectAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.user_id;

    const isPresidentOrVP = await checkIsPresidentOrVicePresident(req);
    if (!isPresidentOrVP) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Announcement refusal is restricted to President and Vice President roles.'
      });
    }

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    announcement.approval_status = 'rejected';
    announcement.approved_by = userId;
    announcement.rejection_reason = reason ? String(reason).trim() : null;

    await announcement.save();

    const updatedAnnouncement = await Announcement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['user_id', 'full_name', 'email']
        }
      ]
    });

    await logAdminAction(
      'announcement_rejected',
      `Refused announcement "${updatedAnnouncement.title}"${reason ? `: ${reason}` : ''}`,
      req,
      'announcement',
      id,
      updatedAnnouncement.season_id
    );

    return res.json({
      success: true,
      message: 'Announcement email broadcast refused',
      data: updatedAnnouncement
    });
  } catch (error) {
    logger.error('Error rejecting announcement:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to refuse announcement'
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
    const {
      title,
      description,
      department,
      announcement_date,
      priority,
      is_active,
      cta_label,
      cta_url
    } = req.body;

    const announcement = await Announcement.findByPk(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

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
      announcement.priority = parseBool(priority, false);
    }
    if (is_active !== undefined) {
      announcement.is_active = parseBool(is_active, true);
    }
    if (cta_label !== undefined || cta_url !== undefined) {
      const cta = normalizeCta(
        cta_label !== undefined ? cta_label : announcement.cta_label,
        cta_url !== undefined ? cta_url : announcement.cta_url
      );
      if (!announcement.publish_to_website) {
        if (!cta.cta_label || !cta.cta_url) {
          return res.status(400).json({
            success: false,
            error: 'CTA button label and URL are required for email broadcasts'
          });
        }
        if (!isValidHttpUrl(cta.cta_url)) {
          return res.status(400).json({
            success: false,
            error: 'CTA button URL must be a valid http(s) link'
          });
        }
      } else if (cta.cta_url && !isValidHttpUrl(cta.cta_url)) {
        return res.status(400).json({
          success: false,
          error: 'CTA button URL must be a valid http(s) link'
        });
      } else if ((cta.cta_label && !cta.cta_url) || (!cta.cta_label && cta.cta_url)) {
        return res.status(400).json({
          success: false,
          error: 'Provide both CTA button label and URL, or leave both empty'
        });
      }
      announcement.cta_label = cta.cta_label;
      announcement.cta_url = cta.cta_url;
    }

    const isWebsite = announcement.publish_to_website !== false;
    const titleMax = isWebsite ? WEBSITE_TITLE_MAX : EMAIL_TITLE_MAX;
    const descMax = isWebsite ? WEBSITE_DESC_MAX : EMAIL_DESC_MAX;
    if (String(announcement.title || '').trim().length > titleMax) {
      return res.status(400).json({
        success: false,
        error: `Title must be at most ${titleMax} characters for this announcement type`
      });
    }
    if (String(announcement.description || '').trim().length > descMax) {
      return res.status(400).json({
        success: false,
        error: `Description must be at most ${descMax} characters for this announcement type`
      });
    }

    await announcement.save();

    const updatedAnnouncement = await Announcement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['user_id', 'full_name', 'email']
        }
      ]
    });

    await logAdminAction(
      'announcement_updated',
      `Updated announcement "${updatedAnnouncement.title}"`,
      req,
      'announcement',
      id,
      updatedAnnouncement.season_id
    );

    return res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: updatedAnnouncement
    });
  } catch (error) {
    logger.error('Error updating announcement:', error);
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

    const annTitle = announcement.title;
    const seasonId = announcement.season_id;
    announcement.is_active = false;
    await announcement.save();

    await logAdminAction(
      'announcement_deleted',
      `Deleted announcement "${annTitle}"`,
      req,
      'announcement',
      id,
      seasonId
    );

    return res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete announcement'
    });
  }
};

/**
 * Resend emails for an announcement
 * POST /api/announcements/:id/resend-emails
 * Requires: President or Vice President role
 */
const resendAnnouncementEmails = async (req, res) => {
  try {
    const { id } = req.params;
    const isPresidentOrVP = await checkIsPresidentOrVicePresident(req);
    if (!isPresidentOrVP) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Resending announcement emails requires President or Vice President approval.'
      });
    }

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    const emailJob = startAnnouncementEmailBroadcast(announcement);

    await logAdminAction(
      'announcement_emails_resent',
      `Resent emails for announcement "${announcement.title}"`,
      req,
      'announcement',
      id,
      announcement.season_id
    );

    return res.json({
      success: true,
      message: 'Announcement email broadcast started',
      data: announcement,
      emailJob
    });
  } catch (error) {
    logger.error('Error resending announcement emails:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to resend announcement emails'
    });
  }
};

module.exports = {
  broadcastNewAnnouncementEmails,
  getAnnouncementEmailJobStatus,
  getAllAnnouncements,
  getAnnouncementById,
  addAnnouncement,
  approveAnnouncement,
  rejectAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  resendAnnouncementEmails
};

