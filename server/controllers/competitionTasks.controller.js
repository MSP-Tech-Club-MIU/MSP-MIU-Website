const { Competition, CompetitionTask } = require('../models');

function num(v, fallback = 0) {
  if (v == null) return fallback;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Optional reference image URL; null if empty. Max 500 chars (DB column). */
function normAssetsUrl(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.length > 500 ? s.slice(0, 500) : s;
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
      return res.status(200).json({ success: true, data: [] });
    }
    const tasks = await CompetitionTask.findAll({
      where: { competition_id: competition.competition_id },
      order: [['position', 'ASC'], ['task_id', 'ASC']]
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
      }))
    });
  } catch (err) {
    console.error('getCompetitionTasksPublic:', err);
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
    console.error('postAdminCompetitionTask:', err);
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
    console.error('putAdminCompetitionTask:', err);
    return res.status(500).json({ success: false, error: 'Failed to update task' });
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
    console.error('deleteAdminCompetitionTask:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
}

module.exports = {
  getCompetitionTasksPublic,
  postAdminCompetitionTask,
  putAdminCompetitionTask,
  deleteAdminCompetitionTask
};
