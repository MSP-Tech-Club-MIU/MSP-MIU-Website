const AdmZip = require('adm-zip');
const { Member, Department, User, Board } = require('../models');
const { Op } = require('sequelize');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { resolveSeasonFilter, seasonInclude, resolveSeasonIdForWrite } = require('../utils/seasonFilter');
const {
  sendActivationEmailForMember,
  sendActivationEmailsToMembers
} = require('../utils/activationEmail');

function hasActiveAccount(user) {
  return Boolean(user && (user.is_active || user.password_hash));
}

async function attachAccountStatus(members) {
  const emails = [...new Set(
    members
      .map((m) => (m.email ? String(m.email).trim() : null))
      .filter(Boolean)
  )];

  const users = emails.length
    ? await User.findAll({
        where: { email: { [Op.in]: emails } },
        attributes: ['user_id', 'email', 'is_active', 'password_hash']
      })
    : [];

  const userByEmail = new Map(
    users.map((u) => [String(u.email).trim().toLowerCase(), u])
  );

  return members.map((member) => {
    const json = typeof member.toJSON === 'function' ? member.toJSON() : { ...member };
    const key = json.email ? String(json.email).trim().toLowerCase() : null;
    const user = key ? userByEmail.get(key) : null;
    return {
      ...json,
      has_active_account: hasActiveAccount(user)
    };
  });
}

const getAllMembers = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, department_id, faculty } = req.query;
    const seasonFilter = await resolveSeasonFilter(req.query);
    const where = { ...seasonFilter.where };

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      where[Op.or] = [
        { full_name: { [Op.like]: q } },
        { email: { [Op.like]: q } },
        { university_id: { [Op.like]: q } }
      ];
    }
    if (department_id) where.department_id = Number(department_id);
    if (faculty) where.faculty = faculty;

    const include = [
      {
        model: Department,
        as: 'department',
        attributes: ['department_id', 'name'],
        required: false
      }
    ];
    if (seasonFilter.includeSeason) {
      include.push(seasonInclude());
    }

    const { rows: members, count: total } = await Member.findAndCountAll({
      where,
      include,
      order: [['joined_at', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    const data = await attachAccountStatus(members);

    res.json({
      success: true,
      data,
      count: data.length,
      pagination: paginationMeta({ page, limit, total })
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Error fetching members:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findByPk(id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['department_id', 'name'],
          required: false
        }
      ]
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

const createMember = async (req, res) => {
  try {
    const {
      full_name,
      email,
      faculty,
      year,
      phone_number,
      department_id,
      university_id,
      schedule,
      user_id
    } = req.body;

    if (!full_name || !String(full_name).trim()) {
      return res.status(400).json({ success: false, error: 'full_name is required' });
    }
    if (!university_id || !String(university_id).trim()) {
      return res.status(400).json({ success: false, error: 'university_id is required' });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ success: false, error: 'email is required' });
    }
    if (!faculty || !String(faculty).trim()) {
      return res.status(400).json({ success: false, error: 'faculty is required' });
    }
    // Member.year is student academic year (1–5), not MSP season
    if (year == null || year === '' || !Number.isFinite(Number(year))) {
      return res.status(400).json({ success: false, error: 'year is required (student year 1–5)' });
    }
    if (!phone_number || !String(phone_number).trim()) {
      return res.status(400).json({ success: false, error: 'phone_number is required' });
    }
    if (department_id == null || department_id === '') {
      return res.status(400).json({ success: false, error: 'department_id is required' });
    }

    const season_id = await resolveSeasonIdForWrite(req.body, req.query);

    const member = await Member.create({
      full_name: String(full_name).trim(),
      email: String(email).trim(),
      faculty: String(faculty).trim(),
      year: Number(year),
      phone_number: String(phone_number).trim(),
      department_id: Number(department_id),
      university_id: String(university_id).trim(),
      schedule: schedule || null,
      user_id: user_id != null && user_id !== '' ? Number(user_id) : null,
      season_id
    });

    res.status(201).json({ success: true, data: member });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Error creating member:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create member' });
  }
};

const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    const allowed = [
      'full_name',
      'email',
      'faculty',
      'year',
      'phone_number',
      'department_id',
      'university_id',
      'schedule'
    ];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (req.body.season_id !== undefined) {
      updates.season_id = await resolveSeasonIdForWrite(req.body, req.query);
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    await member.update(updates);
    await member.reload();
    res.json({ success: true, data: member });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Error updating member:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update member' });
  }
};

const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findByPk(id);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    await member.destroy();

    res.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const cell = String(value).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (/[",\r\n]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function buildMembersCsv(rows) {
  const headers = ['university_id', 'full_name', 'email', 'faculty', 'year'];
  const lines = rows.map((row) =>
    [row.university_id, row.full_name, row.email, row.faculty, row.year]
      .map(escapeCsvCell)
      .join(',')
  );
  return `\uFEFF${[headers.join(','), ...lines].join('\r\n')}`;
}

function sanitizeFilenamePart(value) {
  return String(value || 'Unknown')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Unknown';
}

function resolveExportYearLabel(season) {
  const year =
    season?.start_year ||
    (season?.label ? String(season.label).split('/')[0] : null) ||
    new Date().getFullYear();
  return String(year).length === 2 ? `20${year}` : String(year);
}

/**
 * Export members + board as a ZIP of CSVs, one file per faculty.
 * Board members are merged into the same faculty sheets (no separate board file).
 * Columns: university_id,full_name,email,faculty,year
 */
const exportMembersToCSV = async (req, res) => {
  try {
    const seasonFilter = await resolveSeasonFilter(req.query);
    const where = { ...seasonFilter.where };
    const yearLabel = resolveExportYearLabel(seasonFilter.season);

    const [members, boardMembers] = await Promise.all([
      Member.findAll({
        where,
        attributes: ['university_id', 'full_name', 'email', 'faculty', 'year'],
        order: [
          ['faculty', 'ASC'],
          ['full_name', 'ASC'],
          ['university_id', 'ASC']
        ]
      }),
      Board.findAll({
        where: { ...where },
        attributes: ['university_id', 'full_name', 'email', 'faculty'],
        order: [
          ['sort_order', 'ASC'],
          ['full_name', 'ASC']
        ]
      })
    ]);

    const memberByUniversityId = new Map();
    const memberByEmail = new Map();
    const seenKeys = new Set();
    const byFaculty = new Map();

    const addRow = (row) => {
      const uniId = row.university_id ? String(row.university_id).trim() : '';
      const email = row.email ? String(row.email).trim().toLowerCase() : '';
      const key = uniId
        ? `id:${uniId.toLowerCase()}`
        : email
          ? `email:${email}`
          : `name:${String(row.full_name || '').trim().toLowerCase()}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const faculty = String(row.faculty || '').trim() || 'Unknown';
      if (!byFaculty.has(faculty)) byFaculty.set(faculty, []);
      byFaculty.get(faculty).push({
        university_id: row.university_id || '',
        full_name: row.full_name || '',
        email: row.email || '',
        faculty,
        year: row.year ?? ''
      });
    };

    for (const member of members) {
      const uniId = member.university_id ? String(member.university_id).trim() : '';
      const email = member.email ? String(member.email).trim().toLowerCase() : '';
      if (uniId) memberByUniversityId.set(uniId, member);
      if (email) memberByEmail.set(email, member);
      addRow({
        university_id: member.university_id || '',
        full_name: member.full_name || '',
        email: member.email || '',
        faculty: member.faculty || '',
        year: member.year ?? ''
      });
    }

    for (const board of boardMembers) {
      const uniId = board.university_id ? String(board.university_id).trim() : '';
      const email = board.email ? String(board.email).trim().toLowerCase() : '';
      const matched =
        (uniId && memberByUniversityId.get(uniId)) ||
        (email && memberByEmail.get(email)) ||
        null;

      // Already covered by the members sheet when IDs/emails match
      if (matched) continue;

      addRow({
        university_id: board.university_id || '',
        full_name: board.full_name || '',
        email: board.email || '',
        faculty: board.faculty || 'Unknown',
        year: ''
      });
    }

    if (byFaculty.size === 0) {
      return res.status(404).json({
        success: false,
        error: 'No members or board found for this season'
      });
    }

    const zip = new AdmZip();
    for (const [faculty, rows] of byFaculty) {
      rows.sort((a, b) =>
        String(a.full_name).localeCompare(String(b.full_name)) ||
        String(a.university_id).localeCompare(String(b.university_id))
      );
      const safeFaculty = sanitizeFilenamePart(faculty);
      zip.addFile(
        `MSP - MIU ${safeFaculty} Members ${yearLabel}.csv`,
        Buffer.from(buildMembersCsv(rows), 'utf8')
      );
    }

    const zipBuffer = zip.toBuffer();
    const zipName = `MSP - MIU Members & Board ${yearLabel}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.send(zipBuffer);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Error exporting members/board to CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Send activation emails to members who do not yet have an activated account.
 * Respects season query filters (same as list endpoints).
 * Already-activated members (active user / password set) are skipped.
 */
const sendActivationEmails = async (req, res) => {
  try {
    const seasonFilter = await resolveSeasonFilter(req.query);
    const summary = await sendActivationEmailsToMembers({
      where: { ...seasonFilter.where }
    });

    res.json({
      success: true,
      message: `Sent ${summary.sent} activation email(s). Skipped ${summary.skipped}. Failed ${summary.failed}.`,
      data: summary
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Error sending activation emails:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send activation emails'
    });
  }
};

/**
 * Send an account-creation / activation email to a single member.
 */
const sendActivationEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    const { sendEmail } = await import('../utils/email.mjs');
    const result = await sendActivationEmailForMember(member, sendEmail);

    if (result.skipped) {
      return res.status(400).json({
        success: false,
        error: result.reason || 'Member already has an active account',
        data: result
      });
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send activation email',
        data: result
      });
    }

    res.json({
      success: true,
      message: `Account creation email sent to ${result.email}`,
      data: result
    });
  } catch (error) {
    console.error('Error sending activation email:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send activation email'
    });
  }
};

module.exports = {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  exportMembersToCSV,
  sendActivationEmails,
  sendActivationEmail
};
