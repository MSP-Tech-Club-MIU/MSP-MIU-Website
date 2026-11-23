const Member = require('../models/Member');
const Department = require('../models/Department');
const { renderTemplate } = require('./emailTemplates/render');
const { departmentHasWhatsApp, getGeneralWhatsAppLink } = require('./emailTemplates/defaults');

const DEFAULT_INSTAGRAM = 'https://www.instagram.com/mspmiu';
const DEFAULT_TIKTOK = 'https://www.tiktok.com/@mspmiu';
const DEFAULT_YOUTUBE = 'https://www.youtube.com/@MSP-MIU';

/**
 * Send acceptance email for a single member:
 * - Delegates receive 'delegate_acceptance' with their department's WhatsApp group link.
 * - Regular members receive 'member_acceptance' with the general members WhatsApp group link.
 */
async function sendAcceptanceEmailForMember(member, sendEmail) {
  const studentName = member.full_name;
  const email = member.email;
  const department = member.department;
  const isDelegate = member.role === 'delegate';

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

  let whatsappLink = null;
  let templateKey = 'member_acceptance';

  if (isDelegate) {
    templateKey = 'delegate_acceptance';
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

    whatsappLink = department.whatsapp_group_url;
    if (!whatsappLink) {
      return {
        success: false,
        skipped: true,
        memberId: member.member_id,
        name: studentName,
        email,
        reason: `No WhatsApp link for department: ${department.name}`
      };
    }
  } else {
    templateKey = 'member_acceptance';
    whatsappLink = await getGeneralWhatsAppLink();
    if (!whatsappLink) {
      return {
        success: false,
        skipped: true,
        memberId: member.member_id,
        name: studentName,
        email,
        reason: 'No WhatsApp link configured for general members'
      };
    }
  }

  const rendered = await renderTemplate(templateKey, {
    studentName,
    departmentName: department.name,
    departmentLink: whatsappLink,
    generalGroupLink: whatsappLink,
    whatsappGroupLink: whatsappLink,
    whatsappLink,
    youtubeLink: process.env.YOUTUBE_URL || DEFAULT_YOUTUBE,
    instagramLink: process.env.INSTAGRAM_URL || DEFAULT_INSTAGRAM,
    tiktokLink: process.env.TIKTOK_URL || DEFAULT_TIKTOK
  });

  await sendEmail({
    to: email,
    fromName: 'MSP-MIU',
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
    role: member.role || 'member',
    department: department.name,
    templateKey
  };
}

/**
 * Bulk send acceptance emails:
 * - Delegates receive 'delegate_acceptance' with their department's WhatsApp group link.
 * - Regular members receive 'member_acceptance' with the general members WhatsApp group link.
 * @param {object} [options]
 * @param {object} [options.where]
 */
async function sendAcceptanceEmailsToMembers(options = {}) {
  const { where = {} } = options;
  const { sendEmail } = await import('./email.mjs');
  const { startTrackedBulkEmailJob } = require('../services/announcementEmailJob');
  const generalWhatsAppLink = await getGeneralWhatsAppLink();

  const members = await Member.findAll({
    where,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name', 'whatsapp_group_url']
      }
    ],
    attributes: ['member_id', 'full_name', 'email', 'department_id', 'role']
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
    const isDelegate = m.role === 'delegate';
    if (isDelegate) {
      if (!departmentHasWhatsApp(m.department.name) || !m.department.whatsapp_group_url) {
        skipped++;
        continue;
      }
    } else {
      if (!generalWhatsAppLink) {
        skipped++;
        continue;
      }
    }
    validRecipients.push({
      email,
      member: m
    });
  }

  const emailJob = startTrackedBulkEmailJob({
    type: 'member_acceptance',
    title: 'Acceptance Emails',
    recipients: validRecipients,
    skipped,
    sendFn: sendEmail,
    buildPayload: async (item) => {
      const m = item.member;
      const isDelegate = m.role === 'delegate';
      const studentName = m.full_name;
      const department = m.department;
      const templateKey = isDelegate ? 'delegate_acceptance' : 'member_acceptance';
      const whatsappUrl = isDelegate ? department.whatsapp_group_url : generalWhatsAppLink;

      const rendered = await renderTemplate(templateKey, {
        studentName,
        departmentName: department.name,
        departmentLink: whatsappUrl,
        generalGroupLink: whatsappUrl,
        whatsappGroupLink: whatsappUrl,
        whatsappLink: whatsappUrl,
        youtubeLink: process.env.YOUTUBE_URL || DEFAULT_YOUTUBE,
        instagramLink: process.env.INSTAGRAM_URL || DEFAULT_INSTAGRAM,
        tiktokLink: process.env.TIKTOK_URL || DEFAULT_TIKTOK
      });

      return {
        to: item.email,
        fromName: 'MSP-MIU',
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
