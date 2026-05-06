const db = require('../config/db');
const { generateToken, verifyToken } = require('../utils/jwt');
const { getTeamMemberEmails } = require('./competitionAnnouncementBroadcast');
const { normalizeInsertId } = require('../utils/normalizeInsertId');

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function validateDateRange(startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw createHttpError(400, 'Invalid date format for start_at or end_at');
  }
  if (start >= end) {
    throw createHttpError(400, 'start_at must be before end_at');
  }
}

async function assertProjectCompetition(competitionId, transaction) {
  const rows = await db.query(
    `SELECT competition_id, title, type, location_type, location_details
     FROM competitions
     WHERE competition_id = ?
     LIMIT 1`,
    {
      replacements: [competitionId],
      type: db.QueryTypes.SELECT,
      transaction
    }
  );

  if (!rows || rows.length === 0) {
    throw createHttpError(404, 'Competition not found');
  }

  if (rows[0].type !== 'project') {
    throw createHttpError(400, 'Timeslots are available only for project competitions');
  }

  return rows[0];
}

async function assertTeamInCompetition(competitionId, teamId, transaction) {
  const rows = await db.query(
    `SELECT team_id, team_name
     FROM teams
     WHERE team_id = ? AND competition_id = ?
     LIMIT 1`,
    {
      replacements: [teamId, competitionId],
      type: db.QueryTypes.SELECT,
      transaction
    }
  );

  if (!rows || rows.length === 0) {
    throw createHttpError(404, 'Team not found in this competition');
  }

  return rows[0];
}

function parseSelectionToken(token, expectedCompetitionId) {
  const verified = verifyToken(token);
  if (!verified.success) {
    throw createHttpError(401, 'Invalid or expired timeslot selection token');
  }

  const payload = verified.decoded || {};
  if (payload.purpose !== 'competition_timeslot_selection') {
    throw createHttpError(401, 'Invalid timeslot selection token purpose');
  }

  if (Number(payload.competitionId) !== Number(expectedCompetitionId)) {
    throw createHttpError(401, 'Selection token does not match this competition');
  }

  if (!payload.teamId) {
    throw createHttpError(401, 'Selection token is missing team context');
  }

  return {
    teamId: Number(payload.teamId),
    competitionId: Number(payload.competitionId)
  };
}

function formatDateForEmail(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

async function createTimeslot({ competitionId, start_at, end_at, location_details }) {
  validateDateRange(start_at, end_at);
  await assertProjectCompetition(competitionId);

  const result = await db.query(
    `INSERT INTO competition_timeslots
      (competition_id, start_at, end_at, location_details)
     VALUES (?, ?, ?, ?)`,
    {
      replacements: [competitionId, start_at, end_at, location_details || null],
      type: db.QueryTypes.INSERT
    }
  );

  const insertId = normalizeInsertId(result);
  if (insertId == null) {
    throw createHttpError(500, 'Failed to resolve new timeslot id after insert');
  }
  const rows = await db.query(
    `SELECT * FROM competition_timeslots WHERE timeslot_id = ? LIMIT 1`,
    {
      replacements: [insertId],
      type: db.QueryTypes.SELECT
    }
  );

  return rows[0] || null;
}

async function listCompetitionTimeslots(competitionId) {
  await assertProjectCompetition(competitionId);

  const rows = await db.query(
    `SELECT
      ts.timeslot_id,
      ts.competition_id,
      ts.start_at,
      ts.end_at,
      ts.location_details,
      ts.is_published,
      ts.assigned_team_id,
      ts.assigned_by_admin_user_id,
      ts.assignment_source,
      ts.assigned_at,
      ts.created_at,
      t.team_name AS assigned_team_name
     FROM competition_timeslots ts
     LEFT JOIN teams t ON t.team_id = ts.assigned_team_id
     WHERE ts.competition_id = ?
     ORDER BY ts.start_at ASC`,
    {
      replacements: [competitionId],
      type: db.QueryTypes.SELECT
    }
  );

  return rows;
}

async function updateTimeslot({ competitionId, timeslotId, start_at, end_at, location_details }) {
  await assertProjectCompetition(competitionId);

  const existing = await db.query(
    `SELECT start_at, end_at FROM competition_timeslots WHERE timeslot_id = ? AND competition_id = ? LIMIT 1`,
    {
      replacements: [timeslotId, competitionId],
      type: db.QueryTypes.SELECT
    }
  );
  if (!existing || existing.length === 0) {
    throw createHttpError(404, 'Timeslot not found');
  }

  if (start_at !== undefined || end_at !== undefined) {
    const nextStart = start_at !== undefined ? start_at : existing[0].start_at;
    const nextEnd = end_at !== undefined ? end_at : existing[0].end_at;
    validateDateRange(nextStart, nextEnd);
  }

  const updates = [];
  const values = [];

  if (start_at !== undefined) {
    updates.push('start_at = ?');
    values.push(start_at);
  }
  if (end_at !== undefined) {
    updates.push('end_at = ?');
    values.push(end_at);
  }
  if (location_details !== undefined) {
    updates.push('location_details = ?');
    values.push(location_details || null);
  }

  if (updates.length === 0) {
    throw createHttpError(400, 'No fields to update');
  }

  values.push(timeslotId, competitionId);

  await db.query(
    `UPDATE competition_timeslots SET ${updates.join(', ')} WHERE timeslot_id = ? AND competition_id = ?`,
    {
      replacements: values,
      type: db.QueryTypes.UPDATE
    }
  );

  const rows = await db.query(
    `SELECT * FROM competition_timeslots WHERE timeslot_id = ? LIMIT 1`,
    {
      replacements: [timeslotId],
      type: db.QueryTypes.SELECT
    }
  );

  return rows[0] || null;
}

async function deleteTimeslot({ competitionId, timeslotId }) {
  await assertProjectCompetition(competitionId);

  const rows = await db.query(
    `SELECT assigned_team_id FROM competition_timeslots
     WHERE timeslot_id = ? AND competition_id = ?
     LIMIT 1`,
    {
      replacements: [timeslotId, competitionId],
      type: db.QueryTypes.SELECT
    }
  );

  if (!rows || rows.length === 0) {
    throw createHttpError(404, 'Timeslot not found');
  }

  if (rows[0].assigned_team_id) {
    throw createHttpError(400, 'Cannot delete an assigned timeslot. Unassign it first.');
  }

  await db.query(
    `DELETE FROM competition_timeslots WHERE timeslot_id = ? AND competition_id = ?`,
    {
      replacements: [timeslotId, competitionId],
      type: db.QueryTypes.DELETE
    }
  );
}

async function buildTeamSelectionLinks(competitionId) {
  const competition = await assertProjectCompetition(competitionId);

  const teams = await db.query(
    `SELECT team_id, team_name FROM teams WHERE competition_id = ? ORDER BY team_id ASC`,
    {
      replacements: [competitionId],
      type: db.QueryTypes.SELECT
    }
  );

  if (!teams || teams.length === 0) {
    throw createHttpError(400, 'No teams found for this competition');
  }

  const countRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM competition_timeslots WHERE competition_id = ?`,
    {
      replacements: [competitionId],
      type: db.QueryTypes.SELECT
    }
  );
  const slotCount = Number(countRows?.[0]?.cnt || 0);
  if (slotCount === 0) {
    throw createHttpError(400, 'No timeslots exist for this competition');
  }

  const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

  const links = teams.map((team) => {
    const tokenResult = generateToken(
      {
        purpose: 'competition_timeslot_selection',
        teamId: team.team_id,
        competitionId
      },
      '14d'
    );

    if (!tokenResult.success) {
      throw createHttpError(500, `Failed to generate selection token: ${tokenResult.error}`);
    }

    return {
      team_id: team.team_id,
      team_name: team.team_name,
      token: tokenResult.token,
      selection_link: `${frontendUrl}/competitions/${competitionId}/timeslots?token=${encodeURIComponent(tokenResult.token)}`
    };
  });

  await db.query(
    `UPDATE competition_timeslots SET is_published = 1 WHERE competition_id = ?`,
    {
      replacements: [competitionId],
      type: db.QueryTypes.UPDATE
    }
  );

  return {
    competition,
    slotCount,
    links
  };
}

async function getSelectionView({ competitionId, token }) {
  const competition = await assertProjectCompetition(competitionId);

  const parsed = parseSelectionToken(token, competitionId);
  const team = await assertTeamInCompetition(competitionId, parsed.teamId);

  const rows = await db.query(
    `SELECT
      timeslot_id,
      competition_id,
      start_at,
      end_at,
      location_details,
      is_published,
      assigned_team_id,
      assignment_source,
      assigned_at
     FROM competition_timeslots
     WHERE competition_id = ?
       AND is_published = 1
       AND (assigned_team_id IS NULL OR assigned_team_id = ?)
     ORDER BY start_at ASC`,
    {
      replacements: [competitionId, parsed.teamId],
      type: db.QueryTypes.SELECT
    }
  );

  const current = rows.find((r) => Number(r.assigned_team_id) === parsed.teamId) || null;

  return {
    competition,
    team,
    slots: rows,
    current_selection: current
  };
}

async function selectTimeslotByToken({ competitionId, token, timeslotId }) {
  const parsed = parseSelectionToken(token, competitionId);
  const tx = await db.transaction();

  try {
    const competition = await assertProjectCompetition(competitionId, tx);
    const team = await assertTeamInCompetition(competitionId, parsed.teamId, tx);

    const slots = await db.query(
      `SELECT timeslot_id, assigned_team_id, is_published, start_at, end_at, location_details
       FROM competition_timeslots
       WHERE timeslot_id = ? AND competition_id = ?
       FOR UPDATE`,
      {
        replacements: [timeslotId, competitionId],
        type: db.QueryTypes.SELECT,
        transaction: tx
      }
    );

    if (!slots || slots.length === 0) {
      throw createHttpError(404, 'Timeslot not found');
    }

    const targetSlot = slots[0];

    if (!targetSlot.is_published) {
      throw createHttpError(400, 'Timeslot selection links are not published yet');
    }

    if (targetSlot.assigned_team_id && Number(targetSlot.assigned_team_id) !== parsed.teamId) {
      throw createHttpError(409, 'Timeslot has already been chosen by another team');
    }

    const currentRows = await db.query(
      `SELECT timeslot_id
       FROM competition_timeslots
       WHERE competition_id = ? AND assigned_team_id = ?
       FOR UPDATE`,
      {
        replacements: [competitionId, parsed.teamId],
        type: db.QueryTypes.SELECT,
        transaction: tx
      }
    );

    const previous = currentRows.find((r) => Number(r.timeslot_id) !== Number(timeslotId));
    if (previous) {
      await db.query(
        `UPDATE competition_timeslots
         SET assigned_team_id = NULL,
             assigned_by_admin_user_id = NULL,
             assignment_source = 'none',
             assigned_at = NULL
         WHERE timeslot_id = ?`,
        {
          replacements: [previous.timeslot_id],
          type: db.QueryTypes.UPDATE,
          transaction: tx
        }
      );
    }

    await db.query(
      `UPDATE competition_timeslots
       SET assigned_team_id = ?,
           assigned_by_admin_user_id = NULL,
           assignment_source = 'team_selection',
           assigned_at = NOW()
       WHERE timeslot_id = ?`,
      {
        replacements: [parsed.teamId, timeslotId],
        type: db.QueryTypes.UPDATE,
        transaction: tx
      }
    );

    await tx.commit();

    return {
      competition,
      team,
      slot: {
        timeslot_id: Number(targetSlot.timeslot_id),
        start_at: targetSlot.start_at,
        end_at: targetSlot.end_at,
        location_details: targetSlot.location_details
      }
    };
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

async function assignTimeslotByAdmin({ competitionId, timeslotId, teamId, adminUserId }) {
  const tx = await db.transaction();

  try {
    const competition = await assertProjectCompetition(competitionId, tx);
    const team = await assertTeamInCompetition(competitionId, teamId, tx);

    const slotRows = await db.query(
      `SELECT timeslot_id, assigned_team_id, start_at, end_at, location_details
       FROM competition_timeslots
       WHERE timeslot_id = ? AND competition_id = ?
       FOR UPDATE`,
      {
        replacements: [timeslotId, competitionId],
        type: db.QueryTypes.SELECT,
        transaction: tx
      }
    );

    if (!slotRows || slotRows.length === 0) {
      throw createHttpError(404, 'Timeslot not found');
    }

    await db.query(
      `UPDATE competition_timeslots
       SET assigned_team_id = NULL,
           assigned_by_admin_user_id = NULL,
           assignment_source = 'none',
           assigned_at = NULL
       WHERE competition_id = ?
         AND assigned_team_id = ?
         AND timeslot_id <> ?`,
      {
        replacements: [competitionId, teamId, timeslotId],
        type: db.QueryTypes.UPDATE,
        transaction: tx
      }
    );

    await db.query(
      `UPDATE competition_timeslots
       SET assigned_team_id = ?,
           assigned_by_admin_user_id = ?,
           assignment_source = 'admin_assignment',
           assigned_at = NOW(),
           is_published = 1
       WHERE timeslot_id = ?`,
      {
        replacements: [teamId, adminUserId, timeslotId],
        type: db.QueryTypes.UPDATE,
        transaction: tx
      }
    );

    await tx.commit();

    return {
      competition,
      team,
      slot: slotRows[0]
    };
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

async function unassignTimeslotByAdmin({ competitionId, timeslotId }) {
  await assertProjectCompetition(competitionId);

  const rows = await db.query(
    `SELECT assigned_team_id FROM competition_timeslots
     WHERE timeslot_id = ? AND competition_id = ?
     LIMIT 1`,
    {
      replacements: [timeslotId, competitionId],
      type: db.QueryTypes.SELECT
    }
  );

  if (!rows || rows.length === 0) {
    throw createHttpError(404, 'Timeslot not found');
  }

  await db.query(
    `UPDATE competition_timeslots
     SET assigned_team_id = NULL,
         assigned_by_admin_user_id = NULL,
         assignment_source = 'none',
         assigned_at = NULL
     WHERE timeslot_id = ?`,
    {
      replacements: [timeslotId],
      type: db.QueryTypes.UPDATE
    }
  );
}

module.exports = {
  createHttpError,
  assertProjectCompetition,
  buildTeamSelectionLinks,
  createTimeslot,
  listCompetitionTimeslots,
  updateTimeslot,
  deleteTimeslot,
  getSelectionView,
  selectTimeslotByToken,
  assignTimeslotByAdmin,
  unassignTimeslotByAdmin,
  getTeamMemberEmails,
  formatDateForEmail
};
