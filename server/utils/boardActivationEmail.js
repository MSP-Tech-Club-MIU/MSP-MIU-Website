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
 * @param {number} [options.delayMs=500]
 */
async function sendBoardActivationEmailsToMembers(options = {}) {
  const { where = {}, delayMs = 500 } = options;
  const { sendEmail } = await import('./email.mjs');

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

  const summary = {
    total: boardMembers.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    sentTo: [],
    skippedMembers: [],
    errors: []
  };

  for (let i = 0; i < boardMembers.length; i++) {
    const boardMember = boardMembers[i];
    try {
      const result = await sendBoardActivationEmailForMember(boardMember, sendEmail);
      if (result.success) {
        summary.sent++;
        summary.sentTo.push({
          boardId: result.boardId,
          name: result.name,
          position: result.position,
          email: result.email
        });
      } else if (result.skipped) {
        summary.skipped++;
        summary.skippedMembers.push({
          boardId: result.boardId,
          name: result.name,
          position: result.position,
          email: result.email,
          reason: result.reason
        });
      } else {
        summary.failed++;
        summary.errors.push({
          boardId: result.boardId,
          name: result.name,
          position: result.position,
          email: result.email,
          error: result.error
        });
      }
    } catch (err) {
      summary.failed++;
      summary.errors.push({
        boardId: boardMember.board_id,
        name: boardMember.full_name,
        position: boardMember.position,
        email: boardMember.email,
        error: err.message
      });
    }

    if (i < boardMembers.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return summary;
}

module.exports = {
  sendBoardActivationEmailForMember,
  sendBoardActivationEmailsToMembers
};
