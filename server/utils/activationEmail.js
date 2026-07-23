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
 * @param {number} [options.delayMs=500] - Delay between sends
 */
async function sendActivationEmailsToMembers(options = {}) {
  const { where = {}, delayMs = 500 } = options;
  const { sendEmail } = await import('./email.mjs');

  const members = await Member.findAll({
    where,
    attributes: ['member_id', 'full_name', 'email', 'university_id', 'user_id']
  });

  const summary = {
    total: members.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    sentTo: [],
    skippedMembers: [],
    errors: []
  };

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    try {
      const result = await sendActivationEmailForMember(member, sendEmail);
      if (result.success) {
        summary.sent++;
        summary.sentTo.push({
          memberId: result.memberId,
          name: result.name,
          email: result.email
        });
      } else if (result.skipped) {
        summary.skipped++;
        summary.skippedMembers.push({
          memberId: result.memberId,
          name: result.name,
          email: result.email,
          reason: result.reason
        });
      } else {
        summary.failed++;
        summary.errors.push({
          memberId: result.memberId,
          name: result.name,
          email: result.email,
          error: result.error
        });
      }
    } catch (err) {
      summary.failed++;
      summary.errors.push({
        memberId: member.member_id,
        name: member.full_name,
        email: member.email,
        error: err.message
      });
    }

    if (i < members.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return summary;
}

module.exports = {
  sendActivationEmailForMember,
  sendActivationEmailsToMembers
};
