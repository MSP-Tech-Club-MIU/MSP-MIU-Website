const { Board } = require('../models');
const db = require('../config/db');

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseCsvInts(value) {
  return parseCsv(value)
    .map((x) => parseInt(x, 10))
    .filter((x) => Number.isFinite(x));
}

function canBoardUserJudge(boardMember) {
  if (!boardMember) return false;

  const allowedPositions = parseCsv(process.env.JUDGE_BOARD_POSITIONS || 'President,Vice President,Head,Co-Head');
  const allowedDepartments = parseCsvInts(process.env.JUDGE_BOARD_DEPARTMENT_IDS || '');

  if (!allowedPositions.includes(boardMember.position)) {
    return false;
  }

  if (allowedDepartments.length === 0) {
    return true;
  }

  return allowedDepartments.includes(Number(boardMember.department_id));
}

function parseCompetitionConfig(configValue) {
  if (!configValue) return null;
  if (typeof configValue === 'object') return configValue;
  try {
    return JSON.parse(configValue);
  } catch (_) {
    return null;
  }
}

async function resolveCompetitionId(req) {
  const directCompetitionId = req.params.competitionId || req.params.id || req.body?.competition_id;
  const parsedDirect = parseInt(String(directCompetitionId || ''), 10);
  if (Number.isFinite(parsedDirect)) return parsedDirect;

  const submissionId = req.params.submissionId || req.params.id;
  const parsedSubmissionId = parseInt(String(submissionId || ''), 10);
  if (!Number.isFinite(parsedSubmissionId)) return null;

  const rows = await db.query(
    `SELECT competition_id FROM submissions WHERE submission_id = ? LIMIT 1`,
    {
      replacements: [parsedSubmissionId],
      type: db.QueryTypes.SELECT
    }
  );
  return rows?.[0]?.competition_id ? Number(rows[0].competition_id) : null;
}

async function isBoardAssignedToCompetitionJudge(boardUserId, competitionId) {
  if (!Number.isFinite(competitionId)) return null;
  const rows = await db.query(
    `SELECT config FROM competitions WHERE competition_id = ? LIMIT 1`,
    {
      replacements: [competitionId],
      type: db.QueryTypes.SELECT
    }
  );
  if (!rows || rows.length === 0) return false;

  const config = parseCompetitionConfig(rows[0].config);
  const assigned = config?.judging?.assigned_board_user_ids;
  if (!Array.isArray(assigned) || assigned.length === 0) {
    return null; // No per-competition assignment configured
  }

  const normalized = assigned.map((x) => Number(x)).filter((x) => Number.isFinite(x));
  return normalized.includes(Number(boardUserId));
}

const authorizeJudgingAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (req.user.role === 'admin' || req.user.role === 'judge') {
      return next();
    }

    if (req.user.role !== 'board') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const boardMember = await Board.findOne({
      where: { user_id: req.user.user_id },
      attributes: ['board_id', 'position', 'department_id']
    });

    const competitionId = await resolveCompetitionId(req);
    const assignmentDecision = await isBoardAssignedToCompetitionJudge(req.user.user_id, competitionId);

    const allowedByAssignment = assignmentDecision === true;
    const allowedByDefaultRule = assignmentDecision === null && canBoardUserJudge(boardMember);
    if (!allowedByAssignment && !allowedByDefaultRule) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    req.boardMember = boardMember;
    return next();
  } catch (error) {
    console.error('Judging auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization error'
    });
  }
};

module.exports = {
  authorizeJudgingAccess,
  canBoardUserJudge
};
