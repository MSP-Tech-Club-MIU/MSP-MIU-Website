function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

export function buildCompetitionTimeslotSelectionEmail({ competitionTitle, teamName, slotCount, selectionLink }) {
  const subject = `${competitionTitle} - Choose your competition timeslot`;
  const text = [
    `Hi ${teamName} team,`,
    '',
    `Timeslot selection is now open for ${competitionTitle}.`,
    `Available slots: ${slotCount}`,
    '',
    `Choose your slot here: ${selectionLink}`,
    '',
    'This is an automated message from MSP MIU Competition Management System.'
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
  <div style="max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
    <div style="background: #0f766e; color: #fff; padding: 16px 20px;">
      <h2 style="margin: 0; font-size: 20px;">Competition Timeslot Selection</h2>
    </div>
    <div style="padding: 20px; background: #fff;">
      <p>Hi <strong>${escapeHtml(teamName)}</strong> team,</p>
      <p>Timeslot selection is now open for <strong>${escapeHtml(competitionTitle)}</strong>.</p>
      <p>Available slots: <strong>${Number(slotCount) || 0}</strong></p>
      <p>
        <a href="${selectionLink}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;">
          Choose Timeslot
        </a>
      </p>
      <p style="font-size:12px;color:#6b7280;">This is an automated message from MSP MIU Competition Management System.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

export function buildCompetitionTimeslotAssignedEmail({ competitionTitle, teamName, startAt, endAt, locationDetails, isAdminAssignment }) {
  const assignmentLabel = isAdminAssignment ? 'assigned by admin' : 'selected by your team';
  const whenText = `From: ${startAt}\nTo: ${endAt}`;
  const locationText = locationDetails ? `\nLocation: ${locationDetails}` : '';

  const subject = `${competitionTitle} - Timeslot ${isAdminAssignment ? 'assigned' : 'confirmed'}`;
  const text = [
    `Hi ${teamName} team,`,
    '',
    `Your competition timeslot is ${assignmentLabel}.`,
    whenText + locationText,
    '',
    'This is an automated message from MSP MIU Competition Management System.'
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
  <div style="max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
    <div style="background: #0f766e; color: #fff; padding: 16px 20px;">
      <h2 style="margin: 0; font-size: 20px;">Competition Timeslot ${isAdminAssignment ? 'Assignment' : 'Confirmation'}</h2>
    </div>
    <div style="padding: 20px; background: #fff;">
      <p>Hi <strong>${escapeHtml(teamName)}</strong> team,</p>
      <p>Your competition timeslot is <strong>${escapeHtml(assignmentLabel)}</strong>.</p>
      <ul>
        <li><strong>From:</strong> ${escapeHtml(startAt)}</li>
        <li><strong>To:</strong> ${escapeHtml(endAt)}</li>
        ${locationDetails ? `<li><strong>Location:</strong> ${escapeHtml(locationDetails)}</li>` : ''}
      </ul>
      <p style="font-size:12px;color:#6b7280;">This is an automated message from MSP MIU Competition Management System.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}
