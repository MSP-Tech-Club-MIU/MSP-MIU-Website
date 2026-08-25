const { CourseEnrollment, Course, User } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Get targeted course enrollments based on announcement targeting settings
 * @param {Object} announcement - CourseAnnouncement instance or plain object
 * @param {number} [courseId] - Optional fallback course ID
 * @returns {Promise<Array<Object>>} Array of CourseEnrollment records
 */
async function getCourseRecipients(announcement, courseId = null) {
  const cid = announcement.course_id || courseId;
  if (!cid) return [];

  const targetType = announcement.target_type || 'all';

  // 1. Individual recipient
  if (targetType === 'individual') {
    if (announcement.target_enrollment_id) {
      const enrollment = await CourseEnrollment.findOne({
        where: {
          enrollment_id: announcement.target_enrollment_id,
          course_id: cid
        }
      });
      return enrollment ? [enrollment] : [];
    }

    if (announcement.target_email) {
      const enrollment = await CourseEnrollment.findOne({
        where: {
          email: String(announcement.target_email).trim(),
          course_id: cid
        }
      });
      if (enrollment) return [enrollment];

      // Fallback pseudo-enrollment object if targeted by email but no enrollment record
      return [{
        full_name: 'Student',
        email: String(announcement.target_email).trim(),
        access_token: null,
        status: 'enrolled',
        course_id: cid
      }];
    }

    return [];
  }

  // 2. Filtered list by target type
  const where = { course_id: cid };

  if (targetType === 'enrolled') {
    where.status = 'enrolled';
  } else if (targetType === 'preordered') {
    where.status = { [Op.in]: ['preordered', 'notified'] };
  } else if (targetType === 'attended') {
    where.attended = true;
  }
  // 'all' includes all enrollments for this course

  const enrollments = await CourseEnrollment.findAll({
    where,
    order: [['created_at', 'ASC']]
  });

  return enrollments;
}

/**
 * Count potential recipients for a course announcement target preview
 * @param {number} courseId
 * @param {string} targetType
 * @param {number} [targetEnrollmentId]
 * @param {string} [targetEmail]
 * @returns {Promise<{ total: number, unsubscribedEstimate: number, activeEstimate: number }>}
 */
async function getCourseRecipientsCount(courseId, targetType = 'all', targetEnrollmentId = null, targetEmail = null) {
  const dummyAnnouncement = {
    course_id: courseId,
    target_type: targetType,
    target_enrollment_id: targetEnrollmentId,
    target_email: targetEmail
  };

  const recipients = await getCourseRecipients(dummyAnnouncement, courseId);
  const emails = [...new Set(recipients.map((r) => String(r.email || '').trim().toLowerCase()).filter(Boolean))];

  if (emails.length === 0) {
    return { total: 0, unsubscribedEstimate: 0, activeEstimate: 0 };
  }

  const unsubscribedUsers = await User.findAll({
    where: {
      email: { [Op.in]: emails },
      email_unsubscribed_at: { [Op.ne]: null }
    },
    attributes: ['email']
  });

  const unsubscribedCount = unsubscribedUsers.length;
  const activeEstimate = Math.max(0, emails.length - unsubscribedCount);

  return {
    total: emails.length,
    unsubscribedEstimate: unsubscribedCount,
    activeEstimate
  };
}

/**
 * Broadcast course announcement emails to targeted course members
 * @param {Object} announcement - CourseAnnouncement instance or plain object
 * @param {Object} [course] - Optional Course instance (will fetch if not provided)
 * @returns {Promise<{ sent: number, failed: number, skipped: number, total: number, failures: Array, emailJob: Object }>}
 */
async function broadcastCourseAnnouncementEmails(announcement, course = null) {
  try {
    const plain = typeof announcement?.toJSON === 'function' ? announcement.toJSON() : announcement;
    let courseRecord = course;
    if (!courseRecord && plain.course_id) {
      courseRecord = await Course.findByPk(plain.course_id);
    }

    const recipients = await getCourseRecipients(plain, plain.course_id);

    if (recipients.length === 0) {
      logger.info(`Course announcement: no recipients found for announcement ${plain.announcement_id}`);
      return { sent: 0, failed: 0, skipped: 0, total: 0, failures: [], emailJob: null };
    }

    const { sendEmail } = await import('../utils/email.mjs');
    const { buildCourseAnnouncementEmail } = await import('../utils/courseAnnouncementEmail.mjs');
    const { startTrackedBulkEmailJob } = require('./announcementEmailJob');

    // Deduplicate by email while retaining recipient info
    const recipientMap = new Map();
    for (const rec of recipients) {
      const email = String(rec.email || '').trim().toLowerCase();
      if (email && !recipientMap.has(email)) {
        recipientMap.set(email, rec);
      }
    }

    const uniqueEmails = Array.from(recipientMap.keys());

    // Check unsubscribe status for users
    const users = await User.findAll({
      where: { email: { [Op.in]: uniqueEmails } },
      attributes: ['user_id', 'email', 'email_unsubscribed_at']
    });

    const userByEmail = new Map(
      users.map((u) => [String(u.email || '').trim().toLowerCase(), u])
    );

    const validRecipients = [];
    let skipped = 0;

    for (const [email, enrollment] of recipientMap.entries()) {
      const user = userByEmail.get(email);
      if (user?.email_unsubscribed_at) {
        skipped += 1;
        continue;
      }
      validRecipients.push({
        email,
        enrollment,
        userId: user?.user_id
      });
    }

    if (validRecipients.length === 0) {
      logger.info(
        `Course announcement: all recipients unsubscribed for announcement ${plain.announcement_id} (skipped=${skipped})`
      );
      return { sent: 0, failed: 0, skipped, total: uniqueEmails.length, failures: [], emailJob: null };
    }

    const emailJob = startTrackedBulkEmailJob({
      type: 'course_announcement',
      title: `${courseRecord?.title || 'Course'}: ${plain.title || 'Course Notice'}`,
      announcementId: plain.announcement_id || null,
      recipients: validRecipients,
      skipped,
      sendFn: sendEmail,
      buildPayload: async (item) => {
        const emailContent = await buildCourseAnnouncementEmail(
          plain,
          courseRecord,
          item.enrollment,
          { frontendUrl: process.env.FRONTEND_URL || process.env.WEBSITE_URL }
        );

        return {
          to: item.email,
          userId: item.userId,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
          fromName: `${courseRecord?.title || 'MSP'} Course Team`,
          category: 'marketing'
        };
      },
      metadata: {
        course_id: plain.course_id,
        course_title: courseRecord?.title || null,
        target_type: plain.target_type || 'all'
      }
    });

    logger.info(
      `Course announcement email broadcast started for announcement ${plain.announcement_id} (Job ${emailJob.id}): target=${plain.target_type || 'all'} recipients=${validRecipients.length} skipped=${skipped}`
    );

    return {
      sent: emailJob.sent || 0,
      failed: emailJob.failed || 0,
      skipped: skipped || 0,
      total: validRecipients.length,
      failures: emailJob.failures || [],
      emailJob
    };
  } catch (error) {
    logger.error('Error broadcasting course announcement emails:', error);
    throw error;
  }
}

module.exports = {
  getCourseRecipients,
  getCourseRecipientsCount,
  broadcastCourseAnnouncementEmails
};

