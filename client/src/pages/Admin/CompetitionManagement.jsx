import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiUsers, FiLayers, FiFileText, FiClipboard } from 'react-icons/fi';
import { MdQuiz } from 'react-icons/md';
import ApiService from '../../services/api';
import SEO from '../../components/SEO';
import PageLoader from '../../components/PageLoader';
import AdminQuizManageModal from './AdminQuizManageModal';
import AdminTaskQuizManageModal from './AdminTaskQuizManageModal';
import './AdminPanel.css';
import './CompetitionManagement.css';

const TAB_KEYS = ['details', 'quiz', 'tasks', 'teams'];

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

function typeLabel(type) {
  switch (type) {
    case 'task_quiz':
      return 'Task quiz';
    case 'quiz':
      return 'Quiz';
    case 'external':
      return 'External';
    case 'project':
    default:
      return 'Project';
  }
}

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

function normalizeTab(tabParam, isEdit, comp) {
  const raw = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'details';
  if (!isEdit || !comp) return 'details';
  if (raw === 'quiz' && comp.type !== 'quiz') return 'details';
  if (raw === 'tasks' && comp.type !== 'task_quiz') return 'details';
  return raw;
}

const CompetitionManagement = () => {
  const navigate = useNavigate();
  const { competitionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditMode = Boolean(competitionId && /^\d+$/.test(String(competitionId)));

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [compForm, setCompForm] = useState(emptyCompForm);
  const [loadedComp, setLoadedComp] = useState(null);

  const [teamsList, setTeamsList] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamForm, setTeamForm] = useState({ team_name: '', is_locked: false });
  const [showTeamEditorModal, setShowTeamEditorModal] = useState(false);
  const [teamDetailsLoading, setTeamDetailsLoading] = useState(false);
  const [teamDetails, setTeamDetails] = useState(null);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [memberEditForm, setMemberEditForm] = useState({ full_name: '', email: '', university_id: '' });
  const [judgeCandidates, setJudgeCandidates] = useState([]);
  const [assignedJudgeIds, setAssignedJudgeIds] = useState([]);
  const [judgesLoading, setJudgesLoading] = useState(false);
  const [judgesSaving, setJudgesSaving] = useState(false);

  const urlTab = searchParams.get('tab') || 'details';
  const activeTab = useMemo(
    () => normalizeTab(urlTab, isEditMode, loadedComp),
    [urlTab, isEditMode, loadedComp]
  );

  const setTab = useCallback(
    (next) => {
      setSearchParams({ tab: next }, { replace: true });
    },
    [setSearchParams]
  );

  useEffect(() => {
    document.body.classList.add('admin-panel-active');
    return () => document.body.classList.remove('admin-panel-active');
  }, []);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(t);
  }, [alert]);

  useEffect(() => {
    if (!isEditMode || !loadedComp) return;
    const n = normalizeTab(urlTab, true, loadedComp);
    if (n !== urlTab) {
      setSearchParams({ tab: n }, { replace: true });
    }
  }, [isEditMode, loadedComp, urlTab, setSearchParams]);

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

  const fetchCompTeams = useCallback(async () => {
    if (!loadedComp?.competition_id) return;
    try {
      setTeamsLoading(true);
      const data = await ApiService.getAdminCompetitionTeams(loadedComp.competition_id);
      setTeamsList(data || []);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to load teams' });
    } finally {
      setTeamsLoading(false);
    }
  }, [loadedComp?.competition_id]);

  useEffect(() => {
    if (activeTab === 'teams' && loadedComp?.competition_id) {
      fetchCompTeams();
    }
  }, [activeTab, loadedComp?.competition_id, fetchCompTeams]);

  const canAssignJudges = useMemo(() => {
    if (!loadedComp) return false;
    return ['project', 'task_quiz'].includes(loadedComp.type) &&
      ['manual', 'hybrid'].includes(loadedComp.evaluation_mode);
  }, [loadedComp]);

  const fetchJudgeAssignments = useCallback(async () => {
    if (!loadedComp?.competition_id || !canAssignJudges) {
      setJudgeCandidates([]);
      setAssignedJudgeIds([]);
      return;
    }
    try {
      setJudgesLoading(true);
      const data = await ApiService.getAdminCompetitionJudges(loadedComp.competition_id);
      setJudgeCandidates(Array.isArray(data?.board_candidates) ? data.board_candidates : []);
      setAssignedJudgeIds(Array.isArray(data?.assigned_board_user_ids) ? data.assigned_board_user_ids : []);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to load judge assignments' });
      setJudgeCandidates([]);
      setAssignedJudgeIds([]);
    } finally {
      setJudgesLoading(false);
    }
  }, [loadedComp?.competition_id, canAssignJudges]);

  useEffect(() => {
    if (activeTab === 'details' && isEditMode && loadedComp) {
      fetchJudgeAssignments();
    }
  }, [activeTab, isEditMode, loadedComp, fetchJudgeAssignments]);

  const toggleAssignedJudge = (userId) => {
    const numericId = Number(userId);
    if (!Number.isFinite(numericId)) return;
    setAssignedJudgeIds((prev) =>
      prev.includes(numericId) ? prev.filter((x) => x !== numericId) : [...prev, numericId]
    );
  };

  const saveJudgeAssignments = async () => {
    if (!loadedComp?.competition_id || !canAssignJudges) return;
    try {
      setJudgesSaving(true);
      await ApiService.updateAdminCompetitionJudges(loadedComp.competition_id, assignedJudgeIds);
      setAlert({ type: 'success', message: 'Judge assignments updated.' });
      await fetchJudgeAssignments();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to save judge assignments' });
    } finally {
      setJudgesSaving(false);
    }
  };

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

  const saveTeam = async () => {
    if (!loadedComp) return;
    if (!teamForm.team_name.trim()) {
      setAlert({ type: 'error', message: 'Team name is required' });
      return;
    }
    try {
      if (editingTeam) {
        await ApiService.updateAdminTeam(editingTeam.team_id, teamForm);
        setAlert({ type: 'success', message: 'Team updated.' });
        closeTeamEditor();
      } else {
        await ApiService.createAdminTeam(loadedComp.competition_id, teamForm);
        setAlert({ type: 'success', message: 'Team created.' });
        setTeamForm({ team_name: '', is_locked: false });
      }
      fetchCompTeams();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to save team' });
    }
  };

  const editTeamSettings = (team) => {
    setEditingTeam(team);
    setTeamForm({ team_name: team.team_name, is_locked: team.is_locked || false });
    setShowTeamEditorModal(true);
    setTeamDetails(null);
    fetchTeamDetails(team.team_id);
  };

  const closeTeamEditor = () => {
    setShowTeamEditorModal(false);
    setEditingTeam(null);
    setTeamDetails(null);
    setEditingMemberId(null);
    setMemberEditForm({ full_name: '', email: '', university_id: '' });
    setTeamForm({ team_name: '', is_locked: false });
  };

  const fetchTeamDetails = async (teamId) => {
    try {
      setTeamDetailsLoading(true);
      const data = await ApiService.getAdminTeamDetails(teamId);
      setTeamDetails(data || null);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to load team details' });
    } finally {
      setTeamDetailsLoading(false);
    }
  };

  const removeTeamMember = async (teamMemberId) => {
    if (!editingTeam?.team_id) return;
    if (!window.confirm('Remove this member from the team?')) return;
    try {
      await ApiService.removeAdminTeamMember(editingTeam.team_id, teamMemberId);
      setAlert({ type: 'success', message: 'Team member removed.' });
      await Promise.all([fetchCompTeams(), fetchTeamDetails(editingTeam.team_id)]);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to remove member' });
    }
  };

  const cancelTeamInvitation = async (invitationId) => {
    if (!editingTeam?.team_id) return;
    if (!window.confirm('Cancel this pending invitation?')) return;
    try {
      await ApiService.cancelAdminTeamInvitation(editingTeam.team_id, invitationId);
      setAlert({ type: 'success', message: 'Invitation cancelled.' });
      await Promise.all([fetchCompTeams(), fetchTeamDetails(editingTeam.team_id)]);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to cancel invitation' });
    }
  };

  const startEditMember = (member) => {
    setEditingMemberId(member.team_member_id);
    setMemberEditForm({
      full_name: member.full_name || '',
      email: member.email || '',
      university_id: member.university_id || ''
    });
  };

  const cancelEditMember = () => {
    setEditingMemberId(null);
    setMemberEditForm({ full_name: '', email: '', university_id: '' });
  };

  const saveEditMember = async (teamMemberId) => {
    if (!editingTeam?.team_id) return;
    if (!memberEditForm.full_name.trim() || !memberEditForm.email.trim()) {
      setAlert({ type: 'error', message: 'Member name and email are required.' });
      return;
    }
    try {
      await ApiService.updateAdminTeamMember(editingTeam.team_id, teamMemberId, memberEditForm);
      setAlert({ type: 'success', message: 'Member info updated.' });
      cancelEditMember();
      await fetchTeamDetails(editingTeam.team_id);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update member info' });
    }
  };

  const deleteTeam = async (teamId) => {
    if (!window.confirm('Delete this team?')) return;
    try {
      await ApiService.deleteAdminTeam(teamId);
      setAlert({ type: 'success', message: 'Team deleted.' });
      fetchCompTeams();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete team' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  const tabs = [];
  tabs.push({ id: 'details', label: 'Details', icon: <FiFileText size={18} /> });
  if (isEditMode && loadedComp?.type === 'quiz') {
    tabs.push({ id: 'quiz', label: 'Quiz builder', icon: <MdQuiz size={18} /> });
  }
  if (isEditMode && loadedComp?.type === 'task_quiz') {
    tabs.push({ id: 'tasks', label: 'Tasks', icon: <FiLayers size={18} /> });
  }
  if (isEditMode && loadedComp) {
    tabs.push({ id: 'teams', label: 'Teams', icon: <FiUsers size={18} /> });
  }

  return (
    <section className="CompetitionManagement">
      <SEO
        title={isEditMode ? 'Manage competition' : 'New competition'}
        description="Manage MSP competition settings (admin)."
        noindex
      />

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
            {isEditMode && loadedComp ? loadedComp.title : isEditMode ? 'Competition' : 'Create competition'}
          </h1>
          <p>
            {isEditMode && loadedComp
              ? `${typeLabel(loadedComp.type)} · ID ${loadedComp.competition_id} — use the tabs to edit settings, ${
                  loadedComp.type === 'quiz' ? 'questions, ' : ''
                }${loadedComp.type === 'task_quiz' ? 'tasks, ' : ''}and teams.`
              : 'Fill in the basics, then create. You will open the full manager for the new competition.'}
          </p>
        </div>
        <div className="CompetitionManagement__actions">
          {isEditMode && loadedComp ? (
            <a
              className="CompetitionManagement__btn CompetitionManagement__btn--secondary CompetitionManagement__btn--link"
              href={`/competitions/${loadedComp.competition_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FiClipboard size={16} aria-hidden /> Public page
            </a>
          ) : null}
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
            {saving ? 'Saving…' : isEditMode ? 'Save details' : 'Create competition'}
          </button>
        </div>
      </div>

      {alert ? (
        <div
          className={`CompetitionManagement__alert CompetitionManagement__alert--${
            alert.type === 'success' ? 'success' : 'error'
          }`}
        >
          {alert.message}
        </div>
      ) : null}

      {isEditMode && loadedComp ? (
        <div className="CompetitionManagement__summary">
          <div className="CompetitionManagement__summaryItem">
            <span className="CompetitionManagement__summaryLabel">Type</span>
            <span className="CompetitionManagement__summaryValue">{typeLabel(loadedComp.type)}</span>
          </div>
          <div className="CompetitionManagement__summaryItem">
            <span className="CompetitionManagement__summaryLabel">Status</span>
            <span className={`AdminPanel__badge AdminPanel__badge--${loadedComp.status || 'draft'}`}>
              {loadedComp.status}
            </span>
          </div>
          <div className="CompetitionManagement__summaryItem">
            <span className="CompetitionManagement__summaryLabel">Schedule</span>
            <span className="CompetitionManagement__summaryValue">
              {formatDate(loadedComp.start_at)} → {formatDate(loadedComp.end_at)}
            </span>
          </div>
          <div className="CompetitionManagement__summaryItem">
            <span className="CompetitionManagement__summaryLabel">Format</span>
            <span className="CompetitionManagement__summaryValue">
              {loadedComp.is_team_based === false || loadedComp.is_team_based === 0 ? 'Individual' : 'Team'}
            </span>
          </div>
          {loadedComp.type === 'quiz' && loadedComp.quiz_status ? (
            <div className="CompetitionManagement__summaryItem">
              <span className="CompetitionManagement__summaryLabel">Quiz status</span>
              <span className="CompetitionManagement__summaryValue">{loadedComp.quiz_status}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {tabs.length > 1 ? (
        <nav className="CompetitionManagement__tabs" aria-label="Competition sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`CompetitionManagement__tab ${activeTab === t.id ? 'CompetitionManagement__tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="CompetitionManagement__tabIcon" aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </nav>
      ) : null}

      {activeTab === 'details' ? (
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
              Use the <strong>Tasks</strong> tab to add tasks. Set submission mode to ZIP, links, or both; auto /
              hybrid runs the ZIP evaluator when teams upload.
            </p>
          )}

          {compForm.type === 'quiz' && isEditMode ? (
            <p className="AdminPanel__quizHint">
              Open the <strong>Quiz builder</strong> tab for questions, schedule, and quiz status (separate from
              the competition row).
            </p>
          ) : null}

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

          {isEditMode && loadedComp && (
            <div className="CompetitionManagement__judgeAssignment">
              <div className="CompetitionManagement__judgeAssignmentHead">
                <h3>Assigned board judges</h3>
                <p>
                  Select board members who can judge this competition. When assigned, only these board users can access judging.
                </p>
              </div>
              {!canAssignJudges ? (
                <div className="CompetitionManagement__judgeHint">
                  Judge assignment is available only for <strong>project/task_quiz</strong> with
                  <strong> manual/hybrid</strong> evaluation mode.
                </div>
              ) : judgesLoading ? (
                <div className="CompetitionManagement__judgeHint">Loading board members...</div>
              ) : judgeCandidates.length === 0 ? (
                <div className="CompetitionManagement__judgeHint">No board members with linked users found.</div>
              ) : (
                <>
                  <div className="CompetitionManagement__judgeList">
                    {judgeCandidates.map((member) => {
                      const checked = assignedJudgeIds.includes(Number(member.user_id));
                      return (
                        <label key={member.board_id} className="CompetitionManagement__judgeItem">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAssignedJudge(member.user_id)}
                          />
                          <span>
                            <strong>{member.full_name || 'Board member'}</strong>
                            <em>{member.position}{member.department_id != null ? ` - Dept ${member.department_id}` : ''}</em>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="CompetitionManagement__judgeActions">
                    <button
                      type="button"
                      className="CompetitionManagement__btn CompetitionManagement__btn--secondary"
                      onClick={fetchJudgeAssignments}
                      disabled={judgesSaving}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="CompetitionManagement__btn CompetitionManagement__btn--primary"
                      onClick={saveJudgeAssignments}
                      disabled={judgesSaving}
                    >
                      {judgesSaving ? 'Saving...' : 'Save judge assignments'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === 'quiz' && isEditMode && loadedComp?.type === 'quiz' ? (
        <div className="CompetitionManagement__panelCard">
          <h2 className="CompetitionManagement__panelTitle">Quiz builder</h2>
          <p className="CompetitionManagement__panelLead">
            Status, schedule (Cairo), and questions for <strong>{loadedComp.title}</strong>.
          </p>
          <AdminQuizManageModal
            key={loadedComp.competition_id}
            competition={loadedComp}
            onClose={() => {}}
            setAlert={setAlert}
            variant="embedded"
          />
        </div>
      ) : null}

      {activeTab === 'tasks' && isEditMode && loadedComp?.type === 'task_quiz' ? (
        <div className="CompetitionManagement__panelCard">
          <h2 className="CompetitionManagement__panelTitle">Task quiz</h2>
          <p className="CompetitionManagement__panelLead">
            Tasks and reference assets for <strong>{loadedComp.title}</strong>.
          </p>
          <AdminTaskQuizManageModal
            key={loadedComp.competition_id}
            competition={loadedComp}
            onClose={() => {}}
            setAlert={setAlert}
            variant="embedded"
          />
        </div>
      ) : null}

      {activeTab === 'teams' && isEditMode && loadedComp ? (
        <div className="CompetitionManagement__panelCard CompetitionManagement__panelCard--teams">
          <h2 className="CompetitionManagement__panelTitle">Teams</h2>
          <p className="CompetitionManagement__panelLead">
            Create or lock teams for <strong>{loadedComp.title}</strong>. Participants still join through the
            normal competition flow.
          </p>

          <div className="AdminPanel__teamsSection">
            <div className="AdminPanel__teamForm">
              <h4>{editingTeam ? 'Edit team' : 'Add team'}</h4>
              <div className="AdminPanel__formRow">
                <div className="AdminPanel__formGroup" style={{ flex: 2 }}>
                  <input
                    type="text"
                    placeholder="Team name"
                    value={teamForm.team_name}
                    onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })}
                  />
                </div>
                <div
                  className="AdminPanel__formGroup"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}
                >
                  <label htmlFor="comp-mgmt-team-locked">Locked?</label>
                  <input
                    id="comp-mgmt-team-locked"
                    type="checkbox"
                    checked={teamForm.is_locked}
                    onChange={(e) => setTeamForm({ ...teamForm, is_locked: e.target.checked })}
                    style={{ width: 'auto', marginBottom: 0 }}
                  />
                </div>
                <button
                  type="button"
                  className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                  onClick={saveTeam}
                  style={{ height: '42px' }}
                >
                  {editingTeam ? 'Update team' : 'Add team'}
                </button>
                {editingTeam ? (
                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--secondary"
                    onClick={closeTeamEditor}
                    style={{ height: '42px' }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>

            {teamsLoading ? (
              <div className="AdminPanel__loading">Loading teams…</div>
            ) : teamsList.length === 0 ? (
              <div className="AdminPanel__emptyState">No teams yet for this competition.</div>
            ) : (
              <div className="CompetitionManagement__teamsTableWrap">
                <table className="AdminPanel__table">
                  <thead>
                    <tr>
                      <th>Team name</th>
                      <th>Members</th>
                      <th>Pending invites</th>
                      <th>Created by</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamsList.map((team) => (
                      <tr key={team.team_id}>
                        <td style={{ fontWeight: 600 }}>{team.team_name}</td>
                        <td>
                          <div>{team.member_count ?? 0}</div>
                          {Array.isArray(team.members) && team.members.length > 0 ? (
                            <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
                              {team.members.map((member) => (
                                <div
                                  key={member.team_member_id || member.user_id}
                                  style={{
                                    fontSize: '0.8rem',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: 8,
                                    padding: '6px 8px'
                                  }}
                                >
                                  <div style={{ fontWeight: 600 }}>{member.full_name || 'Unnamed member'}</div>
                                  <div style={{ opacity: 0.85 }}>ID: {member.university_id || '—'}</div>
                                  <div style={{ opacity: 0.85 }}>Email: {member.email || '—'}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ marginTop: 4, fontSize: '0.8rem', opacity: 0.75 }}>No joined members yet</div>
                          )}
                        </td>
                        <td>{team.pending_invitations_count ?? 0}</td>
                        <td>{team.creator?.full_name || '—'}</td>
                        <td>
                          <span
                            className={`AdminPanel__badge AdminPanel__badge--${
                              team.is_locked ? 'rejected' : 'approved'
                            }`}
                          >
                            {team.is_locked ? 'Locked' : 'Open'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                            onClick={() => editTeamSettings(team)}
                          >
                            Edit / Manage
                          </button>
                          <button
                            type="button"
                            className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                            onClick={() => deleteTeam(team.team_id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {showTeamEditorModal && editingTeam ? (
            <div className="AdminPanel__modal" onClick={closeTeamEditor}>
              <div className="AdminPanel__modalContent" onClick={(e) => e.stopPropagation()}>
                <h3 className="AdminPanel__modalTitle">Edit team and members</h3>
                <div className="AdminPanel__formRow">
                  <div className="AdminPanel__formGroup" style={{ flex: 2 }}>
                    <label>Team name</label>
                    <input
                      type="text"
                      value={teamForm.team_name}
                      onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })}
                    />
                  </div>
                  <div className="AdminPanel__formGroup" style={{ maxWidth: 160 }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={teamForm.is_locked}
                        onChange={(e) => setTeamForm({ ...teamForm, is_locked: e.target.checked })}
                      />{' '}
                      Locked team
                    </label>
                  </div>
                </div>

                <div className="AdminPanel__modalActions">
                  <button
                    type="button"
                    className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                    onClick={closeTeamEditor}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="AdminPanel__modalBtn AdminPanel__modalBtn--primary"
                    onClick={saveTeam}
                  >
                    Save team
                  </button>
                </div>

                {teamDetailsLoading ? (
                  <div className="AdminPanel__loading" style={{ marginTop: 12 }}>
                    Loading team details...
                  </div>
                ) : (
                  <>
                    <h4 style={{ marginTop: 18 }}>Accepted members ({teamDetails?.members?.length || 0})</h4>
                    {!teamDetails?.members?.length ? (
                      <div className="AdminPanel__emptyState">No accepted members yet.</div>
                    ) : (
                      <div className="CompetitionManagement__teamsTableWrap">
                        <table className="AdminPanel__table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>ID</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamDetails.members.map((member) => (
                              <tr key={member.team_member_id || member.user_id}>
                                <td>
                                  {editingMemberId === member.team_member_id ? (
                                    <input
                                      value={memberEditForm.full_name}
                                      onChange={(e) =>
                                        setMemberEditForm((f) => ({ ...f, full_name: e.target.value }))
                                      }
                                      placeholder="Full name"
                                    />
                                  ) : (
                                    member.full_name || '—'
                                  )}
                                </td>
                                <td>
                                  {editingMemberId === member.team_member_id ? (
                                    <input
                                      value={memberEditForm.university_id}
                                      onChange={(e) =>
                                        setMemberEditForm((f) => ({ ...f, university_id: e.target.value }))
                                      }
                                      placeholder="University ID"
                                    />
                                  ) : (
                                    member.university_id || '—'
                                  )}
                                </td>
                                <td>
                                  {editingMemberId === member.team_member_id ? (
                                    <input
                                      type="email"
                                      value={memberEditForm.email}
                                      onChange={(e) =>
                                        setMemberEditForm((f) => ({ ...f, email: e.target.value }))
                                      }
                                      placeholder="Email"
                                    />
                                  ) : (
                                    member.email || '—'
                                  )}
                                </td>
                                <td>{member.role || 'member'}</td>
                                <td>
                                  {editingMemberId === member.team_member_id ? (
                                    <>
                                      <button
                                        type="button"
                                        className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                                        onClick={() => saveEditMember(member.team_member_id)}
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        className="AdminPanel__actionBtn AdminPanel__actionBtn--secondary"
                                        onClick={cancelEditMember}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                                        onClick={() => startEditMember(member)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                                        onClick={() => removeTeamMember(member.team_member_id)}
                                      >
                                        Remove
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <h4 style={{ marginTop: 18 }}>
                      Pending invitations ({teamDetails?.pending_invitations?.length || 0})
                    </h4>
                    {!teamDetails?.pending_invitations?.length ? (
                      <div className="AdminPanel__emptyState">No pending invitations.</div>
                    ) : (
                      <div className="CompetitionManagement__teamsTableWrap">
                        <table className="AdminPanel__table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>ID</th>
                              <th>Email</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamDetails.pending_invitations.map((inv) => (
                              <tr key={inv.invitation_id}>
                                <td>{inv.invited_name || '—'}</td>
                                <td>{inv.invited_university_id || '—'}</td>
                                <td>{inv.invited_email || '—'}</td>
                                <td>{inv.status || 'pending'}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                                    onClick={() => cancelTeamInvitation(inv.invitation_id)}
                                  >
                                    Cancel invite
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default CompetitionManagement;
