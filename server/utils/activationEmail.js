const Member = require('../models/Member');
const User = require('../models/User');
const { generateToken } = require('./jwt');
const { renderTemplate } = require('./emailTemplates/render');

const WEBSITE_URL =
  process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'https://msp-miu.tech';

/**
 * Send an activation email to a single member record.
 * Skips members who already have an active account or password.
 */
async function sendActivationEmailForMember(member, sendEmail) {
  const studentName = member.full_name;
  const email = member.email;

  if (!email) {
    return {
      success: false,
      skipped: true,
      memberId: member.member_id,
      name: studentName,
      email: null,
      reason: 'No email on member record'
    };
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser && (existingUser.is_active || existingUser.password_hash)) {
    return {
      success: false,
      skipped: true,
      memberId: member.member_id,
      name: studentName,
      email,
      reason: existingUser.is_active
        ? 'Account is already active'
        : 'Account already has a password'
    };
  }

  const tokenResult = generateToken({
    email,
    type: 'activation',
    member_id: member.member_id
  });

  if (!tokenResult.success) {
    return {
      success: false,
      memberId: member.member_id,
      name: studentName,
      email,
      error: `Token generation failed: ${tokenResult.error}`
    };
  }

  const activationLink = `${WEBSITE_URL}/account-activation?token=${encodeURIComponent(tokenResult.token)}`;
  const rendered = await renderTemplate('member_activation', {
    studentName,
    activationLink
  });

  await sendEmail({
    to: email,
    fromName: 'MSP MIU Website',
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    headers: {
      'X-Entity-Ref-ID': `activation-${member.member_id}-${Date.now()}`
    }
  });

  return {
    success: true,
    memberId: member.member_id,
    name: studentName,
    email
  };
}

/**
 * Send activation emails to members who do not yet have an activated account.
 * @param {object} [options]
 * @param {object} [options.where] - Extra Sequelize where clause (e.g. season filter)
 */
async function sendActivationEmailsToMembers(options = {}) {
  const { where = {} } = options;
  const { sendEmail } = await import('./email.mjs');
  const { startTrackedBulkEmailJob } = require('../services/announcementEmailJob');

  const members = await Member.findAll({
    where,
    attributes: ['member_id', 'full_name', 'email', 'university_id', 'user_id']
  });

  const existingUsers = await User.findAll({
    attributes: ['email', 'is_active', 'password_hash']
  });
  const activeUserEmails = new Set(
    existingUsers
      .filter((u) => u.is_active || u.password_hash)
      .map((u) => String(u.email || '').trim().toLowerCase())
  );

  const validRecipients = [];
  let skipped = 0;
  for (const m of members) {
    const email = String(m.email || '').trim();
    if (!email) {
      skipped++;
      continue;
    }
    if (activeUserEmails.has(email.toLowerCase())) {
      skipped++;
      continue;
    }
    validRecipients.push({
      email,
      member: m,
      userId: m.user_id
    });
  }

  const emailJob = startTrackedBulkEmailJob({
    type: 'member_activation',
    title: 'Member Account Activation Emails',
    recipients: validRecipients,
    skipped,
    sendFn: sendEmail,
    buildPayload: async (item) => {
      const studentName = item.member.full_name;
      const tokenResult = generateToken({
        email: item.email,
        type: 'activation',
        member_id: item.member.member_id
      });

      if (!tokenResult.success) {
        throw new Error(`Token generation failed: ${tokenResult.error}`);
      }

      const activationLink = `${WEBSITE_URL}/account-activation?token=${encodeURIComponent(tokenResult.token)}`;
      const rendered = await renderTemplate('member_activation', {
        studentName,
        activationLink
      });

      return {
        to: item.email,
        fromName: 'MSP MIU Website',
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        headers: {
          'X-Entity-Ref-ID': `activation-${item.member.member_id}-${Date.now()}`
        }
      };
    }
  });

  return {
    total: members.length,
    sent: emailJob.sent || 0,
    skipped,
    failed: emailJob.failed || 0,
    emailJob
  };
}

module.exports = {
  sendActivationEmailForMember,
  sendActivationEmailsToMembers
};

