const { Announcement, User } = require('../models');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { resolveSeasonFilter, seasonInclude, resolveSeasonIdForWrite } = require('../utils/seasonFilter');

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
    const adminView = req.query.forAdmin === 'true' || includeInactive === 'true';

    // Public feed: active + published to website only
    if (!adminView) {
      whereClause.is_active = true;
      whereClause.publish_to_website = true;
    } else if (includeInactive !== 'true') {
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

    const announcement = await Announcement.create({
      title,
      description,
      department,
      announcement_date,
      priority: parseBool(priority, false),
      send_email: shouldSendEmail,
      publish_to_website: publishToWebsite,
      cta_label: cta.cta_label,
      cta_url: cta.cta_url,
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

    let message = 'Website announcement posted';
    if (!publishToWebsite) {
      message = 'Email broadcast sent to members';
    } else if (shouldSendEmail) {
      message = 'Website announcement posted and emails sent';
    }

    return res.status(201).json({
      success: true,
      message,
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
