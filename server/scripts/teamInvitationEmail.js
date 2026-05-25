/**
 * Team Invitation Email Templates
 * Two versions: For new users (no account) and existing users
 */

function buildAcceptInvitationUrl(acceptUrl, invitationToken) {
  const base = String(acceptUrl || 'http://localhost:5173').trim().replace(/\/+$/, '');
  const token = encodeURIComponent(String(invitationToken || ''));
  return `${base}/accept-team-invitation?token=${token}`;
}

/**
 * Generate team invitation email HTML for NEW users (no existing account)
 * User needs to create account with password
 */
function generateNewUserInvitationEmailHTML(data) {
  const {
    teamName,
    inviterName,
    competitionTitle,
    competitionStartDate,
    competitionEndDate,
    invitationToken,
    acceptUrl,
    expiresAt,
    invitedName,
    invitedUniversityId,
    email,
    competitionUrl
  } = data;

  const acceptLink = buildAcceptInvitationUrl(acceptUrl, invitationToken);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation - Create Account - MSP MIU</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0D3159; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background: linear-gradient(145deg, rgba(13, 49, 89, 0.9), rgba(29, 79, 130, 0.8)); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #0077CC, #03A9F4); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);">
                🎯 Team Invitation
              </h1>
              <p style="margin: 10px 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.95);">
                Microsoft Student Partners - MIU
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 18px; color: #8EC2F0; margin: 0 0 20px; font-weight: 600;">
                Hello!
              </p>
              <p style="font-size: 16px; color: #C5DAE9; line-height: 1.6; margin: 0 0 25px;">
                <strong style="color: #03A9F4;">${inviterName}</strong> has invited you to join their team 
                <strong style="color: #03A9F4;">"${teamName}"</strong> for the upcoming competition:
              </p>
              <table role="presentation" style="width: 100%; background: rgba(3, 169, 244, 0.1); border-left: 4px solid #03A9F4; border-radius: 8px; margin: 0 0 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; font-size: 22px; color: #8EC2F0; font-weight: 650;">
                      ${competitionTitle}
                    </h2>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #C5DAE9;">
                      <strong style="color: #03A9F4;">Start Date:</strong> ${competitionStartDate}
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #C5DAE9;">
                      <strong style="color: #03A9F4;">End Date:</strong> ${competitionEndDate}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="font-size: 16px; color: #C5DAE9; line-height: 1.6; margin: 0 0 20px;">
                <strong>You don't have an account yet!</strong> Click the button below to create your competitor account and join the team.
              </p>
              <table role="presentation" style="width: 100%; background: rgba(0, 0, 0, 0.2); border-radius: 8px; margin: 0 0 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; font-size: 15px; color: #8EC2F0; font-weight: 600;">
                      Your Account Details:
                    </p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #C5DAE9;">
                      <strong style="color: #03A9F4;">Name:</strong> ${invitedName || 'Not provided'}
                    </p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #C5DAE9;">
                      <strong style="color: #03A9F4;">University ID:</strong> ${invitedUniversityId || 'Not provided'}
                    </p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #C5DAE9;">
                      <strong style="color: #03A9F4;">Email:</strong> ${email}
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #C5DAE9;">
                      <strong style="color: #03A9F4;">Role:</strong> Competitor
                    </p>
                  </td>
                </tr>
              </table>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px;">
                <tr>
                  <td align="center">
                    <a href="${acceptLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #0077CC, #03A9F4); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 20px rgba(3, 169, 244, 0.4);">
                      ✓ Create Account to Participate
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 14px; color: #C5DAE9; line-height: 1.5; margin: 0 0 20px;">
                After creating your account, use this competition link:<br>
                <a href="${competitionUrl}" style="color: #03A9F4; word-break: break-all;">${competitionUrl}</a>
              </p>
              <p style="font-size: 13px; color: #8EC2F0; line-height: 1.5; margin: 0 0 20px; padding: 15px; background: rgba(0, 0, 0, 0.2); border-radius: 8px;">
                <strong>Note:</strong> If the button doesn't work, copy and paste this link in your browser:<br>
                <a href="${acceptLink}" style="color: #03A9F4; word-break: break-all;">${acceptLink}</a>
              </p>
              <table role="presentation" style="width: 100%; background: rgba(244, 88, 31, 0.15); border: 1px solid rgba(244, 88, 31, 0.3); border-radius: 8px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; font-size: 14px; color: #F4581F; font-weight: 600;">
                      ⚠️ This invitation expires on ${expiresAt}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background: rgba(0, 0, 0, 0.3); padding: 25px 40px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="margin: 0 0 10px; font-size: 14px; color: #8EC2F0;">
                Microsoft Student Partners - Misr International University
              </p>
              <p style="margin: 0; font-size: 12px; color: #C5DAE9; opacity: 0.7;">
                This is an automated email. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate team invitation email HTML for EXISTING users
 * User already has account, just needs to accept
 */
function generateExistingUserInvitationEmailHTML(data) {
  const {
    teamName,
    inviterName,
    competitionTitle,
    competitionStartDate,
    competitionEndDate,
    competitionUrl,
    expiresAt,
    email
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation - MSP MIU</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0D3159; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background: linear-gradient(145deg, rgba(13, 49, 89, 0.9), rgba(29, 79, 130, 0.8)); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #0077CC, #03A9F4); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);">
                🎯 Team Invitation
              </h1>
              <p style="margin: 10px 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.95);">
                Microsoft Student Partners - MIU
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 18px; color: #8EC2F0; margin: 0 0 20px; font-weight: 600;">
                Hello!
              </p>
              <p style="font-size: 16px; color: #C5DAE9; line-height: 1.6; margin: 0 0 25px;">
                <strong style="color: #03A9F4;">${inviterName}</strong> has invited you to join their team 
                <strong style="color: #03A9F4;">"${teamName}"</strong>.
              </p>
              <table role="presentation" style="width: 100%; background: rgba(3, 169, 244, 0.1); border-left: 4px solid #03A9F4; border-radius: 8px; margin: 0 0 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; font-size: 22px; color: #8EC2F0; font-weight: 650;">
                      ${competitionTitle}
                    </h2>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #C5DAE9;">
                      <strong style="color: #03A9F4;">Start Date:</strong> ${competitionStartDate}
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #C5DAE9;">
                      <strong style="color: #03A9F4;">End Date:</strong> ${competitionEndDate}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="font-size: 16px; color: #C5DAE9; line-height: 1.6; margin: 0 0 30px;">
                <strong>Welcome back!</strong> We found your existing account (<strong style="color: #03A9F4;">${email}</strong>) and added you to the team automatically.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px;">
                <tr>
                  <td align="center">
                    <a href="${competitionUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #0077CC, #03A9F4); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 20px rgba(3, 169, 244, 0.4);">
                      View Competition
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 13px; color: #8EC2F0; line-height: 1.5; margin: 0 0 20px; padding: 15px; background: rgba(0, 0, 0, 0.2); border-radius: 8px;">
                <strong>Competition Link:</strong><br>
                <a href="${competitionUrl}" style="color: #03A9F4; word-break: break-all;">${competitionUrl}</a>
              </p>
              ${expiresAt ? `
              <table role="presentation" style="width: 100%; background: rgba(244, 88, 31, 0.15); border: 1px solid rgba(244, 88, 31, 0.3); border-radius: 8px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; font-size: 14px; color: #F4581F; font-weight: 600;">
                      ⚠️ This invitation expires on ${expiresAt}
                    </p>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>
          <tr>
            <td style="background: rgba(0, 0, 0, 0.3); padding: 25px 40px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="margin: 0 0 10px; font-size: 14px; color: #8EC2F0;">
                Microsoft Student Partners - Misr International University
              </p>
              <p style="margin: 0; font-size: 12px; color: #C5DAE9; opacity: 0.7;">
                This is an automated email. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Guest registered a team and already has an account (no activation link needed).
 */
function generateGuestLeaderTeamCreatedEmailHTML(data) {
  const {
    teamName,
    competitionTitle,
    competitionStartDate,
    competitionEndDate,
    competitionUrl,
    workspaceUrl,
    email
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Created - MSP MIU</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0D3159; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background: linear-gradient(145deg, rgba(13, 49, 89, 0.9), rgba(29, 79, 130, 0.8)); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #0077CC, #03A9F4); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">✅ Team Created</h1>
              <p style="margin: 10px 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.95);">MSP MIU Competitions</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 16px; color: #C5DAE9; line-height: 1.6;">
                Your team <strong style="color: #03A9F4;">"${teamName}"</strong> is registered for:
              </p>
              <h2 style="margin: 16px 0; font-size: 22px; color: #8EC2F0;">${competitionTitle}</h2>
              <p style="margin: 0 0 8px; font-size: 14px; color: #C5DAE9;"><strong>Start:</strong> ${competitionStartDate}</p>
              <p style="margin: 0 0 24px; font-size: 14px; color: #C5DAE9;"><strong>End:</strong> ${competitionEndDate}</p>
              <p style="margin: 0 0 8px; font-size: 14px; color: #C5DAE9;">Account: <strong style="color: #03A9F4;">${email}</strong></p>
              <table role="presentation" style="width: 100%; margin: 24px 0;">
                <tr><td align="center">
                  <a href="${workspaceUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #0077CC, #03A9F4); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">Open Team Workspace</a>
                </td></tr>
              </table>
              <p style="font-size: 13px; color: #8EC2F0;"><strong>Competition:</strong><br><a href="${competitionUrl}" style="color: #03A9F4; word-break: break-all;">${competitionUrl}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function generateGuestLeaderTeamCreatedEmailText(data) {
  const {
    teamName,
    competitionTitle,
    competitionStartDate,
    competitionEndDate,
    competitionUrl,
    workspaceUrl,
    email
  } = data;

  return `
TEAM CREATED - MSP MIU
======================

Your team "${teamName}" is registered for: ${competitionTitle}

When: ${competitionStartDate} → ${competitionEndDate}
Account: ${email}

Open your team workspace: ${workspaceUrl}

Competition page: ${competitionUrl}

---
Microsoft Student Partners - Misr International University
  `.trim();
}

function getGuestLeaderTeamCreatedSubject(teamName, competitionTitle) {
  return `✅ Team "${teamName}" created for ${competitionTitle} - MSP MIU`;
}

/**
 * Plain text versions
 */
function generateNewUserInvitationEmailText(data) {
  const {
    teamName,
    inviterName,
    competitionTitle,
    competitionStartDate,
    competitionEndDate,
    invitationToken,
    acceptUrl,
    expiresAt,
    invitedName,
    invitedUniversityId,
    email,
    competitionUrl
  } = data;

  const acceptLink = buildAcceptInvitationUrl(acceptUrl, invitationToken);

  return `
TEAM INVITATION - MSP MIU
========================

Hello!

${inviterName} has invited you to join their team "${teamName}" for the upcoming competition.

COMPETITION DETAILS
-------------------
Title: ${competitionTitle}
Start Date: ${competitionStartDate}
End Date: ${competitionEndDate}

YOUR ACCOUNT DETAILS
--------------------
Name: ${invitedName || 'Not provided'}
University ID: ${invitedUniversityId || 'Not provided'}
Email: ${email}
Role: Competitor

CREATE ACCOUNT TO PARTICIPATE
-----------------------------
You don't have an account yet. Click the link below to create your competitor account:

${acceptLink}

Competition link: ${competitionUrl}

IMPORTANT
---------
⚠️ This invitation expires on ${expiresAt}

---
Microsoft Student Partners - Misr International University
This is an automated email. Please do not reply to this message.
  `.trim();
}

function generateExistingUserInvitationEmailText(data) {
  const {
    teamName,
    inviterName,
    competitionTitle,
    competitionStartDate,
    competitionEndDate,
    competitionUrl,
    expiresAt,
    email
  } = data;

  return `
TEAM INVITATION - MSP MIU
========================

Hello!

${inviterName} has added you to their team "${teamName}" for the upcoming competition.

COMPETITION DETAILS
-------------------
Title: ${competitionTitle}
Start Date: ${competitionStartDate}
End Date: ${competitionEndDate}

WELCOME BACK!
-------------
We found your existing account (${email}) and added you to the team automatically.

VIEW COMPETITION
----------------
${competitionUrl}

${expiresAt ? `IMPORTANT
---------
⚠️ This invitation expires on ${expiresAt}` : ''}

---
Microsoft Student Partners - Misr International University
This is an automated email. Please do not reply to this message.
  `.trim();
}

/**
 * Get email subject line
 */
function getInvitationEmailSubject(teamName, competitionTitle, userExists = false) {
  if (userExists) {
    return `✅ You were added to "${teamName}" for ${competitionTitle} - MSP MIU`;
  }
  return `🎯 Team Invitation: Join "${teamName}" for ${competitionTitle} - MSP MIU`;
}

module.exports = {
  generateNewUserInvitationEmailHTML,
  generateExistingUserInvitationEmailHTML,
  generateNewUserInvitationEmailText,
  generateExistingUserInvitationEmailText,
  getInvitationEmailSubject,
  generateGuestLeaderTeamCreatedEmailHTML,
  generateGuestLeaderTeamCreatedEmailText,
  getGuestLeaderTeamCreatedSubject
};
