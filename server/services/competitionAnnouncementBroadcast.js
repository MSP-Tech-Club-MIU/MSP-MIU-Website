const { Team, TeamMember, User, Competition, TeamInvitation } = require('../models');
const logger = require('../utils/logger');

/**
 * Get targeted competitor emails for an announcement
 * Includes both active AND inactive users who are part of competition teams
 * @param {Object} announcement - CompetitionAnnouncement object
 * @returns {Promise<string[]>} Array of unique email addresses
 */
async function getCompetitorEmails(announcement) {
  try {
    // 1. Specific competitor
    if (announcement.target_type === 'competitor' && announcement.target_user_id) {
      const user = await User.findByPk(announcement.target_user_id, { attributes: ['email'] });
      return user && user.email ? [user.email.trim()] : [];
    }

    let teamIds = [];
    let creatorUserIds = [];
    
    // 2. Specific team
    if (announcement.target_type === 'team' && announcement.target_team_id) {
      teamIds = [announcement.target_team_id];
    } else {
      // 3. All competitors in competition
      const teams = await Team.findAll({
        where: { competition_id: announcement.competition_id },
        attributes: ['team_id', 'created_by_user_id']
      });

      if (teams.length === 0) {
        logger.info(`No teams found for competition ${announcement.competition_id}`);
        return [];
      }
      teamIds = teams.map(team => team.team_id);
      // Collect creator user IDs for inactive users check
      creatorUserIds = teams
        .filter(team => team.created_by_user_id)
        .map(team => team.created_by_user_id);
    }

    // Find all team members and their associated users (includes both active and inactive users)
    const teamMembers = await TeamMember.findAll({
      where: { team_id: teamIds },
      attributes: ['user_id'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['email', 'is_active'],
        required: true
      }]
    });

    // Extract unique emails from team members (including inactive users)
    const emails = new Set(
      teamMembers
        .map(tm => (tm.user?.email || '').trim())
        .filter(Boolean)
    );

    // Also include inactive team creators
    if (creatorUserIds.length > 0) {
      const inactiveCreators = await User.findAll({
        where: {
          user_id: creatorUserIds,
          is_active: false
        },
        attributes: ['email']
      });

      inactiveCreators.forEach(user => {
        if (user?.email) {
          emails.add((user.email || '').trim());
        }
      });
    }

    // Also include users with pending team invitations
    const pendingInvitations = await TeamInvitation.findAll({
      where: {
        team_id: teamIds,
        status: 'pending'
      },
      attributes: ['invited_email']
    });

    pendingInvitations.forEach(invitation => {
      if (invitation?.invited_email) {
        emails.add((invitation.invited_email || '').trim());
      }
    });

    const emailArray = Array.from(emails);
    logger.info(`Found ${emailArray.length} unique emails for announcement ${announcement.announcement_id} (including inactive users and users with pending invitations)`);
    return emailArray;
  } catch (error) {
    logger.error('Error fetching competitor emails:', error);
    throw error;
  }
}

/**
 * Get unique team member emails for a single team
 * @param {number} teamId
 * @returns {Promise<string[]>}
 */
async function getTeamMemberEmails(teamId) {
  if (!teamId) return [];

  const teamMembers = await TeamMember.findAll({
    where: { team_id: teamId },
    attributes: ['user_id'],
    include: [{
      model: User,
      as: 'user',
      attributes: ['email'],
      required: true
    }]
  });

  return [
    ...new Set(
      teamMembers
        .map(tm => (tm.user?.email || '').trim())
        .filter(Boolean)
    )
  ];
}

/**
 * Broadcast competition announcement emails to targeted competitors
 * @param {Object} announcement - CompetitionAnnouncement object
 * @param {Object} competition - Competition object
 */
async function broadcastCompetitionAnnouncementEmails(announcement, competition) {
  try {
    const emails = await getCompetitorEmails(announcement);

    if (emails.length === 0) {
      logger.info(`Competition announcement: no recipients for announcement ${announcement.announcement_id}`);
      return { sent: 0, failed: 0, skipped: 0 };
    }

    const { sendEmail } = await import('../utils/email.mjs');
    const { buildCompetitionAnnouncementEmail } = await import('../utils/competitionAnnouncementEmail.mjs');
    const { sendBulkEmails } = require('../utils/bulkEmailSend');
    const { Op } = require('sequelize');

    const { subject, text, html } = await buildCompetitionAnnouncementEmail(announcement, competition, {
      frontendUrl: process.env.FRONTEND_URL
    });

    const users = await User.findAll({
      where: { email: { [Op.in]: emails } },
      attributes: ['user_id', 'email', 'email_unsubscribed_at']
    });
    const byEmail = new Map(
      users.map((u) => [String(u.email || '').trim().toLowerCase(), u])
    );

    const recipients = [];
    let skipped = 0;
    for (const email of emails) {
      const key = String(email || '').trim().toLowerCase();
      const user = byEmail.get(key);
      if (user?.email_unsubscribed_at) {
        skipped += 1;
        continue;
      }
      recipients.push({
        email: String(email).trim(),
        userId: user?.user_id
      });
    }

    if (recipients.length === 0) {
      logger.info(
        `Competition announcement: all recipients unsubscribed for ${announcement.announcement_id} (skipped=${skipped})`
      );
      return { sent: 0, failed: 0, skipped };
    }

    const result = await sendBulkEmails({
      recipients,
      sendFn: sendEmail,
      buildPayload: async (recipient) => ({
        to: recipient.email,
        userId: recipient.userId,
        subject,
        text,
        html,
        fromName: 'MSP MIU Competition Announcements',
        category: 'marketing'
      })
    });

    logger.info(
      `Competition announcement emails: sent=${result.sent} failed=${result.failed} skipped=${skipped} competition=${announcement.competition_id}`
    );
    return { ...result, skipped };
  } catch (error) {
    logger.error('Error broadcasting competition announcement emails:', error);
    throw error;
  }
}

module.exports = {
  getCompetitorEmails,
  getTeamMemberEmails,
  broadcastCompetitionAnnouncementEmails
};
