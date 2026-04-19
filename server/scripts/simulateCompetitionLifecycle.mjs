/**
 * E2E simulation: project and/or task_quiz competitions (ZIP submissions + auto evaluation).
 *
 * Usage (from Back-End/server):
 *   node scripts/simulateCompetitionLifecycle.mjs
 *   node scripts/simulateCompetitionLifecycle.mjs --flow project
 *   node scripts/simulateCompetitionLifecycle.mjs --flow task_quiz
 *   node scripts/simulateCompetitionLifecycle.mjs --flow all
 *   node scripts/simulateCompetitionLifecycle.mjs --submission-mode both
 *
 * Task quiz: creates tasks first (admin API if allowed, else SQL), then team, then opens the
 * quiz window (PATCH admin quiz or SQL). Do not set quiz status to `active` before team create
 * — that closes registration in this codebase.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import AdmZip from 'adm-zip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '.env'),
];
envPaths.forEach((p, i) => {
  if (fs.existsSync(p)) dotenv.config({ path: p, override: false });
});
dotenv.config();

const argv = process.argv.slice(2);
function argValue(flag, fallback = null) {
  const i = argv.indexOf(flag);
  if (i === -1) return fallback;
  const next = argv[i + 1];
  if (!next || next.startsWith('--')) return fallback;
  return next;
}

const adminUniversityId = argValue('--admin-university-id', '2023/03479');
const adminPassword = argValue('--admin-password', 'Ahmed32004');
const baseUrl = (argValue('--base-url', `http://127.0.0.1:${process.env.PORT || 3000}/api`) || '').replace(/\/$/, '');
const dryRun = argv.includes('--dry-run');
const submissionModeArg = (argValue('--submission-mode', 'upload') || 'upload').toLowerCase();
if (!['upload', 'both'].includes(submissionModeArg)) {
  console.error('--submission-mode must be upload or both');
  process.exit(1);
}
const flowArg = (argValue('--flow', 'all') || 'all').toLowerCase();
if (!['project', 'task_quiz', 'all'].includes(flowArg)) {
  console.error('--flow must be one of: project, task_quiz, all');
  process.exit(1);
}

const roster = [
  { full_name: 'Sim Leader', university_id: '2023/99001', email: 'simleader2399001@miuegypt.edu.eg', password: 'LeaderPass123!' },
  { full_name: 'Sim Member One', university_id: '2023/99002', email: 'simmemberone2399002@miuegypt.edu.eg', password: 'MemberPass123!' },
  { full_name: 'Sim Member Two', university_id: '2023/99003', email: 'simmembertwo2399003@miuegypt.edu.eg', password: 'MemberPass123!' },
];

function sqlDateTime(d) {
  return new Date(d).toISOString().slice(0, 19).replace('T', ' ');
}

function buildProjectCompetitionPayload(runTag) {
  return {
    title: `Sim Project ${runTag}`,
    description: 'Automated local E2E simulation (project)',
    rules: 'Script-generated.',
    start_at: sqlDateTime(Date.now() - 60 * 60 * 1000),
    end_at: sqlDateTime(Date.now() + 24 * 60 * 60 * 1000),
    min_team_size: 3,
    max_team_size: 3,
    is_team_based: true,
    status: 'open',
    location_type: 'online',
    type: 'project',
    submission_mode: submissionModeArg,
    evaluation_mode: 'auto',
    config: { source: 'simulateCompetitionLifecycle', run_ts: runTag, flow: 'project' },
  };
}

function buildTaskQuizCompetitionPayload(runTag) {
  return {
    title: `Sim TaskQuiz ${runTag}`,
    description: 'Automated local E2E simulation (task_quiz)',
    rules: 'Script-generated task quiz.',
    start_at: sqlDateTime(Date.now() - 60 * 60 * 1000),
    end_at: sqlDateTime(Date.now() + 24 * 60 * 60 * 1000),
    min_team_size: 3,
    max_team_size: 3,
    is_team_based: true,
    status: 'open',
    location_type: 'online',
    type: 'task_quiz',
    submission_mode: submissionModeArg,
    evaluation_mode: 'hybrid',
    config: { source: 'simulateCompetitionLifecycle', run_ts: runTag, flow: 'task_quiz' },
  };
}

async function apiRequest(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { res, json };
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildMinimalEvalZipBuffer() {
  const zip = new AdmZip();
  zip.addFile(
    'index.html',
    Buffer.from(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Sim</title><link rel="stylesheet" href="styles.css"></head><body><h1>Sim</h1><script src="app.js"></script></body></html>`,
      'utf8'
    )
  );
  zip.addFile('styles.css', Buffer.from('body { margin: 0; font-family: system-ui, sans-serif; }\n', 'utf8'));
  zip.addFile('app.js', Buffer.from('console.log("sim");\n', 'utf8'));
  return zip.toBuffer();
}

async function postSubmissionMultipart(leaderToken, fields, zipBuffer) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v != null && v !== '') fd.set(k, String(v));
  }
  const blob = new Blob([zipBuffer], { type: 'application/zip' });
  fd.append('file', blob, 'submission.zip');

  const res = await fetch(`${baseUrl}/submissions`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${leaderToken}`,
    },
    body: fd,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { res, json };
}

async function login(university_id, password) {
  const { res, json } = await apiRequest(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: authHeaders(null),
    body: JSON.stringify({ university_id, password }),
  });
  if (!res.ok || !json?.success || !json?.token) {
    throw new Error(`Login failed for ${university_id}: ${json?.error || res.status}`);
  }
  return json.token;
}

async function ensureUsers(conn) {
  for (const u of roster) {
    const [rows] = await conn.execute(
      'SELECT user_id FROM users WHERE university_id = ? OR email = ? LIMIT 1',
      [u.university_id, u.email]
    );
    const hash = await bcrypt.hash(u.password, 10);
    if (rows.length > 0) {
      await conn.execute(
        `UPDATE users
         SET full_name = ?, university_id = ?, email = ?, password_hash = ?, role = 'member', is_active = 1
         WHERE user_id = ?`,
        [u.full_name, u.university_id, u.email, hash, rows[0].user_id]
      );
      console.log(`Updated existing user ${u.university_id}`);
    } else {
      await conn.execute(
        `INSERT INTO users (full_name, university_id, email, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, 'member', 1)`,
        [u.full_name, u.university_id, u.email, hash]
      );
      console.log(`Created user ${u.university_id}`);
    }
  }
}

async function clearPriorTeamRows(conn, competitionId) {
  const [subRows] = await conn.execute(
    'SELECT submission_id FROM submissions WHERE competition_id = ?',
    [competitionId]
  );
  if (subRows.length > 0) {
    const subIds = subRows.map((r) => r.submission_id);
    await conn.query('DELETE FROM evaluations WHERE submission_id IN (?)', [subIds]);
    await conn.query('DELETE FROM judge_scores WHERE submission_id IN (?)', [subIds]);
  }
  await conn.execute('DELETE FROM submissions WHERE competition_id = ?', [competitionId]);
  const [teamRows] = await conn.execute('SELECT team_id FROM teams WHERE competition_id = ?', [competitionId]);
  if (teamRows.length > 0) {
    const teamIds = teamRows.map((r) => r.team_id);
    await conn.query('DELETE FROM team_invitations WHERE team_id IN (?)', [teamIds]);
    await conn.query('DELETE FROM team_members WHERE team_id IN (?)', [teamIds]);
  }
  await conn.execute('DELETE FROM teams WHERE competition_id = ?', [competitionId]);
}

async function createCompetitionApi(adminToken, payload) {
  const createComp = await apiRequest(`${baseUrl}/competitions`, {
    method: 'POST',
    headers: authHeaders(adminToken),
    body: JSON.stringify(payload),
  });
  if (!createComp.res.ok || !createComp.json?.success) {
    const detail = createComp.json?.details || createComp.json?.error || createComp.res.status;
    throw new Error(`Create competition failed: ${detail}`);
  }
  const row = createComp.json.data;
  console.log(`Competition created: #${row.competition_id} (type=${row.type})`);
  return row.competition_id;
}

async function createTeamGuest(competitionId, teamNameSuffix) {
  const createTeamPayload = {
    competition_id: competitionId,
    team_name: `Auto Team ${teamNameSuffix}`,
    leader_name: roster[0].full_name,
    leader_university_id: roster[0].university_id,
    leader_email: roster[0].email,
    members: roster.slice(1).map((m) => ({
      name: m.full_name,
      university_id: m.university_id,
      email: m.email,
    })),
  };
  const createTeam = await apiRequest(`${baseUrl}/teams`, {
    method: 'POST',
    headers: authHeaders(null),
    body: JSON.stringify(createTeamPayload),
  });
  if (!createTeam.res.ok || !createTeam.json?.success) {
    throw new Error(`Create team failed: ${createTeam.json?.error || createTeam.res.status}`);
  }
  const teamId = createTeam.json.data.team_id;
  console.log(`Team created: #${teamId} (3 members)`);
  return teamId;
}

async function submitZipAsLeader(leaderToken, competitionId, teamId, taskIdOrNull, label) {
  const zipBuffer = buildMinimalEvalZipBuffer();
  const submitType = submissionModeArg === 'both' ? 'zip_and_links' : 'zip';
  const formFields = {
    competition_id: Number(competitionId),
    team_id: Number(teamId),
    submit_type: submitType,
    notes: `Automated simulation: ${label}`,
  };
  if (taskIdOrNull != null) formFields.task_id = Number(taskIdOrNull);
  if (submitType === 'zip_and_links') {
    formFields.repo_url = 'https://github.com/example/local-sim-project';
    formFields.live_url = 'https://example.com/';
  }
  const createSubmission = await postSubmissionMultipart(leaderToken, formFields, zipBuffer);
  if (!createSubmission.res.ok || !createSubmission.json?.success) {
    const detail =
      createSubmission.json?.details || createSubmission.json?.error || createSubmission.res.status;
    throw new Error(`Create submission failed: ${detail}`);
  }
  const sid = createSubmission.json.data.submission_id;
  console.log(
    `Submission ${label}: #${sid} (submit_type=${submitType}, r2_key=${createSubmission.json.data.r2_key || '—'})`
  );
  return sid;
}

async function runEvaluationApi(adminToken, submissionId) {
  const runAuto = await apiRequest(`${baseUrl}/evaluation/run/${submissionId}`, {
    method: 'POST',
    headers: authHeaders(adminToken),
  });
  if (!runAuto.res.ok || !runAuto.json?.success) {
    const detail = runAuto.json?.error || runAuto.json?.details || runAuto.res.status;
    throw new Error(`Auto evaluation failed: ${detail}`);
  }
  const totalAuto =
    runAuto.json?.data?.evaluation?.total_auto_score ?? runAuto.json?.data?.breakdown?.total_auto_score;
  console.log(`Auto evaluation OK for submission #${submissionId}. total_auto_score=${totalAuto}`);
  return totalAuto;
}

async function fetchLeaderboard(competitionId) {
  const leaderboard = await apiRequest(`${baseUrl}/competitions/${competitionId}/leaderboard`);
  if (!leaderboard.res.ok || !leaderboard.json?.success) {
    throw new Error(`Leaderboard fetch failed: ${leaderboard.json?.error || leaderboard.res.status}`);
  }
  return leaderboard.json.data;
}

/** Admin panel: POST /api/admin/competitions/:id/tasks — may 403 if user is not President/VP/Head SWD. */
async function tryCreateTaskViaAdmin(adminToken, competitionId, title, position) {
  return apiRequest(`${baseUrl}/admin/competitions/${competitionId}/tasks`, {
    method: 'POST',
    headers: authHeaders(adminToken),
    body: JSON.stringify({
      title,
      description: `Auto task: ${title}`,
      position,
    }),
  });
}

async function createTasksViaSql(conn, competitionId, specs) {
  const ids = [];
  let pos = 1;
  for (const title of specs) {
    const [r] = await conn.execute(
      `INSERT INTO competition_tasks (competition_id, title, description, position, assets_url)
       VALUES (?, ?, ?, ?, NULL)`,
      [competitionId, title, `SQL task: ${title}`, pos++]
    );
    ids.push(Number(r.insertId));
    console.log(`Task (SQL): #${r.insertId} — ${title}`);
  }
  return ids;
}

/**
 * Creates tasks via admin API when allowed; otherwise inserts rows (local DB).
 * Order matches UI: tasks exist before team/submit.
 */
async function ensureCompetitionTasks(adminToken, conn, competitionId, titles) {
  const taskIds = [];
  let apiOk = true;
  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    const position = i + 1;
    const { res, json } = await tryCreateTaskViaAdmin(adminToken, competitionId, title, position);
    if (res.ok && json?.success && json.data?.task_id) {
      taskIds.push(Number(json.data.task_id));
      console.log(`Task (API): #${json.data.task_id} — ${title}`);
    } else {
      apiOk = false;
      break;
    }
  }
  if (apiOk && taskIds.length === titles.length) return taskIds;

  console.warn(
    `Admin task API unavailable (${apiOk ? 'partial' : '403 or error'}). Using SQL inserts for tasks.`
  );
  await conn.execute('DELETE FROM competition_tasks WHERE competition_id = ?', [competitionId]);
  return createTasksViaSql(conn, competitionId, titles);
}

/** After team exists: widen quiz window so submissions + public /tasks unlock (avoid status=active before team — closes registration). */
async function openQuizWindowForSubmissions(adminToken, conn, competitionId) {
  const start = sqlDateTime(Date.now() - 2 * 60 * 60 * 1000);
  const end = sqlDateTime(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const patch = await apiRequest(`${baseUrl}/admin/competitions/${competitionId}/quiz`, {
    method: 'PATCH',
    headers: authHeaders(adminToken),
    body: JSON.stringify({ start_at: start, end_at: end }),
  });
  if (patch.res.ok && patch.json?.success) {
    console.log(`Quiz window updated (admin PATCH) for competition #${competitionId}`);
    return;
  }
  console.warn('Admin quiz PATCH failed; applying SQL window on quizzes.');
  await conn.execute(
    `UPDATE quizzes
     SET start_at = DATE_SUB(NOW(), INTERVAL 2 HOUR),
         end_at = DATE_ADD(NOW(), INTERVAL 7 DAY)
     WHERE competition_id = ?`,
    [competitionId]
  );
}

async function verifyPublicTasks(competitionId) {
  const { res, json } = await apiRequest(`${baseUrl}/competitions/${competitionId}/tasks`);
  if (!res.ok || !json?.success) {
    throw new Error(`GET /competitions/${competitionId}/tasks failed: ${json?.error || res.status}`);
  }
  const tasks = json.data || [];
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('Public tasks list empty (quiz window or type mismatch)');
  }
  console.log(`Public tasks OK: ${tasks.length} task(s) visible`);
  return tasks;
}

async function runProjectFlow(adminToken, conn, runTag) {
  const competitionId = await createCompetitionApi(adminToken, buildProjectCompetitionPayload(runTag));
  await clearPriorTeamRows(conn, competitionId);
  const teamId = await createTeamGuest(competitionId, `PQ-${runTag}`);
  const leaderToken = await login(roster[0].university_id, roster[0].password);
  console.log(`Leader login succeeded (${roster[0].university_id})`);
  const submissionId = await submitZipAsLeader(leaderToken, competitionId, teamId, null, 'project');
  await runEvaluationApi(adminToken, submissionId);
  const board = await fetchLeaderboard(competitionId);
  return {
    flow: 'project',
    competition_id: competitionId,
    team_id: teamId,
    submission_ids: [submissionId],
    leaderboard_top: Array.isArray(board) ? board[0] : null,
  };
}

async function runTaskQuizFlow(adminToken, conn, runTag) {
  const competitionId = await createCompetitionApi(adminToken, buildTaskQuizCompetitionPayload(runTag));
  await clearPriorTeamRows(conn, competitionId);

  const taskTitles = [`TQ Task A ${runTag}`, `TQ Task B ${runTag}`];
  const taskIds = await ensureCompetitionTasks(adminToken, conn, competitionId, taskTitles);

  const teamId = await createTeamGuest(competitionId, `TQ-${runTag}`);

  await openQuizWindowForSubmissions(adminToken, conn, competitionId);
  await verifyPublicTasks(competitionId);

  const leaderToken = await login(roster[0].university_id, roster[0].password);
  console.log(`Leader login succeeded (${roster[0].university_id})`);

  const submissionIds = [];
  for (const tid of taskIds) {
    const sid = await submitZipAsLeader(leaderToken, competitionId, teamId, tid, `task_quiz task ${tid}`);
    submissionIds.push(sid);
    await runEvaluationApi(adminToken, sid);
  }

  const board = await fetchLeaderboard(competitionId);

  const myEval = await apiRequest(
    `${baseUrl}/evaluation/my-task-quiz/${competitionId}/team/${teamId}`,
    { headers: authHeaders(leaderToken) }
  );
  if (!myEval.res.ok || !myEval.json?.success) {
    console.warn(`my-task-quiz GET: ${myEval.json?.error || myEval.res.status}`);
  }

  return {
    flow: 'task_quiz',
    competition_id: competitionId,
    team_id: teamId,
    task_ids: taskIds,
    submission_ids: submissionIds,
    leaderboard_top: Array.isArray(board) ? board[0] : null,
    my_task_quiz_ok: !!(myEval.res.ok && myEval.json?.success),
    my_task_quiz_phase: myEval.json?.data?.readiness?.phase,
  };
}

async function main() {
  console.log(`API base: ${baseUrl}`);
  console.log(`Flow: ${flowArg} | submission_mode: ${submissionModeArg}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}\n`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await ensureUsers(conn);
    if (dryRun) return;

    const adminToken = await login(adminUniversityId, adminPassword);
    console.log(`Admin login succeeded (${adminUniversityId})\n`);

    const runTag = Date.now();
    const summary = { users: roster.map((u) => ({ university_id: u.university_id, email: u.email, password: u.password })) };

    if (flowArg === 'project' || flowArg === 'all') {
      console.log('--- Project flow ---\n');
      summary.project = await runProjectFlow(adminToken, conn, runTag);
    }
    if (flowArg === 'task_quiz' || flowArg === 'all') {
      console.log('\n--- Task quiz flow ---\n');
      summary.task_quiz = await runTaskQuizFlow(adminToken, conn, runTag + 1);
    }

    console.log('\n=== Simulation complete ===');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\nSimulation failed:', err.message);
  process.exit(1);
});
