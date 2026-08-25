/**
 * Board members in these departments can manage Programs tabs:
 * Events, Courses, Competitions, Registrations.
 *
 * 1  Software Development (aka software engineering)
 * 2  Technical Training
 * 11 Artificial Intelligence
 * 12 Cyber Security
 */
const PROGRAMS_DEPARTMENT_IDS = [1, 2, 11, 12];

function isProgramsEligibleDepartment(departmentId) {
  const id = Number(departmentId);
  return Number.isFinite(id) && PROGRAMS_DEPARTMENT_IDS.includes(id);
}

/**
 * Any board row assigned to a programs department (Head, Co-Head, etc.).
 */
function isProgramsEligibleBoardMember(member = {}) {
  return isProgramsEligibleDepartment(member.department_id);
}

module.exports = {
  PROGRAMS_DEPARTMENT_IDS,
  isProgramsEligibleDepartment,
  isProgramsEligibleBoardMember
};
