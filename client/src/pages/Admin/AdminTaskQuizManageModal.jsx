import React, { useState, useEffect, useCallback } from 'react';
import { MdClose } from 'react-icons/md';
import ApiService from '../../services/api';

function taskReferenceImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const s = url.trim();
  return /^https?:\/\//i.test(s) ? s : null;
}

/**
 * Admin: define ordered tasks for a task_quiz competition (title, description, optional reference image URL).
 */
const AdminTaskQuizManageModal = ({ competition, onClose, setAlert }) => {
  const competitionId = competition?.competition_id;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', position: '', assets_url: '' });
  const [urlDrafts, setUrlDrafts] = useState({});
  /** Per-task drafts for PUT (title, description, position) — synced from server on reload. */
  const [taskEdits, setTaskEdits] = useState({});

  const reload = useCallback(async () => {
    if (!competitionId) return;
    setLoading(true);
    try {
      const list = await ApiService.getCompetitionTasks(competitionId);
      setTasks(Array.isArray(list) ? list : []);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to load tasks' });
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [competitionId, setAlert]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const urls = {};
    const edits = {};
    tasks.forEach((t) => {
      urls[t.task_id] = t.assets_url || '';
      edits[t.task_id] = {
        title: t.title || '',
        description: t.description ?? '',
        position: t.position != null ? String(t.position) : '0'
      };
    });
    setUrlDrafts(urls);
    setTaskEdits(edits);
  }, [tasks]);

  const saveTaskDetails = async (taskId) => {
    const ed = taskEdits[taskId];
    if (!ed) return;
    const title = (ed.title || '').trim();
    if (!title) {
      setAlert({ type: 'error', message: 'Task title cannot be empty' });
      return;
    }
    const pos = parseInt(ed.position, 10);
    if (Number.isNaN(pos) || pos < 0) {
      setAlert({ type: 'error', message: 'Position must be a non-negative number' });
      return;
    }
    setBusy(true);
    try {
      await ApiService.updateAdminCompetitionTask(taskId, {
        title,
        description: (ed.description || '').trim() || null,
        position: pos
      });
      setAlert({ type: 'success', message: 'Task details saved.' });
      await reload();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to save task' });
    } finally {
      setBusy(false);
    }
  };

  const saveTaskAssetsUrl = async (taskId) => {
    const raw = (urlDrafts[taskId] ?? '').trim();
    setBusy(true);
    try {
      await ApiService.updateAdminCompetitionTask(taskId, { assets_url: raw || null });
      setAlert({ type: 'success', message: 'Reference image URL saved.' });
      await reload();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to save URL' });
    } finally {
      setBusy(false);
    }
  };

  const addTask = async () => {
    const title = (newTask.title || '').trim();
    if (!title) {
      setAlert({ type: 'error', message: 'Task title is required' });
      return;
    }
    setBusy(true);
    try {
      await ApiService.createAdminCompetitionTask(competitionId, {
        title,
        description: (newTask.description || '').trim() || null,
        position: newTask.position === '' ? undefined : Number(newTask.position),
        assets_url: (newTask.assets_url || '').trim() || null
      });
      setNewTask({ title: '', description: '', position: '', assets_url: '' });
      setAlert({ type: 'success', message: 'Task added.' });
      await reload();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to add task' });
    } finally {
      setBusy(false);
    }
  };

  const removeTask = async (taskId) => {
    if (!window.confirm('Delete this task? Submissions linked to it may become inconsistent.')) return;
    setBusy(true);
    try {
      await ApiService.deleteAdminCompetitionTask(taskId);
      setAlert({ type: 'success', message: 'Task removed.' });
      await reload();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="AdminPanel__modalOverlay" onClick={onClose}>
      <div
        className="AdminPanel__modalContent AdminPanel__modalContent--large AdminPanel__quizModal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="AdminPanel__modalHeader">
          <div>
            <h3>Manage task quiz</h3>
            <p className="AdminPanel__quizModalSub">{competition?.title}</p>
          </div>
          <button type="button" className="AdminPanel__modalClose" onClick={onClose} aria-label="Close">
            <MdClose />
          </button>
        </div>

        {loading ? (
          <div className="AdminPanel__loading">Loading tasks…</div>
        ) : (
          <div className="AdminPanel__quizModalBody">
            <p className="AdminPanel__quizHint">
              Teams register the same way as other competitions. Each task has its own submission (ZIP and/or
              links per competition settings). <strong>Auto / hybrid</strong> evaluation runs when a ZIP is
              uploaded (same pipeline as project submissions).
            </p>

            <div className="AdminPanel__quizNewQuestion">
              <h4>Add task</h4>
              <label className="AdminPanel__formGroup">
                Title *
                <input
                  value={newTask.title}
                  disabled={busy}
                  onChange={(e) => setNewTask((n) => ({ ...n, title: e.target.value }))}
                  placeholder="e.g. Build landing page"
                />
              </label>
              <label className="AdminPanel__formGroup">
                Description
                <textarea
                  rows={3}
                  value={newTask.description}
                  disabled={busy}
                  onChange={(e) => setNewTask((n) => ({ ...n, description: e.target.value }))}
                  placeholder="Instructions for participants"
                />
              </label>
              <label className="AdminPanel__formGroup">
                Position (optional)
                <input
                  type="number"
                  min="0"
                  value={newTask.position}
                  disabled={busy}
                  onChange={(e) => setNewTask((n) => ({ ...n, position: e.target.value }))}
                  placeholder="Auto if empty"
                />
              </label>
              <label className="AdminPanel__formGroup">
                Reference image URL (optional)
                <input
                  type="url"
                  value={newTask.assets_url}
                  disabled={busy}
                  onChange={(e) => setNewTask((n) => ({ ...n, assets_url: e.target.value }))}
                  placeholder="https://… (illustration or design to aim for)"
                />
              </label>
              <button type="button" className="AdminPanel__addBtn" disabled={busy} onClick={addTask}>
                Add task
              </button>
            </div>

            <div className="AdminPanel__quizQuestionList">
              <h4>Tasks ({tasks.length})</h4>
              {tasks.length === 0 ? (
                <p className="AdminPanel__emptyState">No tasks yet.</p>
              ) : (
                tasks.map((t) => (
                  <div key={t.task_id} className="AdminPanel__quizQuestionCard">
                    <div className="AdminPanel__quizQuestionCardHead">
                      <span className="AdminPanel__badge AdminPanel__badge--open">Task</span>
                      <span className="AdminPanel__quizMeta">id {t.task_id}</span>
                    </div>
                    <label className="AdminPanel__formGroup">
                      Title *
                      <input
                        value={taskEdits[t.task_id]?.title ?? ''}
                        disabled={busy}
                        onChange={(e) =>
                          setTaskEdits((prev) => {
                            const cur = prev[t.task_id] ?? {
                              title: t.title || '',
                              description: t.description ?? '',
                              position: String(t.position ?? 0)
                            };
                            return { ...prev, [t.task_id]: { ...cur, title: e.target.value } };
                          })
                        }
                      />
                    </label>
                    <label className="AdminPanel__formGroup">
                      Description
                      <textarea
                        rows={3}
                        value={taskEdits[t.task_id]?.description ?? ''}
                        disabled={busy}
                        onChange={(e) =>
                          setTaskEdits((prev) => {
                            const cur = prev[t.task_id] ?? {
                              title: t.title || '',
                              description: t.description ?? '',
                              position: String(t.position ?? 0)
                            };
                            return { ...prev, [t.task_id]: { ...cur, description: e.target.value } };
                          })
                        }
                        placeholder="Instructions for participants"
                      />
                    </label>
                    <label className="AdminPanel__formGroup">
                      Position (sort order)
                      <input
                        type="number"
                        min="0"
                        value={taskEdits[t.task_id]?.position ?? '0'}
                        disabled={busy}
                        onChange={(e) =>
                          setTaskEdits((prev) => {
                            const cur = prev[t.task_id] ?? {
                              title: t.title || '',
                              description: t.description ?? '',
                              position: String(t.position ?? 0)
                            };
                            return { ...prev, [t.task_id]: { ...cur, position: e.target.value } };
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="AdminPanel__addBtn"
                      disabled={busy}
                      onClick={() => saveTaskDetails(t.task_id)}
                    >
                      Save task details
                    </button>
                    {taskReferenceImageUrl(t.assets_url) ? (
                      <div style={{ marginTop: 10 }}>
                        <img
                          src={taskReferenceImageUrl(t.assets_url)}
                          alt={`Reference for ${t.title}`}
                          style={{
                            maxWidth: '100%',
                            maxHeight: 160,
                            objectFit: 'contain',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.12)'
                          }}
                        />
                      </div>
                    ) : null}
                    <label className="AdminPanel__formGroup" style={{ marginTop: 12 }}>
                      Reference image URL
                      <input
                        type="url"
                        value={urlDrafts[t.task_id] ?? ''}
                        disabled={busy}
                        onChange={(e) =>
                          setUrlDrafts((d) => ({ ...d, [t.task_id]: e.target.value }))
                        }
                        placeholder="https://…"
                      />
                    </label>
                    {t.assets_url && !taskReferenceImageUrl(t.assets_url) ? (
                      <p className="AdminPanel__quizHint" style={{ marginTop: 6 }}>
                        Preview requires a URL starting with <code>http://</code> or <code>https://</code>. The
                        value is still stored.
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="AdminPanel__addBtn"
                      style={{ marginTop: 8 }}
                      disabled={busy}
                      onClick={() => saveTaskAssetsUrl(t.task_id)}
                    >
                      Save reference URL
                    </button>
                    <div className="AdminPanel__quizQuestionActions">
                      <button
                        type="button"
                        className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                        disabled={busy}
                        onClick={() => removeTask(t.task_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTaskQuizManageModal;
