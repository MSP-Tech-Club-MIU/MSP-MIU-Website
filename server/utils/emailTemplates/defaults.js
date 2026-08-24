/**
 * Code defaults for all outbound email templates.
 * Placeholders use {{name}} — see render.js.
 */

const MEMBER_ACTIVATION_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Activate Your Account - MSP MIU</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px 40px; background: linear-gradient(135deg, #031C35 0%, #0D3159 50%, #1D4F82 100%); border-top-left-radius: 8px; border-top-right-radius: 8px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">MSP MIU</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">Hi {{studentName}},</p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;"><strong>Welcome to MSP MIU! 🎉</strong></p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">To complete your account setup and activate your account on the MSP-MIU website, please click on the activation button below:</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="{{activationLink}}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #0d7bd8 0%, #03A9F4 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(13, 123, 216, 0.3);">Activate Your Account</a>
              </div>
              <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 6px;">
                <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin: 0; word-break: break-all;"><a href="{{activationLink}}" style="color: #0d7bd8; text-decoration: none; font-size: 12px;">{{activationLink}}</a></p>
              </div>
              <div style="margin: 30px 0; padding: 20px; background-color: #eaf2ff; border-radius: 6px; border-left: 4px solid #03A9F4;">
                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">What's Next?</h2>
                <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">Once you've activated your account, you'll be able to:</p>
                <ul style="margin: 0 0 0 20px; padding: 0; color: #666666; font-size: 14px; line-height: 1.8;">
                  <li>Log in to the MSP-MIU website</li>
                  <li>Access your profile and dashboard</li>
                  <li>Participate in MSP activities and events</li>
                  <li>Stay updated with the latest announcements</li>
                  <li>Connect with other MSP members</li>
                </ul>
              </div>
              <p style="margin: 30px 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">If you have any questions or need assistance, please don't hesitate to contact us.</p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;"><strong>Welcome to the MSP MIU family!</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5;">Best regards,<br><strong>MSP MIU Team</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const BOARD_ACTIVATION_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Activate Your Board Account - MSP MIU</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px 40px; background: linear-gradient(135deg, #031C35 0%, #0D3159 50%, #1D4F82 100%); border-top-left-radius: 8px; border-top-right-radius: 8px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">MSP MIU Board</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">Hi {{boardMemberName}},</p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;"><strong>Welcome to MSP MIU Board! 🎉</strong></p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">As a <strong>{{position}}</strong> of MSP MIU, we're excited to have you on board!</p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">To complete your account setup and activate your account on the MSP-MIU website, please click on the activation button below:</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="{{activationLink}}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #0d7bd8 0%, #03A9F4 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(13, 123, 216, 0.3);">Activate Your Board Account</a>
              </div>
              <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 6px;">
                <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin: 0; word-break: break-all;"><a href="{{activationLink}}" style="color: #0d7bd8; text-decoration: none; font-size: 12px;">{{activationLink}}</a></p>
              </div>
              <div style="margin: 30px 0; padding: 20px; background-color: #eaf2ff; border-radius: 6px; border-left: 4px solid #03A9F4;">
                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">Board Member Benefits</h2>
                <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">Once you've activated your account, you'll be able to:</p>
                <ul style="margin: 0 0 0 20px; padding: 0; color: #666666; font-size: 14px; line-height: 1.8;">
                  <li>Log in to the MSP-MIU website</li>
                  <li>Access your board member dashboard</li>
                  <li>Manage MSP activities and events</li>
                  <li>Access administrative features</li>
                  <li>Stay updated with the latest announcements</li>
                  <li>Coordinate with other board members</li>
                </ul>
              </div>
              <p style="margin: 30px 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">If you have any questions or need assistance, please don't hesitate to contact us.</p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;"><strong>Welcome to the MSP MIU Board!</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5;">Best regards,<br><strong>MSP MIU Team</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const MEMBER_ACCEPTANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Welcome to MSP MIU - {{departmentName}} Department</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px 40px; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
              <h1 style="margin: 0; color: #333333; font-size: 24px; font-weight: 600;">MSP MIU</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #ffffff;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">Hi {{studentName}},</p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;"><strong>Congratulations! 🎊</strong> You've been accepted into the <strong>{{departmentName}} Department</strong> at MSP MIU!</p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">We really enjoyed your interview and are excited to see what you'll bring to the team.</p>
              <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 6px; border-left: 4px solid #25D366;">
                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">Join the Department WhatsApp Group</h2>
                <p style="margin: 0 0 15px 0; color: #666666; font-size: 14px; line-height: 1.6;">Stay connected with your teammates, get instant updates, and never miss an announcement by joining our official WhatsApp group:</p>
                <p style="margin: 0;"><a href="{{departmentLink}}" style="display: inline-block; padding: 12px 24px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Join {{departmentName}} WhatsApp Group</a></p>
              </div>
              <div style="margin: 30px 0; padding: 20px; background-color: #fff9e6; border-radius: 6px; border-left: 4px solid #FFA500;">
                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">Opening Session</h2>
                <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">To kick things off, we'd love to see you at our Opening Session on <strong>Wednesday, November 12, 2025</strong>, from <strong>12:00 PM to 2:00 PM</strong> at the <strong>OOA Room, Main Building</strong>, followed by a special Orange Business Talk from <strong>2:00 PM to 3:00 PM</strong>.</p>
                <p style="margin: 15px 0 10px 0; color: #333333; font-size: 14px; font-weight: 600;">Speakers from Orange Business:</p>
                <ul style="margin: 0 0 0 20px; padding: 0; color: #666666; font-size: 14px; line-height: 1.8;">
                  <li>Ahmed Galal Eldin, Operational Department Head</li>
                  <li>Sandy Elias George, Incident Management Specialist</li>
                  <li>Fady Sherif Saad, Incident Management Team Leader</li>
                </ul>
              </div>
              <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 6px;">
                <p style="margin: 0 0 15px 0; color: #666666; font-size: 14px; line-height: 1.6;">If you haven't already, make sure to join our MSP group and follow us to stay updated on events and announcements:</p>
                <p style="margin: 10px 0;"><a href="{{instagramLink}}" style="color: #E4405F; text-decoration: none; font-size: 14px; font-weight: 600;">📷 Instagram</a></p>
                <p style="margin: 10px 0;"><a href="{{tiktokLink}}" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 600;">🎵 TikTok</a></p>
              </div>
              <p style="margin: 30px 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">We're so glad to have you with us - <strong>welcome to the MSP MIU family!</strong></p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">Can't wait to see you at the Opening Session!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5;">Cheers,<br><strong>MSP MIU Team</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

function def(key, name, category, subject, text_body, html_body, placeholders, meta = null) {
  return { template_key: key, name, category, subject, text_body, html_body, placeholders, meta };
}

const EMAIL_TEMPLATE_DEFAULTS = {
  member_activation: def(
    'member_activation',
    'Member account activation',
    'account',
    'Activate Your Account - MSP MIU',
    `Hi {{studentName}},

Welcome to MSP MIU! 🎉

To complete your account setup and activate your account on the MSP-MIU website, please click on the activation link below:

{{activationLink}}

This link will take you to the account activation page where you can set your password.

Once you've activated your account, you'll be able to:
- Log in to the MSP-MIU website
- Access your profile
- Participate in MSP activities and events
- Stay updated with the latest announcements

If you have any questions or need assistance, please don't hesitate to contact us.

Welcome to the MSP MIU family!

Best regards,
MSP MIU Team`,
    MEMBER_ACTIVATION_HTML,
    ['studentName', 'activationLink']
  ),

  board_activation: def(
    'board_activation',
    'Board account activation',
    'account',
    'Activate Your Board Account - MSP MIU ({{position}})',
    `Hi {{boardMemberName}},

Welcome to MSP MIU Board! 🎉

As a {{position}} of MSP MIU, we're excited to have you on board!

To complete your account setup and activate your account on the MSP-MIU website, please click on the activation link below:

{{activationLink}}

This link will take you to the account activation page where you can set your password.

Once you've activated your account, you'll be able to:
- Log in to the MSP-MIU website
- Access your board member dashboard
- Manage MSP activities and events
- Access administrative features
- Stay updated with the latest announcements

If you have any questions or need assistance, please don't hesitate to contact us.

Welcome to the MSP MIU Board!

Best regards,
MSP MIU Team`,
    BOARD_ACTIVATION_HTML,
    ['boardMemberName', 'position', 'activationLink']
  ),

  member_acceptance: def(
    'member_acceptance',
    'Member acceptance (WhatsApp)',
    'account',
    'Congratulations! Welcome to {{departmentName}} Department - MSP MIU',
    `Hi {{studentName}},

Congratulations! 🎊 You've been accepted into the {{departmentName}} Department at MSP MIU!

We really enjoyed your interview and are excited to see what you'll bring to the team.

Join the Department WhatsApp Group

Stay connected with your teammates, get instant updates, and never miss an announcement by joining our official WhatsApp group:

{{departmentLink}}

To kick things off, we'd love to see you at our Opening Session on Wednesday, November 12, 2025, from 12:00 PM to 2:00 PM at the OOA Room, Main Building, followed by a special Orange Business Talk from 2:00 PM to 3:00 PM.

Speakers from Orange Business:

- Ahmed Galal Eldin, Operational Department Head
- Sandy Elias George, Incident Management Specialist
- Fady Sherif Saad, Incident Management Team Leader

If you haven't already, make sure to join our MSP group and follow us to stay updated on events and announcements:

Instagram: {{instagramLink}}

TikTok: {{tiktokLink}}

We're so glad to have you with us - welcome to the MSP MIU family!

Can't wait to see you at the Opening Session!

Cheers,
MSP MIU Team`,
    MEMBER_ACCEPTANCE_HTML,
    ['studentName', 'departmentName', 'departmentLink', 'instagramLink', 'tiktokLink']
  ),

  password_reset: def(
    'password_reset',
    'Password reset',
    'system',
    'Password Reset Request - MSP MIU',
    `Password Reset Request - MSP MIU

Hello {{fullName}},

We received a request to reset your password for your MSP MIU account.

Click the following link to reset your password:
{{resetLink}}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

Security Notice:
- This link will expire in 1 hour
- If you didn't request this reset, please ignore this email
- Never share this link with anyone

MSP MIU Website
This is an automated email, please do not reply.`,
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4a90e2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
    .button { display: inline-block; padding: 12px 30px; background-color: #4a90e2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Password Reset Request</h1></div>
    <div class="content">
      <p>Hello {{fullName}},</p>
      <p>We received a request to reset your password for your MSP MIU account.</p>
      <p>Click the button below to reset your password:</p>
      <p style="text-align: center;"><a href="{{resetLink}}" class="button">Reset Password</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #4a90e2;">{{resetLink}}</p>
      <div class="warning">
        <strong>⚠️ Security Notice:</strong>
        <ul>
          <li>This link will expire in 1 hour</li>
          <li>If you didn't request this reset, please ignore this email</li>
          <li>Never share this link with anyone</li>
        </ul>
      </div>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>MSP MIU Website</p>
      <p>This is an automated email, please do not reply.</p>
    </div>
  </div>
</body>
</html>`,
    ['fullName', 'resetLink']
  ),

  site_announcement: def(
    'site_announcement',
    'Site announcement broadcast',
    'announcement',
    '{{title}}',
    `{{title}}

{{departmentLine}}{{dateLine}}{{description}}

{{ctaText}}

—
MSP MIU · {{frontendUrl}}`,
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>{{title}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;-webkit-text-size-adjust:100%;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f4f4f4;opacity:0;">{{preheader}}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-collapse:collapse;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);overflow:hidden;">
          <tr>
            <td style="padding:28px 36px;background:linear-gradient(135deg,#031C35 0%,#0D3159 50%,#1D4F82 100%);">
              <p style="margin:0;font-size:22px;font-weight:600;letter-spacing:0.3px;line-height:1.2;color:#ffffff;">MSP MIU</p>
              <p style="margin:10px 0 0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8EC2F0;font-weight:600;">Announcement</p>
            </td>
          </tr>
          {{testBannerHtml}}
          <tr>
            <td style="padding:32px 36px 8px;">
              <h1 style="margin:0;font-size:22px;font-weight:600;color:#031C35;line-height:1.35;">{{titleHtml}}</h1>
              {{metaHtml}}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 36px 28px;">
              <div style="padding:18px 20px;background-color:#eaf2ff;border-radius:6px;border-left:4px solid #03A9F4;font-size:15px;line-height:1.65;color:#333333;">{{descriptionHtml}}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 32px;text-align:center;">
              {{ctaHtml}}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 36px 22px;background-color:#f9f9f9;border-top:1px solid #eeeeee;font-size:13px;line-height:1.55;color:#666666;text-align:center;">
              <p style="margin:0 0 8px;"><a href="{{frontendUrl}}" style="color:#0d7bd8;text-decoration:none;font-weight:600;">{{frontendUrl}}</a></p>
              <p style="margin:0;">You receive these messages because you have an account with MSP MIU.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    ['title', 'description', 'frontendUrl', 'titleHtml', 'descriptionHtml', 'preheader', 'testBannerHtml', 'metaHtml', 'departmentLine', 'dateLine', 'ctaHtml', 'ctaText']
  ),

  android_app_update: def(
    'android_app_update',
    'Android app update broadcast',
    'announcement',
    'MSP MIU Android app update {{versionName}}',
    `A new version of the MSP MIU Android app is available.

Version: {{versionName}}

{{releaseNotes}}

Download the update:
{{downloadUrl}}

—
MSP MIU · {{frontendUrl}}`,
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
</head>
<body style="margin:0;padding:0;background:#091a2c;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#091a2c;opacity:0;">{{preheader}}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#091a2c;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0e2744;border:1px solid #1e3a52;border-radius:18px;overflow:hidden;">
          <tr><td style="height:4px;line-height:4px;font-size:0;background:#3DDC84;">&nbsp;</td></tr>
          <tr>
            <td style="background:#031c35;padding:20px 26px 18px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0;font-family:Inter,system-ui,sans-serif;font-size:20px;font-weight:700;letter-spacing:0.5px;line-height:1.2;">
                <span style="color:#8EC2F0;">MSP</span><span style="color:#eaf2ff;"> · MIU</span>
              </p>
              <p style="margin:8px 0 0;font-family:Inter,system-ui,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#3DDC84;font-weight:600;">Android App Update</p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 26px 8px;font-family:Inter,system-ui,sans-serif;">
              <h1 style="margin:0;font-size:19px;font-weight:600;letter-spacing:0.4px;color:#ffffff;line-height:1.35;">{{titleHtml}}</h1>
              <p style="margin:10px 0 0;font-size:13px;color:#3DDC84;font-weight:600;">Version {{versionNameHtml}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 26px 26px;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.55;color:#8EC2F0;">{{notesHtml}}</td>
          </tr>
          <tr>
            <td style="padding:0 26px 28px;font-family:Inter,system-ui,sans-serif;" align="center">
              <a href="{{downloadUrl}}" style="display:inline-block;padding:12px 26px;background:#3DDC84;color:#031c35;text-decoration:none;border-radius:12px;font-weight:700;font-size:13px;letter-spacing:0.35px;">Download update</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 26px 24px;border-top:1px solid rgba(255,255,255,0.08);font-family:Inter,system-ui,sans-serif;font-size:12px;line-height:1.55;color:#8a8a8a;text-align:center;">
              <p style="margin:0 0 10px;"><a href="{{frontendUrl}}" style="color:#03A9F4;text-decoration:none;font-weight:600;">{{frontendUrl}}</a></p>
              <p style="margin:0;color:#8a8a8a;">You receive these messages because you have an account with MSP MIU.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    ['title', 'versionName', 'releaseNotes', 'downloadUrl', 'frontendUrl', 'titleHtml', 'versionNameHtml', 'notesHtml', 'preheader']
  ),

  competition_announcement: def(
    'competition_announcement',
    'Competition announcement',
    'competition',
    '{{competitionTitle}} - {{announcementTitle}}',
    `Hi Competitor,

You have received a new announcement for the competition: {{competitionTitle}}

Title: {{announcementTitle}}

Message:
{{announcementMessage}}

View the competition: {{competitionLink}}

---
This is an automated message from MSP MIU Competition Management System.`,
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #333; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 12px;">
    <div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #031C35 0%, #0D3159 50%, #1D4F82 100%); color: white; padding: 28px 36px;">
      <p style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff;">MSP MIU</p>
      <p style="margin: 10px 0 0; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #8EC2F0; font-weight: 600;">Competition Announcement</p>
    </div>
    <div style="padding: 28px 36px; background-color: white;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #0d7bd8;">{{competitionTitleHtml}}</p>
      <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #031C35; line-height: 1.35;">{{announcementTitleHtml}}</h1>
      <div style="background-color: #eaf2ff; padding: 18px 20px; border-left: 4px solid #03A9F4; border-radius: 6px; margin: 0 0 24px; white-space: pre-wrap; word-wrap: break-word; font-size: 15px; line-height: 1.65; color: #333333;">{{announcementMessageHtml}}</div>
      <div style="text-align: center;">
        <a href="{{competitionLink}}" style="display: inline-block; background: linear-gradient(135deg, #0d7bd8 0%, #03A9F4 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 8px rgba(13, 123, 216, 0.3);">View Competition</a>
      </div>
      <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #eeeeee; font-size: 13px; color: #666666; text-align: center;">
        <p style="margin: 0 0 8px;">This is an automated message from MSP MIU Competition Management.</p>
        <p style="margin: 0;">Please do not reply to this email.</p>
      </div>
    </div>
    </div>
  </div>
</body>
</html>`,
    ['competitionTitle', 'announcementTitle', 'announcementMessage', 'competitionLink', 'competitionTitleHtml', 'announcementTitleHtml', 'announcementMessageHtml']
  ),

  team_invite_new: def(
    'team_invite_new',
    'Team invitation (new user)',
    'competition',
    '🎯 Team Invitation: Join "{{teamName}}" for {{competitionTitle}} - MSP MIU',
    `Hello!

{{inviterName}} has invited you to join their team "{{teamName}}" for {{competitionTitle}}.

Start Date: {{competitionStartDate}}
End Date: {{competitionEndDate}}

You don't have an account yet. Create your competitor account and join the team:
{{acceptLink}}

Name: {{invitedName}}
University ID: {{invitedUniversityId}}
Email: {{email}}

Competition: {{competitionUrl}}

This invitation expires on {{expiresAt}}

— MSP MIU`,
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Team Invitation - Create Account - MSP MIU</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#0D3159;color:#ffffff;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" style="max-width:600px;width:100%;background:linear-gradient(145deg,rgba(13,49,89,0.9),rgba(29,79,130,0.8));border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0077CC,#03A9F4);padding:30px 40px;text-align:center;">
          <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;">🎯 Team Invitation</h1>
          <p style="margin:10px 0 0;font-size:16px;color:rgba(255,255,255,0.95);">Microsoft Student Partners - MIU</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="font-size:18px;color:#8EC2F0;margin:0 0 20px;font-weight:600;">Hello!</p>
          <p style="font-size:16px;color:#C5DAE9;line-height:1.6;margin:0 0 25px;"><strong style="color:#03A9F4;">{{inviterName}}</strong> has invited you to join their team <strong style="color:#03A9F4;">"{{teamName}}"</strong> for the upcoming competition:</p>
          <table role="presentation" style="width:100%;background:rgba(3,169,244,0.1);border-left:4px solid #03A9F4;border-radius:8px;margin:0 0 30px;"><tr><td style="padding:20px;">
            <h2 style="margin:0 0 15px;font-size:22px;color:#8EC2F0;font-weight:650;">{{competitionTitle}}</h2>
            <p style="margin:0 0 8px;font-size:14px;color:#C5DAE9;"><strong style="color:#03A9F4;">Start Date:</strong> {{competitionStartDate}}</p>
            <p style="margin:0;font-size:14px;color:#C5DAE9;"><strong style="color:#03A9F4;">End Date:</strong> {{competitionEndDate}}</p>
          </td></tr></table>
          <p style="font-size:16px;color:#C5DAE9;line-height:1.6;margin:0 0 20px;"><strong>You don't have an account yet!</strong> Click the button below to create your competitor account and join the team.</p>
          <table role="presentation" style="width:100%;background:rgba(0,0,0,0.2);border-radius:8px;margin:0 0 30px;"><tr><td style="padding:20px;">
            <p style="margin:0 0 12px;font-size:15px;color:#8EC2F0;font-weight:600;">Your Account Details:</p>
            <p style="margin:0 0 8px;font-size:14px;color:#C5DAE9;"><strong style="color:#03A9F4;">Name:</strong> {{invitedName}}</p>
            <p style="margin:0 0 8px;font-size:14px;color:#C5DAE9;"><strong style="color:#03A9F4;">University ID:</strong> {{invitedUniversityId}}</p>
            <p style="margin:0 0 8px;font-size:14px;color:#C5DAE9;"><strong style="color:#03A9F4;">Email:</strong> {{email}}</p>
            <p style="margin:0;font-size:14px;color:#C5DAE9;"><strong style="color:#03A9F4;">Role:</strong> Competitor</p>
          </td></tr></table>
          <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 30px;"><tr><td align="center">
            <a href="{{acceptLink}}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#0077CC,#03A9F4);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">✓ Create Account to Participate</a>
          </td></tr></table>
          <p style="font-size:14px;color:#C5DAE9;line-height:1.5;margin:0 0 20px;">After creating your account, use this competition link:<br><a href="{{competitionUrl}}" style="color:#03A9F4;word-break:break-all;">{{competitionUrl}}</a></p>
          <p style="font-size:13px;color:#8EC2F0;line-height:1.5;margin:0 0 20px;padding:15px;background:rgba(0,0,0,0.2);border-radius:8px;"><strong>Note:</strong> If the button doesn't work, copy and paste this link:<br><a href="{{acceptLink}}" style="color:#03A9F4;word-break:break-all;">{{acceptLink}}</a></p>
          <table role="presentation" style="width:100%;background:rgba(244,88,31,0.15);border:1px solid rgba(244,88,31,0.3);border-radius:8px;"><tr><td style="padding:15px;">
            <p style="margin:0;font-size:14px;color:#F4581F;font-weight:600;">⚠️ This invitation expires on {{expiresAt}}</p>
          </td></tr></table>
        </td></tr>
        <tr><td style="background:rgba(0,0,0,0.3);padding:25px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.1);">
          <p style="margin:0 0 10px;font-size:14px;color:#8EC2F0;">Microsoft Student Partners - Misr International University</p>
          <p style="margin:0;font-size:12px;color:#C5DAE9;opacity:0.7;">This is an automated email. Please do not reply to this message.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    ['teamName', 'inviterName', 'competitionTitle', 'competitionStartDate', 'competitionEndDate', 'acceptLink', 'expiresAt', 'invitedName', 'invitedUniversityId', 'email', 'competitionUrl']
  ),

  team_invite_existing: def(
    'team_invite_existing',
    'Team invitation (existing user)',
    'competition',
    '✅ You were added to "{{teamName}}" for {{competitionTitle}} - MSP MIU',
    `Hello!

{{inviterName}} has invited you to join their team "{{teamName}}" for {{competitionTitle}}.

Start Date: {{competitionStartDate}}
End Date: {{competitionEndDate}}

You already have an account. View the competition:
{{competitionUrl}}

Email: {{email}}
{{expiresNote}}

— MSP MIU`,
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Team Invitation - MSP MIU</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#0D3159;color:#ffffff;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" style="max-width:600px;width:100%;background:linear-gradient(145deg,rgba(13,49,89,0.9),rgba(29,79,130,0.8));border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0077CC,#03A9F4);padding:30px 40px;text-align:center;">
          <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;">🎯 Team Invitation</h1>
          <p style="margin:10px 0 0;font-size:16px;color:rgba(255,255,255,0.95);">Microsoft Student Partners - MIU</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="font-size:18px;color:#8EC2F0;margin:0 0 20px;font-weight:600;">Hello!</p>
          <p style="font-size:16px;color:#C5DAE9;line-height:1.6;margin:0 0 25px;"><strong style="color:#03A9F4;">{{inviterName}}</strong> has invited you to join their team <strong style="color:#03A9F4;">"{{teamName}}"</strong>.</p>
          <table role="presentation" style="width:100%;background:rgba(3,169,244,0.1);border-left:4px solid #03A9F4;border-radius:8px;margin:0 0 30px;"><tr><td style="padding:20px;">
            <h2 style="margin:0 0 15px;font-size:22px;color:#8EC2F0;">{{competitionTitle}}</h2>
            <p style="margin:0 0 8px;font-size:14px;color:#C5DAE9;"><strong style="color:#03A9F4;">Start Date:</strong> {{competitionStartDate}}</p>
            <p style="margin:0;font-size:14px;color:#C5DAE9;"><strong style="color:#03A9F4;">End Date:</strong> {{competitionEndDate}}</p>
          </td></tr></table>
          <p style="font-size:16px;color:#C5DAE9;line-height:1.6;margin:0 0 20px;">Welcome back — you've been added automatically. View the competition below.</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 30px;"><tr><td align="center">
            <a href="{{competitionUrl}}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#0077CC,#03A9F4);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">View Competition</a>
          </td></tr></table>
          <p style="font-size:14px;color:#C5DAE9;">Email: {{email}}</p>
          {{expiresHtml}}
        </td></tr>
        <tr><td style="background:rgba(0,0,0,0.3);padding:25px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.1);">
          <p style="margin:0;font-size:12px;color:#C5DAE9;opacity:0.7;">This is an automated email. Please do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    ['teamName', 'inviterName', 'competitionTitle', 'competitionStartDate', 'competitionEndDate', 'competitionUrl', 'email', 'expiresNote', 'expiresHtml']
  ),

  team_created_guest: def(
    'team_created_guest',
    'Guest leader team created',
    'competition',
    '✅ Team "{{teamName}}" created for {{competitionTitle}} - MSP MIU',
    `Hello!

Your team "{{teamName}}" was created for {{competitionTitle}}.

Start Date: {{competitionStartDate}}
End Date: {{competitionEndDate}}

Open your team workspace: {{workspaceUrl}}
Competition: {{competitionUrl}}
Email: {{email}}

— MSP MIU`,
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Team Created - MSP MIU</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#0D3159;color:#ffffff;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" style="max-width:600px;width:100%;background:linear-gradient(145deg,rgba(13,49,89,0.9),rgba(29,79,130,0.8));border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0077CC,#03A9F4);padding:30px 40px;text-align:center;">
          <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;">✅ Team Created</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="font-size:16px;color:#C5DAE9;line-height:1.6;">Your team <strong style="color:#03A9F4;">"{{teamName}}"</strong> was created for <strong>{{competitionTitle}}</strong>.</p>
          <p style="font-size:14px;color:#C5DAE9;">Start: {{competitionStartDate}} · End: {{competitionEndDate}}</p>
          <p style="text-align:center;margin:30px 0;"><a href="{{workspaceUrl}}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#0077CC,#03A9F4);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Open Team Workspace</a></p>
          <p style="font-size:14px;color:#C5DAE9;"><a href="{{competitionUrl}}" style="color:#03A9F4;">{{competitionUrl}}</a></p>
          <p style="font-size:14px;color:#C5DAE9;">Email: {{email}}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    ['teamName', 'competitionTitle', 'competitionStartDate', 'competitionEndDate', 'competitionUrl', 'workspaceUrl', 'email']
  ),

  timeslot_selection: def(
    'timeslot_selection',
    'Timeslot selection link',
    'competition',
    '{{competitionTitle}} - Choose your competition timeslot',
    `Hi {{teamName}} team,

Timeslot selection is now open for {{competitionTitle}}.
Available slots: {{slotCount}}

Choose your slot here: {{selectionLink}}

This is an automated message from MSP MIU Competition Management System.`,
    `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
  <div style="max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
    <div style="background: #0f766e; color: #fff; padding: 16px 20px;"><h2 style="margin: 0; font-size: 20px;">Competition Timeslot Selection</h2></div>
    <div style="padding: 20px; background: #fff;">
      <p>Hi <strong>{{teamNameHtml}}</strong> team,</p>
      <p>Timeslot selection is now open for <strong>{{competitionTitleHtml}}</strong>.</p>
      <p>Available slots: <strong>{{slotCount}}</strong></p>
      <p><a href="{{selectionLink}}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;">Choose Timeslot</a></p>
      <p style="font-size:12px;color:#6b7280;">This is an automated message from MSP MIU Competition Management System.</p>
    </div>
  </div>
</body>
</html>`,
    ['competitionTitle', 'teamName', 'slotCount', 'selectionLink', 'competitionTitleHtml', 'teamNameHtml']
  ),

  timeslot_assigned: def(
    'timeslot_assigned',
    'Timeslot assigned / confirmed',
    'competition',
    '{{competitionTitle}} - Timeslot {{assignmentVerb}}',
    `Hi {{teamName}} team,

Your competition timeslot is {{assignmentLabel}}.
From: {{startAt}}
To: {{endAt}}{{locationText}}

This is an automated message from MSP MIU Competition Management System.`,
    `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
  <div style="max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
    <div style="background: #0f766e; color: #fff; padding: 16px 20px;"><h2 style="margin: 0; font-size: 20px;">Competition Timeslot {{headerLabel}}</h2></div>
    <div style="padding: 20px; background: #fff;">
      <p>Hi <strong>{{teamNameHtml}}</strong> team,</p>
      <p>Your competition timeslot is <strong>{{assignmentLabelHtml}}</strong>.</p>
      <ul>
        <li><strong>From:</strong> {{startAtHtml}}</li>
        <li><strong>To:</strong> {{endAtHtml}}</li>
        {{locationHtml}}
      </ul>
      <p style="font-size:12px;color:#6b7280;">This is an automated message from MSP MIU Competition Management System.</p>
    </div>
  </div>
</body>
</html>`,
    ['competitionTitle', 'teamName', 'assignmentVerb', 'assignmentLabel', 'startAt', 'endAt', 'locationText', 'headerLabel', 'teamNameHtml', 'assignmentLabelHtml', 'startAtHtml', 'endAtHtml', 'locationHtml']
  ),

  course_certificate: def(
    'course_certificate',
    'Course certificate',
    'system',
    'Your {{courseName}} Certificate - MSP Tech Club',
    `Hi {{studentName}},

Congratulations on completing the {{courseName}}!

Your certificate is attached to this email.

Feedback form: {{feedbackFormUrl}}
Share on LinkedIn: {{linkedInPostUrl}}
GitHub Copilot learning path: {{githubCopilotUrl}}

Best regards,
MSP MIU Team`,
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your {{courseName}} Certificate - MSP Tech Club</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;background:#f4f4f4;">
    <tr><td align="center" style="padding:20px 0;">
      <table role="presentation" style="width:600px;max-width:100%;background:#ffffff;border-radius:8px;">
        <tr><td style="padding:30px 40px;background:linear-gradient(135deg,#031C35,#1D4F82);border-radius:8px 8px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:24px;">MSP Tech Club</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#333;font-size:16px;line-height:1.6;">Hi {{studentName}},</p>
          <p style="color:#333;font-size:16px;line-height:1.6;"><strong>Congratulations!</strong> You've completed the <strong>{{courseName}}</strong>. Your certificate is attached.</p>
          <div style="margin:20px 0;padding:20px;background:#e8f5e9;border-left:4px solid #4caf50;border-radius:6px;">
            <p style="margin:0;color:#333;">📄 Please find your certificate PDF attached to this email.</p>
          </div>
          <p style="text-align:center;margin:24px 0;"><a href="{{feedbackFormUrl}}" style="display:inline-block;padding:12px 24px;background:#0d7bd8;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Leave Feedback</a></p>
          <p style="text-align:center;margin:24px 0;"><a href="{{linkedInPostUrl}}" style="display:inline-block;padding:12px 24px;background:#0a66c2;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Share on LinkedIn</a></p>
          <p style="text-align:center;margin:24px 0;"><a href="{{githubCopilotUrl}}" style="display:inline-block;padding:12px 24px;background:#6e40c9;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">GitHub Copilot Path</a></p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f9f9f9;border-radius:0 0 8px 8px;">
          <p style="margin:0;color:#666;font-size:14px;">Best regards,<br><strong>MSP MIU Team</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    ['studentName', 'courseName', 'feedbackFormUrl', 'linkedInPostUrl', 'githubCopilotUrl'],
    { courseName: 'Front-End Course' }
  ),

  course_available: def(
    'course_available',
    'Course available',
    'system',
    '{{courseTitle}} is now available - MSP Tech Club',
    `Hi {{studentName}},

Good news — {{courseTitle}} is now available!

Open the course: {{courseUrl}}

You're among the first to know because you registered your interest.

Best regards,
MSP MIU Team`,
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{courseTitle}} is now available</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;background:#f4f4f4;">
    <tr><td align="center" style="padding:20px 0;">
      <table role="presentation" style="width:600px;max-width:100%;background:#ffffff;border-radius:8px;">
        <tr><td style="padding:30px 40px;background:linear-gradient(135deg,#031C35,#1D4F82);border-radius:8px 8px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:24px;">MSP Tech Club</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#333;font-size:16px;line-height:1.6;">Hi {{studentName}},</p>
          <p style="color:#333;font-size:16px;line-height:1.6;"><strong>{{courseTitle}}</strong> is now available. You're among the first to know because you registered your interest.</p>
          <p style="text-align:center;margin:28px 0;"><a href="{{courseUrl}}" style="display:inline-block;padding:12px 24px;background:#0d7bd8;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Open course</a></p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f9f9f9;border-radius:0 0 8px 8px;">
          <p style="margin:0;color:#666;font-size:14px;">Best regards,<br><strong>MSP MIU Team</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    ['studentName', 'courseTitle', 'courseUrl']
  ),

  course_announcement: def(
    'course_announcement',
    'Course announcement',
    'announcement',
    '{{courseTitle}} - {{announcementTitle}}',
    `Hi {{studentName}},

You have received an announcement for {{courseTitle}}:

Title: {{announcementTitle}}

Message:
{{announcementMessage}}

{{ctaBlockText}}

---
This is an automated message from MSP MIU Course Management.`,
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #333; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 12px;">
    <div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
      <div style="background: linear-gradient(135deg, #031C35 0%, #0D3159 50%, #1D4F82 100%); color: white; padding: 28px 36px;">
        <p style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff;">MSP MIU</p>
        <p style="margin: 10px 0 0; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #8EC2F0; font-weight: 600;">Course Communication</p>
      </div>
      <div style="padding: 28px 36px; background-color: white;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #0d7bd8;">{{courseTitleHtml}}</p>
        <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #031C35; line-height: 1.35;">{{announcementTitleHtml}}</h1>
        <p style="margin: 0 0 16px; font-size: 15px; color: #555555;">Hello <strong>{{studentNameHtml}}</strong>,</p>
        <div style="background-color: #eaf2ff; padding: 18px 20px; border-left: 4px solid #03A9F4; border-radius: 6px; margin: 0 0 24px; word-wrap: break-word; font-size: 15px; line-height: 1.65; color: #333333;">{{announcementMessageHtml}}</div>
        {{ctaButtonHtml}}
        <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #eeeeee; font-size: 13px; color: #666666; text-align: center;">
          <p style="margin: 0 0 8px;">This is an automated communication from MSP MIU Course Management.</p>
          <p style="margin: 0;">Please do not reply directly to this email.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`,
    ['courseTitle', 'announcementTitle', 'announcementMessage', 'studentName', 'courseUrl', 'ctaLabel', 'ctaUrl', 'courseTitleHtml', 'announcementTitleHtml', 'announcementMessageHtml', 'studentNameHtml', 'ctaButtonHtml', 'ctaBlockText']
  )
};

const DEFAULT_WHATSAPP_LINKS = {
  'Media & Content Creation': 'https://chat.whatsapp.com/I64zmHEVRiFIuZqMKBKLma?mode=ems_copy_t',
  'Human Resources': 'https://chat.whatsapp.com/EPwUJcrQv1U03hGiN9jkkV?mode=ems_copy_t',
  'Software Development': 'https://chat.whatsapp.com/GkKuGje7wv5AfjOE1SpeZA?mode=ems_copy_t',
  'Public Relations': 'https://chat.whatsapp.com/IZgp2iqQ00K1qCaiyO9WgP?mode=ems_copy_t',
  'Event Planning': 'https://chat.whatsapp.com/CJCWsKh5ANXAYZiYIMkfem?mode=ems_copy_t',
  'Technical Training': 'https://chat.whatsapp.com/Ku12m4quUqPCvYpERQKTM0?mode=ems_copy_t'
};

/** Board titles / roles stored as departments — no WhatsApp groups */
const DEPARTMENTS_WITHOUT_WHATSAPP = new Set([
  'President',
  'Vice President',
  'Founder',
  'Competitor'
]);

function departmentHasWhatsApp(name) {
  return !DEPARTMENTS_WITHOUT_WHATSAPP.has(String(name || '').trim());
}

function getDefaultTemplate(key) {
  return EMAIL_TEMPLATE_DEFAULTS[key] || null;
}

function listDefaultTemplates() {
  return Object.values(EMAIL_TEMPLATE_DEFAULTS);
}

module.exports = {
  EMAIL_TEMPLATE_DEFAULTS,
  DEFAULT_WHATSAPP_LINKS,
  DEPARTMENTS_WITHOUT_WHATSAPP,
  departmentHasWhatsApp,
  getDefaultTemplate,
  listDefaultTemplates
};
