const path = require('path');
const multer = require('multer');
const { Competition, CompetitionTask, Quiz } = require('../models');
const { uploadToR2 } = require('../config/cloud');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const logger = require('../utils/logger');

const TASK_ASSET_R2_PREFIX = 'competitions_tasks_assets/';
const ASSETS_URL_MAX_LEN = 2048;

function num(v, fallback = 0) {
  if (v == null) return fallback;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Optional reference asset URL (R2 public URL, etc.); null if empty. */
function normAssetsUrl(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.length > ASSETS_URL_MAX_LEN ? s.slice(0, ASSETS_URL_MAX_LEN) : s;
}

function publicUrlForR2Key(key) {
  const base = String(process.env.R2_PUBLIC_DOMAIN || '').replace(/\/+$/, '');
  if (!base) {
    throw new Error('R2_PUBLIC_DOMAIN is not configured');
  }
  const cleanKey = String(key).replace(/^\/+/, '');
  return `${base}/${cleanKey}`;
}

const uploadCompetitionTaskAssetFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 45 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    const allowed = [
      'pdf',
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'svg',
      'pptx',
      'ppt',
      'docx',
      'doc',
      'xls',
      'xlsx',
      'mp4',
      'webm'
    ];
    if (!ext || !allowed.includes(ext)) {
      return cb(new Error(`Unsupported file type for task asset: .${ext || 'unknown'}`));
    }
    cb(null, true);
  }
}).single('file');

function wrapMulterTaskAsset(req, res, next) {
  uploadCompetitionTaskAssetFile(req, res, (err) => {
    if (err) {
      const msg = err.message || 'Upload failed';
      return res.status(400).json({ success: false, error: msg });
    }
    next();
  });
}

async function loadTaskQuizCompetitionForMutation(competitionId) {
  const cid = parseInt(competitionId, 10);
  if (Number.isNaN(cid)) {
    return { error: 'Invalid competition id', status: 400 };
  }
  const competition = await Competition.findByPk(cid);
  if (!competition) {
    return { error: 'Competition not found', status: 404 };
  }
  if (competition.type !== 'task_quiz') {
    return { error: 'Competition must be of type task_quiz', status: 400 };
  }
  return { competition };
}

async function getCompetitionTasksPublic(req, res) {
  try {
    const cid = parseInt(req.params.id, 10);
    if (Number.isNaN(cid)) {
      return res.status(400).json({ success: false, error: 'Invalid competition id' });
    }
    const competition = await Competition.findByPk(cid);
    if (!competition) {
      return res.status(404).json({ success: false, error: 'Competition not found' });
    }
    if (competition.type !== 'task_quiz') {
      const { page, limit } = parsePagination(req.query);
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        pagination: paginationMeta({ page, limit, total: 0 })
      });
    }

    // Task quiz access rule: allow only after quiz unlocks
    // (quiz.status === 'active' OR quiz.start_at reached).
    const quiz = await Quiz.findOne({ where: { competition_id: competition.competition_id } });
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found for this task quiz competition' });
    }
    const now = new Date();
    const start = new Date(quiz.start_at);
    const unlocked = quiz.status === 'active' || (!Number.isNaN(start.getTime()) && now >= start);
    if (!unlocked) {
      return res.status(403).json({ success: false, error: 'Task quiz is not open yet.' });
    }

    const { page, limit, offset } = parsePagination(req.query);
    const { rows: tasks, count: total } = await CompetitionTask.findAndCountAll({
      where: { competition_id: competition.competition_id },
      order: [['position', 'ASC'], ['task_id', 'ASC']],
      limit,
      offset
    });
    return res.status(200).json({
      success: true,
      data: tasks.map((t) => ({
        task_id: num(t.task_id),
        competition_id: num(t.competition_id),
        title: t.title,
        description: t.description,
        position: num(t.position, 0),
        assets_url: t.assets_url || null
      })),
      count: tasks.length,
      pagination: paginationMeta({ page, limit, total })
    });
  } catch (err) {
    logger.error('getCompetitionTasksPublic:', err);
    return res.status(500).json({ success: false, error: 'Failed to load tasks' });
  }
}

async function getAdminCompetitionTasks(req, res) {
  try {
    const cid = parseInt(req.params.id, 10);
    if (Number.isNaN(cid)) {
      return res.status(400).json({ success: false, error: 'Invalid competition id' });
    }
    const competition = await Competition.findByPk(cid);
    if (!competition) {
      return res.status(404).json({ success: false, error: 'Competition not found' });
    }
    if (competition.type !== 'task_quiz') {
      const { page, limit } = parsePagination(req.query);
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        pagination: paginationMeta({ page, limit, total: 0 })
      });
    }

    // Admin endpoint: no unlock gate, return all tasks
    const { page, limit, offset } = parsePagination(req.query);
    const { rows: tasks, count: total } = await CompetitionTask.findAndCountAll({
      where: { competition_id: competition.competition_id },
      order: [['position', 'ASC'], ['task_id', 'ASC']],
      limit,
      offset
    });
    return res.status(200).json({
      success: true,
      data: tasks.map((t) => ({
        task_id: num(t.task_id),
        competition_id: num(t.competition_id),
        title: t.title,
        description: t.description,
        position: num(t.position, 0),
        assets_url: t.assets_url || null
      })),
      count: tasks.length,
      pagination: paginationMeta({ page, limit, total })
    });
  } catch (err) {
    logger.error('getAdminCompetitionTasks:', err);
    return res.status(500).json({ success: false, error: 'Failed to load tasks' });
  }
}

async function postAdminCompetitionTask(req, res) {
  try {
    const loaded = await loadTaskQuizCompetitionForMutation(req.params.id);
    if (loaded.error) {
      return res.status(loaded.status).json({ success: false, error: loaded.error });
    }
    const { title, description, position, assets_url } = req.body || {};
    const text = String(title || '').trim();
    if (!text) {
      return res.status(400).json({ success: false, error: 'title is required' });
    }
    let pos = position != null ? parseInt(position, 10) : null;
    if (pos == null || Number.isNaN(pos)) {
      const maxRow = await CompetitionTask.findOne({
        where: { competition_id: loaded.competition.competition_id },
        order: [['position', 'DESC']],
        attributes: ['position']
      });
      pos = (maxRow?.position || 0) + 1;
    }
    const task = await CompetitionTask.create({
      competition_id: loaded.competition.competition_id,
      title: text,
      description: description != null ? String(description) : null,
      position: pos,
      assets_url: normAssetsUrl(assets_url)
    });
    return res.status(201).json({
      success: true,
      data: {
        task_id: num(task.task_id),
        competition_id: num(task.competition_id),
        title: task.title,
        description: task.description,
        position: num(task.position, 0),
        assets_url: task.assets_url || null
      }
    });
  } catch (err) {
    logger.error('postAdminCompetitionTask:', err);
    return res.status(500).json({ success: false, error: 'Failed to create task' });
  }
}

async function putAdminCompetitionTask(req, res) {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    if (Number.isNaN(taskId)) {
      return res.status(400).json({ success: false, error: 'Invalid task id' });
    }
    const task = await CompetitionTask.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    const comp = await Competition.findByPk(task.competition_id);
    if (!comp || comp.type !== 'task_quiz') {
      return res.status(400).json({ success: false, error: 'Invalid competition for task' });
    }
    const { title, description, position, assets_url } = req.body || {};
    const updates = {};
    if (title !== undefined) {
      const text = String(title).trim();
      if (!text) {
        return res.status(400).json({ success: false, error: 'title cannot be empty' });
      }
      updates.title = text;
    }
    if (description !== undefined) {
      updates.description = description == null ? null : String(description);
    }
    if (position !== undefined) {
      const p = parseInt(position, 10);
      if (Number.isNaN(p)) {
        return res.status(400).json({ success: false, error: 'Invalid position' });
      }
      updates.position = p;
    }
    if (assets_url !== undefined) {
      updates.assets_url = normAssetsUrl(assets_url);
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    await task.update(updates);
    await task.reload();
    return res.status(200).json({
      success: true,
      data: {
        task_id: num(task.task_id),
        competition_id: num(task.competition_id),
        title: task.title,
        description: task.description,
        position: num(task.position, 0),
        assets_url: task.assets_url || null
      }
    });
  } catch (err) {
    logger.error('putAdminCompetitionTask:', err);
    return res.status(500).json({ success: false, error: 'Failed to update task' });
  }
}

async function postAdminCompetitionTaskAsset(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const taskId = parseInt(req.params.taskId, 10);
    if (Number.isNaN(taskId)) {
      return res.status(400).json({ success: false, error: 'Invalid task id' });
    }
    const task = await CompetitionTask.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    const comp = await Competition.findByPk(task.competition_id);
    if (!comp || comp.type !== 'task_quiz') {
      return res.status(400).json({ success: false, error: 'Invalid competition for task' });
    }
    const ext = path.extname(req.file.originalname) || '';
    const safeBase = path
      .basename(req.file.originalname, ext)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80) || 'asset';
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const key = `${TASK_ASSET_R2_PREFIX}${comp.competition_id}/${taskId}/${unique}_${safeBase}${ext}`;
    await uploadToR2(
      req.file.buffer,
      key,
      req.file.mimetype || 'application/octet-stream'
    );
    const url = publicUrlForR2Key(key);
    await task.update({ assets_url: normAssetsUrl(url) });
    await task.reload();
    return res.status(200).json({
      success: true,
      url: task.assets_url,
      key,
      data: {
        task_id: num(task.task_id),
        competition_id: num(task.competition_id),
        title: task.title,
        description: task.description,
        position: num(task.position, 0),
        assets_url: task.assets_url || null
      }
    });
  } catch (err) {
    logger.error('postAdminCompetitionTaskAsset:', err);
    const msg = err?.message ? String(err.message) : '';
    return res.status(500).json({
      success: false,
      error: msg.includes('R2_PUBLIC_DOMAIN') ? 'Server storage URL is not configured' : 'Failed to upload task asset'
    });
  }
}

async function deleteAdminCompetitionTask(req, res) {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    if (Number.isNaN(taskId)) {
      return res.status(400).json({ success: false, error: 'Invalid task id' });
    }
    const task = await CompetitionTask.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    const comp = await Competition.findByPk(task.competition_id);
    if (!comp || comp.type !== 'task_quiz') {
      return res.status(400).json({ success: false, error: 'Invalid competition for task' });
    }
    await task.destroy();
    return res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (err) {
    logger.error('deleteAdminCompetitionTask:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
}

module.exports = {
  getCompetitionTasksPublic,
  getAdminCompetitionTasks,
  postAdminCompetitionTask,
  putAdminCompetitionTask,
  deleteAdminCompetitionTask,
  postAdminCompetitionTaskAsset,
  wrapMulterTaskAsset
};
