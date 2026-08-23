const { CourseAnnouncement, Course, CourseEnrollment, User } = require('../models');
const {
  broadcastCourseAnnouncementEmails,
  getCourseRecipientsCount
} = require('../services/courseAnnouncementBroadcast');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { logAdminAction } = require('../utils/adminNotification');
const logger = require('../utils/logger');

/**
 * Get all announcements for a specific course
 * GET /api/courses/:courseId/announcements
 */
const getCourseAnnouncements = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId || req.params.id, 10);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ success: false, error: 'Invalid course id' });
    }

    const { includeInactive, target_type } = req.query;
    const isAdmin = Boolean(req.user && ['admin', 'board'].includes(req.user.role));

    // Verify course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const whereClause = { course_id: courseId };

    // Only show active announcements by default (unless admin/board requests all)
    if (!isAdmin || includeInactive !== 'true') {
      whereClause.is_active = true;
    }

    if (target_type) {
      whereClause.target_type = target_type;
    }

    const { page, limit, offset } = parsePagination(req.query);

    const { rows: announcements, count: total } = await CourseAnnouncement.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        },
        {
          model: CourseEnrollment,
          as: 'targetEnrollment',
          attributes: ['enrollment_id', 'full_name', 'email', 'status', 'university_id'],
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
    logger.error('Error fetching course announcements:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch course announcements'
    });
  }
};

/**
 * Get a specific course announcement by ID
 * GET /api/courses/:courseId/announcements/:announcementId
 */
const getCourseAnnouncementById = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId || req.params.id, 10);
    const announcementId = parseInt(req.params.announcementId, 10);

    if (!Number.isFinite(courseId) || !Number.isFinite(announcementId)) {
      return res.status(400).json({ success: false, error: 'Invalid course or announcement id' });
    }

    const announcement = await CourseAnnouncement.findOne({
      where: {
        announcement_id: announcementId,
        course_id: courseId
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        },
        {
          model: CourseEnrollment,
          as: 'targetEnrollment',
          attributes: ['enrollment_id', 'full_name', 'email', 'status', 'university_id'],
          required: false
        },
        {
          model: Course,
          as: 'course',
          attributes: ['course_id', 'title', 'status']
        }
      ]
    });

    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    return res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    logger.error('Error fetching course announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch course announcement'
    });
  }
};

/**
 * Preview recipient count before broadcasting
 * GET/POST /api/courses/:courseId/announcements/recipients-preview
 */
const getCourseRecipientsPreview = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId || req.params.id, 10);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ success: false, error: 'Invalid course id' });
    }

    const targetType = req.body?.target_type || req.query?.target_type || 'all';
    const targetEnrollmentId = req.body?.target_enrollment_id || req.query?.target_enrollment_id || null;
    const targetEmail = req.body?.target_email || req.query?.target_email || null;

    const preview = await getCourseRecipientsCount(courseId, targetType, targetEnrollmentId, targetEmail);

    return res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    logger.error('Error fetching course recipients preview:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to preview course recipients'
    });
  }
};

/**
 * Create a new course announcement and optionally broadcast emails to course members
 * POST /api/courses/:courseId/announcements
 * Requires: admin or board role
 */
const createCourseAnnouncement = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId || req.params.id, 10);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ success: false, error: 'Invalid course id' });
    }

    const {
      title,
      message,
      send_email = true,
      target_type = 'all',
      target_enrollment_id = null,
      target_email = null,
      cta_label = null,
      cta_url = null
    } = req.body;

    const userId = req.user.user_id;

    // Verify course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    // Validation
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    const validTargetTypes = ['all', 'enrolled', 'preordered', 'attended', 'individual'];
    if (target_type && !validTargetTypes.includes(target_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid target_type. Must be one of: ${validTargetTypes.join(', ')}`
      });
    }

    // If individual target specified, verify enrollment if provided
    let verifiedEnrollmentId = target_enrollment_id ? parseInt(target_enrollment_id, 10) : null;
    if (target_type === 'individual' && verifiedEnrollmentId) {
      const enrollment = await CourseEnrollment.findOne({
        where: { enrollment_id: verifiedEnrollmentId, course_id: courseId }
      });
      if (!enrollment) {
        return res.status(404).json({
          success: false,
          error: 'Specified target enrollment not found for this course'
        });
      }
    }

    const willSendEmail = send_email === true || send_email === 'true' || send_email === 1;

    // Create announcement
    const announcement = await CourseAnnouncement.create({
      course_id: courseId,
      title: String(title).trim(),
      message: String(message).trim(),
      created_by: userId,
      send_email: willSendEmail,
      target_type: target_type || 'all',
      target_enrollment_id: verifiedEnrollmentId,
      target_email: target_email ? String(target_email).trim() : null,
      cta_label: cta_label ? String(cta_label).trim() : null,
      cta_url: cta_url ? String(cta_url).trim() : null,
      is_active: true
    });

    // Broadcast email if requested
    let emailStats = null;
    if (willSendEmail) {
      try {
        emailStats = await broadcastCourseAnnouncementEmails(announcement, course);
      } catch (emailError) {
        logger.error('Error broadcasting course announcement emails:', emailError);
      }
    }

    // Fetch created announcement with relations
    const createdAnnouncement = await CourseAnnouncement.findByPk(announcement.announcement_id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        },
        {
          model: CourseEnrollment,
          as: 'targetEnrollment',
          attributes: ['enrollment_id', 'full_name', 'email', 'status', 'university_id'],
          required: false
        }
      ]
    });

    await logAdminAction(
      'course_announcement_created',
      `Created announcement "${createdAnnouncement.title}" for course "${course.title}"`,
      req,
      'course',
      course.course_id,
      course.season_id
    );

    return res.status(201).json({
      success: true,
      message: willSendEmail
        ? 'Course announcement created and emails dispatched'
        : 'Course announcement created successfully',
      data: createdAnnouncement,
      emailStats
    });
  } catch (error) {
    logger.error('Error creating course announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create course announcement'
    });
  }
};

/**
 * Quick action to send direct message/email to a specific enrolled member
 * POST /api/courses/:courseId/announcements/message-member
 * Requires: admin or board role
 */
const sendDirectCourseMemberMessage = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId || req.params.id, 10);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ success: false, error: 'Invalid course id' });
    }

    const {
      enrollment_id,
      email,
      title,
      message,
      cta_label,
      cta_url,
      send_email = true
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    if (!enrollment_id && !email) {
      return res.status(400).json({
        success: false,
        error: 'Either enrollment_id or email is required to message a member'
      });
    }

    req.body.target_type = 'individual';
    req.body.target_enrollment_id = enrollment_id || null;
    req.body.target_email = email || null;
    req.body.send_email = send_email;
    req.body.cta_label = cta_label;
    req.body.cta_url = cta_url;

    return createCourseAnnouncement(req, res);
  } catch (error) {
    logger.error('Error in sendDirectCourseMemberMessage:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send message to member'
    });
  }
};

/**
 * Update an existing course announcement
 * PUT /api/courses/:courseId/announcements/:announcementId
 * Requires: admin or board role
 */
const updateCourseAnnouncement = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId || req.params.id, 10);
    const announcementId = parseInt(req.params.announcementId, 10);

    const {
      title,
      message,
      is_active,
      target_type,
      target_enrollment_id,
      target_email,
      cta_label,
      cta_url
    } = req.body;

    const announcement = await CourseAnnouncement.findOne({
      where: {
        announcement_id: announcementId,
        course_id: courseId
      }
    });

    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    if (title !== undefined) announcement.title = String(title).trim();
    if (message !== undefined) announcement.message = String(message).trim();
    if (is_active !== undefined) {
      announcement.is_active = is_active === true || is_active === 'true' || is_active === 1;
    }
    if (target_type !== undefined) announcement.target_type = target_type;
    if (target_enrollment_id !== undefined) announcement.target_enrollment_id = target_enrollment_id || null;
    if (target_email !== undefined) announcement.target_email = target_email || null;
    if (cta_label !== undefined) announcement.cta_label = cta_label || null;
    if (cta_url !== undefined) announcement.cta_url = cta_url || null;

    await announcement.save();

    const updatedAnnouncement = await CourseAnnouncement.findByPk(announcementId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'email'],
          required: false
        },
        {
          model: CourseEnrollment,
          as: 'targetEnrollment',
          attributes: ['enrollment_id', 'full_name', 'email', 'status', 'university_id'],
          required: false
        }
      ]
    });

    await logAdminAction(
      'course_announcement_updated',
      `Updated announcement "${updatedAnnouncement.title}" in course #${courseId}`,
      req,
      'course',
      courseId
    );

    return res.json({
      success: true,
      message: 'Course announcement updated successfully',
      data: updatedAnnouncement
    });
  } catch (error) {
    logger.error('Error updating course announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update course announcement'
    });
  }
};

/**
 * Delete a course announcement (soft delete by default, hard delete if ?hard=1)
 * DELETE /api/courses/:courseId/announcements/:announcementId
 * Requires: admin or board role
 */
const deleteCourseAnnouncement = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId || req.params.id, 10);
    const announcementId = parseInt(req.params.announcementId, 10);
    const hardDelete = req.query.hard === '1' || req.query.hard === 'true';

    const announcement = await CourseAnnouncement.findOne({
      where: {
        announcement_id: announcementId,
        course_id: courseId
      }
    });

    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    const annTitle = announcement.title;

    if (hardDelete) {
      await announcement.destroy();
      await logAdminAction(
        'course_announcement_deleted',
        `Permanently deleted announcement "${annTitle}" in course #${courseId}`,
        req,
        'course',
        courseId
      );
      return res.json({ success: true, message: 'Course announcement permanently deleted' });
    }

    announcement.is_active = false;
    await announcement.save();

    await logAdminAction(
      'course_announcement_deleted',
      `Deleted announcement "${annTitle}" in course #${courseId}`,
      req,
      'course',
      courseId
    );

    return res.json({
      success: true,
      message: 'Course announcement deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting course announcement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete course announcement'
    });
  }
};

/**
 * Resend announcement emails to targeted course members
 * POST /api/courses/:courseId/announcements/:announcementId/resend-emails
 * Requires: admin or board role
 */
const resendCourseAnnouncementEmails = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId || req.params.id, 10);
    const announcementId = parseInt(req.params.announcementId, 10);

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const announcement = await CourseAnnouncement.findOne({
      where: {
        announcement_id: announcementId,
        course_id: courseId
      }
    });

    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    const emailStats = await broadcastCourseAnnouncementEmails(announcement, course);

    await logAdminAction(
      'course_announcement_emails_resent',
      `Resent emails for announcement "${announcement.title}" in course "${course.title}"`,
      req,
      'course',
      courseId,
      course.season_id
    );

    return res.json({
      success: true,
      message: 'Announcement emails resent successfully',
      data: {
        announcement_id: announcementId,
        emailStats
      }
    });
  } catch (error) {
    logger.error('Error resending course announcement emails:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resend course announcement emails'
    });
  }
};

module.exports = {
  getCourseAnnouncements,
  getCourseAnnouncementById,
  getCourseRecipientsPreview,
  createCourseAnnouncement,
  sendDirectCourseMemberMessage,
  updateCourseAnnouncement,
  deleteCourseAnnouncement,
  resendCourseAnnouncementEmails
};
