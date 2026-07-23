const Member = require('../models/Member');
const Department = require('../models/Department');
const { renderTemplate } = require('./emailTemplates/render');
const { departmentHasWhatsApp } = require('./emailTemplates/defaults');

const DEFAULT_INSTAGRAM = 'https://www.instagram.com/mspmiu';
const DEFAULT_TIKTOK = 'https://www.tiktok.com/@mspmiu';

/**
 * Send acceptance email for a single member (uses department.whatsapp_group_url).
 */
async function sendAcceptanceEmailForMember(member, sendEmail) {
  const studentName = member.full_name;
  const email = member.email;
  const department = member.department;

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

  if (!department || !department.name) {
    return {
      success: false,
      skipped: true,
      memberId: member.member_id,
      name: studentName,
      email,
      reason: 'No department assigned'
    };
  }

  if (!departmentHasWhatsApp(department.name)) {
    return {
      success: false,
      skipped: true,
      memberId: member.member_id,
      name: studentName,
      email,
      reason: `${department.name} does not use a WhatsApp group link`
    };
  }

  const departmentLink = department.whatsapp_group_url;
  if (!departmentLink) {
    return {
      success: false,
      skipped: true,
      memberId: member.member_id,
      name: studentName,
      email,
      reason: `No WhatsApp link for department: ${department.name}`
    };
  }

  const rendered = await renderTemplate('member_acceptance', {
    studentName,
    departmentName: department.name,
    departmentLink,
    instagramLink: process.env.INSTAGRAM_URL || DEFAULT_INSTAGRAM,
    tiktokLink: process.env.TIKTOK_URL || DEFAULT_TIKTOK
  });

  await sendEmail({
    to: email,
    fromName: 'MSP MIU Website',
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    headers: {
      'X-Entity-Ref-ID': `acceptance-${member.member_id}-${Date.now()}`
    }
  });

  return {
    success: true,
    memberId: member.member_id,
    name: studentName,
    email,
    department: department.name
  };
}

/**
 * Bulk send member acceptance emails.
 * @param {object} [options]
 * @param {object} [options.where]
 * @param {number} [options.delayMs=500]
 */
async function sendAcceptanceEmailsToMembers(options = {}) {
  const { where = {}, delayMs = 500 } = options;
  const { sendEmail } = await import('./email.mjs');

  const members = await Member.findAll({
    where,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name', 'whatsapp_group_url']
      }
    ],
    attributes: ['member_id', 'full_name', 'email', 'department_id']
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
      const result = await sendAcceptanceEmailForMember(member, sendEmail);
      if (result.success) {
        summary.sent++;
        summary.sentTo.push({
          memberId: result.memberId,
          name: result.name,
          email: result.email,
          department: result.department
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
          error: result.error || 'Unknown error'
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
  sendAcceptanceEmailForMember,
  sendAcceptanceEmailsToMembers
};
