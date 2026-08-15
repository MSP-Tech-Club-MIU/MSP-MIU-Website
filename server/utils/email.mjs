import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const logger = require('./logger');
const { buildUnsubscribeUrl } = require('./emailUnsubscribe');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
];
envPaths.forEach((p, i) => {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: i > 0 });
  }
});
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: Number(process.env.MAIL_PORT) === 465,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
});

const UNSUB_MARKER = '<!--msp-unsub-->';

function appendUnsubscribeFooter(html, unsubscribeUrl) {
  if (!html || !unsubscribeUrl) return html;
  if (String(html).includes(UNSUB_MARKER)) return html;
  const block = `${UNSUB_MARKER}
<div style="margin-top:24px;padding-top:12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.45;color:#999999;">
  MSP MIU · <a href="${unsubscribeUrl}" style="color:#999999;text-decoration:underline;">Unsubscribe</a>
</div>`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${block}</body>`);
  }
  return `${html}${block}`;
}

/**
 * Resolve user for unsubscribe footer. Prefer mailOptions.userId when provided.
 */
async function resolveUserForUnsubscribe(to, userIdHint) {
  try {
    const { User } = require('../models');
    if (userIdHint != null && Number.isFinite(Number(userIdHint))) {
      const byId = await User.findByPk(Number(userIdHint), {
        attributes: ['user_id', 'email']
      });
      if (byId) return byId;
    }
    const email = String(to || '').trim();
    if (!email) return null;
    return await User.findOne({
      where: { email },
      attributes: ['user_id', 'email']
    });
  } catch (err) {
    logger.warn('Could not resolve user for unsubscribe footer:', err.message || err);
    return null;
  }
}

/**
 * Send an email using the configured transporter
 * @param {Object} mailOptions
 * @param {string} [mailOptions.category] - 'marketing' adds List-Unsubscribe headers
 * @param {number} [mailOptions.userId] - preferred user for unsubscribe token
 * @param {boolean} [mailOptions.skipUnsubscribeFooter]
 */
export async function sendEmail(mailOptions) {
  try {
    const fromName = mailOptions.fromName || 'MSP MIU Website';
    const fromEmail = process.env.MAIL_FROM_ADDRESS || mailOptions.from || 'noreply@msp-miu.tech';

    if (!process.env.MAIL_FROM_ADDRESS && !mailOptions.from) {
      logger.warn('⚠️  Warning: MAIL_FROM_ADDRESS not set in .env file. Using default from address.');
    }

    const emailDomain = fromEmail.split('@')[1] || process.env.MAIL_HOST || 'msp-miu.tech';
    const escapedName = fromName.replace(/"/g, '\\"');
    const fromAddress = `"${escapedName}" <${fromEmail}>`;

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const messageId = `<${timestamp}.${randomId}@${emailDomain}>`;
    const date = new Date().toUTCString();

    let html = mailOptions.html;
    let text = mailOptions.text;
    let unsubscribeUrl = mailOptions.unsubscribeUrl || null;

    if (!mailOptions.skipUnsubscribeFooter) {
      const user = await resolveUserForUnsubscribe(mailOptions.to, mailOptions.userId);
      if (user?.user_id && user?.email) {
        unsubscribeUrl = buildUnsubscribeUrl(user.user_id, user.email);
        html = appendUnsubscribeFooter(html, unsubscribeUrl);
        if (text != null && text !== '' && !String(text).includes(unsubscribeUrl)) {
          text = `${text}\n\nUnsubscribe: ${unsubscribeUrl}`;
        }
      }
    }

    const headers = {
      'Message-ID': messageId,
      Date: date,
      'X-Mailer': 'MSP MIU Website',
      'X-Priority': '3',
      Importance: 'normal',
      Precedence: 'bulk',
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'All',
      'X-Entity-Ref-ID': `${timestamp}-${randomId}`,
      ...mailOptions.headers
    };

    if (
      (mailOptions.category === 'marketing' || mailOptions.listUnsubscribe) &&
      unsubscribeUrl
    ) {
      headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    const emailData = {
      from: fromAddress,
      replyTo: mailOptions.replyTo || fromEmail,
      to: mailOptions.to,
      subject: mailOptions.subject,
      text,
      html,
      attachments: mailOptions.attachments || [],
      headers
    };

    const info = await transporter.sendMail(emailData);
    logger.info('Email sent successfully:', { messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
}

export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    logger.info('Email transporter is ready to send emails');
    return true;
  } catch (error) {
    logger.error('Email transporter verification failed:', error);
    return false;
  }
}

export default transporter;
