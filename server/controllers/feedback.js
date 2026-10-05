const { Feedback, Course, CourseLesson, Event, Competition, User } = require('../models');
const { checkBlacklist } = require('../utils/blacklistCheck');
const logger = require('../utils/logger');

const VALID_TARGET_TYPES = ['general', 'course', 'event', 'lesson', 'competition'];
const MAX_TEXT_LEN = 3000;

/**
 * Public feedback creation (supports guests, members, and logged-in users).
 * Optional auth attaches user info unless anonymous.
 */
const createFeedback = async (req, res) => {
  try {
    const rawTargetType = String(req.body.target_type || 'general').toLowerCase().trim();
    if (!VALID_TARGET_TYPES.includes(rawTargetType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid target_type. Must be one of: ${VALID_TARGET_TYPES.join(', ')}`
      });
    }

    let targetId = req.body.target_id != null && req.body.target_id !== '' 
      ? parseInt(req.body.target_id, 10) 
      : null;
    if (targetId !== null && (isNaN(targetId) || targetId <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'target_id must be a positive integer'
      });
    }

    let courseId = req.body.course_id != null && req.body.course_id !== '' 
      ? parseInt(req.body.course_id, 10) 
      : null;
    if (courseId !== null && isNaN(courseId)) {
      courseId = null;
    }

    // Target entity verification
    if (rawTargetType !== 'general') {
      if (!targetId) {
        return res.status(400).json({
          success: false,
          error: `target_id is required when target_type is '${rawTargetType}'`
        });
      }

      if (rawTargetType === 'course') {
        const course = await Course.findByPk(targetId);
        if (!course) {
          return res.status(404).json({ success: false, error: 'Course not found' });
        }
        courseId = course.course_id;
      } else if (rawTargetType === 'event') {
        const event = await Event.findByPk(targetId);
        if (!event) {
          return res.status(404).json({ success: false, error: 'Event not found' });
        }
      } else if (rawTargetType === 'lesson') {
        const lesson = await CourseLesson.findByPk(targetId);
        if (!lesson) {
          return res.status(404).json({ success: false, error: 'Lesson not found' });
        }
        courseId = lesson.course_id;
      } else if (rawTargetType === 'competition') {
        const comp = await Competition.findByPk(targetId);
        if (!comp) {
          return res.status(404).json({ success: false, error: 'Competition not found' });
        }
      }
    } else {
      targetId = null;
    }

    // Rating validation (1 to 5)
    let rating = req.body.rating != null && req.body.rating !== '' 
      ? parseInt(req.body.rating, 10) 
      : null;
    if (rating !== null) {
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be an integer between 1 and 5'
        });
      }
    }

    const positives = typeof req.body.positives === 'string' ? req.body.positives.trim() : '';
    const negatives = typeof req.body.negatives === 'string' ? req.body.negatives.trim() : '';
    const feedbackText = typeof req.body.feedback === 'string' ? req.body.feedback.trim() : '';

    if (positives.length > MAX_TEXT_LEN || negatives.length > MAX_TEXT_LEN || feedbackText.length > MAX_TEXT_LEN) {
      return res.status(400).json({
        success: false,
        error: `Text fields must each be under ${MAX_TEXT_LEN} characters`
      });
    }

    // Require at least some input
    if (!positives && !negatives && !feedbackText && rating === null) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a rating, positive highlights, constructive feedback, or general comments.'
      });
    }

    const anonymous = Boolean(req.body.anonymous);
    let name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    let email = typeof req.body.email === 'string' ? req.body.email.trim() : '';

    // Blacklist check
    const blacklistStatus = await checkBlacklist({
      user_id: req.user?.user_id,
      name: anonymous ? null : name,
      email: anonymous ? null : email
    });
    if (blacklistStatus.isBlacklisted) {
      return res.status(403).json({
        success: false,
        error: `Action blocked: You are restricted from participating in club activities. Reason: ${blacklistStatus.reason}`
      });
    }

    let userId = req.user?.user_id || null;
    if (userId && !anonymous) {
      if (!name) name = req.user.full_name || req.user.username || '';
      if (!email) email = req.user.email || '';
    }

    if (anonymous) {
      name = null;
      email = null;
      userId = null;
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    const created = await Feedback.create({
      target_type: rawTargetType,
      target_id: targetId,
      course_id: courseId,
      rating,
      positives: positives || null,
      negatives: negatives || null,
      feedback: feedbackText || null,
      user_id: userId,
      name: name || null,
      email: email || null,
      anonymous
    });

    logger.info(`Feedback submitted (#${created.feedback_id}) for ${rawTargetType}${targetId ? ` ID:${targetId}` : ''}`);

    res.status(201).json({
      success: true,
      message: 'Thank you! Your feedback has been submitted successfully.',
      data: {
        feedback_id: created.feedback_id,
        target_type: created.target_type,
        target_id: created.target_id,
        rating: created.rating,
        created_at: created.created_at
      }
    });
  } catch (error) {
    logger.error('Error creating feedback:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit feedback'
    });
  }
};

/**
 * Public summary of ratings & count for a specific target activity.
 * GET /api/feedback/summary?target_type=course&target_id=12
 */
const getFeedbackSummary = async (req, res) => {
  try {
    const { target_type, target_id } = req.query;
    if (!target_type || !VALID_TARGET_TYPES.includes(String(target_type).toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Valid target_type query param required' });
    }

    const where = { target_type: String(target_type).toLowerCase() };
    if (target_id) {
      const parsedId = parseInt(target_id, 10);
      if (!isNaN(parsedId)) where.target_id = parsedId;
    }

    const feedbacks = await Feedback.findAll({
      where,
      attributes: ['rating']
    });

    const totalCount = feedbacks.length;
    const rated = feedbacks.filter((f) => f.rating != null && f.rating >= 1 && f.rating <= 5);
    const sumRating = rated.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = rated.length > 0 ? Number((sumRating / rated.length).toFixed(1)) : null;

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const f of rated) {
      ratingBreakdown[f.rating] = (ratingBreakdown[f.rating] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        totalCount,
        ratedCount: rated.length,
        averageRating,
        ratingBreakdown
      }
    });
  } catch (error) {
    logger.error('Error fetching feedback summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feedback summary' });
  }
};

module.exports = {
  createFeedback,
  getFeedbackSummary
};
