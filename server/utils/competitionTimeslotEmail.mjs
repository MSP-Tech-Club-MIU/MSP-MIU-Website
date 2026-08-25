import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { renderTemplate, escapeHtml } = require('./emailTemplates/render');

export async function buildCompetitionTimeslotSelectionEmail({
  competitionTitle,
  teamName,
  slotCount,
  selectionLink
}) {
  return renderTemplate('timeslot_selection', {
    competitionTitle,
    teamName,
    slotCount: Number(slotCount) || 0,
    selectionLink,
    competitionTitleHtml: escapeHtml(competitionTitle),
    teamNameHtml: escapeHtml(teamName)
  });
}

export async function buildCompetitionTimeslotAssignedEmail({
  competitionTitle,
  teamName,
  startAt,
  endAt,
  locationDetails,
  isAdminAssignment
}) {
  const assignmentLabel = isAdminAssignment ? 'assigned by admin' : 'selected by your team';
  const assignmentVerb = isAdminAssignment ? 'assigned' : 'confirmed';
  const headerLabel = isAdminAssignment ? 'Assignment' : 'Confirmation';
  const locationText = locationDetails ? `\nLocation: ${locationDetails}` : '';
  const locationHtml = locationDetails
    ? `<li><strong>Location:</strong> ${escapeHtml(locationDetails)}</li>`
    : '';

  return renderTemplate('timeslot_assigned', {
    competitionTitle,
    teamName,
    assignmentVerb,
    assignmentLabel,
    startAt,
    endAt,
    locationText,
    headerLabel,
    teamNameHtml: escapeHtml(teamName),
    assignmentLabelHtml: escapeHtml(assignmentLabel),
    startAtHtml: escapeHtml(startAt),
    endAtHtml: escapeHtml(endAt),
    locationHtml
  });
}
