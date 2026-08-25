const { Op } = require('sequelize');
const { Board, User } = require('../models');
const { getDefaultSeasonId } = require('./seasonFilter');

async function syncUserFromBoard(boardMember, options = {}) {
  const { transaction, force = false } = options;
  if (!boardMember) return null;

  let user = null;
  if (boardMember.user_id) {
    user = await User.findByPk(boardMember.user_id, { transaction });
  }
  if (!user && boardMember.email) {
    user = await User.findOne({
      where: { email: String(boardMember.email).trim() },
      transaction
    });
  }
  if (!user) return null;

  if (boardMember.user_id !== user.user_id) {
    await boardMember.update({ user_id: user.user_id }, { transaction });
  }

  // Only override access for current/default season unless force
  if (!force) {
    const defaultSeasonId = await getDefaultSeasonId();
    if (
      defaultSeasonId != null &&
      Number(boardMember.season_id) !== Number(defaultSeasonId)
    ) {
      return user;
    }
  }

  const updates = {
    department_id:
      boardMember.department_id != null && boardMember.department_id !== ''
        ? Number(boardMember.department_id)
        : null,
    season_id: boardMember.season_id != null ? Number(boardMember.season_id) : user.season_id,
    full_name: boardMember.full_name || user.full_name
  };

  if (user.role !== 'admin' && user.role !== 'judge') {
    updates.role = 'board';
  }

  if (!user.university_id && boardMember.university_id) {
    updates.university_id = String(boardMember.university_id).trim();
  }

  await user.update(updates, { transaction });
  return user;
}

async function applyCurrentSeasonBoardAccess(seasonId, options = {}) {
  const { transaction } = options;
  const id = Number(seasonId);
  if (!Number.isFinite(id) || id < 1) return { synced: 0, demoted: 0 };

  const boardMembers = await Board.findAll({
    where: {
      season_id: id,
      user_id: { [Op.ne]: null }
    },
    transaction
  });

  const currentUserIds = new Set();
  for (const member of boardMembers) {
    const user = await syncUserFromBoard(member, { transaction, force: true });
    if (user) currentUserIds.add(Number(user.user_id));
  }

  const demoteWhere = { role: 'board' };
  if (currentUserIds.size) {
    demoteWhere.user_id = { [Op.notIn]: [...currentUserIds] };
  }

  const [demoted] = await User.update(
    { role: 'member' },
    { where: demoteWhere, transaction }
  );

  return { synced: currentUserIds.size, demoted };
}

async function demoteUserIfNoCurrentBoard(userId, options = {}) {
  const { transaction } = options;
  const id = Number(userId);
  if (!Number.isFinite(id) || id < 1) return null;

  const user = await User.findByPk(id, { transaction });
  if (!user || user.role !== 'board') return user;

  const defaultSeasonId = await getDefaultSeasonId();
  const where = { user_id: id };
  if (defaultSeasonId != null) {
    where.season_id = defaultSeasonId;
  }

  const stillBoard = await Board.findOne({ where, transaction });
  if (!stillBoard) {
    await user.update({ role: 'member' }, { transaction });
  }
  return user;
}

module.exports = {
  syncUserFromBoard,
  applyCurrentSeasonBoardAccess,
  demoteUserIfNoCurrentBoard
};
