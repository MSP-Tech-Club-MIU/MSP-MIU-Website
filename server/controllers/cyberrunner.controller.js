const { Op } = require('sequelize');
const { CyberRunnerScore, User } = require('../models');
const logger = require('../utils/logger');

const SPONSOR_INFO = {
  name: 'SCNT.eg',
  brand: 'SCNT.eg Fragrances',
  tagline: 'Luxury Homegrown Fragrances',
  instagramUrl: 'https://www.instagram.com/scnt.eg/',
  giveawayUrl: 'https://www.instagram.com/scnt.eg/',
  handle: '@scnt.eg',
  description: 'Homegrown Egyptian fragrance brand dedicated to long-lasting luxury perfumes and distinct personal scents.',
  giveawayTitle: 'Daily Top Score Perfume Giveaway',
  giveawayDetails: 'Every day, the player with the #1 top score in CyberRunner wins an exclusive fragrance giveaway from SCNT.eg!',
  qrPrompt: 'Scan with your camera or tap to participate in the giveaway & explore SCNT.eg fragrances on Instagram'
};

function getCairoDateString(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    return new Date(d.getTime() + 2 * 3600 * 1000).toISOString().split('T')[0];
  }
}

function getMonthDateRange(yearMonth) {
  const parts = String(yearMonth || '').split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(y) || Number.isNaN(m) || m < 1 || m > 12) {
    const today = getCairoDateString();
    return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
  }
  const lastDay = new Date(y, m, 0).getDate();
  const yearStr = String(y).padStart(4, '0');
  const monthStr = String(m).padStart(2, '0');
  const lastDayStr = String(lastDay).padStart(2, '0');
  return {
    startDate: `${yearStr}-${monthStr}-01`,
    endDate: `${yearStr}-${monthStr}-${lastDayStr}`
  };
}

function getYearDateRange(yearStr) {
  const y = parseInt(yearStr, 10);
  if (Number.isNaN(y) || y < 2000 || y > 2100) {
    const currentYear = getCairoDateString().slice(0, 4);
    return {
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`
    };
  }
  const safeYear = String(y).padStart(4, '0');
  return {
    startDate: `${safeYear}-01-01`,
    endDate: `${safeYear}-12-31`
  };
}

function getCairoResetCountdown() {
  const now = new Date();
  try {
    const timeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    }).formatToParts(now);

    const hour = parseInt(timeParts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(timeParts.find((p) => p.type === 'minute')?.value || '0', 10);
    const second = parseInt(timeParts.find((p) => p.type === 'second')?.value || '0', 10);

    const secondsUntilMidnight = Math.max(0, 24 * 3600 - (hour * 3600 + minute * 60 + second));
    const resetTimestamp = new Date(now.getTime() + secondsUntilMidnight * 1000).toISOString();

    return {
      resetTimestamp,
      secondsRemaining: secondsUntilMidnight
    };
  } catch {
    const fallbackSec = 24 * 3600 - ((now.getUTCHours() + 2) % 24 * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds());
    return {
      resetTimestamp: new Date(now.getTime() + fallbackSec * 1000).toISOString(),
      secondsRemaining: Math.max(0, fallbackSec)
    };
  }
}

let tableEnsured = false;
async function ensureCyberRunnerTable() {
  if (tableEnsured) return;
  try {
    await CyberRunnerScore.sync();
    tableEnsured = true;
  } catch (err) {
    // Safe fallback if already exists or sync error
  }
}

function formatInstagram(contact) {
  if (!contact) return null;
  const raw = String(contact).trim();
  if (!raw) return null;
  // If full Instagram URL
  const match = raw.match(/(?:instagram\.com\/|instagr\.am\/)([a-zA-Z0-9._]+)/i);
  if (match) return `@${match[1]}`;
  // If already starts with @
  if (raw.startsWith('@')) return raw;
  // If valid handle
  if (/^[a-zA-Z0-9._]{2,30}$/.test(raw) && /[a-zA-Z]/.test(raw)) {
    return `@${raw}`;
  }
  if (raw.includes('@') && raw.includes('.')) {
    const handle = raw.split('@')[0];
    return handle ? `@${handle}` : raw;
  }
  return raw.startsWith('@') ? raw : `@${raw}`;
}

/**
 * Filter out duplicates to return only the best run per player.
 * Deduplicates by player name (case-insensitive) rather than user_id,
 * allowing multiple different players on a shared device/account to appear separately.
 */
function getUniquePlayerBests(scores, limit = 10) {
  const seen = new Set();
  const unique = [];
  for (const s of scores) {
    const rawName = s.player_name ? String(s.player_name).trim().toLowerCase() : '';
    const key = rawName ? `p_${rawName}` : (s.score_id ? `s_${s.score_id}` : '');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
      if (unique.length >= limit) break;
    }
  }
  return unique;
}

/**
 * GET /api/game/cyberrunner/leaderboard
 * Fetches rankings filtered by Day, Month, Year, or All-Time.
 * Supports query params:
 *   - period: 'day' | 'month' | 'year' | 'all' (default: 'day')
 *   - date: YYYY-MM-DD (for period='day', default: Cairo today)
 *   - month: YYYY-MM (for period='month', default: Cairo current month)
 *   - year: YYYY (for period='year', default: Cairo current year)
 *   - limit: max number of unique players (default: 10, max: 100)
 */
const getLeaderboard = async (req, res) => {
  try {
    await ensureCyberRunnerTable();

    const cairoToday = getCairoDateString();
    const periodRaw = String(req.query.period || 'day').toLowerCase();
    const period = ['day', 'month', 'year', 'all'].includes(periodRaw)
      ? periodRaw
      : 'day';

    const requestedDate = req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : cairoToday;

    const requestedMonth = req.query.month && /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : cairoToday.slice(0, 7);

    const requestedYear = req.query.year && /^\d{4}$/.test(String(req.query.year))
      ? String(req.query.year)
      : cairoToday.slice(0, 4);

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));

    // Construct filter for selected period
    const periodWhere = { is_verified: true };
    let filterValue = requestedDate;

    if (period === 'day') {
      periodWhere.played_date = requestedDate;
      filterValue = requestedDate;
    } else if (period === 'month') {
      const { startDate, endDate } = getMonthDateRange(requestedMonth);
      periodWhere.played_date = { [Op.between]: [startDate, endDate] };
      filterValue = requestedMonth;
    } else if (period === 'year') {
      const { startDate, endDate } = getYearDateRange(requestedYear);
      periodWhere.played_date = { [Op.between]: [startDate, endDate] };
      filterValue = requestedYear;
    } else if (period === 'all') {
      filterValue = 'all-time';
    }

    const fetchLimit = period === 'day' ? 100 : 300;

    const isTodayQuery = period === 'day' && requestedDate === cairoToday;
    const isAllTimeQuery = period === 'all';

    const queries = [
      CyberRunnerScore.findAll({
        where: periodWhere,
        order: [
          ['score', 'DESC'],
          ['created_at', 'ASC']
        ],
        limit: fetchLimit
      })
    ];

    if (isTodayQuery) {
      queries.push(Promise.resolve(null));
    } else {
      queries.push(
        CyberRunnerScore.findAll({
          where: {
            played_date: cairoToday,
            is_verified: true
          },
          order: [
            ['score', 'DESC'],
            ['created_at', 'ASC']
          ],
          limit: 60
        })
      );
    }

    if (isAllTimeQuery) {
      queries.push(Promise.resolve(null));
    } else {
      queries.push(
        CyberRunnerScore.findAll({
          where: { is_verified: true },
          order: [
            ['score', 'DESC'],
            ['created_at', 'ASC']
          ],
          limit: 60
        })
      );
    }

    const [periodRunsRaw, todayRunsRaw, allTimeRunsRaw] = await Promise.all(queries);
    const periodRuns = periodRunsRaw || [];
    const todayRuns = isTodayQuery ? periodRuns : (todayRunsRaw || []);
    const allTimeRuns = isAllTimeQuery ? periodRuns : (allTimeRunsRaw || []);

    const uniquePeriod = getUniquePlayerBests(periodRuns, limit);
    const uniqueToday = getUniquePlayerBests(todayRuns, limit);
    const uniqueAllTime = getUniquePlayerBests(allTimeRuns, limit);

    const mapScoreItem = (s, idx) => ({
      rank: idx + 1,
      scoreId: s.score_id,
      playerName: s.player_name || 'Anonymous Runner',
      instagram: formatInstagram(s.player_contact),
      score: s.score,
      level: s.level,
      tokens: s.tokens,
      maxCombo: s.max_combo,
      playedDate: s.played_date,
      createdAt: s.created_at,
      isChampion: idx === 0
    });

    const periodChampion = uniquePeriod.length > 0 ? {
      ...mapScoreItem(uniquePeriod[0], 0),
      isDailyWinner: period === 'day' && requestedDate === cairoToday
    } : null;

    // Today's Daily Champion is the #1 player of today
    const dailyChampion = uniqueToday.length > 0 ? {
      ...mapScoreItem(uniqueToday[0], 0),
      isDailyWinner: true
    } : null;

    const allTimeChampion = uniqueAllTime.length > 0 ? {
      ...mapScoreItem(uniqueAllTime[0], 0)
    } : null;

    const countdown = getCairoResetCountdown();

    return res.status(200).json({
      success: true,
      data: {
        period,
        filterValue,
        currentDate: requestedDate,
        currentMonth: requestedMonth,
        currentYear: requestedYear,
        cairoToday,
        periodChampion,
        dailyChampion,
        allTimeChampion,
        scores: uniquePeriod.map(mapScoreItem),
        todayScores: uniqueToday.map((s, idx) => ({
          ...mapScoreItem(s, idx),
          isDailyChampion: idx === 0
        })),
        allTimeScores: uniqueAllTime.map(mapScoreItem),
        totalPeriodRuns: periodRuns.length,
        totalPeriodPlayers: uniquePeriod.length,
        totalTodayRuns: todayRuns.length,
        totalTodayPlayers: uniqueToday.length,
        countdown,
        sponsor: SPONSOR_INFO
      }
    });
  } catch (error) {
    logger.error('Error fetching CyberRunner leaderboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve CyberRunner leaderboard'
    });
  }
};

/**
 * POST /api/game/cyberrunner/score
 * Submits a new score to the persistent leaderboard.
 */
const submitScore = async (req, res) => {
  try {
    await ensureCyberRunnerTable();

    const {
      score,
      level = 1,
      tokens = 0,
      maxCombo = 0,
      runDuration = 0,
      playerName,
      playerContact,
      studentId
    } = req.body;

    const parsedScore = parseInt(score, 10);
    if (isNaN(parsedScore) || parsedScore < 0) {
      return res.status(400).json({
        success: false,
        error: 'A valid non-negative score is required'
      });
    }

    // Determine player name
    let resolvedName = String(playerName || '').trim();
    let resolvedUserId = null;
    let resolvedStudentId = studentId ? String(studentId).trim() : null;
    let resolvedContact = playerContact ? String(playerContact).trim() : null;

    if (req.user) {
      resolvedUserId = req.user.user_id;
      const fullName = (req.user.full_name || req.user.username || '').trim();
      if (!resolvedName) {
        resolvedName = fullName || `Runner_${req.user.user_id}`;
      }
      if (!resolvedStudentId && req.user.university_id) {
        resolvedStudentId = req.user.university_id;
      }
      if (!resolvedContact && req.user.email) {
        resolvedContact = req.user.email;
      }
    }

    if (!resolvedName || resolvedName.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Player name must be at least 2 characters long'
      });
    }

    if (resolvedName.length > 50) {
      resolvedName = resolvedName.substring(0, 50);
    }

    // Basic sanity checks against impossible scores
    const parsedLevel = Math.max(1, parseInt(level, 10) || 1);
    const parsedTokens = Math.max(0, parseInt(tokens, 10) || 0);
    const parsedCombo = Math.max(0, parseInt(maxCombo, 10) || 0);
    const parsedDuration = Math.max(0, parseInt(runDuration, 10) || 0);

    const cairoDate = getCairoDateString();

    // Check current top score for today before saving
    const currentTodayTop = await CyberRunnerScore.findOne({
      where: {
        played_date: cairoDate,
        is_verified: true
      },
      order: [['score', 'DESC']]
    });

    const isNewDailyChampion = !currentTodayTop || parsedScore > currentTodayTop.score;

    // Create the score record
    const created = await CyberRunnerScore.create({
      player_name: resolvedName,
      player_contact: resolvedContact,
      student_id: resolvedStudentId,
      user_id: resolvedUserId,
      score: parsedScore,
      level: parsedLevel,
      tokens: parsedTokens,
      max_combo: parsedCombo,
      run_duration: parsedDuration,
      played_date: cairoDate,
      is_verified: true
    });

    // Compute rank today
    const higherScoresToday = await CyberRunnerScore.count({
      where: {
        played_date: cairoDate,
        is_verified: true,
        score: {
          [Op.gt]: parsedScore
        }
      }
    });
    const rankToday = higherScoresToday + 1;

    // Compute rank all-time
    const higherScoresAllTime = await CyberRunnerScore.count({
      where: {
        is_verified: true,
        score: {
          [Op.gt]: parsedScore
        }
      }
    });
    const rankAllTime = higherScoresAllTime + 1;

    logger.info('CyberRunner score submitted', {
      scoreId: created.score_id,
      player: resolvedName,
      score: parsedScore,
      rankToday,
      isNewDailyChampion
    });

    return res.status(201).json({
      success: true,
      message: isNewDailyChampion
        ? 'Incredible! You have set the new Top Score of the Day and are currently in first place for the SCNT.eg giveaway!'
        : 'Score recorded successfully on the leaderboard!',
      data: {
        scoreId: created.score_id,
        playerName: created.player_name,
        score: created.score,
        level: created.level,
        rankToday,
        rankAllTime,
        isDailyChampion: rankToday === 1,
        isNewDailyChampion,
        playedDate: created.played_date,
        sponsor: SPONSOR_INFO
      }
    });
  } catch (error) {
    logger.error('Error submitting CyberRunner score:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record CyberRunner score'
    });
  }
};

/**
 * GET /api/game/cyberrunner/daily-champion
 * Quick lightweight endpoint for header ribbons and ticker info.
 */
const getDailyChampion = async (req, res) => {
  try {
    await ensureCyberRunnerTable();
    const cairoDate = getCairoDateString();

    const topScore = await CyberRunnerScore.findOne({
      where: {
        played_date: cairoDate,
        is_verified: true
      },
      order: [
        ['score', 'DESC'],
        ['created_at', 'ASC']
      ]
    });

    const countdown = getCairoResetCountdown();

    return res.status(200).json({
      success: true,
      data: {
        date: cairoDate,
        dailyChampion: topScore ? {
          scoreId: topScore.score_id,
          playerName: topScore.player_name || 'Anonymous Runner',
          instagram: formatInstagram(topScore.player_contact),
          score: topScore.score,
          level: topScore.level,
          playedDate: topScore.played_date
        } : null,
        countdown,
        sponsor: SPONSOR_INFO
      }
    });
  } catch (error) {
    logger.error('Error getting daily champion:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve daily champion'
    });
  }
};

/**
 * Admin Endpoints
 * GET /api/game/cyberrunner/admin/scores
 */
const getAdminScores = async (req, res) => {
  try {
    await ensureCyberRunnerTable();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.date) {
      where.played_date = req.query.date;
    }
    if (req.query.search) {
      where.player_name = {
        [Op.like]: `%${req.query.search}%`
      };
    }

    const { rows: scores, count: total } = await CyberRunnerScore.findAndCountAll({
      where,
      order: [
        ['played_date', 'DESC'],
        ['score', 'DESC'],
        ['created_at', 'DESC']
      ],
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email', 'university_id'],
          required: false
        }
      ]
    });

    return res.status(200).json({
      success: true,
      data: scores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Admin error fetching CyberRunner scores:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch CyberRunner scores'
    });
  }
};

/**
 * DELETE /api/game/cyberrunner/admin/scores/:id
 */
const deleteScore = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await CyberRunnerScore.destroy({
      where: { score_id: id }
    });

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Score not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Score removed successfully'
    });
  } catch (error) {
    logger.error('Admin error deleting CyberRunner score:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete score'
    });
  }
};

module.exports = {
  SPONSOR_INFO,
  getLeaderboard,
  submitScore,
  getDailyChampion,
  getAdminScores,
  deleteScore,
  getUniquePlayerBests,
  getCairoDateString,
  getMonthDateRange,
  getYearDateRange
};
