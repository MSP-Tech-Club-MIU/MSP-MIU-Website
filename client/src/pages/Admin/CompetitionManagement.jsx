import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import ApiService from '../../services/api';
import SEO from '../../components/SEO';
import PageLoader from '../../components/PageLoader';
import AdminQuizManageModal from './AdminQuizManageModal';
import AdminTaskQuizManageModal from './AdminTaskQuizManageModal';
import './AdminPanel.css';
import './CompetitionManagement.css';

const emptyCompForm = () => ({
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  registration_deadline: '',
  max_team_size: 4,
  min_team_size: 1,
  max_teams: '',
  status: 'draft',
  location_type: 'on-campus',
  location: '',
  rules: '',
  type: 'project',
  submission_mode: 'upload',
  evaluation_mode: 'manual',
  is_multitask: false,
  is_team_based: true
});

function competitionToForm(comp) {
  return {
    name: comp.title || '',
    description: comp.description || '',
    start_date: comp.start_at ? comp.start_at.split('T')[0] : '',
    end_date: comp.end_at ? comp.end_at.split('T')[0] : '',
    registration_deadline: '',
    max_team_size: comp.max_team_size || 4,
    min_team_size: comp.min_team_size || 1,
    max_teams: '',
    status: comp.status || 'draft',
    location_type: comp.location_type || 'on-campus',
    location: comp.location_details || '',
    rules: comp.rules != null ? String(comp.rules) : '',
    type: comp.type || 'project',
    submission_mode: comp.submission_mode || 'upload',
    evaluation_mode: comp.evaluation_mode || 'manual',
    is_multitask: comp?.config?.multiTask === true,
    is_team_based: !(comp.is_team_based === false || comp.is_team_based === 0)
  };
}

function buildSavePayload(compForm) {
  return {
    title: compForm.name,
    description: compForm.description,
    start_at: compForm.start_date,
    end_at: compForm.end_date,
    max_team_size: compForm.max_team_size,
    min_team_size: compForm.min_team_size,
    status: compForm.status,
    location_type: compForm.location_type || 'on-campus',
    location_details: compForm.location || null,
    rules:
      compForm.rules != null && String(compForm.rules).trim() !== '' ? String(compForm.rules).trim() : '',
    type: compForm.type,
    submission_mode: compForm.type === 'external' ? 'none' : compForm.submission_mode,
    evaluation_mode: compForm.type === 'external' ? 'none' : compForm.evaluation_mode,
    config: compForm.type === 'project' ? { multiTask: !!compForm.is_multitask } : null,
    is_team_based: !!compForm.is_team_based
  };
}

const CompetitionManagement = () => {
  const navigate = useNavigate();
  const { competitionId } = useParams();
  const isEditMode = Boolean(competitionId && /^\d+$/.test(String(competitionId)));

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [compForm, setCompForm] = useState(emptyCompForm);
  const [loadedComp, setLoadedComp] = useState(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showTaskQuizModal, setShowTaskQuizModal] = useState(false);

  useEffect(() => {
    document.body.classList.add('admin-panel-active');
    return () => document.body.classList.remove('admin-panel-active');
  }, []);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(t);
  }, [alert]);

  const loadCompetition = useCallback(async () => {
    const list = await ApiService.getAdminCompetitions();
    const rows = Array.isArray(list) ? list : [];
    const id = parseInt(competitionId, 10);
    const comp = rows.find((c) => Number(c.competition_id) === id);
    if (!comp) {
      setAlert({ type: 'error', message: 'Competition not found.' });
      setCompForm(emptyCompForm());
      setLoadedComp(null);
      return;
    }
    setLoadedComp(comp);
    setCompForm(competitionToForm(comp));
  }, [competitionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!ApiService.isAuthenticated()) {
          if (!cancelled) setLoading(false);
          navigate('/login', { replace: true, state: { from: { pathname: window.location.pathname } } });
          return;
        }
        const result = await ApiService.checkAdminAccess();
        if (!result.success) {
          if (!cancelled) {
            setHasAccess(false);
            setLoading(false);
          }
          return;
        }
        if (!cancelled) setHasAccess(true);

        if (isEditMode) {
          await loadCompetition();
        } else if (!cancelled) {
          setLoadedComp(null);
          setCompForm(emptyCompForm());
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setAlert({ type: 'error', message: err.message || 'Failed to load' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, isEditMode, loadCompetition]);

  const saveCompetition = async () => {
    if (!compForm.name.trim() || !compForm.description.trim()) {
      setAlert({ type: 'error', message: 'Name and description are required.' });
      return;
    }
    if (!compForm.start_date || !compForm.end_date) {
      setAlert({ type: 'error', message: 'Start date and end date are required.' });
      return;
    }
    const data = buildSavePayload(compForm);
    setSaving(true);
    setAlert(null);
    try {
      if (isEditMode && loadedComp) {
        await ApiService.updateAdminCompetition(loadedComp.competition_id, data);
        setAlert({ type: 'success', message: 'Competition updated.' });
        await loadCompetition();
      } else {
        const created = await ApiService.createAdminCompetition(data);
        setAlert({ type: 'success', message: 'Competition created.' });
        if (created?.competition_id) {
          navigate(`/admin/competition-management/${created.competition_id}`, { replace: true });
        } else {
          navigate('/admin/competitions', { replace: false });
        }
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to save competition' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCompetition = async () => {
    if (!loadedComp) return;
    if (!window.confirm(`Delete competition "${loadedComp.title}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await ApiService.deleteAdminCompetition(loadedComp.competition_id);
      navigate('/admin/competitions');
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!hasAccess) {
    return (
      <section className="CompetitionManagement">
        <SEO title="Access denied" description="Admin only." noindex />
        <p>You do not have access to this page.</p>
        <Link to="/">Home</Link>
      </section>
    );
  }

  return (
    <section className="CompetitionManagement">
      <SEO
        title={isEditMode ? 'Edit competition' : 'New competition'}
        description="Manage MSP competition settings (admin)."
        noindex
      />

      {showQuizModal && loadedComp && loadedComp.type === 'quiz' && (
        <AdminQuizManageModal
          competition={loadedComp}
          onClose={() => setShowQuizModal(false)}
          setAlert={setAlert}
        />
      )}
      {showTaskQuizModal && loadedComp && loadedComp.type === 'task_quiz' && (
        <AdminTaskQuizManageModal
          competition={loadedComp}
          onClose={() => setShowTaskQuizModal(false)}
          setAlert={setAlert}
        />
      )}

      <div className="CompetitionManagement__top">
        <div className="CompetitionManagement__titleBlock">
          <button
            type="button"
            className="CompetitionManagement__back"
            onClick={() => navigate('/admin/competitions')}
          >
            <FiArrowLeft size={18} aria-hidden />
            Back to competitions
          </button>
          <h1 style={{ marginTop: 20 }}>
            {isEditMode ? 'Edit competition' : 'Create competition'}
          </h1>
          <p>
            {isEditMode
              ? 'Update every field below, then save. Use the extra actions for quiz and task-quiz tools.'
              : 'Fill in the details, then create. You will be taken to the editor for the new competition.'}
          </p>
        </div>
        <div className="CompetitionManagement__actions">
          <button
            type="button"
            className="CompetitionManagement__btn CompetitionManagement__btn--secondary"
            disabled={saving}
            onClick={() => navigate('/admin/competitions')}
          >
            Cancel
          </button>
          {isEditMode && loadedComp ? (
            <button
              type="button"
              className="CompetitionManagement__btn CompetitionManagement__btn--danger"
              disabled={saving}
              onClick={deleteCompetition}
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            className="CompetitionManagement__btn CompetitionManagement__btn--primary"
            disabled={saving}
            onClick={saveCompetition}
          >
            {saving ? 'Saving…' : isEditMode ? 'Save changes' : 'Create competition'}
          </button>
        </div>
      </div>

      {alert ? (
        <div
          className={`CompetitionManagement__alert CompetitionManagement__alert--${alert.type === 'success' ? 'success' : 'error'}`}
        >
          {alert.message}
        </div>
      ) : null}

      <div className="CompetitionManagement__formCard">
        <div className="AdminPanel__formGroup">
          <label>Name *</label>
          <input
            value={compForm.name}
            onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
            placeholder="Competition name"
          />
        </div>

        <div className="AdminPanel__formGroup">
          <label>Description *</label>
          <textarea
            value={compForm.description}
            onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
            placeholder="Competition description"
            rows={4}
          />
        </div>

        <div className="AdminPanel__formRow">
          <div className="AdminPanel__formGroup">
            <label>Start date *</label>
            <input
              type="date"
              value={compForm.start_date}
              onChange={(e) => setCompForm({ ...compForm, start_date: e.target.value })}
            />
          </div>
          <div className="AdminPanel__formGroup">
            <label>End date *</label>
            <input
              type="date"
              value={compForm.end_date}
              onChange={(e) => setCompForm({ ...compForm, end_date: e.target.value })}
            />
          </div>
        </div>

        <div className="AdminPanel__formRow">
          <div className="AdminPanel__formGroup">
            <label>Competition type</label>
            <select
              value={compForm.type}
              onChange={(e) => setCompForm({ ...compForm, type: e.target.value })}
            >
              <option value="project">Project</option>
              <option value="quiz">Quiz (MCQ / text)</option>
              <option value="task_quiz">Task quiz (ZIP / links per task)</option>
              <option value="external">External</option>
            </select>
          </div>
          <div className="AdminPanel__formGroup">
            <label>Registration deadline</label>
            <input
              type="date"
              value={compForm.registration_deadline}
              onChange={(e) => setCompForm({ ...compForm, registration_deadline: e.target.value })}
            />
          </div>
          <div className="AdminPanel__formGroup">
            <label>Status</label>
            <select
              value={compForm.status}
              onChange={(e) => setCompForm({ ...compForm, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="locked">Locked</option>
              <option value="judging">Judging</option>
              <option value="finished">Finished</option>
            </select>
          </div>
        </div>

        <div className="AdminPanel__formRow">
          <div className="AdminPanel__formGroup">
            <label>Submission mode</label>
            <select
              value={compForm.type === 'external' ? 'none' : compForm.submission_mode}
              disabled={compForm.type === 'external'}
              onChange={(e) => setCompForm({ ...compForm, submission_mode: e.target.value })}
            >
              {compForm.type === 'external' ? (
                <option value="none">None</option>
              ) : (
                <>
                  <option value="upload">Upload (ZIP)</option>
                  <option value="link">Link</option>
                  <option value="both">Both</option>
                </>
              )}
            </select>
          </div>
          <div className="AdminPanel__formGroup">
            <label>Evaluation mode</label>
            <select
              value={compForm.type === 'external' ? 'none' : compForm.evaluation_mode}
              disabled={compForm.type === 'external'}
              onChange={(e) => setCompForm({ ...compForm, evaluation_mode: e.target.value })}
            >
              {compForm.type === 'external' ? (
                <option value="none">None</option>
              ) : (
                <>
                  <option value="manual">Manual</option>
                  <option value="auto">Auto</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="none">None</option>
                </>
              )}
            </select>
          </div>
        </div>

        {compForm.type === 'project' && (
          <div className="AdminPanel__formGroup">
            <label>
              <input
                type="checkbox"
                checked={compForm.is_multitask}
                onChange={(e) => setCompForm({ ...compForm, is_multitask: e.target.checked })}
              />{' '}
              Frontend multi-task mode (expects task1 + task2 folders)
            </label>
          </div>
        )}

        {compForm.type === 'task_quiz' && (
          <p className="AdminPanel__quizHint">
            After saving, use <strong>Manage tasks</strong> below to add tasks. Set submission mode to ZIP, links,
            or both; auto / hybrid runs the ZIP evaluator when teams upload.
          </p>
        )}

        <div className="AdminPanel__formGroup">
          <label>Rules (optional)</label>
          <textarea
            value={compForm.rules}
            onChange={(e) => setCompForm({ ...compForm, rules: e.target.value })}
            placeholder="Competition rules"
            rows={3}
          />
        </div>

        <div className="AdminPanel__formGroup">
          <label>
            <input
              type="checkbox"
              checked={!compForm.is_team_based}
              onChange={(e) => {
                const individual = e.target.checked;
                setCompForm((f) => ({
                  ...f,
                  is_team_based: !individual,
                  ...(individual ? { min_team_size: 1, max_team_size: 1 } : {})
                }));
              }}
            />{' '}
            Individual competition (single participant; one team slot only)
          </label>
        </div>

        <div className="AdminPanel__formRow">
          <div className="AdminPanel__formGroup">
            <label>Min team size</label>
            <input
              type="number"
              value={compForm.min_team_size}
              onChange={(e) => setCompForm({ ...compForm, min_team_size: parseInt(e.target.value, 10) || 1 })}
              min={1}
              disabled={!compForm.is_team_based}
            />
          </div>
          <div className="AdminPanel__formGroup">
            <label>Max team size</label>
            <input
              type="number"
              value={compForm.max_team_size}
              onChange={(e) => setCompForm({ ...compForm, max_team_size: parseInt(e.target.value, 10) || 4 })}
              min={1}
              disabled={!compForm.is_team_based}
            />
          </div>
        </div>

        <div className="AdminPanel__formRow">
          <div className="AdminPanel__formGroup">
            <label>Max teams (optional)</label>
            <input
              type="number"
              value={compForm.max_teams}
              onChange={(e) => setCompForm({ ...compForm, max_teams: e.target.value })}
              placeholder="Unlimited"
              min={1}
            />
          </div>
          <div className="AdminPanel__formGroup">
            <label>Location type</label>
            <select
              value={compForm.location_type}
              onChange={(e) => setCompForm({ ...compForm, location_type: e.target.value })}
            >
              <option value="on-campus">On campus</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div className="AdminPanel__formGroup">
            <label>Location details</label>
            <input
              value={compForm.location}
              onChange={(e) => setCompForm({ ...compForm, location: e.target.value })}
              placeholder={
                compForm.location_type === 'online' ? 'e.g. Zoom / Google Meet link' : 'e.g. MIU campus'
              }
            />
          </div>
        </div>
      </div>

      {isEditMode && loadedComp ? (
        <div className="CompetitionManagement__extras">
          {loadedComp.type === 'quiz' ? (
            <button
              type="button"
              className="CompetitionManagement__linkBtn"
              onClick={() => setShowQuizModal(true)}
            >
              Manage quiz questions
            </button>
          ) : null}
          {loadedComp.type === 'task_quiz' ? (
            <button
              type="button"
              className="CompetitionManagement__linkBtn"
              onClick={() => setShowTaskQuizModal(true)}
            >
              Manage task quiz tasks
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default CompetitionManagement;
