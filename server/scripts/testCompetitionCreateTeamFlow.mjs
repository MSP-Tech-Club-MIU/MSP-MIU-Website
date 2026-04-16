/**
 * Exercise the same HTTP flow as the competition "Create team" form:
 *   GET  /api/competitions/:id
 *   POST /api/teams  (same JSON shape as Front-End ApiService.createTeam)
 *
 * Helps debug generic "Failed to create team" (often a 400 with a specific `error`,
 * or a 500 where `details` appears in development).
 *
 * Usage (from Back-End/server):
 *   node scripts/testCompetitionCreateTeamFlow.mjs
 *   node scripts/testCompetitionCreateTeamFlow.mjs --execute
 *   node scripts/testCompetitionCreateTeamFlow.mjs --competition-id 2 --execute --verbose
 *
 *   --execute     Actually POST /teams (default is dry-run: fetch competition + show payload only)
 *   --verbose     Log request JSON
 *   --competition-id  N   Target competition (default: 4, or CREATE_TEAM_TEST_COMPETITION_ID)
 *   --base-url    Override API root (default: CREATE_TEAM_TEST_API_BASE or http://localhost:PORT/api)
 *   --token       Bearer JWT for authenticated leader flow (optional; omit = guest flow like logged-out users)
 *
 * Default test identities (override with env): leader 2023/03479 → john2303479@miuegypt.edu.eg;
 * extra members use 2023/03480, … with different names and the same email rule (first name + YY + XXXXX).
 *
 * Optional env:
 *   CREATE_TEAM_TEST_LEADER_NAME
 *   CREATE_TEAM_TEST_LEADER_UNIVERSITY_ID   (YYYY/XXXXX)
 *   CREATE_TEAM_TEST_LEADER_EMAIL
 *   CREATE_TEAM_TEST_API_BASE               (e.g. https://msp-miu.tech/api)
 *   CREATE_TEAM_TEST_COMPETITION_ID         (default: 4 if --competition-id omitted)
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '.env'),
];
envPaths.forEach((p, i) => {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: i > 0 });
  }
});
dotenv.config();

const argv = process.argv.slice(2);

function argValue(flag) {
  const i = argv.indexOf(flag);
  if (i === -1) return null;
  const next = argv[i + 1];
  if (!next || next.startsWith('--')) return null;
  return next;
}

const competitionIdArg =
  argValue('--competition-id') || process.env.CREATE_TEAM_TEST_COMPETITION_ID || '4';
const execute = argv.includes('--execute');
const verbose = argv.includes('--verbose');
const token = argValue('--token') || process.env.CREATE_TEAM_TEST_JWT || null;
const port = process.env.PORT || '3000';
const defaultBase = `http://127.0.0.1:${port}/api`;
const apiBase = (
  argValue('--base-url') ||
  process.env.CREATE_TEAM_TEST_API_BASE ||
  defaultBase
).replace(/\/$/, '');

function isSoloStyleCompetition(c) {
  return c && (c.is_team_based === false || c.is_team_based === 0);
}

/**
 * MIU convention used in tests: first name (letters only) + last two digits of year + 5-digit segment.
 * Example: "John …" + 2023/03479 → john2303479@miuegypt.edu.eg
 */
function miuEmailFromNameAndUniversityId(displayName, universityId) {
  const m = /^(\d{4})\/(\d{5})$/.exec(String(universityId).trim());
  if (!m) {
    throw new Error(`Invalid university_id for email derivation: ${universityId}`);
  }
  const firstWord = String(displayName).trim().split(/\s+/)[0] || 'user';
  const local = `${firstWord.replace(/[^a-zA-Z]/g, '').toLowerCase() || 'user'}${m[1].slice(-2)}${m[2]}`;
  return `${local}@miuegypt.edu.eg`;
}

/** Fixed roster: same cohort-style IDs, distinct names (emails derived via miuEmailFromNameAndUniversityId). */
const DEFAULT_TEST_ROSTER = [
  { name: 'John Test', university_id: '2023/03479' },
  { name: 'Alice Test', university_id: '2023/03480' },
  { name: 'Bob Test', university_id: '2023/03481' },
  { name: 'Sara Test', university_id: '2023/03482' },
  { name: 'Omar Test', university_id: '2023/03483' },
  { name: 'Nada Test', university_id: '2023/03484' },
  { name: 'Lina Test', university_id: '2023/03485' },
  { name: 'Karim Test', university_id: '2023/03486' },
];

function hintForError(message) {
  if (!message) return '';
  const hints = [
    ['Leader email must be a valid @miuegypt.edu.eg', 'Guest flow: leader must use MIU email domain.'],
    ['Invalid University ID format', 'Use YYYY/XXXXX (e.g. 2023/98765).'],
    ['Competition is not open', 'Competition status must be "open" in the database.'],
    ['already a member of team', 'That user/email already has a team in this competition.'],
    ['Team name already exists', 'Pick another team name for this competition.'],
    ['Team must have at least', 'Backend counts only members with all three fields filled; partial rows are dropped.'],
    ['Team cannot exceed', 'Too many members in payload vs max_team_size.'],
    ['members must be an array', 'Send `members` as a JSON array (can be []).'],
    ['Required fields: competition_id', 'Body must include competition_id and team_name.'],
    [
      'One of the provided emails/university IDs is already assigned',
      'Unique constraint — duplicate email or ID vs another user/invitation.',
    ],
    ['Failed to create team', 'Often HTTP 500: check server logs; in development, JSON may include `details`.'],
  ];
  for (const [needle, hint] of hints) {
    if (message.includes(needle)) return `\n   Hint: ${hint}`;
  }
  return '';
}

function buildSyntheticPayload(competition) {
  const ts = Date.now();
  const solo = isSoloStyleCompetition(competition);

  const leaderSlot = DEFAULT_TEST_ROSTER[0];
  const leaderName =
    process.env.CREATE_TEAM_TEST_LEADER_NAME || leaderSlot.name;
  const leaderUniversityId =
    process.env.CREATE_TEAM_TEST_LEADER_UNIVERSITY_ID || leaderSlot.university_id;
  const leaderEmail =
    process.env.CREATE_TEAM_TEST_LEADER_EMAIL ||
    miuEmailFromNameAndUniversityId(leaderName, leaderUniversityId);

  const teamName = solo
    ? `Solo - ${leaderName} - ${ts}`
    : `Automated Test Team ${ts}`;

  const minSize = Math.max(Number(competition.min_team_size) || 1, 1);
  const maxSize = Math.max(Number(competition.max_team_size) || minSize, minSize);
  const needExtra = solo ? 0 : Math.max(minSize - 1, 0);
  const extras = Math.min(needExtra, Math.max(maxSize - 1, 0));

  const members = [];
  let rosterIndex = 1;
  const usedIds = new Set([leaderUniversityId]);
  const usedEmails = new Set([leaderEmail.toLowerCase()]);

  for (let i = 0; i < extras; i++) {
    while (rosterIndex < DEFAULT_TEST_ROSTER.length) {
      const slot = DEFAULT_TEST_ROSTER[rosterIndex++];
      const email = miuEmailFromNameAndUniversityId(slot.name, slot.university_id);
      if (usedIds.has(slot.university_id) || usedEmails.has(email.toLowerCase())) continue;
      usedIds.add(slot.university_id);
      usedEmails.add(email.toLowerCase());
      members.push({
        name: slot.name,
        university_id: slot.university_id,
        email,
      });
      break;
    }
    if (members.length !== i + 1) {
      const seq = 3487 + i + (ts % 100);
      const suffix = String(seq).padStart(5, '0');
      const university_id = `2023/${suffix}`;
      const name = `Flow Member ${i + 1}`;
      const email = miuEmailFromNameAndUniversityId(name, university_id);
      if (usedIds.has(university_id) || usedEmails.has(email.toLowerCase())) {
        throw new Error('Could not allocate unique test member id/email; extend DEFAULT_TEST_ROSTER.');
      }
      usedIds.add(university_id);
      usedEmails.add(email.toLowerCase());
      members.push({ name, university_id, email });
    }
  }

  return {
    competition_id: competition.competition_id,
    team_name: teamName,
    leader_name: leaderName,
    leader_university_id: leaderUniversityId,
    leader_email: leaderEmail,
    members,
  };
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _parseError: true, raw: text.slice(0, 500) };
  }
  return { res, json, text };
}

async function main() {
  if (!/^\d+$/.test(String(competitionIdArg).trim())) {
    console.error('Invalid --competition-id or CREATE_TEAM_TEST_COMPETITION_ID (expect a positive integer).');
    process.exit(1);
  }
  const competitionId = parseInt(competitionIdArg, 10);

  console.log(`API base: ${apiBase}`);
  console.log(`Competition id: ${competitionId}`);
  console.log(`Mode: ${execute ? 'EXECUTE (will create a real team)' : 'DRY-RUN (no POST)'}`);
  console.log(`Auth: ${token ? 'Bearer token (logged-in leader flow)' : 'none (guest flow)'}\n`);

  const getUrl = `${apiBase}/competitions/${competitionId}`;
  const { res: getRes, json: compJson } = await fetchJson(getUrl);

  if (!getRes.ok) {
    console.error(`GET ${getUrl} -> ${getRes.status}`);
    console.error(JSON.stringify(compJson, null, 2));
    process.exit(1);
  }

  const competition = compJson.data || compJson;
  console.log('Competition (summary):');
  console.log(
    JSON.stringify(
      {
        competition_id: competition.competition_id,
        title: competition.title,
        status: competition.status,
        is_team_based: competition.is_team_based,
        min_team_size: competition.min_team_size,
        max_team_size: competition.max_team_size,
      },
      null,
      2
    )
  );

  const payload = buildSyntheticPayload(competition);
  if (verbose) {
    console.log('\nPOST /teams payload (mirrors client createTeam):');
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log('\nPOST /teams payload (use --verbose for full JSON):');
    console.log(
      JSON.stringify(
        {
          team_name: payload.team_name,
          leader_email: payload.leader_email,
          leader_university_id: payload.leader_university_id,
          members_count: payload.members.length,
        },
        null,
        2
      )
    );
  }

  if (!execute) {
    console.log('\n[DRY-RUN] No request sent. Re-run with --execute to POST (creates DB rows + may send emails).');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const postUrl = `${apiBase}/teams`;
  const { res: postRes, json: postJson } = await fetchJson(postUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  console.log(`\nPOST ${postUrl} -> ${postRes.status}`);
  console.log(JSON.stringify(postJson, null, 2));

  const errMsg = postJson?.error || (postJson?.success === false ? 'Request failed' : '');
  if (!postRes.ok || postJson?.success === false) {
    console.error(hintForError(errMsg));
    if (postJson?.details) {
      console.error(`\n   Server details: ${postJson.details}`);
    }
    process.exit(1);
  }

  console.log('\nOK: Team create flow completed (same path as the competition form).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
