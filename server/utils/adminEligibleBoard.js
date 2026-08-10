const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');

const POSITION_VALUES = ['President', 'Vice President', 'Head', 'Co-Head', 'Founder'];

/**
 * Admin panel access: President, Vice President, or Head of SoftDev (1) / Tech Training (2),
 * with a linked user account.
 */
function isAdminEligibleBoardMember(member = {}) {
  const userId = member.user_id != null && member.user_id !== ''
    ? Number(member.user_id)
    : null;
  if (!Number.isFinite(userId) || userId < 1) return false;

  const position = String(member.position || '').trim();
  if (position === 'President' || position === 'Vice President') return true;

  const departmentId = Number(member.department_id);
  if (position === 'Head' && (departmentId === 1 || departmentId === 2)) return true;

  return false;
}

function normalizeBoardMemberInput(raw = {}, seasonYear) {
  const full_name = raw.full_name != null ? String(raw.full_name).trim() : '';
  const position = raw.position != null ? String(raw.position).trim() : '';
  const department_id =
    raw.department_id != null && raw.department_id !== ''
      ? Number(raw.department_id)
      : null;
  const user_id =
    raw.user_id != null && raw.user_id !== '' ? Number(raw.user_id) : null;
  const email = raw.email != null && String(raw.email).trim() ? String(raw.email).trim() : null;
  const year =
    raw.year != null && String(raw.year).trim()
      ? String(raw.year).trim()
      : seasonYear || null;

  return {
    full_name,
    position,
    department_id: Number.isFinite(department_id) ? department_id : null,
    user_id: Number.isFinite(user_id) && user_id > 0 ? user_id : null,
    email,
    year,
    university_id: raw.university_id || null,
    faculty: raw.faculty != null && String(raw.faculty).trim() ? String(raw.faculty).trim() : null,
    photo_url: raw.photo_url || null,
    linkedin_url: raw.linkedin_url || null,
    github_url: raw.github_url || null,
    sort_order: Number.isFinite(Number(raw.sort_order)) ? Number(raw.sort_order) : 0,
    is_visible: raw.is_visible === undefined ? true : Boolean(raw.is_visible)
  };
}

/**
 * Validate board members for season create. Returns { ok, error, members }.
 */
function validateInitialBoardMembers(rawList, seasonYear) {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return {
      ok: false,
      error:
        'Add at least one board member with an admin-eligible role (President, Vice President, or Head of Software Development / Technical Training) linked to a user account.'
    };
  }

  const members = [];
  for (let i = 0; i < rawList.length; i += 1) {
    const member = normalizeBoardMemberInput(rawList[i], seasonYear);
    if (!member.full_name) {
      return { ok: false, error: `Board member #${i + 1}: full_name is required` };
    }
    if (!POSITION_VALUES.includes(member.position)) {
      return {
        ok: false,
        error: `Board member #${i + 1}: position must be one of: ${POSITION_VALUES.join(', ')}`
      };
    }
    if (!member.year) {
      return { ok: false, error: `Board member #${i + 1}: year is required` };
    }
    if (
      (member.position === 'Head' || member.position === 'Co-Head') &&
      member.department_id == null
    ) {
      return {
        ok: false,
        error: `Board member #${i + 1}: department is required for ${member.position} (Meet the Board hierarchy)`
      };
    }
    members.push(member);
  }

  if (!members.some(isAdminEligibleBoardMember)) {
    return {
      ok: false,
      error:
        'At least one board member must be President, Vice President, or Head of Software Development / Technical Training, and must be linked to a user_id so they can open the Admin Panel.'
    };
  }

  return { ok: true, members };
}

async function seasonHasAdminEligibleBoard(seasonId, { transaction } = {}) {
  const id = Number(seasonId);
  if (!Number.isFinite(id) || id < 1) return false;

  const rows = await sequelize.query(
    `SELECT board_id
     FROM board
     WHERE season_id = ?
       AND user_id IS NOT NULL
       AND (
         position IN ('President', 'Vice President')
         OR (position = 'Head' AND department_id IN (1, 2))
       )
     LIMIT 1`,
    {
      replacements: [id],
      type: QueryTypes.SELECT,
      transaction
    }
  );
  return rows.length > 0;
}

module.exports = {
  POSITION_VALUES,
  isAdminEligibleBoardMember,
  normalizeBoardMemberInput,
  validateInitialBoardMembers,
  seasonHasAdminEligibleBoard
};
