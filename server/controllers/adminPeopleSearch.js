const { Op } = require('sequelize');
const { Board, Member, User, Season } = require('../models');

function likeClause(q) {
  return { [Op.like]: `%${q}%` };
}

function dedupeKey(row) {
  if (row.user_id) return `u:${row.user_id}`;
  if (row.university_id) return `id:${String(row.university_id).trim().toLowerCase()}`;
  if (row.email) return `e:${String(row.email).trim().toLowerCase()}`;
  return `n:${String(row.full_name || '').trim().toLowerCase()}`;
}

/**
 * GET /admin/people-search?q=
 * Search board + members + users for season board linking.
 * Resolves user_id from linked rows or matching User by email / university_id.
 */
const searchPeople = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ success: true, data: [], count: 0 });
    }

    const like = likeClause(q);
    const nameOrIdentity = {
      [Op.or]: [
        { full_name: like },
        { email: like },
        { university_id: like }
      ]
    };

    const [boardRows, memberRows, userRows] = await Promise.all([
      Board.findAll({
        where: nameOrIdentity,
        attributes: [
          'board_id',
          'full_name',
          'email',
          'university_id',
          'user_id',
          'position',
          'department_id',
          'season_id'
        ],
        include: [
          {
            model: Season,
            as: 'season',
            attributes: ['season_id', 'label'],
            required: false
          }
        ],
        order: [['board_id', 'DESC']],
        limit: 25
      }),
      Member.findAll({
        where: nameOrIdentity,
        attributes: [
          'member_id',
          'full_name',
          'email',
          'university_id',
          'user_id',
          'department_id',
          'season_id'
        ],
        include: [
          {
            model: Season,
            as: 'season',
            attributes: ['season_id', 'label'],
            required: false
          }
        ],
        order: [['member_id', 'DESC']],
        limit: 25
      }),
      User.findAll({
        where: {
          [Op.or]: [
            { full_name: like },
            { email: like },
            { university_id: like }
          ]
        },
        attributes: ['user_id', 'full_name', 'email', 'university_id', 'role', 'department_id'],
        order: [['user_id', 'DESC']],
        limit: 25
      })
    ]);

    // Resolve missing user_ids via User lookup by email / university_id
    const emails = new Set();
    const uniIds = new Set();
    for (const row of [...boardRows, ...memberRows]) {
      if (!row.user_id && row.email) emails.add(String(row.email).trim().toLowerCase());
      if (!row.user_id && row.university_id) {
        uniIds.add(String(row.university_id).trim());
      }
    }

    let usersByEmail = new Map();
    let usersByUni = new Map();
    if (emails.size || uniIds.size) {
      const or = [];
      if (emails.size) or.push({ email: { [Op.in]: [...emails] } });
      if (uniIds.size) or.push({ university_id: { [Op.in]: [...uniIds] } });
      const linked = await User.findAll({
        where: { [Op.or]: or },
        attributes: ['user_id', 'email', 'university_id', 'full_name']
      });
      usersByEmail = new Map(
        linked
          .filter((u) => u.email)
          .map((u) => [String(u.email).trim().toLowerCase(), u])
      );
      usersByUni = new Map(
        linked
          .filter((u) => u.university_id)
          .map((u) => [String(u.university_id).trim(), u])
      );
    }

    const resolveUserId = (row) => {
      if (row.user_id) return Number(row.user_id);
      const byEmail = row.email
        ? usersByEmail.get(String(row.email).trim().toLowerCase())
        : null;
      if (byEmail) return Number(byEmail.user_id);
      const byUni = row.university_id
        ? usersByUni.get(String(row.university_id).trim())
        : null;
      if (byUni) return Number(byUni.user_id);
      return null;
    };

    const results = [];
    const seen = new Set();

    const push = (item) => {
      const key = dedupeKey(item);
      if (seen.has(key)) return;
      seen.add(key);
      results.push(item);
    };

    for (const row of boardRows) {
      const json = row.toJSON ? row.toJSON() : row;
      push({
        source: 'board',
        source_label: json.season?.label
          ? `Board · ${json.season.label}`
          : 'Board',
        full_name: json.full_name || '',
        email: json.email || null,
        university_id: json.university_id || null,
        user_id: resolveUserId(json),
        position: json.position || null,
        department_id: json.department_id ?? null,
        season_id: json.season_id ?? null,
        season_label: json.season?.label || null
      });
    }

    for (const row of memberRows) {
      const json = row.toJSON ? row.toJSON() : row;
      push({
        source: 'member',
        source_label: json.season?.label
          ? `Member · ${json.season.label}`
          : 'Member',
        full_name: json.full_name || '',
        email: json.email || null,
        university_id: json.university_id || null,
        user_id: resolveUserId(json),
        position: null,
        department_id: json.department_id ?? null,
        season_id: json.season_id ?? null,
        season_label: json.season?.label || null
      });
    }

    for (const row of userRows) {
      const json = row.toJSON ? row.toJSON() : row;
      push({
        source: 'user',
        source_label: json.role ? `User · ${json.role}` : 'User',
        full_name: json.full_name || '',
        email: json.email || null,
        university_id: json.university_id || null,
        user_id: Number(json.user_id),
        position: null,
        department_id: json.department_id ?? null,
        season_id: null,
        season_label: null
      });
    }

    // Prefer rows that already have a linked user_id
    results.sort((a, b) => {
      const au = a.user_id ? 1 : 0;
      const bu = b.user_id ? 1 : 0;
      if (bu !== au) return bu - au;
      const sourceRank = { board: 0, member: 1, user: 2 };
      return (sourceRank[a.source] ?? 9) - (sourceRank[b.source] ?? 9);
    });

    return res.json({
      success: true,
      data: results.slice(0, 15),
      count: Math.min(results.length, 15)
    });
  } catch (error) {
    console.error('searchPeople error:', error);
    return res.status(500).json({ success: false, error: 'Failed to search people' });
  }
};

module.exports = { searchPeople };
