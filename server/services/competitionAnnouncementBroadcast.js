const { Team, TeamMember, User, Competition } = require('../models');

/**
 * Get targeted competitor emails for an announcement
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
    
    // 2. Specific team
    if (announcement.target_type === 'team' && announcement.target_team_id) {
      teamIds = [announcement.target_team_id];
    } else {
      // 3. All competitors in competition
      const teams = await Team.findAll({
        where: { competition_id: announcement.competition_id },
        attributes: ['team_id']
      });

      if (teams.length === 0) {
        console.log(`No teams found for competition ${announcement.competition_id}`);
        return [];
      }
      teamIds = teams.map(team => team.team_id);
    }

    // Find all team members and their associated users
    const teamMembers = await TeamMember.findAll({
      where: { team_id: teamIds },
      attributes: ['user_id'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['email'],
        required: true
      }]
    });

    // Extract unique emails
    const emails = [
      ...new Set(
        teamMembers
          .map(tm => (tm.user?.email || '').trim())
          .filter(Boolean)
      )
    ];

    console.log(`Found ${emails.length} unique emails for announcement ${announcement.announcement_id}`);
    return emails;
  } catch (error) {
    console.error('Error fetching competitor emails:', error);
    throw error;
  }
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
      console.log(`Competition announcement: no recipients for announcement ${announcement.announcement_id}`);
      return;
    }

    const { sendEmail } = await import('../utils/email.mjs');
    const { buildCompetitionAnnouncementEmail } = await import('../utils/competitionAnnouncementEmail.mjs');

    const { subject, text, html } = buildCompetitionAnnouncementEmail(announcement, competition, {
      frontendUrl: process.env.FRONTEND_URL
    });

    // Send emails to each recipient individually for reliability
    for (const to of emails) {
      await sendEmail({
        to,
        subject,
        text,
        html,
        fromName: 'MSP MIU Competition Announcements'
      });
    }

    console.log(`Competition announcement emails sent to ${emails.length} recipient(s) for competition ${announcement.competition_id}`);
  } catch (error) {
    console.error('Error broadcasting competition announcement emails:', error);
    throw error;
  }
}

module.exports = {
  getCompetitorEmails,
  broadcastCompetitionAnnouncementEmails
};
