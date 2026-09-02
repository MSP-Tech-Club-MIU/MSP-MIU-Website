import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiUsers, FiLayers, FiFileText, FiClipboard, FiClock } from 'react-icons/fi';
import { MdQuiz, MdCampaign, MdEmojiEvents, MdEvent, MdDashboard, MdAppRegistration, MdNotifications, MdFeedback, MdPerson, MdHome, MdMenuBook } from 'react-icons/md';
import ApiService from '../../services/api';
import { confirmModal } from '../../context/ModalContext';
import SEO from '../../components/SEO';
import PageLoader from '../../components/PageLoader';
import Pagination from '../../components/Pagination';
import EmailSendProgress from '../../components/EmailSendProgress';
import AdminQuizManageModal from './AdminQuizManageModal';
import AdminTaskQuizManageModal from './AdminTaskQuizManageModal';
import AdminShell from './AdminShell';
import './AdminPanel.css';
import './CompetitionManagement.css';
import { useSeason } from '../../context/SeasonContext';
import { isProgramsEligibleDepartment, PROGRAMS_TAB_KEYS } from '../../data/programsAccess';

const TAB_KEYS = ['details', 'quiz', 'tasks', 'timeslots', 'teams', 'announcements'];
const LIST_LIMIT = 20;
const SELECT_LIMIT = 100;

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
    registration_deadline: comp.registration_deadline
      ? String(comp.registration_deadline).split('T')[0]
      : '',
    max_team_size: comp.max_team_size || 4,
    min_team_size: comp.min_team_size || 1,
    max_teams: comp.max_teams != null ? comp.max_teams : '',
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
    registration_deadline: compForm.registration_deadline || null,
    max_team_size: compForm.max_team_size,
    min_team_size: compForm.min_team_size,
    max_teams:
      compForm.max_teams === '' || compForm.max_teams == null
        ? null
        : Number(compForm.max_teams),
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
  if (raw === 'timeslots' && comp.type !== 'project') return 'details';
  return raw;
}

const CompetitionManagement = () => {
  const navigate = useNavigate();
  const { competitionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditMode = Boolean(competitionId && /^\d+$/.test(String(competitionId)));
  const { selectedSeasonId } = useSeason();

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessLevel, setAccessLevel] = useState('full');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [compForm, setCompForm] = useState(emptyCompForm);
  const [loadedComp, setLoadedComp] = useState(null);

  const [teamsList, setTeamsList] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsPage, setTeamsPage] = useState(1);
  const [teamsPagination, setTeamsPagination] = useState(null);
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

  // Announcements state
  const [announcementsList, setAnnouncementsList] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementsPage, setAnnouncementsPage] = useState(1);
  const [announcementsPagination, setAnnouncementsPagination] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '', send_email: true, target_type: 'all', target_team_id: '', target_user_id: '' });
  const [resendingEmails, setResendingEmails] = useState(null);
  const [emailSendJob, setEmailSendJob] = useState(null);

  // Timeslots state
  const [timeslotsList, setTimeslotsList] = useState([]);
  const [timeslotsLoading, setTimeslotsLoading] = useState(false);
  const [timeslotsPage, setTimeslotsPage] = useState(1);
  const [timeslotsPagination, setTimeslotsPagination] = useState(null);
  const [timeslotsActionLoading, setTimeslotsActionLoading] = useState(false);
  const [timeslotForm, setTimeslotForm] = useState({
    start_at: '',
    end_at: '',
    location_details: '',
    window_start_at: '',
    window_end_at: '',
    slot_length_minutes: 15
  });
  const [editingTimeslotId, setEditingTimeslotId] = useState(null);

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
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(t);
  }, [alert]);

  const shellNavItems = useMemo(() => {
    const full = [
      { key: 'dashboard', label: 'Dashboard', icon: <MdDashboard />, category: 'Overview' },
      { key: 'events', label: 'Events', icon: <MdEvent />, category: 'Programs' },
      { key: 'courses', label: 'Courses', icon: <MdMenuBook />, category: 'Programs' },
      { key: 'competitions', label: 'Competitions', icon: <MdEmojiEvents />, category: 'Programs' },
      { key: 'registrations', label: 'Registrations', icon: <MdAppRegistration />, category: 'Programs' },
      { key: 'members', label: 'Members', icon: <MdPerson />, category: 'Organization' },
      { key: 'sponsors', label: 'Sponsors', icon: <MdEmojiEvents />, category: 'Organization' },
      { key: 'board', label: 'Board', icon: <MdPerson />, category: 'Organization' },
      { key: 'media', label: 'Media', icon: <MdDashboard />, category: 'Content' },
      { key: 'content', label: 'Site content', icon: <MdCampaign />, category: 'Content' },
      { key: 'notifications', label: 'Notifications', icon: <MdNotifications />, category: 'Communications' },
      { key: 'announcements', label: 'Announcements', icon: <MdCampaign />, category: 'Communications' },
      { key: 'suggestions', label: 'Suggestions', icon: <MdFeedback />, category: 'Communications' },
    ];
    if (accessLevel === 'programs') {
      return full.filter((item) => PROGRAMS_TAB_KEYS.includes(item.key));
    }
    return full;
  }, [accessLevel]);

  const shellBottomItems = useMemo(() => [
    { key: 'profile', label: 'Profile', icon: <MdPerson />, onClick: () => navigate('/profile') },
    { key: 'home', label: 'Home', icon: <MdHome />, onClick: () => navigate('/') },
  ], [navigate]);

  const handleShellNav = useCallback((key) => {
    navigate(`/admin/${key}`);
  }, [navigate]);

  useEffect(() => {
    if (!isEditMode || !loadedComp) return;
    const n = normalizeTab(urlTab, true, loadedComp);
    if (n !== urlTab) {
      setSearchParams({ tab: n }, { replace: true });
    }
  }, [isEditMode, loadedComp, urlTab, setSearchParams]);

  const loadCompetition = useCallback(async () => {
    // Prefer admin list (has full admin fields); high limit so we can find by id under pagination.
    const result = await ApiService.getAdminCompetitions({ page: 1, limit: SELECT_LIMIT });
    const rows = Array.isArray(result?.data) ? result.data : [];
    const id = parseInt(competitionId, 10);
    let comp = rows.find((c) => Number(c.competition_id) === id);
    if (!comp) {
      // Fallback to public detail if not in first page of admin list
      try {
        comp = await ApiService.getCompetitionById(competitionId);
      } catch {
        comp = null;
      }
    }
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
        let allowed = result.success;
        let level = 'full';
        if (!allowed) {
          try {
            const [profile, boardResult] = await Promise.all([
              ApiService.getProfile().catch(() => null),
              ApiService.getMyBoardMembership()
            ]);
            allowed =
              profile?.role === 'board' &&
              isProgramsEligibleDepartment(boardResult?.data?.department_id);
            if (allowed) level = 'programs';
          } catch (_) {
            allowed = false;
          }
        }
        if (!allowed) {
          if (!cancelled) {
            setHasAccess(false);
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setAccessLevel(level);
          setHasAccess(true);
        }

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

  const fetchCompTeams = useCallback(async (opts = {}) => {
    if (!loadedComp?.competition_id) return;
    const page = opts.page ?? teamsPage;
    const limit = opts.limit ?? LIST_LIMIT;
    try {
      setTeamsLoading(true);
      const result = await ApiService.getAdminCompetitionTeams(loadedComp.competition_id, {
        page,
        limit
      });
      setTeamsList(Array.isArray(result?.data) ? result.data : []);
      setTeamsPagination(limit >= SELECT_LIMIT ? null : (result?.pagination || null));
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to load teams' });
      setTeamsList([]);
      setTeamsPagination(null);
    } finally {
      setTeamsLoading(false);
    }
  }, [loadedComp?.competition_id, teamsPage]);

  useEffect(() => {
    if (activeTab === 'teams' && loadedComp?.competition_id) {
      fetchCompTeams({ page: teamsPage, limit: LIST_LIMIT });
    }
  }, [activeTab, loadedComp?.competition_id, fetchCompTeams, teamsPage]);

  useEffect(() => {
    if ((activeTab === 'announcements' || activeTab === 'timeslots') && loadedComp?.competition_id) {
      fetchCompTeams({ page: 1, limit: SELECT_LIMIT });
    }
  }, [activeTab, loadedComp?.competition_id, fetchCompTeams]);

  const fetchCompAnnouncements = useCallback(async () => {
    if (!loadedComp?.competition_id) return;
    try {
      setAnnouncementsLoading(true);
      const result = await ApiService.getCompetitionAnnouncements(loadedComp.competition_id, {
        page: announcementsPage,
        limit: LIST_LIMIT
      });
      setAnnouncementsList(Array.isArray(result?.data) ? result.data : []);
      setAnnouncementsPagination(result?.pagination || null);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to load announcements' });
      setAnnouncementsList([]);
      setAnnouncementsPagination(null);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [loadedComp?.competition_id, announcementsPage]);

  const fetchCompTimeslots = useCallback(async () => {
    if (!loadedComp?.competition_id) return;
    try {
      setTimeslotsLoading(true);
      const result = await ApiService.getAdminCompetitionTimeslots(loadedComp.competition_id, {
        page: timeslotsPage,
        limit: LIST_LIMIT
      });
      setTimeslotsList(Array.isArray(result?.data) ? result.data : []);
      setTimeslotsPagination(result?.pagination || null);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to load timeslots' });
      setTimeslotsList([]);
      setTimeslotsPagination(null);
    } finally {
      setTimeslotsLoading(false);
    }
  }, [loadedComp?.competition_id, timeslotsPage]);

  useEffect(() => {
    if (activeTab === 'announcements' && loadedComp?.competition_id) {
      fetchCompAnnouncements();
    }
  }, [activeTab, loadedComp?.competition_id, fetchCompAnnouncements]);

  useEffect(() => {
    if (activeTab === 'timeslots' && loadedComp?.competition_id) {
      fetchCompTimeslots();
    }
  }, [activeTab, loadedComp?.competition_id, fetchCompTimeslots]);

  useEffect(() => {
    setTeamsPage(1);
    setAnnouncementsPage(1);
    setTimeslotsPage(1);
  }, [activeTab]);

  const createTimeslotSingle = async () => {
    if (!loadedComp?.competition_id) return;
    if (!timeslotForm.start_at || !timeslotForm.end_at) {
      setAlert({ type: 'error', message: 'From and To datetime are required.' });
      return;
    }
    try {
      setTimeslotsActionLoading(true);
      if (editingTimeslotId) {
        await ApiService.updateAdminCompetitionTimeslot(loadedComp.competition_id, editingTimeslotId, {
          start_at: timeslotForm.start_at,
          end_at: timeslotForm.end_at,
          location_details: timeslotForm.location_details || null
        });
        setAlert({ type: 'success', message: 'Timeslot updated.' });
        setEditingTimeslotId(null);
      } else {
        await ApiService.createAdminCompetitionTimeslot(loadedComp.competition_id, {
          start_at: timeslotForm.start_at,
          end_at: timeslotForm.end_at,
          location_details: timeslotForm.location_details || null
        });
        setAlert({ type: 'success', message: 'Timeslot created.' });
      }
      setTimeslotForm((s) => ({ ...s, start_at: '', end_at: '', location_details: '' }));
      await fetchCompTimeslots();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to save timeslot' });
    } finally {
      setTimeslotsActionLoading(false);
    }
  };

  const beginEditTimeslot = (slot) => {
    const toLocalInput = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setEditingTimeslotId(slot.timeslot_id);
    setTimeslotForm((s) => ({
      ...s,
      start_at: toLocalInput(slot.start_at),
      end_at: toLocalInput(slot.end_at),
      location_details: slot.location_details || ''
    }));
  };

  const createGeneratedTimeslots = async () => {
    if (!loadedComp?.competition_id) return;
    const slotMinutes = Number(timeslotForm.slot_length_minutes || 0);
    if (!timeslotForm.window_start_at || !timeslotForm.window_end_at || !slotMinutes) {
      setAlert({ type: 'error', message: 'Window start, window end, and slot length are required.' });
      return;
    }

    const start = new Date(timeslotForm.window_start_at);
    const end = new Date(timeslotForm.window_end_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      setAlert({ type: 'error', message: 'Invalid timeslot generation window.' });
      return;
    }

    const generated = [];
    let cursor = new Date(start.getTime());
    while (cursor < end) {
      const next = new Date(cursor.getTime() + slotMinutes * 60 * 1000);
      if (next > end) break;
      generated.push({ start_at: new Date(cursor), end_at: new Date(next) });
      cursor = next;
    }

    if (!generated.length) {
      setAlert({ type: 'error', message: 'No slots generated. Increase the window or reduce slot length.' });
      return;
    }

    try {
      setTimeslotsActionLoading(true);
      for (const slot of generated) {
        await ApiService.createAdminCompetitionTimeslot(loadedComp.competition_id, {
          start_at: slot.start_at.toISOString(),
          end_at: slot.end_at.toISOString(),
          location_details: timeslotForm.location_details || null
        });
      }
      setAlert({ type: 'success', message: `${generated.length} timeslots created.` });
      await fetchCompTimeslots();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to generate timeslots' });
    } finally {
      setTimeslotsActionLoading(false);
    }
  };

  const assignTimeslotToTeam = async (timeslotId, teamId) => {
    if (!loadedComp?.competition_id || !teamId) return;
    try {
      setTimeslotsActionLoading(true);
      await ApiService.assignAdminCompetitionTimeslot(loadedComp.competition_id, timeslotId, Number(teamId));
      setAlert({ type: 'success', message: 'Timeslot assigned.' });
      await fetchCompTimeslots();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to assign timeslot' });
    } finally {
      setTimeslotsActionLoading(false);
    }
  };

  const unassignTimeslot = async (timeslotId) => {
    if (!loadedComp?.competition_id) return;
    try {
      setTimeslotsActionLoading(true);
      await ApiService.unassignAdminCompetitionTimeslot(loadedComp.competition_id, timeslotId);
      setAlert({ type: 'success', message: 'Timeslot unassigned.' });
      await fetchCompTimeslots();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to unassign timeslot' });
    } finally {
      setTimeslotsActionLoading(false);
    }
  };

  const deleteTimeslot = async (timeslotId) => {
    if (!loadedComp?.competition_id) return;
    const ok = await confirmModal({
      title: 'Delete Timeslot?',
      message: 'Are you sure you want to delete this timeslot?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    try {
      setTimeslotsActionLoading(true);
      await ApiService.deleteAdminCompetitionTimeslot(loadedComp.competition_id, timeslotId);
      setAlert({ type: 'success', message: 'Timeslot deleted.' });
      await fetchCompTimeslots();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete timeslot' });
    } finally {
      setTimeslotsActionLoading(false);
    }
  };

  const publishTimeslotLinks = async () => {
    if (!loadedComp?.competition_id) return;
    try {
      setTimeslotsActionLoading(true);
      const result = await ApiService.publishAdminCompetitionTimeslotSelectionLinks(loadedComp.competition_id);
      const sent = Number(result?.data?.sent_links || 0);
      setAlert({ type: 'success', message: `Selection links published and emailed to ${sent} team(s).` });
      await fetchCompTimeslots();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to publish selection links' });
    } finally {
      setTimeslotsActionLoading(false);
    }
  };

  const canAssignJudges = useMemo(() => {
    if (!loadedComp) return false;
    return ['project', 'task_quiz'].includes(loadedComp.type) &&
      ['manual', 'hybrid'].includes(loadedComp.evaluation_mode);
  }, [loadedComp]);

  const allCompetitors = useMemo(() => {
    const competitors = [];
    const seen = new Set();
    teamsList.forEach(team => {
      if (Array.isArray(team.members)) {
        team.members.forEach(member => {
          if (member.user_id && !seen.has(member.user_id)) {
            seen.add(member.user_id);
            competitors.push(member);
          }
        });
      }
    });
    return competitors.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [teamsList]);

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
    if (!isEditMode && typeof selectedSeasonId === 'number') {
      data.season_id = selectedSeasonId;
    }
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
    const ok = await confirmModal({
      title: 'Delete Competition?',
      message: `Delete competition "${loadedComp.title}"? This cannot be undone.`,
      confirmText: 'Delete Competition',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
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
    const ok = await confirmModal({
      title: 'Remove Team Member?',
      message: 'Are you sure you want to remove this member from the team?',
      confirmText: 'Remove Member',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
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
    const ok = await confirmModal({
      title: 'Cancel Invitation?',
      message: 'Are you sure you want to cancel this pending invitation?',
      confirmText: 'Cancel Invitation',
      cancelText: 'Keep Invitation',
      type: 'warning'
    });
    if (!ok) return;
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
    const ok = await confirmModal({
      title: 'Delete Team?',
      message: 'Are you sure you want to delete this team?',
      confirmText: 'Delete Team',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
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

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return String(dateString);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
  const saveAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      setAlert({ type: 'error', message: 'Title and message are required' });
      return;
    }

    if (announcementForm.target_type === 'team' && !announcementForm.target_team_id) {
      setAlert({ type: 'error', message: 'Please select a team' });
      return;
    }
    if (announcementForm.target_type === 'competitor' && !announcementForm.target_user_id) {
      setAlert({ type: 'error', message: 'Please select a competitor' });
      return;
    }

    try {
      const payload = {
        title: announcementForm.title,
        message: announcementForm.message,
        send_email: announcementForm.send_email,
        target_type: announcementForm.target_type,
        target_team_id: announcementForm.target_team_id || null,
        target_user_id: announcementForm.target_user_id || null,
        is_active: true
      };

      if (editingAnnouncement) {
        await ApiService.updateCompetitionAnnouncement(
          loadedComp.competition_id,
          editingAnnouncement.announcement_id,
          payload
        );
        setAlert({ type: 'success', message: 'Announcement updated.' });
      } else {
        const res = await ApiService.createCompetitionAnnouncement(
          loadedComp.competition_id,
          payload
        );
        const job = res?.emailJob || res?.data?.emailJob || (res?.emailStats?.emailJob);
        if (job?.id) {
          setEmailSendJob({
            id: job.id,
            title: `${loadedComp.title || 'Competition'}: ${payload.title}`
          });
        }
        setAlert({ type: 'success', message: 'Announcement created and sent to ' + (payload.target_type === 'all' ? 'all competitors!' : 'targeted audience!') });
      }
      setEditingAnnouncement(null);
      setAnnouncementForm({ title: '', message: '', send_email: true, target_type: 'all', target_team_id: '', target_user_id: '' });
      fetchCompAnnouncements();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to save announcement' });
    }
  };

  const editAnnouncementItem = (announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      message: announcement.message,
      send_email: announcement.send_email !== false,
      target_type: announcement.target_type || 'all',
      target_team_id: announcement.target_team_id || '',
      target_user_id: announcement.target_user_id || ''
    });
  };

  const deleteAnnouncement = async (announcementId) => {
    const ok = await confirmModal({
      title: 'Delete Announcement?',
      message: 'Are you sure you want to delete this announcement?',
      confirmText: 'Delete Announcement',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await ApiService.deleteCompetitionAnnouncement(
        loadedComp.competition_id,
        announcementId
      );
      setAlert({ type: 'success', message: 'Announcement deleted.' });
      fetchCompAnnouncements();
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete announcement' });
    }
  };

  const resendAnnouncementEmails = async (announcementId) => {
    setResendingEmails(announcementId);
    try {
      const res = await ApiService.resendCompetitionAnnouncementEmails(
        loadedComp.competition_id,
        announcementId
      );
      const job = res?.emailJob || res?.data?.emailJob || (res?.emailStats?.emailJob);
      if (job?.id) {
        setEmailSendJob({
          id: job.id,
          title: `${loadedComp.title || 'Competition'}: Resend Announcement`
        });
      }
      setAlert({ type: 'success', message: 'Emails resent to all competitors!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to resend emails' });
    } finally {
      setResendingEmails(null);
    }
  };

  tabs.push({ id: 'details', label: 'Details', icon: <FiFileText size={18} /> });
  if (isEditMode && loadedComp?.type === 'quiz') {
    tabs.push({ id: 'quiz', label: 'Quiz builder', icon: <MdQuiz size={18} /> });
  }
  if (isEditMode && loadedComp?.type === 'task_quiz') {
    tabs.push({ id: 'tasks', label: 'Tasks', icon: <FiLayers size={18} /> });
  }
  if (isEditMode && loadedComp) {
    if (loadedComp.type === 'project') {
      tabs.push({ id: 'timeslots', label: 'Timeslots', icon: <FiClock size={18} /> });
    }
    tabs.push({ id: 'teams', label: 'Teams', icon: <FiUsers size={18} /> });
    if (isEditMode && loadedComp) {
      tabs.push({ id: 'announcements', label: 'Announcements', icon: <MdCampaign size={18} /> });
    }

  }

  return (
    <AdminShell
      seo={
        <SEO
          title={isEditMode ? 'Manage competition' : 'New competition'}
          description="Manage MSP competition settings (admin)."
          noindex
        />
      }
      navItems={shellNavItems}
      bottomItems={shellBottomItems}
      activeKey="competitions"
      onNavClick={handleShellNav}
      pageTitle={isEditMode && loadedComp ? loadedComp.title : isEditMode ? 'Competition' : 'Create competition'}
      pageIcon={<MdEmojiEvents />}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
    >
    <section className="CompetitionManagement CompetitionManagement--embedded">
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

          {!['quiz', 'task_quiz'].includes(compForm.type) && (
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
          )}

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

      {activeTab === 'timeslots' && isEditMode && loadedComp?.type === 'project' ? (
        <div className="CompetitionManagement__panelCard">
          <h2 className="CompetitionManagement__panelTitle">Competition timeslots</h2>
          <p className="CompetitionManagement__panelLead">
            Define exact <strong>from</strong> and <strong>to</strong> timings, generate slots by length, publish selection links,
            and assign/unassign teams.
          </p>

          <div className="AdminPanel__formRow">
            <div className="AdminPanel__formGroup">
              <label>From (exact datetime)</label>
              <input
                type="datetime-local"
                value={timeslotForm.start_at}
                onChange={(e) => setTimeslotForm((s) => ({ ...s, start_at: e.target.value }))}
              />
            </div>
            <div className="AdminPanel__formGroup">
              <label>To (exact datetime)</label>
              <input
                type="datetime-local"
                value={timeslotForm.end_at}
                onChange={(e) => setTimeslotForm((s) => ({ ...s, end_at: e.target.value }))}
              />
            </div>
            <div className="AdminPanel__formGroup">
              <label>Slot location / meeting link</label>
              <input
                value={timeslotForm.location_details}
                onChange={(e) => setTimeslotForm((s) => ({ ...s, location_details: e.target.value }))}
                placeholder={loadedComp.location_type === 'online' ? 'Zoom / Meet link' : 'Campus room'}
              />
            </div>
          </div>

          <div className="CompetitionManagement__judgeActions" style={{ marginBottom: 18 }}>
            <button
              type="button"
              className="CompetitionManagement__btn CompetitionManagement__btn--primary"
              onClick={createTimeslotSingle}
              disabled={timeslotsActionLoading}
            >
              {timeslotsActionLoading
                ? 'Saving...'
                : editingTimeslotId
                  ? 'Update timeslot'
                  : 'Add exact timeslot'}
            </button>
            {editingTimeslotId ? (
              <button
                type="button"
                className="AdminPanel__actionBtn"
                onClick={() => {
                  setEditingTimeslotId(null);
                  setTimeslotForm((s) => ({ ...s, start_at: '', end_at: '', location_details: '' }));
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="AdminPanel__formRow">
            <div className="AdminPanel__formGroup">
              <label>Window start</label>
              <input
                type="datetime-local"
                value={timeslotForm.window_start_at}
                onChange={(e) => setTimeslotForm((s) => ({ ...s, window_start_at: e.target.value }))}
              />
            </div>
            <div className="AdminPanel__formGroup">
              <label>Window end</label>
              <input
                type="datetime-local"
                value={timeslotForm.window_end_at}
                onChange={(e) => setTimeslotForm((s) => ({ ...s, window_end_at: e.target.value }))}
              />
            </div>
            <div className="AdminPanel__formGroup">
              <label>Slot length (minutes)</label>
              <input
                type="number"
                min={5}
                value={timeslotForm.slot_length_minutes}
                onChange={(e) =>
                  setTimeslotForm((s) => ({ ...s, slot_length_minutes: Number(e.target.value) || 15 }))
                }
              />
            </div>
          </div>

          <div className="CompetitionManagement__judgeActions">
            <button
              type="button"
              className="CompetitionManagement__btn CompetitionManagement__btn--secondary"
              onClick={createGeneratedTimeslots}
              disabled={timeslotsActionLoading}
            >
              {timeslotsActionLoading ? 'Generating...' : 'Generate slots by length'}
            </button>
            <button
              type="button"
              className="CompetitionManagement__btn CompetitionManagement__btn--primary"
              onClick={publishTimeslotLinks}
              disabled={timeslotsActionLoading || timeslotsList.length === 0}
            >
              Publish selection links (email)
            </button>
            <button
              type="button"
              className="CompetitionManagement__btn CompetitionManagement__btn--secondary"
              onClick={fetchCompTimeslots}
              disabled={timeslotsActionLoading}
            >
              Refresh
            </button>
          </div>

          {timeslotsLoading ? (
            <div className="AdminPanel__loading" style={{ marginTop: 16 }}>Loading timeslots...</div>
          ) : timeslotsList.length === 0 ? (
            <div className="AdminPanel__emptyState" style={{ marginTop: 16 }}>No timeslots yet.</div>
          ) : (
            <div className="CompetitionManagement__teamsTableWrap" style={{ marginTop: 16 }}>
              <table className="AdminPanel__table">
                <thead>
                  <tr>
                    <th>Slot</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Location</th>
                    <th>Assigned team</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timeslotsList.map((slot) => {
                    const isAssigned = Boolean(slot.assigned_team_id);
                    return (
                      <tr key={slot.timeslot_id}>
                        <td>#{slot.timeslot_id}</td>
                        <td>{formatDateTime(slot.start_at)}</td>
                        <td>{formatDateTime(slot.end_at)}</td>
                        <td>{slot.location_details || '—'}</td>
                        <td>{slot.assigned_team_name || '—'}</td>
                        <td>
                          <span className={`AdminPanel__badge AdminPanel__badge--${isAssigned ? 'approved' : 'draft'}`}>
                            {isAssigned ? 'Assigned' : 'Available'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                              onClick={() => beginEditTimeslot(slot)}
                              disabled={timeslotsActionLoading}
                            >
                              Edit
                            </button>
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                const teamId = e.target.value;
                                if (!teamId) return;
                                assignTimeslotToTeam(slot.timeslot_id, teamId);
                                e.target.value = '';
                              }}
                            >
                              <option value="">Assign team...</option>
                              {teamsList.map((team) => (
                                <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
                              ))}
                            </select>
                            {isAssigned ? (
                              <button
                                type="button"
                                className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                                onClick={() => unassignTimeslot(slot.timeslot_id)}
                                disabled={timeslotsActionLoading}
                              >
                                Unassign
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                                onClick={() => deleteTimeslot(slot.timeslot_id)}
                                disabled={timeslotsActionLoading}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            pagination={timeslotsPagination}
            onPageChange={(p) => { setTimeslotsPage(p); }}
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
            <Pagination
              pagination={teamsPagination}
              onPageChange={(p) => { setTeamsPage(p); }}
            />
          </div>

          {showTeamEditorModal && editingTeam
            ? createPortal(
            <div className="AdminPanel__modal" onClick={closeTeamEditor} role="presentation">
              <div
                className="AdminPanel__modalContent"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
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
            </div>,
            document.body
          )
          : null}
        </div>
      ) : null}
      {activeTab === 'announcements' && isEditMode && loadedComp ? (
        <div className="CompetitionManagement__panelCard">
          <h2 className="CompetitionManagement__panelTitle">Announcements</h2>
          <p className="CompetitionManagement__panelLead">
            Broadcast messages to all competitors in <strong>{loadedComp.title}</strong>. Competitors will receive email notifications if enabled.
          </p>

          <div className="AdminPanel__announcementsSection">
            <div className="AdminPanel__announcementForm">
              <h4>{editingAnnouncement ? 'Edit announcement' : 'Create announcement'}</h4>
              <div className="AdminPanel__formGroup">
                <label htmlFor="comp-mgmt-ann-title">Announcement title</label>
                <input
                  id="comp-mgmt-ann-title"
                  type="text"
                  placeholder="e.g., Important Update"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                />
              </div>

              <div className="AdminPanel__formRow">
                <div className="AdminPanel__formGroup">
                  <label htmlFor="comp-mgmt-ann-target">Target Audience</label>
                  <select
                    id="comp-mgmt-ann-target"
                    value={announcementForm.target_type}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, target_type: e.target.value, target_team_id: '', target_user_id: '' })}
                  >
                    <option value="all">All Competitors</option>
                    <option value="team">Specific Team</option>
                    <option value="competitor">Specific Competitor</option>
                  </select>
                </div>
                
                {announcementForm.target_type === 'team' && (
                  <div className="AdminPanel__formGroup">
                    <label htmlFor="comp-mgmt-ann-team">Select Team</label>
                    <select
                      id="comp-mgmt-ann-team"
                      value={announcementForm.target_team_id}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, target_team_id: e.target.value })}
                    >
                      <option value="">-- Select a Team --</option>
                      {teamsList.map(team => (
                        <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {announcementForm.target_type === 'competitor' && (
                  <div className="AdminPanel__formGroup">
                    <label htmlFor="comp-mgmt-ann-user">Select Competitor</label>
                    <select
                      id="comp-mgmt-ann-user"
                      value={announcementForm.target_user_id}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, target_user_id: e.target.value })}
                    >
                      <option value="">-- Select a Competitor --</option>
                      {allCompetitors.map(member => (
                        <option key={member.user_id} value={member.user_id}>{member.full_name} ({member.email})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="AdminPanel__formGroup">
                <label htmlFor="comp-mgmt-ann-message">Message</label>
                <textarea
                  id="comp-mgmt-ann-message"
                  placeholder="Write your announcement here..."
                  rows={5}
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                />
              </div>

              <div className="AdminPanel__formGroup" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                <label htmlFor="comp-mgmt-ann-email">
                  <input
                    id="comp-mgmt-ann-email"
                    type="checkbox"
                    checked={announcementForm.send_email}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, send_email: e.target.checked })}
                    style={{ marginRight: '6px', marginBottom: 0 }}
                  />
                  Send email notification to all competitors
                </label>
              </div>

              <div className="AdminPanel__formRow" style={{ marginTop: '12px', gap: '8px' }}>
                <button
                  type="button"
                  className="AdminPanel__actionBtn AdminPanel__actionBtn--primary"
                  onClick={saveAnnouncement}
                >
                  {editingAnnouncement ? 'Update' : 'Create'} Announcement
                </button>
                {editingAnnouncement && (
                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--secondary"
                    onClick={() => {
                      setEditingAnnouncement(null);
                      setAnnouncementForm({ title: '', message: '', send_email: true });
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <h4 style={{ marginTop: '24px', marginBottom: '12px' }}>
              Announcements ({announcementsPagination?.total ?? announcementsList?.length ?? 0})
            </h4>
            {announcementsLoading ? (
              <div className="AdminPanel__emptyState">Loading announcements...</div>
            ) : !announcementsList?.length ? (
              <div className="AdminPanel__emptyState">No announcements yet. Create one to get started!</div>
            ) : (
              <div className="AdminPanel__announcementsGrid">
                {announcementsList.map((ann) => (
                  <div key={ann.announcement_id} className="AdminPanel__announcementCard">
                    <h5>{ann.title}</h5>
                    <p>{ann.message}</p>
                    <div style={{ marginTop: '10px', marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {ann.send_email && (
                        <span className="AdminPanel__announcementEmailBadge">
                          <span style={{ marginRight: '4px' }}>✓</span>Email sent
                        </span>
                      )}
                      <span className="AdminPanel__badge AdminPanel__badge--info">
                        Target: {ann.target_type === 'team' ? 'Team' : ann.target_type === 'competitor' ? 'Competitor' : 'All'}
                      </span>
                      <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                        {formatDate(ann.created_at)}
                      </span>
                    </div>
                    <div className="AdminPanel__formRow" style={{ gap: '6px', marginBottom: 0 }}>
                      <button
                        type="button"
                        className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                        onClick={() => editAnnouncementItem(ann)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="AdminPanel__actionBtn AdminPanel__actionBtn--info"
                        onClick={() => resendAnnouncementEmails(ann.announcement_id)}
                        disabled={resendingEmails === ann.announcement_id}
                      >
                        {resendingEmails === ann.announcement_id ? 'Resending...' : 'Resend emails'}
                      </button>
                      <button
                        type="button"
                        className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                        onClick={() => deleteAnnouncement(ann.announcement_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination
              pagination={announcementsPagination}
              onPageChange={(p) => { setAnnouncementsPage(p); }}
            />
          </div>
        </div>
      ) : null}
    </section>

    {emailSendJob && (
      <EmailSendProgress
        jobId={emailSendJob.id}
        title={emailSendJob.title}
        onClear={() => setEmailSendJob(null)}
      />
    )}
    </AdminShell>
  );
};
export default CompetitionManagement;

