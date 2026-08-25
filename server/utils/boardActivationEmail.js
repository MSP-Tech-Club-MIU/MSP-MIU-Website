const Board = require('../models/Board');
const User = require('../models/User');
const Department = require('../models/Department');
const { generateToken } = require('./jwt');
const { renderTemplate } = require('./emailTemplates/render');

const WEBSITE_URL =
  process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'https://msp-miu.tech';

/**
 * Send board activation email for a single board member record.
 */
async function sendBoardActivationEmailForMember(boardMember, sendEmail) {
  const boardMemberName = boardMember.full_name;
  const position = boardMember.position;
  const email = boardMember.email;

  if (!email) {
    return {
      success: false,
      skipped: true,
      boardId: boardMember.board_id,
      name: boardMemberName,
      position,
      email: null,
      reason: 'No email on board record'
    };
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser && (existingUser.is_active || existingUser.password_hash)) {
    return {
      success: false,
      skipped: true,
      boardId: boardMember.board_id,
      name: boardMemberName,
      position,
      email,
      reason: existingUser.is_active
        ? 'Account is already active'
        : 'Account already has a password'
    };
  }

  if (boardMember.user_id) {
    const linkedUser = await User.findByPk(boardMember.user_id, {
      attributes: ['user_id', 'email', 'is_active', 'password_hash']
    });
    if (linkedUser && (linkedUser.is_active || linkedUser.password_hash)) {
      return {
        success: false,
        skipped: true,
        boardId: boardMember.board_id,
        name: boardMemberName,
        position,
        email,
        reason: linkedUser.is_active
          ? 'Linked account is already active'
          : 'Linked account already has a password'
      };
    }
  }

  const tokenResult = generateToken({
    email,
    type: 'board_activation',
    board_id: boardMember.board_id
  });

  if (!tokenResult.success) {
    return {
      success: false,
      boardId: boardMember.board_id,
      name: boardMemberName,
      position,
      email,
      error: `Token generation failed: ${tokenResult.error}`
    };
  }

  const activationLink = `${WEBSITE_URL}/account-activation?token=${encodeURIComponent(tokenResult.token)}`;
  const rendered = await renderTemplate('board_activation', {
    boardMemberName,
    position,
    activationLink
  });

  await sendEmail({
    to: email,
    fromName: 'MSP MIU Website',
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    headers: {
      'X-Entity-Ref-ID': `board-activation-${boardMember.board_id}-${Date.now()}`
    }
  });

  return {
    success: true,
    boardId: boardMember.board_id,
    name: boardMemberName,
    position,
    email
  };
}

/**
 * Bulk send board activation emails.
 * @param {object} [options]
 * @param {object} [options.where]
 */
async function sendBoardActivationEmailsToMembers(options = {}) {
  const { where = {} } = options;
  const { sendEmail } = await import('./email.mjs');
  const { startTrackedBulkEmailJob } = require('../services/announcementEmailJob');

  const boardMembers = await Board.findAll({
    where,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['name'],
        required: false
      }
    ],
    attributes: [
      'board_id',
      'full_name',
      'position',
      'department_id',
      'year',
      'email',
      'university_id',
      'user_id'
    ]
  });

  const existingUsers = await User.findAll({
    attributes: ['email', 'is_active', 'password_hash']
  });
  const activeUserEmails = new Set(
    existingUsers
      .filter((u) => u.is_active || u.password_hash)
      .map((u) => String(u.email || '').trim().toLowerCase())
  );

  const validRecipients = [];
  let skipped = 0;
  for (const b of boardMembers) {
    const email = String(b.email || '').trim();
    if (!email) {
      skipped++;
      continue;
    }
    if (activeUserEmails.has(email.toLowerCase())) {
      skipped++;
      continue;
    }
    validRecipients.push({
      email,
      boardMember: b,
      userId: b.user_id
    });
  }

  const emailJob = startTrackedBulkEmailJob({
    type: 'board_activation',
    title: 'Board Account Activation Emails',
    recipients: validRecipients,
    skipped,
    sendFn: sendEmail,
    buildPayload: async (item) => {
      const b = item.boardMember;
      const boardMemberName = b.full_name;
      const position = b.position;
      const departmentName = b.department?.name || null;
      const tokenResult = generateToken({
        email: item.email,
        type: 'activation',
        board_id: b.board_id
      });

      if (!tokenResult.success) {
        throw new Error(`Token generation failed: ${tokenResult.error}`);
      }

      const activationLink = `${WEBSITE_URL}/account-activation?token=${encodeURIComponent(tokenResult.token)}`;
      const rendered = await renderTemplate('board_activation', {
        boardMemberName,
        position,
        departmentName,
        activationLink
      });

      return {
        to: item.email,
        fromName: 'MSP MIU Website',
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        headers: {
          'X-Entity-Ref-ID': `board-activation-${b.board_id}-${Date.now()}`
        }
      };
    }
  });

  return {
    total: boardMembers.length,
    sent: emailJob.sent || 0,
    skipped,
    failed: emailJob.failed || 0,
    emailJob
  };
}

module.exports = {
  sendBoardActivationEmailForMember,
  sendBoardActivationEmailsToMembers
};

