const Member = require('../models/Member');
const Department = require('../models/Department');
const { renderTemplate } = require('./emailTemplates/render');
const { departmentHasWhatsApp } = require('./emailTemplates/defaults');

const DEFAULT_INSTAGRAM = 'https://www.instagram.com/mspmiu';
const DEFAULT_TIKTOK = 'https://www.tiktok.com/@mspmiu';
const DEFAULT_YOUTUBE = 'https://www.youtube.com/@MSP-MIU';

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
    youtubeLink: process.env.YOUTUBE_URL || DEFAULT_YOUTUBE,
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
 */
async function sendAcceptanceEmailsToMembers(options = {}) {
  const { where = {} } = options;
  const { sendEmail } = await import('./email.mjs');
  const { startTrackedBulkEmailJob } = require('../services/announcementEmailJob');

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

  const validRecipients = [];
  let skipped = 0;
  for (const m of members) {
    const email = String(m.email || '').trim();
    if (!email) {
      skipped++;
      continue;
    }
    if (!m.department || !m.department.name) {
      skipped++;
      continue;
    }
    validRecipients.push({
      email,
      member: m
    });
  }

  const emailJob = startTrackedBulkEmailJob({
    type: 'member_acceptance',
    title: 'Member Acceptance Emails',
    recipients: validRecipients,
    skipped,
    sendFn: sendEmail,
    buildPayload: async (item) => {
      const m = item.member;
      const studentName = m.full_name;
      const department = m.department;
      const rendered = await renderTemplate('member_acceptance', {
        studentName,
        departmentName: department.name,
        departmentLink: department.whatsapp_group_url || null,
        whatsappGroupLink: department.whatsapp_group_url || null,
        youtubeLink: process.env.YOUTUBE_URL || DEFAULT_YOUTUBE,
        instagramLink: process.env.INSTAGRAM_URL || DEFAULT_INSTAGRAM,
        tiktokLink: process.env.TIKTOK_URL || DEFAULT_TIKTOK
      });

      return {
        to: item.email,
        fromName: 'MSP MIU Website',
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        headers: {
          'X-Entity-Ref-ID': `acceptance-${m.member_id}-${Date.now()}`
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
  sendAcceptanceEmailForMember,
  sendAcceptanceEmailsToMembers
};

