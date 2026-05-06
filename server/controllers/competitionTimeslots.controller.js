const {
  buildTeamSelectionLinks,
  createTimeslot,
  listCompetitionTimeslots,
  updateTimeslot,
  deleteTimeslot,
  assertProjectCompetition,
  getSelectionView,
  selectTimeslotByToken,
  getWorkspaceTimeslotView,
  selectTimeslotForTeam,
  assignTimeslotByAdmin,
  unassignTimeslotByAdmin,
  getTeamMemberEmails,
  formatDateForEmail
} = require('../services/competitionTimeslotService');

function toCompetitionModeContext(competition) {
  if (!competition) return null;
  return {
    competition_id: competition.competition_id,
    title: competition.title,
    location_type: competition.location_type,
    location_details: competition.location_details,
    is_online: competition.location_type === 'online',
    is_on_campus: competition.location_type === 'on-campus'
  };
}

function handleTimeslotError(res, error, fallback = 'Timeslot operation failed') {
  if (error && error.status) {
    return res.status(error.status).json({
      success: false,
      error: error.message
    });
  }

  console.error(fallback, error);
  return res.status(500).json({
    success: false,
    error: fallback
  });
}

async function sendSelectionLinksEmailBatch({ competition, slotCount, links }) {
  const { sendEmail } = await import('../utils/email.mjs');
  const { buildCompetitionTimeslotSelectionEmail } = await import('../utils/competitionTimeslotEmail.mjs');

  const failures = [];

  for (const linkData of links) {
    try {
      const recipients = await getTeamMemberEmails(linkData.team_id);
      if (!recipients.length) {
        failures.push({ team_id: linkData.team_id, reason: 'No team member emails found' });
        continue;
      }

      const emailPayload = buildCompetitionTimeslotSelectionEmail({
        competitionTitle: competition.title,
        teamName: linkData.team_name,
        slotCount,
        selectionLink: linkData.selection_link
      });

      for (const to of recipients) {
        await sendEmail({
          to,
          subject: emailPayload.subject,
          text: emailPayload.text,
          html: emailPayload.html,
          fromName: 'MSP MIU Competition Timeslots'
        });
      }
    } catch (err) {
      failures.push({ team_id: linkData.team_id, reason: err.message || 'Email send failure' });
    }
  }

  return failures;
}

async function sendAssignmentEmail({ competition, team, slot, isAdminAssignment }) {
  const recipients = await getTeamMemberEmails(team.team_id);
  if (!recipients.length) return;

  const { sendEmail } = await import('../utils/email.mjs');
  const { buildCompetitionTimeslotAssignedEmail } = await import('../utils/competitionTimeslotEmail.mjs');

  const emailPayload = buildCompetitionTimeslotAssignedEmail({
    competitionTitle: competition.title,
    teamName: team.team_name,
    startAt: formatDateForEmail(slot.start_at),
    endAt: formatDateForEmail(slot.end_at),
    locationDetails: slot.location_details,
    isAdminAssignment
  });

  for (const to of recipients) {
    await sendEmail({
      to,
      subject: emailPayload.subject,
      text: emailPayload.text,
      html: emailPayload.html,
      fromName: 'MSP MIU Competition Timeslots'
    });
  }
}

const getAdminCompetitionTimeslots = async (req, res) => {
  try {
    const competitionId = Number(req.params.id);
    const competition = await assertProjectCompetition(competitionId);
    const timeslots = await listCompetitionTimeslots(competitionId);
    return res.json({
      success: true,
      competition: toCompetitionModeContext(competition),
      data: timeslots
    });
  } catch (error) {
    return handleTimeslotError(res, error, 'Failed to fetch competition timeslots');
  }
};

const createAdminCompetitionTimeslot = async (req, res) => {
  try {
    const competitionId = Number(req.params.id);
    const { start_at, end_at, location_details } = req.body;

    if (!start_at || !end_at) {
      return res.status(400).json({
        success: false,
        error: 'start_at and end_at are required'
      });
    }

    const timeslot = await createTimeslot({
      competitionId,
      start_at,
      end_at,
      location_details
    });

    const competition = await assertProjectCompetition(competitionId);

    return res.status(201).json({
      success: true,
      competition: toCompetitionModeContext(competition),
      data: timeslot
    });
  } catch (error) {
    return handleTimeslotError(res, error, 'Failed to create timeslot');
  }
};

const updateAdminCompetitionTimeslot = async (req, res) => {
  try {
    const competitionId = Number(req.params.id);
    const timeslotId = Number(req.params.timeslotId);
    const { start_at, end_at, location_details } = req.body;

    const timeslot = await updateTimeslot({
      competitionId,
      timeslotId,
      start_at,
      end_at,
      location_details
    });

    const competition = await assertProjectCompetition(competitionId);

    return res.json({
      success: true,
      competition: toCompetitionModeContext(competition),
      data: timeslot
    });
  } catch (error) {
    return handleTimeslotError(res, error, 'Failed to update timeslot');
  }
};

const deleteAdminCompetitionTimeslot = async (req, res) => {
  try {
    const competitionId = Number(req.params.id);
    const timeslotId = Number(req.params.timeslotId);

    await deleteTimeslot({ competitionId, timeslotId });
    return res.json({ success: true, message: 'Timeslot deleted successfully' });
  } catch (error) {
    return handleTimeslotError(res, error, 'Failed to delete timeslot');
  }
};

const publishCompetitionTimeslotSelectionLinks = async (req, res) => {
  try {
    const competitionId = Number(req.params.id);
    const payload = await buildTeamSelectionLinks(competitionId);
    const failures = await sendSelectionLinksEmailBatch(payload);

    return res.json({
      success: true,
      data: {
        competition_id: competitionId,
        competition: toCompetitionModeContext(payload.competition),
        sent_links: payload.links.length,
        failed_emails: failures
      }
    });
  } catch (error) {
    return handleTimeslotError(res, error, 'Failed to publish timeslot selection links');
  }
};

const assignCompetitionTimeslotByAdmin = async (req, res) => {
  try {
    const competitionId = Number(req.params.id);
    const timeslotId = Number(req.params.timeslotId);
    const teamId = Number(req.body.team_id);

    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'team_id is required'
      });
    }

    const result = await assignTimeslotByAdmin({
      competitionId,
      timeslotId,
      teamId,
      adminUserId: req.user.user_id
    });

    try {
      await sendAssignmentEmail({
        competition: result.competition,
        team: result.team,
        slot: result.slot,
        isAdminAssignment: true
      });
    } catch (mailErr) {
      console.error('Timeslot assignment email failed:', mailErr);
    }

    return res.json({
      success: true,
      message: 'Timeslot assigned successfully',
      data: {
        competition_id: competitionId,
        competition: toCompetitionModeContext(result.competition),
        timeslot_id: timeslotId,
        team_id: teamId
      }
    });
  } catch (error) {
    return handleTimeslotError(res, error, 'Failed to assign timeslot');
  }
};

const unassignCompetitionTimeslotByAdmin = async (req, res) => {
  try {
    const competitionId = Number(req.params.id);
    const timeslotId = Number(req.params.timeslotId);

    await unassignTimeslotByAdmin({ competitionId, timeslotId });

    return res.json({
      success: true,
      message: 'Timeslot unassigned successfully'
    });
  } catch (error) {
    return handleTimeslotError(res, error, 'Failed to unassign timeslot');
  }
};

const getCompetitionTimeslotSelectionView = async (req, res) => {
  try {
    const competitionId = Number(req.params.id);
    const token = String(req.query.token || '').trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'token query parameter is required'
      });
    }

    const view = await getSelectionView({ competitionId, token });

    return res.json({
      success: true,
      data: {
        competition: toCompetitionModeContext(view.competition),
        team: view.team,
        current_selection: view.current_selection,
        slots: view.slots
      }
    });
  } catch (error) {
    return handleTimeslotError(res, error, 'Failed to fetch timeslot selection view');
  }
};

const submitCompetitionTimeslotSelection = async (req, res) => {
  try {
    const competitionId = Number(req.params.id);
    const token = String(req.body.token || '').trim();
    const timeslotId = Number(req.body.timeslot_id);

    if (!token || !timeslotId) {
      return res.status(400).json({
        success: false,
        error: 'token and timeslot_id are required'
      });
    }

    const result = await selectTimeslotByToken({
      competitionId,
      token,
      timeslotId
    });

    try {
      await sendAssignmentEmail({
        competition: result.competition,
        team: result.team,
        slot: result.slot,
        isAdminAssignment: false
      });
    } catch (mailErr) {
      console.error('Timeslot confirmation email failed:', mailErr);
    }

    return res.json({
      success: true,
      message: 'Timeslot selected successfully',
      data: {
        competition_id: competitionId,
        competition: toCompetitionModeContext(result.competition),
        timeslot_id: timeslotId,
        team_id: result.team.team_id
      }
    });
  } catch (error) {
    return handleTimeslotError(res, error, 'Failed to select timeslot');
  }
};

const getCompetitionWorkspaceTimeslotView = async (req, res) => {
  try {
    const competitionId = Number(req.params.id);
    const teamId = Number(req.params.teamId);
    const userId = req.user.user_id;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'teamId is required'
      });
    }

    const view = await getWorkspaceTimeslotView({ competitionId, teamId, userId });

    return res.json({
      success: true,
      data: {
        competition: toCompetitionModeContext(view.competition),
        team: view.team,
        current_selection: view.current_selection,
        selection_open: view.selection_open,
        slots: view.slots
      }
    });
  } catch (error) {
    return handleTimeslotError(res, error, 'Failed to fetch workspace timeslot view');
  }
};

const submitCompetitionWorkspaceTimeslotSelection = async (req, res) => {
  try {
    const competitionId = Number(req.params.id);
    const teamId = Number(req.params.teamId);
    const timeslotId = Number(req.body.timeslot_id);
    const userId = req.user.user_id;

    if (!teamId || !timeslotId) {
      return res.status(400).json({
        success: false,
        error: 'teamId and timeslot_id are required'
      });
    }

    const result = await selectTimeslotForTeam({
      competitionId,
      teamId,
      userId,
      timeslotId
    });

    try {
      await sendAssignmentEmail({
        competition: result.competition,
        team: result.team,
        slot: result.slot,
        isAdminAssignment: false
      });
    } catch (mailErr) {
      console.error('Workspace timeslot confirmation email failed:', mailErr);
    }

    return res.json({
      success: true,
      message: 'Timeslot selected successfully',
      data: {
        competition_id: competitionId,
        competition: toCompetitionModeContext(result.competition),
        team_id: teamId,
        timeslot_id: timeslotId
      }
    });
  } catch (error) {
    return handleTimeslotError(res, error, 'Failed to select workspace timeslot');
  }
};

module.exports = {
  getAdminCompetitionTimeslots,
  createAdminCompetitionTimeslot,
  updateAdminCompetitionTimeslot,
  deleteAdminCompetitionTimeslot,
  publishCompetitionTimeslotSelectionLinks,
  assignCompetitionTimeslotByAdmin,
  unassignCompetitionTimeslotByAdmin,
  getCompetitionTimeslotSelectionView,
  submitCompetitionTimeslotSelection,
  getCompetitionWorkspaceTimeslotView,
  submitCompetitionWorkspaceTimeslotSelection
};
