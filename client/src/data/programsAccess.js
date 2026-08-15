/**
 * Board members in these departments can use Admin Programs tabs:
 * Events, Courses, Competitions, Registrations.
 *
 * Matches server/utils/programsEligibleBoard.js
 * 1  Software Development (software engineering)
 * 2  Technical Training
 * 11 Artificial Intelligence
 * 12 Cyber Security
 */
export const PROGRAMS_DEPARTMENT_IDS = [1, 2, 11, 12];

export const PROGRAMS_TAB_KEYS = ['events', 'courses', 'competitions', 'registrations'];

export function isProgramsEligibleDepartment(departmentId) {
  const id = typeof departmentId === 'number' ? departmentId : parseInt(departmentId, 10);
  return !Number.isNaN(id) && PROGRAMS_DEPARTMENT_IDS.includes(id);
}
