const { Op } = require('sequelize');
const { Member, User } = require('../models');
const { getDefaultSeasonId } = require('./seasonFilter');

/**
 * Prefer the member row for the default/current season when several exist for one email.
 */
async function findMemberByEmailPreferCurrentSeason(email, options = {}) {
  if (!email) return null;
  const { transaction } = options;
  const members = await Member.findAll({
    where: { email },
    order: [['joined_at', 'DESC'], ['member_id', 'DESC']],
    transaction
  });
  if (!members.length) return null;

  const defaultSeasonId = await getDefaultSeasonId();
  if (defaultSeasonId != null) {
    const current = members.find((m) => m.season_id === defaultSeasonId);
    if (current) return current;
  }
  return members[0];
}

/**
 * Resolve the User account for a returning student without creating a duplicate.
 * Identity preference: university_id, then email, then prior member.user_id.
 */
async function findExistingUserForEnrollment({ university_id, email, priorUserId }, options = {}) {
  const { transaction } = options;

  if (priorUserId) {
    const byLink = await User.findByPk(priorUserId, { transaction });
    if (byLink) return byLink;
  }
  if (university_id) {
    const byUni = await User.findOne({
      where: { university_id: String(university_id).trim() },
      transaction
    });
    if (byUni) return byUni;
  }
  if (email) {
    const byEmail = await User.findOne({
      where: { email: String(email).trim() },
      transaction
    });
    if (byEmail) return byEmail;
  }
  return null;
}

/**
 * Upsert a season-scoped Member from an approved application and sync the existing User
 * (department + current season). Never creates a second User for the same student.
 *
 * @returns {{ member: object, user: object|null, createdMember: boolean, updatedUser: boolean }}
 */
async function enrollFromApplication(application, options = {}) {
  const {
    departmentId = application.first_choice,
    transaction
  } = options;

  if (!application) {
    const err = new Error('Application is required');
    err.status = 400;
    throw err;
  }
  if (departmentId == null || departmentId === '') {
    const err = new Error('Department is required to enroll member');
    err.status = 400;
    throw err;
  }

  const season_id =
    application.season_id != null
      ? application.season_id
      : await getDefaultSeasonId();

  if (season_id == null) {
    const err = new Error('No default season configured');
    err.status = 400;
    throw err;
  }

  const university_id = String(application.university_id).trim();
  const email = String(application.email).trim();

  let member = await Member.findOne({
    where: { university_id, season_id },
    transaction
  });

  const priorMember = await Member.findOne({
    where: {
      university_id,
      ...(member ? { member_id: { [Op.ne]: member.member_id } } : {})
    },
    order: [['joined_at', 'DESC'], ['member_id', 'DESC']],
    transaction
  });

  const user = await findExistingUserForEnrollment(
    {
      university_id,
      email,
      priorUserId: member?.user_id || priorMember?.user_id || null
    },
    { transaction }
  );

  const memberPayload = {
    university_id,
    full_name: application.full_name,
    email,
    faculty: application.faculty,
    year: application.year,
    phone_number: application.phone_number,
    department_id: Number(departmentId),
    season_id,
    user_id: user?.user_id || member?.user_id || priorMember?.user_id || null
  };

  let createdMember = false;
  if (member) {
    await member.update(memberPayload, { transaction });
  } else {
    member = await Member.create(
      { ...memberPayload, joined_at: new Date() },
      { transaction }
    );
    createdMember = true;
  }

  let updatedUser = false;
  if (user) {
    const userUpdates = {
      department_id: Number(departmentId),
      season_id,
      full_name: application.full_name || user.full_name
    };
    // Keep login identity stable; only fill university_id if missing
    if (!user.university_id && university_id) {
      userUpdates.university_id = university_id;
    }
    await user.update(userUpdates, { transaction });
    updatedUser = true;

    if (member.user_id !== user.user_id) {
      await member.update({ user_id: user.user_id }, { transaction });
    }
  }

  await member.reload({ transaction });
  return { member, user, createdMember, updatedUser };
}

/**
 * After member create/update, keep the linked User on the same department/season.
 */
async function syncUserFromMember(member, options = {}) {
  const { transaction } = options;
  if (!member) return null;

  let user = null;
  if (member.user_id) {
    user = await User.findByPk(member.user_id, { transaction });
  }
  if (!user) {
    user = await findExistingUserForEnrollment(
      { university_id: member.university_id, email: member.email },
      { transaction }
    );
  }
  if (!user) return null;

  await user.update(
    {
      department_id: member.department_id,
      season_id: member.season_id,
      full_name: member.full_name || user.full_name,
      ...(user.university_id ? {} : { university_id: member.university_id })
    },
    { transaction }
  );

  if (member.user_id !== user.user_id) {
    await member.update({ user_id: user.user_id }, { transaction });
  }

  return user;
}

module.exports = {
  findMemberByEmailPreferCurrentSeason,
  findExistingUserForEnrollment,
  enrollFromApplication,
  syncUserFromMember
};
