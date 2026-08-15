const express = require('express');
const { User } = require('../models');
const { verifyUnsubscribeToken } = require('../utils/emailUnsubscribe');
const logger = require('../utils/logger');

const router = express.Router();

function confirmationHtml({ ok, title, message }) {
  const color = ok ? '#0d7bd8' : '#c62828';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:40px 16px;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px 28px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${color};font-weight:600;">MSP MIU</p>
    <h1 style="margin:0 0 12px;font-size:22px;color:#031C35;">${title}</h1>
    <p style="margin:0;font-size:15px;line-height:1.55;color:#555;">${message}</p>
  </div>
</body>
</html>`;
}

/**
 * GET /api/email/unsubscribe?token=...
 * One-click marketing opt-out (no login).
 */
async function handleUnsubscribe(req, res) {
  try {
    const token = String(req.query.token || '').trim();
    const parsed = verifyUnsubscribeToken(token);
    if (!parsed) {
      return res
        .status(400)
        .type('html')
        .send(
          confirmationHtml({
            ok: false,
            title: 'Invalid link',
            message: 'This unsubscribe link is invalid or has expired.'
          })
        );
    }

    const user = await User.findByPk(parsed.userId);
    if (!user || String(user.email || '').trim().toLowerCase() !== parsed.email) {
      return res
        .status(404)
        .type('html')
        .send(
          confirmationHtml({
            ok: false,
            title: 'Account not found',
            message: 'We could not find an account for this unsubscribe request.'
          })
        );
    }

    if (!user.email_unsubscribed_at) {
      user.email_unsubscribed_at = new Date();
      await user.save();
      logger.info(`User ${user.user_id} unsubscribed from marketing emails`);
    }

    return res.type('html').send(
      confirmationHtml({
        ok: true,
        title: 'Unsubscribed',
        message:
          'You will no longer receive MSP MIU announcement and marketing emails. Account and security emails may still be sent when needed.'
      })
    );
  } catch (error) {
    logger.error('Unsubscribe failed:', error);
    return res
      .status(500)
      .type('html')
      .send(
        confirmationHtml({
          ok: false,
          title: 'Something went wrong',
          message: 'Please try again later or contact MSP MIU support.'
        })
      );
  }
}

router.get('/unsubscribe', handleUnsubscribe);
router.get('/unsubscribe/confirm', handleUnsubscribe);

module.exports = router;
