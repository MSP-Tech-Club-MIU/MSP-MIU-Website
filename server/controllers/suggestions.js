const { Suggestion, Member } = require('../models');
const { getDefaultSeasonId } = require('../utils/seasonFilter');
const { checkBlacklist } = require('../utils/blacklistCheck');
const logger = require('../utils/logger');

const MAX_LENGTH = 2000;

/**
 * Public create — guests and members can submit suggestions.
 * Optional auth: if logged-in member is found, links member_id.
 */
const createSuggestion = async (req, res) => {
  try {
    const rawSuggestion = typeof req.body.suggestion === 'string' ? req.body.suggestion.trim() : '';
    const anonymous = Boolean(req.body.anonymous);
    let name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    let email = typeof req.body.email === 'string' ? req.body.email.trim() : '';

    if (!rawSuggestion) {
      return res.status(400).json({
        success: false,
        error: 'Suggestion text is required'
      });
    }

    if (rawSuggestion.length > MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Suggestion must be less than ${MAX_LENGTH} characters`
      });
    }

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

    let memberId = null;
    if (req.user?.user_id) {
      const defaultSeasonId = await getDefaultSeasonId();
      let member = null;
      if (defaultSeasonId != null) {
        member = await Member.findOne({
          where: { user_id: req.user.user_id, season_id: defaultSeasonId },
          attributes: ['member_id', 'full_name', 'email']
        });
      }
      if (!member) {
        member = await Member.findOne({
          where: { user_id: req.user.user_id },
          attributes: ['member_id', 'full_name', 'email'],
          order: [['joined_at', 'DESC'], ['member_id', 'DESC']]
        });
      }
      if (member) {
        memberId = member.member_id;
        if (!anonymous) {
          if (!name) name = member.full_name || '';
          if (!email) email = member.email || '';
        }
      }
    }

    if (anonymous) {
      name = null;
      email = null;
    } else if (!memberId && !name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required unless you submit anonymously'
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    const created = await Suggestion.create({
      member_id: memberId,
      name: name || null,
      email: email || null,
      suggestion: rawSuggestion,
      anonymous
    });

    res.status(201).json({
      success: true,
      message: 'Suggestion submitted successfully',
      data: {
        suggestion_id: created.suggestion_id,
        created_at: created.created_at
      }
    });
  } catch (error) {
    logger.error('Error creating suggestion:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit suggestion'
    });
  }
};

module.exports = {
  createSuggestion
};
