const { Op } = require('sequelize');
const { DirectEmail, User, Board, Member } = require('../models');
const logger = require('../utils/logger');
const { r2, PutObjectCommand, deleteFromR2 } = require('../config/cloud');
const { formatEmailBodyHtml, escapeHtml } = require('../utils/formatEmailText');

// Valid email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function parseEmailList(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(e => String(e).trim()).filter(Boolean);
  }
  return String(input)
    .split(/[,;\n\r]+/)
    .map(e => e.trim())
    .filter(Boolean);
}

function wrapHtmlEmail(subject, contentHtml, senderName) {
  // If content is already a full HTML document, return as is
  if (/<!DOCTYPE\s+html/i.test(contentHtml) || /<html[\s>]/i.test(contentHtml)) {
    return contentHtml;
  }

  const safeSubject = escapeHtml(subject);
  const safeSenderName = escapeHtml(senderName || 'MSP MIU Admin');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:28px 16px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
    <!-- Brand Header -->
    <tr>
      <td style="background:linear-gradient(135deg, #091a2c 0%, #133b5a 100%);padding:24px 32px;border-bottom:3px solid #ff5b1f;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <h2 style="margin:0;font-size:21px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">MSP Tech Club</h2>
              <p style="margin:4px 0 0;font-size:12px;color:#bfe0ff;font-weight:500;">Misr International University</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Subject Header -->
    <tr>
      <td style="padding:28px 32px 14px;border-bottom:1px solid #f1f5f9;">
        <h1 style="margin:0;font-size:18px;font-weight:700;color:#0f172a;line-height:1.4;">${safeSubject}</h1>
      </td>
    </tr>
    <!-- Message Content -->
    <tr>
      <td style="padding:24px 32px;font-size:15px;line-height:1.75;color:#334155;">
        ${contentHtml}
      </td>
    </tr>
    <!-- Signature / Footer -->
    <tr>
      <td style="padding:20px 32px 24px;border-top:1px solid #f1f5f9;background:#f8fafc;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#64748b;line-height:1.5;">
              <p style="margin:0;font-weight:600;color:#334155;">${safeSenderName}</p>
              <p style="margin:3px 0 0;color:#64748b;">MSP Tech Club · Misr International University</p>
              <p style="margin:4px 0 0;font-size:12px;"><a href="https://msp-miu.tech" style="color:#0d7bd8;text-decoration:none;font-weight:500;">msp-miu.tech</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send a direct custom email with attachments.
 * POST /api/mail/send
 */
const sendDirectEmail = async (req, res) => {
  try {
    const {
      to,
      cc,
      bcc,
      subject,
      body,
      isHtml = true,
      replyTo,
      fromName
    } = req.body;

    // Validate recipients
    const toList = parseEmailList(to);
    if (toList.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one recipient email ("to") is required.' });
    }

    // Validate email format
    for (const email of toList) {
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ success: false, error: `Invalid recipient email address: "${email}"` });
      }
    }

    const ccList = parseEmailList(cc);
    for (const email of ccList) {
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ success: false, error: `Invalid CC email address: "${email}"` });
      }
    }

    const bccList = parseEmailList(bcc);
    for (const email of bccList) {
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ success: false, error: `Invalid BCC email address: "${email}"` });
      }
    }

    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ success: false, error: 'Email subject is required.' });
    }

    if (!body || !String(body).trim()) {
      return res.status(400).json({ success: false, error: 'Email message body is required.' });
    }

    // Sender details
    let senderUserId = req.user?.user_id || null;
    if (senderUserId) {
      const u = await User.findByPk(senderUserId, { attributes: ['user_id'] });
      if (!u) senderUserId = null;
    }
    const senderNameDisplay = String(fromName || req.user?.full_name || 'MSP MIU').trim();
    const senderEmail = process.env.MAIL_FROM_ADDRESS || req.user?.email || 'msp@msp-miu.tech';

    // Process attachments
    const files = req.files || [];
    let totalAttachmentSize = 0;
    const nodemailerAttachments = [];
    const savedAttachmentMeta = [];

    for (const file of files) {
      totalAttachmentSize += file.size;
      nodemailerAttachments.push({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype
      });

      // Try uploading to Cloudflare R2 for long-term Sent viewer download
      let fileUrl = null;
      let r2Key = null;
      try {
        if (process.env.R2_BUCKET && r2) {
          const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'dat';
          const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          r2Key = `Mail_Attachments/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${cleanName}`;
          
          await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: r2Key,
            Body: file.buffer,
            ContentType: file.mimetype
          }));

          if (process.env.R2_PUBLIC_DOMAIN) {
            fileUrl = `${process.env.R2_PUBLIC_DOMAIN}/${r2Key}`;
          }
        }
      } catch (uploadErr) {
        logger.warn('Failed to archive attachment to R2 (email will still send):', uploadErr.message);
      }

      savedAttachmentMeta.push({
        filename: file.originalname,
        size: file.size,
        mime_type: file.mimetype,
        key: r2Key,
        url: fileUrl
      });
    }

    // SMTP size guard (25MB)
    if (totalAttachmentSize > 25 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'Total attachment size exceeds the 25 MB limit for email delivery.'
      });
    }

    // Format body
    const isRich = isHtml === true || isHtml === 'true';
    let formattedHtml = '';
    let plainText = '';

    if (isRich) {
      // If user typed raw markdown/newlines, format it
      const bodyStr = String(body).trim();
      const innerHtml = /<[a-z][\s\S]*>/i.test(bodyStr) ? bodyStr : formatEmailBodyHtml(bodyStr);
      formattedHtml = wrapHtmlEmail(subject, innerHtml, senderNameDisplay);
      plainText = bodyStr.replace(/<[^>]+>/g, '');
    } else {
      plainText = String(body).trim();
      formattedHtml = wrapHtmlEmail(subject, formatEmailBodyHtml(plainText), senderNameDisplay);
    }

    // Dynamic import of sendEmail
    const { sendEmail } = await import('../utils/email.mjs');

    const mailOptions = {
      fromName: senderNameDisplay,
      from: senderEmail,
      replyTo: replyTo || req.user?.email || senderEmail,
      to: toList.join(', '),
      ...(ccList.length > 0 ? { cc: ccList.join(', ') } : {}),
      ...(bccList.length > 0 ? { bcc: bccList.join(', ') } : {}),
      subject: String(subject).trim(),
      html: formattedHtml,
      text: plainText,
      attachments: nodemailerAttachments,
      skipUnsubscribeFooter: true
    };

    let sendInfo;
    try {
      sendInfo = await sendEmail(mailOptions);
    } catch (sendError) {
      logger.error('Failed to send direct email via transporter:', sendError);

      // Record failure in direct_emails
      await DirectEmail.create({
        sender_id: senderUserId,
        sender_email: senderEmail,
        sender_name: senderNameDisplay,
        to_emails: toList.join(', '),
        cc_emails: ccList.length ? ccList.join(', ') : null,
        bcc_emails: bccList.length ? bccList.join(', ') : null,
        subject: String(subject).trim(),
        body_html: formattedHtml,
        body_text: plainText,
        attachments: savedAttachmentMeta,
        status: 'failed',
        error_message: sendError.message || 'SMTP sending failed',
        message_id: null
      });

      return res.status(500).json({
        success: false,
        error: `Failed to deliver email: ${sendError.message || 'Unknown SMTP error'}`
      });
    }

    // Record success in direct_emails
    const savedEmail = await DirectEmail.create({
      sender_id: senderUserId,
      sender_email: senderEmail,
      sender_name: senderNameDisplay,
      to_emails: toList.join(', '),
      cc_emails: ccList.length ? ccList.join(', ') : null,
      bcc_emails: bccList.length ? bccList.join(', ') : null,
      subject: String(subject).trim(),
      body_html: formattedHtml,
      body_text: plainText,
      attachments: savedAttachmentMeta,
      status: 'sent',
      message_id: sendInfo?.messageId || null
    });

    return res.status(200).json({
      success: true,
      message: 'Email delivered successfully',
      data: savedEmail
    });

  } catch (error) {
    logger.error('Error in sendDirectEmail controller:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while processing email'
    });
  }
};

/**
 * List direct emails with filtering, search and pagination.
 * GET /api/mail
 */
const listEmails = async (req, res) => {
  try {
    const folder = String(req.query.folder || 'sent').toLowerCase();
    const search = String(req.query.search || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;

    const where = {};

    if (folder === 'trash') {
      where.is_trash = true;
    } else if (folder === 'starred') {
      where.is_starred = true;
      where.is_trash = false;
    } else if (folder === 'drafts') {
      where.status = 'draft';
      where.is_trash = false;
    } else {
      // Default: 'sent'
      where.status = 'sent';
      where.is_trash = false;
    }

    if (search) {
      where[Op.or] = [
        { subject: { [Op.like]: `%${search}%` } },
        { to_emails: { [Op.like]: `%${search}%` } },
        { cc_emails: { [Op.like]: `%${search}%` } },
        { body_text: { [Op.like]: `%${search}%` } },
        { sender_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows: emails, count: total } = await DirectEmail.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    // Compute folder counts
    const [sentCount, starredCount, draftsCount, trashCount] = await Promise.all([
      DirectEmail.count({ where: { status: 'sent', is_trash: false } }),
      DirectEmail.count({ where: { is_starred: true, is_trash: false } }),
      DirectEmail.count({ where: { status: 'draft', is_trash: false } }),
      DirectEmail.count({ where: { is_trash: true } })
    ]);

    return res.json({
      success: true,
      emails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      counts: {
        sent: sentCount,
        starred: starredCount,
        drafts: draftsCount,
        trash: trashCount
      }
    });

  } catch (error) {
    logger.error('Error in listEmails controller:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to list emails'
    });
  }
};

/**
 * Get detailed email by ID.
 * GET /api/mail/:id
 */
const getEmailById = async (req, res) => {
  try {
    const { id } = req.params;
    const email = await DirectEmail.findByPk(id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['user_id', 'full_name', 'email', 'role']
        }
      ]
    });

    if (!email) {
      return res.status(404).json({ success: false, error: 'Email message not found' });
    }

    return res.json({
      success: true,
      data: email
    });

  } catch (error) {
    logger.error('Error fetching email details:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve email'
    });
  }
};

/**
 * Toggle starred status.
 * PATCH /api/mail/:id/star
 */
const toggleStar = async (req, res) => {
  try {
    const { id } = req.params;
    const email = await DirectEmail.findByPk(id);

    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    email.is_starred = !email.is_starred;
    await email.save();

    return res.json({
      success: true,
      is_starred: email.is_starred
    });

  } catch (error) {
    logger.error('Error toggling star:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to toggle star'
    });
  }
};

/**
 * Move email to trash or permanently delete.
 * DELETE /api/mail/:id
 */
const deleteEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const isPermanent = req.query.permanent === 'true';
    const email = await DirectEmail.findByPk(id);

    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    if (isPermanent || email.is_trash) {
      // Permanently remove from database
      // If there are R2 attachments, clean them up
      if (Array.isArray(email.attachments)) {
        for (const att of email.attachments) {
          if (att.key) {
            try {
              await deleteFromR2(att.key);
            } catch (_) {}
          }
        }
      }
      await email.destroy();
      return res.json({ success: true, message: 'Email permanently deleted' });
    }

    // Move to trash
    email.is_trash = true;
    await email.save();

    return res.json({
      success: true,
      message: 'Email moved to trash',
      is_trash: true
    });

  } catch (error) {
    logger.error('Error deleting email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete email'
    });
  }
};

/**
 * Restore an email from trash.
 * POST /api/mail/:id/restore
 */
const restoreEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const email = await DirectEmail.findByPk(id);

    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    email.is_trash = false;
    await email.save();

    return res.json({
      success: true,
      message: 'Email restored',
      is_trash: false
    });

  } catch (error) {
    logger.error('Error restoring email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to restore email'
    });
  }
};

/**
 * Save or update a draft.
 * POST /api/mail/draft
 */
const saveDraft = async (req, res) => {
  try {
    const { id, to, cc, bcc, subject, body } = req.body;
    let senderUserId = req.user?.user_id || null;
    if (senderUserId) {
      const u = await User.findByPk(senderUserId, { attributes: ['user_id'] });
      if (!u) senderUserId = null;
    }
    const senderName = req.user?.full_name || 'MSP Admin';
    const senderEmail = process.env.MAIL_FROM_ADDRESS || req.user?.email || 'msp@msp-miu.tech';

    let draft;
    if (id) {
      draft = await DirectEmail.findByPk(id);
      if (draft) {
        draft.to_emails = Array.isArray(to) ? to.join(', ') : (to || '');
        draft.cc_emails = Array.isArray(cc) ? cc.join(', ') : (cc || null);
        draft.bcc_emails = Array.isArray(bcc) ? bcc.join(', ') : (bcc || null);
        draft.subject = subject || '';
        draft.body_text = body || '';
        draft.body_html = body || '';
        draft.status = 'draft';
        await draft.save();
        return res.json({ success: true, data: draft });
      }
    }

    draft = await DirectEmail.create({
      sender_id: senderUserId,
      sender_email: senderEmail,
      sender_name: senderName,
      to_emails: Array.isArray(to) ? to.join(', ') : (to || ''),
      cc_emails: Array.isArray(cc) ? cc.join(', ') : (cc || null),
      bcc_emails: Array.isArray(bcc) ? bcc.join(', ') : (bcc || null),
      subject: subject || '(No Subject)',
      body_text: body || '',
      body_html: body || '',
      attachments: [],
      status: 'draft'
    });

    return res.json({ success: true, data: draft });

  } catch (error) {
    logger.error('Error saving draft:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to save draft'
    });
  }
};

/**
 * Autocomplete contact search for recipients.
 * GET /api/mail/recipients?q=...
 */
const searchRecipients = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, contacts: [] });
    }

    const likeQuery = `%${q}%`;

    const [users, boardMembers] = await Promise.all([
      User.findAll({
        where: {
          [Op.or]: [
            { full_name: { [Op.like]: likeQuery } },
            { email: { [Op.like]: likeQuery } },
            { university_id: { [Op.like]: likeQuery } }
          ]
        },
        attributes: ['user_id', 'full_name', 'email', 'role'],
        limit: 8
      }),
      Board.findAll({
        where: {
          [Op.or]: [
            { full_name: { [Op.like]: likeQuery } },
            { email: { [Op.like]: likeQuery } }
          ]
        },
        attributes: ['board_id', 'full_name', 'email', 'position'],
        limit: 5
      })
    ]);

    const seen = new Set();
    const contacts = [];

    boardMembers.forEach(b => {
      if (b.email && !seen.has(b.email.toLowerCase())) {
        seen.add(b.email.toLowerCase());
        contacts.push({
          name: b.full_name,
          email: b.email,
          role: b.position || 'Board Member'
        });
      }
    });

    users.forEach(u => {
      if (u.email && !seen.has(u.email.toLowerCase())) {
        seen.add(u.email.toLowerCase());
        contacts.push({
          name: u.full_name,
          email: u.email,
          role: u.role || 'Member'
        });
      }
    });

    return res.json({
      success: true,
      contacts: contacts.slice(0, 10)
    });

  } catch (error) {
    logger.error('Error searching mail recipients:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to search recipients'
    });
  }
};

/**
 * SMTP connection status and configuration.
 * GET /api/mail/status
 */
const getMailStatus = async (req, res) => {
  try {
    const { verifyEmailConfig } = await import('../utils/email.mjs');
    const isReady = await verifyEmailConfig();

    return res.json({
      success: true,
      status: {
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: process.env.MAIL_PORT || 587,
        fromAddress: process.env.MAIL_FROM_ADDRESS || 'msp@msp-miu.tech',
        username: process.env.MAIL_USERNAME || 'mspmiu.club1@gmail.com',
        isReady,
        maxAttachmentSizeMb: 25
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify mail configuration'
    });
  }
};

module.exports = {
  sendDirectEmail,
  listEmails,
  getEmailById,
  toggleStar,
  deleteEmail,
  restoreEmail,
  saveDraft,
  searchRecipients,
  getMailStatus
};
