const EmailTemplate = require('../models/EmailTemplate');
const Department = require('../models/Department');
const {
  listTemplates,
  getTemplate,
  renderTemplate
} = require('../utils/emailTemplates/render');
const { getDefaultTemplate, listDefaultTemplates } = require('../utils/emailTemplates/defaults');
const { sendActivationEmailsToMembers } = require('../utils/activationEmail');
const { sendBoardActivationEmailsToMembers } = require('../utils/boardActivationEmail');
const { sendAcceptanceEmailsToMembers } = require('../utils/acceptanceEmail');
const { resolveSeasonFilter } = require('../utils/seasonFilter');

const listEmailTemplates = async (req, res) => {
  try {
    const templates = await listTemplates();
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('listEmailTemplates:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to list templates' });
  }
};

const getEmailTemplate = async (req, res) => {
  try {
    const { key } = req.params;
    const template = await getTemplate(key);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('getEmailTemplate:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get template' });
  }
};

const updateEmailTemplate = async (req, res) => {
  try {
    const { key } = req.params;
    const fallback = getDefaultTemplate(key);
    if (!fallback) {
      return res.status(404).json({ success: false, error: 'Unknown template key' });
    }

    const { subject, html_body, text_body, name, meta } = req.body;
    if (subject == null || html_body == null || text_body == null) {
      return res.status(400).json({
        success: false,
        error: 'subject, html_body, and text_body are required'
      });
    }

    let metaValue = fallback.meta || null;
    if (meta !== undefined) {
      metaValue = meta && typeof meta === 'object' ? meta : null;
    } else {
      // Preserve existing meta when not sent
      try {
        const existing = await EmailTemplate.findByPk(key);
        if (existing?.meta != null) metaValue = existing.meta;
      } catch (_) {
        /* ignore */
      }
    }

    const [row] = await EmailTemplate.upsert({
      template_key: key,
      name: name || fallback.name,
      category: fallback.category,
      subject: String(subject),
      html_body: String(html_body),
      text_body: String(text_body),
      placeholders: fallback.placeholders,
      meta: metaValue,
      updated_at: new Date()
    });

    const template = await getTemplate(key);
    res.json({ success: true, data: template || row });
  } catch (error) {
    console.error('updateEmailTemplate:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update template' });
  }
};

const resetEmailTemplate = async (req, res) => {
  try {
    const { key } = req.params;
    const fallback = getDefaultTemplate(key);
    if (!fallback) {
      return res.status(404).json({ success: false, error: 'Unknown template key' });
    }

    await EmailTemplate.upsert({
      template_key: key,
      name: fallback.name,
      category: fallback.category,
      subject: fallback.subject,
      html_body: fallback.html_body,
      text_body: fallback.text_body,
      placeholders: fallback.placeholders,
      meta: fallback.meta || null,
      updated_at: new Date()
    });

    const template = await getTemplate(key);
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('resetEmailTemplate:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to reset template' });
  }
};

const SAMPLE_VARS = {
  member_activation: {
    studentName: 'Sample Member',
    activationLink: 'https://msp-miu.tech/account-activation?token=sample'
  },
  board_activation: {
    boardMemberName: 'Sample Board',
    position: 'President',
    activationLink: 'https://msp-miu.tech/account-activation?token=sample'
  },
  member_acceptance: {
    studentName: 'Sample Member',
    departmentName: 'Software Development',
    departmentLink: 'https://chat.whatsapp.com/sample',
    instagramLink: 'https://www.instagram.com/mspmiu',
    tiktokLink: 'https://www.tiktok.com/@mspmiu'
  },
  password_reset: {
    fullName: 'Sample User',
    resetLink: 'https://msp-miu.tech/reset-password?token=sample'
  },
  site_announcement: {
    title: 'Sample Announcement',
    description: 'This is a sample announcement body.',
    frontendUrl: 'https://msp-miu.tech',
    titleHtml: 'Sample Announcement',
    descriptionHtml: 'This is a sample announcement body.',
    preheader: 'This is a sample announcement body.',
    testBannerHtml: ''
  },
  competition_announcement: {
    competitionTitle: 'Sample Competition',
    announcementTitle: 'Sample Title',
    announcementMessage: 'Sample message',
    competitionLink: 'https://msp-miu.tech/competitions/1',
    competitionTitleHtml: 'Sample Competition',
    announcementTitleHtml: 'Sample Title',
    announcementMessageHtml: 'Sample message'
  },
  team_invite_new: {
    teamName: 'Team Alpha',
    inviterName: 'Leader',
    competitionTitle: 'Sample Competition',
    competitionStartDate: 'Jan 1, 2026',
    competitionEndDate: 'Jan 31, 2026',
    acceptLink: 'https://msp-miu.tech/accept-team-invitation?token=sample',
    expiresAt: 'Jan 15, 2026',
    invitedName: 'Invitee',
    invitedUniversityId: '2024/00001',
    email: 'sample@miuegypt.edu.eg',
    competitionUrl: 'https://msp-miu.tech/competitions/1'
  },
  team_invite_existing: {
    teamName: 'Team Alpha',
    inviterName: 'Leader',
    competitionTitle: 'Sample Competition',
    competitionStartDate: 'Jan 1, 2026',
    competitionEndDate: 'Jan 31, 2026',
    competitionUrl: 'https://msp-miu.tech/competitions/1',
    email: 'sample@miuegypt.edu.eg',
    expiresNote: '',
    expiresHtml: ''
  },
  team_created_guest: {
    teamName: 'Team Alpha',
    competitionTitle: 'Sample Competition',
    competitionStartDate: 'Jan 1, 2026',
    competitionEndDate: 'Jan 31, 2026',
    competitionUrl: 'https://msp-miu.tech/competitions/1',
    workspaceUrl: 'https://msp-miu.tech/competitions/1/workspace',
    email: 'sample@miuegypt.edu.eg'
  },
  timeslot_selection: {
    competitionTitle: 'Sample Competition',
    teamName: 'Team Alpha',
    slotCount: 3,
    selectionLink: 'https://msp-miu.tech/timeslot?token=sample',
    competitionTitleHtml: 'Sample Competition',
    teamNameHtml: 'Team Alpha'
  },
  timeslot_assigned: {
    competitionTitle: 'Sample Competition',
    teamName: 'Team Alpha',
    assignmentVerb: 'confirmed',
    assignmentLabel: 'selected by your team',
    startAt: 'Jan 10, 2026 10:00 AM',
    endAt: 'Jan 10, 2026 12:00 PM',
    locationText: '\nLocation: Main Hall',
    headerLabel: 'Confirmation',
    teamNameHtml: 'Team Alpha',
    assignmentLabelHtml: 'selected by your team',
    startAtHtml: 'Jan 10, 2026 10:00 AM',
    endAtHtml: 'Jan 10, 2026 12:00 PM',
    locationHtml: '<li><strong>Location:</strong> Main Hall</li>'
  },
  course_certificate: {
    studentName: 'Sample Student',
    courseName: 'Sample Course',
    feedbackFormUrl: 'https://forms.gle/sample',
    linkedInPostUrl: 'https://www.linkedin.com/feed/',
    githubCopilotUrl: 'https://learn.microsoft.com/training/paths/copilot/'
  }
};

const sendTestEmail = async (req, res) => {
  try {
    const { key } = req.params;
    if (!getDefaultTemplate(key)) {
      return res.status(404).json({ success: false, error: 'Unknown template key' });
    }

    const to = String(req.body?.to || '').trim();
    if (!to) {
      return res.status(400).json({ success: false, error: 'Test recipient email (to) is required' });
    }

    const vars = { ...(SAMPLE_VARS[key] || {}), ...(req.body?.vars || {}) };
    if (key === 'course_certificate') {
      const { getCertificateCourseName } = require('../utils/emailTemplates/render');
      const savedName = await getCertificateCourseName();
      if (!vars.courseName || vars.courseName === SAMPLE_VARS.course_certificate?.courseName) {
        vars.courseName = savedName;
      }
    }
    const rendered = await renderTemplate(key, vars);
    const { sendEmail } = await import('../utils/email.mjs');
    await sendEmail({
      to,
      fromName: 'MSP MIU Website',
      subject: `[TEST] ${rendered.subject}`,
      text: rendered.text,
      html: rendered.html
    });

    res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (error) {
    console.error('sendTestEmail:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to send test email' });
  }
};

const listDepartmentWhatsApp = async (req, res) => {
  try {
    const { departmentHasWhatsApp } = require('../utils/emailTemplates/defaults');
    const departments = await Department.findAll({
      attributes: ['department_id', 'name', 'whatsapp_group_url'],
      order: [['name', 'ASC']]
    });
    const filtered = departments.filter((d) => departmentHasWhatsApp(d.name));
    res.json({ success: true, data: { departments: filtered } });
  } catch (error) {
    console.error('listDepartmentWhatsApp:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to list WhatsApp links' });
  }
};

const updateDepartmentWhatsApp = async (req, res) => {
  try {
    const { departmentHasWhatsApp } = require('../utils/emailTemplates/defaults');
    const { id } = req.params;
    const { whatsapp_group_url } = req.body;
    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    if (!departmentHasWhatsApp(department.name)) {
      return res.status(400).json({
        success: false,
        error: `${department.name} does not have a WhatsApp group link`
      });
    }
    department.whatsapp_group_url =
      whatsapp_group_url != null && String(whatsapp_group_url).trim()
        ? String(whatsapp_group_url).trim()
        : null;
    await department.save();
    res.json({ success: true, data: department });
  } catch (error) {
    console.error('updateDepartmentWhatsApp:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update WhatsApp link' });
  }
};

const sendMemberActivation = async (req, res) => {
  try {
    const seasonFilter = await resolveSeasonFilter(req.query);
    const summary = await sendActivationEmailsToMembers({
      where: { ...seasonFilter.where }
    });
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('sendMemberActivation:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to send activation emails' });
  }
};

const sendBoardActivation = async (req, res) => {
  try {
    const seasonFilter = await resolveSeasonFilter(req.query);
    const summary = await sendBoardActivationEmailsToMembers({
      where: { ...seasonFilter.where }
    });
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('sendBoardActivation:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to send board activation emails' });
  }
};

const sendMemberAcceptance = async (req, res) => {
  try {
    const seasonFilter = await resolveSeasonFilter(req.query);
    const summary = await sendAcceptanceEmailsToMembers({
      where: { ...seasonFilter.where }
    });
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('sendMemberAcceptance:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to send acceptance emails' });
  }
};

module.exports = {
  listEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  resetEmailTemplate,
  sendTestEmail,
  listDepartmentWhatsApp,
  updateDepartmentWhatsApp,
  sendMemberActivation,
  sendBoardActivation,
  sendMemberAcceptance,
  listDefaultTemplates
};
