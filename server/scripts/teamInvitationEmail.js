/**
 * Team Invitation Email Templates — backed by email_templates DB + defaults.
 */
const { renderTemplate } = require('../utils/emailTemplates/render');

function buildAcceptInvitationUrl(acceptUrl, invitationToken) {
  const base = String(acceptUrl || 'http://localhost:5173').trim().replace(/\/+$/, '');
  const token = encodeURIComponent(String(invitationToken || ''));
  return `${base}/accept-team-invitation?token=${token}`;
}

async function generateNewUserInvitationEmail(data) {
  const acceptLink = buildAcceptInvitationUrl(data.acceptUrl, data.invitationToken);
  return renderTemplate('team_invite_new', {
    teamName: data.teamName || '',
    inviterName: data.inviterName || '',
    competitionTitle: data.competitionTitle || '',
    competitionStartDate: data.competitionStartDate || '',
    competitionEndDate: data.competitionEndDate || '',
    acceptLink,
    expiresAt: data.expiresAt || '',
    invitedName: data.invitedName || 'Not provided',
    invitedUniversityId: data.invitedUniversityId || 'Not provided',
    email: data.email || '',
    competitionUrl: data.competitionUrl || ''
  });
}

async function generateExistingUserInvitationEmail(data) {
  const expiresNote = data.expiresAt
    ? `\nThis invitation expires on ${data.expiresAt}\n`
    : '';
  const expiresHtml = data.expiresAt
    ? `<table role="presentation" style="width:100%;background:rgba(244,88,31,0.15);border:1px solid rgba(244,88,31,0.3);border-radius:8px;margin-top:20px;"><tr><td style="padding:15px;"><p style="margin:0;font-size:14px;color:#F4581F;font-weight:600;">⚠️ This invitation expires on ${data.expiresAt}</p></td></tr></table>`
    : '';

  return renderTemplate('team_invite_existing', {
    teamName: data.teamName || '',
    inviterName: data.inviterName || '',
    competitionTitle: data.competitionTitle || '',
    competitionStartDate: data.competitionStartDate || '',
    competitionEndDate: data.competitionEndDate || '',
    competitionUrl: data.competitionUrl || '',
    email: data.email || '',
    expiresNote,
    expiresHtml
  });
}

async function generateGuestLeaderTeamCreatedEmail(data) {
  return renderTemplate('team_created_guest', {
    teamName: data.teamName || '',
    competitionTitle: data.competitionTitle || '',
    competitionStartDate: data.competitionStartDate || '',
    competitionEndDate: data.competitionEndDate || '',
    competitionUrl: data.competitionUrl || '',
    workspaceUrl: data.workspaceUrl || '',
    email: data.email || ''
  });
}

/** @deprecated use generateNewUserInvitationEmail */
async function generateNewUserInvitationEmailHTML(data) {
  const r = await generateNewUserInvitationEmail(data);
  return r.html;
}
async function generateNewUserInvitationEmailText(data) {
  const r = await generateNewUserInvitationEmail(data);
  return r.text;
}
async function generateExistingUserInvitationEmailHTML(data) {
  const r = await generateExistingUserInvitationEmail(data);
  return r.html;
}
async function generateExistingUserInvitationEmailText(data) {
  const r = await generateExistingUserInvitationEmail(data);
  return r.text;
}
async function generateGuestLeaderTeamCreatedEmailHTML(data) {
  const r = await generateGuestLeaderTeamCreatedEmail(data);
  return r.html;
}
async function generateGuestLeaderTeamCreatedEmailText(data) {
  const r = await generateGuestLeaderTeamCreatedEmail(data);
  return r.text;
}

async function getInvitationEmailSubject(teamName, competitionTitle, userExists = false) {
  const key = userExists ? 'team_invite_existing' : 'team_invite_new';
  const r = await renderTemplate(key, { teamName, competitionTitle });
  return r.subject;
}

async function getGuestLeaderTeamCreatedSubject(teamName, competitionTitle) {
  const r = await renderTemplate('team_created_guest', { teamName, competitionTitle });
  return r.subject;
}

module.exports = {
  buildAcceptInvitationUrl,
  generateNewUserInvitationEmail,
  generateExistingUserInvitationEmail,
  generateGuestLeaderTeamCreatedEmail,
  generateNewUserInvitationEmailHTML,
  generateExistingUserInvitationEmailHTML,
  generateNewUserInvitationEmailText,
  generateExistingUserInvitationEmailText,
  getInvitationEmailSubject,
  generateGuestLeaderTeamCreatedEmailHTML,
  generateGuestLeaderTeamCreatedEmailText,
  getGuestLeaderTeamCreatedSubject
};
