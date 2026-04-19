import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import TaskQuizAssetMedia from '../components/TaskQuizAssetMedia';
import LiveDemoEmbed from '../components/LiveDemoEmbed';
import { safeTaskAssetUrl, normalizeLiveDemoOpenUrl } from '../utils/taskQuizAssets';
import './CompetitionWorkspace.css';
import {
  FiUpload,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiLock,
  FiUsers,
  FiFileText,
  FiLink,
  FiFile,
  FiSend,
  FiPlayCircle,
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

function defaultSubmitTypeForMode(competition) {
  if (!competition) return 'zip';
  if (competition.submission_mode === 'link') return 'links';
  if (competition.submission_mode === 'both') return 'zip_and_links';
  return 'zip';
}

const CompetitionWorkspace = () => {
  const { id: competitionId, teamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [competition, setCompetition] = useState(null);
  const [team, setTeam] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskSubmissionMap, setTaskSubmissionMap] = useState({});
  const [taskQuizMarksGate, setTaskQuizMarksGate] = useState(null);
  const [error, setError] = useState(null);

  // Form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [submitType, setSubmitType] = useState('zip'); // synced from backend submission_mode when data loads
  /** task_quiz: step 0 = rules/requirements (if any), then one step per task, then submit */
  const [taskQuizWizardStep, setTaskQuizWizardStep] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [competitionData, teamData, userProfile] = await Promise.all([
        ApiService.getCompetitionById(competitionId),
        ApiService.getTeamById(teamId),
        ApiService.getProfile(),
      ]);

      setCompetition(competitionData);
      setTeam(teamData);
      setCurrentUserId(userProfile?.user_id || null);

      if (competitionData?.type === 'task_quiz') {
        const now = new Date();
        const quizStart = competitionData.quiz_start_at ? new Date(competitionData.quiz_start_at) : null;
        const unlockedForView =
          competitionData.quiz_status === 'active' ||
          (!!quizStart && !Number.isNaN(quizStart.getTime()) && now >= quizStart);

        if (!unlockedForView) {
          setTasks([]);
          setTaskSubmissionMap({});
          setTaskQuizMarksGate(null);
          setSelectedTaskId(null);
          setSubmission(null);
        } else {
          const taskList = await ApiService.getCompetitionTasks(competitionId).catch(() => []);
          const list = Array.isArray(taskList) ? taskList : [];
          const map = {};
          await Promise.all(
            list.map(async (t) => {
              map[t.task_id] = await ApiService.getTeamSubmission(competitionId, teamId, t.task_id).catch(
                () => null
              );
            })
          );
          setTasks(list);
          setTaskSubmissionMap(map);
          const marksData = await ApiService
            .getMyTaskQuizEvaluation(competitionId, teamId)
            .catch(() => null);
          setTaskQuizMarksGate(marksData?.readiness || null);
          setSelectedTaskId((prev) =>
            prev != null && list.some((x) => x.task_id === prev) ? prev : list[0]?.task_id ?? null
          );
        }
      } else if (competitionData?.type === 'quiz') {
        setTasks([]);
        setSelectedTaskId(null);
        setTaskSubmissionMap({});
        setTaskQuizMarksGate(null);
        setSubmission(null);
      } else {
        setTasks([]);
        setSelectedTaskId(null);
        setTaskSubmissionMap({});
        setTaskQuizMarksGate(null);
        const submissionData = await ApiService
          .getTeamSubmission(competitionId, teamId)
          .catch(() => null);
        setSubmission(submissionData);
        if (submissionData) {
          setSubmitType(submissionData.submit_type);
          setGithubUrl(submissionData.repo_url || '');
          setLiveUrl(submissionData.live_url || '');
        } else {
          setSubmitType(defaultSubmitTypeForMode(competitionData));
          setGithubUrl('');
          setLiveUrl('');
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load competition workspace');
    } finally {
      setLoading(false);
    }
  }, [competitionId, teamId]);

  useEffect(() => {
    setTaskQuizWizardStep(0);
  }, [competitionId, teamId]);

  useEffect(() => {
    if (competition?.type !== 'task_quiz' || selectedTaskId == null) return;
    const sub = taskSubmissionMap[selectedTaskId] || null;
    setSubmission(sub);
    if (sub) {
      setSubmitType(sub.submit_type);
      setGithubUrl(sub.repo_url || '');
      setLiveUrl(sub.live_url || '');
    } else {
      setSubmitType(defaultSubmitTypeForMode(competition));
      setGithubUrl('');
      setLiveUrl('');
    }
    setSelectedFile(null);
  }, [competition?.type, selectedTaskId, taskSubmissionMap]);

  useEffect(() => {
    if (competition?.type !== 'task_quiz' || !tasks.length) return;
    const hasRules = typeof competition.rules === 'string' && competition.rules.trim() !== '';
    const hasReq =
      typeof competition.requirements === 'string' && competition.requirements.trim() !== '';
    const bc = (hasRules ? 1 : 0) + (hasReq ? 1 : 0);
    if (taskQuizWizardStep < bc) return;
    const rel = taskQuizWizardStep - bc;
    if (rel >= 2 * tasks.length) return;
    const taskIdx = rel % 2 === 0 ? rel / 2 : (rel - 1) / 2;
    const tid = tasks[taskIdx]?.task_id;
    if (tid != null) setSelectedTaskId(tid);
  }, [
    competition?.type,
    competition?.requirements,
    competition?.rules,
    taskQuizWizardStep,
    tasks,
  ]);

  useEffect(() => {
    if (competition?.type !== 'task_quiz') return;
    const hasRules = typeof competition.rules === 'string' && competition.rules.trim() !== '';
    const hasReq =
      typeof competition.requirements === 'string' && competition.requirements.trim() !== '';
    const bc = (hasRules ? 1 : 0) + (hasReq ? 1 : 0);
    const maxStep = tasks.length > 0 ? bc + 2 * tasks.length - 1 : bc;
    setTaskQuizWizardStep((s) => Math.min(s, maxStep));
  }, [competition?.type, competition?.requirements, competition?.rules, tasks.length]);

  useEffect(() => {
    if (!ApiService.isAuthenticated()) {
      setLoading(false);
      navigate('/login', { replace: true, state: { from: location } });
      return;
    }
    fetchData();
  }, [competitionId, teamId, location, navigate, fetchData]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setError('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const getAllowedSubmitTypes = () => {
    if (!competition) return ['zip', 'links', 'zip_and_links'];
    if (competition.submission_mode === 'upload') return ['zip'];
    if (competition.submission_mode === 'link') return ['links'];
    if (competition.submission_mode === 'both') return ['zip', 'links', 'zip_and_links'];
    return [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allowedTypes = getAllowedSubmitTypes();
    if (!allowedTypes.includes(submitType)) {
      setError('Selected submission type is not allowed for this competition');
      return;
    }

    // Validation
    if (submitType === 'zip' && !selectedFile && !submission?.r2_key) {
      setError('Please select a file to upload');
      return;
    }

    if (submitType === 'links' && !githubUrl && !liveUrl) {
      setError('Please provide at least one URL');
      return;
    }

    if (submitType === 'zip_and_links' && !selectedFile && !submission?.r2_key) {
      setError('Please select a file to upload');
      return;
    }

    if (submitType === 'zip_and_links' && !githubUrl && !liveUrl) {
      setError('Please provide at least one URL');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append('team_id', teamId);
      formData.append('competition_id', competitionId);
      formData.append('submit_type', submitType);

      if (competition?.type === 'task_quiz') {
        if (selectedTaskId == null) {
          setError('Select a task first.');
          setSubmitting(false);
          return;
        }
        formData.append('task_id', String(selectedTaskId));
      }

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      if (githubUrl) {
        formData.append('repo_url', githubUrl);
      }

      if (liveUrl) {
        formData.append('live_url', liveUrl);
      }

      await ApiService.createSubmission(formData);
      
      // Refresh submission data
      await fetchData();
      
      setSelectedFile(null);
      setError(null);
      
    } catch (err) {
      console.error('Error submitting:', err);
      setError(err.message || 'Failed to submit work');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = () => {
    if (!competition?.end_at) return null;
    const now = new Date();
    const end = new Date(competition.end_at);
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const canSubmit = () => {
    if (!competition) return false;
    if (competition.type === 'quiz') return false;

    const isLeader = !!team?.members?.some(
      (m) => m?.user_id === currentUserId && String(m?.role).toLowerCase() === 'leader'
    );
    if (['project', 'task_quiz'].includes(competition.type) && !isLeader) return false;

    if (competition.type === 'task_quiz') {
      if (!tasks.length || selectedTaskId == null) return false;
      const now = new Date();
      const quizStart = competition.quiz_start_at ? new Date(competition.quiz_start_at) : null;
      const quizEnd = competition.quiz_end_at ? new Date(competition.quiz_end_at) : null;
      if (!quizEnd || Number.isNaN(quizEnd.getTime())) return false;

      const unlockedForView =
        competition.quiz_status === 'active' ||
        (!!quizStart && !Number.isNaN(quizStart.getTime()) && now >= quizStart);

      // Submissions are allowed only after unlock and before quiz end.
      const withinQuizWindow = unlockedForView && now < quizEnd;

      if (!withinQuizWindow) return false;
      if (competition.status === 'draft' || competition.status === 'finished') return false;
      return true;
    }

    if (competition.type === 'external' || competition.submission_mode === 'none') return false;
    if (competition.status !== 'open') return false;

    const now = new Date();
    const end = new Date(competition.end_at);
    return now < end;
  };
  const allowedSubmitTypes = getAllowedSubmitTypes();
  const isCurrentUserLeader = !!team?.members?.some(
    (m) => m?.user_id === currentUserId && String(m?.role).toLowerCase() === 'leader'
  );
  const isFrontendMultitask = competition?.type === 'project' && competition?.config?.multiTask === true;
  const isClassicQuiz = competition?.type === 'quiz';
  const isTaskQuiz = competition?.type === 'task_quiz';

  const nowTs = Date.now();
  const quizStart = competition?.quiz_start_at ? new Date(competition.quiz_start_at) : null;
  const quizEnd = competition?.quiz_end_at ? new Date(competition.quiz_end_at) : null;
  const quizStartValid = !!quizStart && !Number.isNaN(quizStart.getTime());
  const quizEndValid = !!quizEnd && !Number.isNaN(quizEnd.getTime());
  const quizUnlockedForView =
    isClassicQuiz && (competition?.quiz_status === 'active' || (quizStartValid && nowTs >= quizStart.getTime()));
  const quizUnlockedForTake = quizUnlockedForView && quizEndValid && nowTs < quizEnd.getTime();

  const selectedTask =
    isTaskQuiz && selectedTaskId != null ? tasks.find((x) => x.task_id === selectedTaskId) : null;

  const taskQuizHasRulesContent =
    isTaskQuiz &&
    typeof competition?.rules === 'string' &&
    competition.rules.trim() !== '';
  const taskQuizHasRequirementsContent =
    isTaskQuiz &&
    typeof competition?.requirements === 'string' &&
    competition.requirements.trim() !== '';

  const taskQuizBriefingCount =
    (taskQuizHasRulesContent ? 1 : 0) + (taskQuizHasRequirementsContent ? 1 : 0);
  const taskQuizRulesStepIndex = taskQuizHasRulesContent ? 0 : -1;
  const taskQuizRequirementsStepIndex = taskQuizHasRequirementsContent
    ? taskQuizHasRulesContent
      ? 1
      : 0
    : -1;
  const taskQuizRelativeStep =
    isTaskQuiz && taskQuizWizardStep >= taskQuizBriefingCount
      ? taskQuizWizardStep - taskQuizBriefingCount
      : -1;
  const taskQuizIsSubmitStep =
    isTaskQuiz &&
    tasks.length > 0 &&
    taskQuizRelativeStep >= 0 &&
    taskQuizRelativeStep % 2 === 1 &&
    taskQuizRelativeStep < 2 * tasks.length;
  const taskQuizIsTaskStep =
    isTaskQuiz &&
    tasks.length > 0 &&
    taskQuizRelativeStep >= 0 &&
    taskQuizRelativeStep % 2 === 0 &&
    taskQuizRelativeStep < 2 * tasks.length;
  const taskQuizSubmitForTaskIndex = taskQuizIsSubmitStep
    ? (taskQuizRelativeStep - 1) / 2
    : -1;
  const taskQuizIsRulesStep =
    isTaskQuiz && taskQuizHasRulesContent && taskQuizWizardStep === taskQuizRulesStepIndex;
  const taskQuizIsRequirementsStep =
    isTaskQuiz &&
    taskQuizHasRequirementsContent &&
    taskQuizWizardStep === taskQuizRequirementsStepIndex;
  const taskQuizIsBriefingStep = taskQuizIsRulesStep || taskQuizIsRequirementsStep;
  const taskQuizWizardTaskIndex = taskQuizIsTaskStep ? taskQuizRelativeStep / 2 : -1;
  const taskQuizPageTask =
    taskQuizWizardTaskIndex >= 0 ? tasks[taskQuizWizardTaskIndex] : null;
  const taskQuizPageRefUrl = taskQuizPageTask
    ? safeTaskAssetUrl(taskQuizPageTask.assets_url)
    : null;
  const taskQuizTotalPages =
    tasks.length > 0 ? taskQuizBriefingCount + 2 * tasks.length : taskQuizBriefingCount + 1;
  const taskQuizCurrentPage = taskQuizWizardStep + 1;

  const taskQuizGoBack = () => setTaskQuizWizardStep((s) => Math.max(0, s - 1));

  const taskQuizGoNext = () => {
    if (!isTaskQuiz) return;
    const bc = taskQuizBriefingCount;
    const T = tasks.length;
    const maxStep = T > 0 ? bc + 2 * T - 1 : bc;
    setTaskQuizWizardStep((s) => Math.min(s + 1, maxStep));
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error && !competition) {
    return (
      <section className="CompetitionWorkspace">
        <BackButton to={`/competitions/${competitionId}`} label="Back to Competition" />
        <div className="CompetitionWorkspace__error">
          <FiAlertCircle size={60} />
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  // Quiz-based competitions: block workspace access entirely until the quiz unlocks.
  if (isClassicQuiz || isTaskQuiz) {
    const now = new Date();
    const quizStart = competition?.quiz_start_at ? new Date(competition.quiz_start_at) : null;
    const unlockedForView =
      competition?.quiz_status === 'active' ||
      (!!quizStart && !Number.isNaN(quizStart.getTime()) && now >= quizStart);

    if (!unlockedForView) {
      return (
        <section className="CompetitionWorkspace">
          <BackButton to={`/competitions/${competitionId}`} label="Back to Competition" />
          <div className="CompetitionWorkspace__error">
            <FiLock size={60} />
            <h2>{isTaskQuiz ? 'Task quiz is locked' : 'Quiz workspace is locked'}</h2>
            <p>
              This workspace unlocks when the quiz is activated or when its scheduled start time is reached
              {competition?.quiz_start_at ? ` (${formatDateTime(competition.quiz_start_at)}).` : '.'}
            </p>
          </div>
        </section>
      );
    }
  }

  return (
    <section className="CompetitionWorkspace">
      <BackButton to={`/competitions/${competitionId}`} label="Back to Competition" />
      <SEO
        title={`${competition?.title} - Workspace`}
        description="Competition workspace"
      />

      <div className="CompetitionWorkspace__container">
        {/* Header */}
        <motion.header
          className="CompetitionWorkspace__header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="CompetitionWorkspace__headerContent">
            <h1 className="CompetitionWorkspace__title">{competition?.title}</h1>
            <div className="CompetitionWorkspace__meta">
              <span className="CompetitionWorkspace__team">
                <FiUsers size={18} />
                {team?.team_name}
              </span>
              <span className="CompetitionWorkspace__deadline">
                <FiClock size={18} />
                {getTimeRemaining()}
              </span>
            </div>
          </div>
          {competition?.end_at && (
            <div className="CompetitionWorkspace__deadlineBox">
              <span>Deadline: {formatDateTime(competition.end_at)}</span>
            </div>
          )}
          {isTaskQuiz && taskQuizMarksGate?.can_view_marks === true && (
            <div className="CompetitionWorkspace__deadlineBox" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="CompetitionWorkspace__quizBtnSecondary"
                onClick={() => navigate(`/competitions/${competitionId}/team/${teamId}/marks`)}
              >
                View my marks
              </button>
            </div>
          )}
        </motion.header>

        <div
          className={`CompetitionWorkspace__grid${
            isTaskQuiz ? ' CompetitionWorkspace__grid--taskQuizSolo' : ''
          }`}
        >
          {!isTaskQuiz && (
            <motion.div
              className="CompetitionWorkspace__tasks"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="CompetitionWorkspace__section">
                <h2 className="CompetitionWorkspace__sectionTitle">
                  <FiFileText size={24} />
                  Competition Description
                </h2>
                <div className="CompetitionWorkspace__description">
                  {competition?.description || 'No description provided'}
                </div>
              </div>

              {competition?.requirements && (
                <div className="CompetitionWorkspace__section">
                  <h2 className="CompetitionWorkspace__sectionTitle">
                    <FiCheckCircle size={24} />
                    Requirements
                  </h2>
                  <div className="CompetitionWorkspace__requirements">
                    {competition.requirements}
                  </div>
                </div>
              )}

              {competition?.rules && (
                <div className="CompetitionWorkspace__section">
                  <h2 className="CompetitionWorkspace__sectionTitle">
                    <FiAlertCircle size={24} />
                    Rules
                  </h2>
                  <div className="CompetitionWorkspace__rules">{competition.rules}</div>
                </div>
              )}
            </motion.div>
          )}

          {isTaskQuiz && taskQuizIsRulesStep && (
            <motion.div
              className="CompetitionWorkspace__taskQuizBriefing"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="CompetitionWorkspace__taskQuizWizardBar">
                <span className="CompetitionWorkspace__taskQuizWizardProgress">
                  Page {taskQuizCurrentPage} of {taskQuizTotalPages}
                </span>
                <span className="CompetitionWorkspace__taskQuizWizardStepLabel">Rules</span>
              </div>
              <h2 className="CompetitionWorkspace__taskQuizBriefingTitle">Competition rules</h2>
              <p className="CompetitionWorkspace__taskQuizBriefingIntro">
                Read the rules carefully. Confirm to continue
                {taskQuizHasRequirementsContent ? ' to the requirements page' : ''}
                {tasks.length > 0
                  ? ', then each task on its own page followed by a submission page for that task.'
                  : '.'}
              </p>
              <div className="CompetitionWorkspace__taskQuizBriefingScroll">
                <div className="CompetitionWorkspace__taskQuizBriefingBlock">
                  <div className="CompetitionWorkspace__rules">{competition.rules}</div>
                </div>
              </div>
              <div className="CompetitionWorkspace__taskQuizActions CompetitionWorkspace__taskQuizActions--wizard">
                <button
                  type="button"
                  className="CompetitionWorkspace__taskQuizPagerBtn"
                  onClick={taskQuizGoBack}
                  disabled={taskQuizWizardStep <= 0}
                >
                  <FiChevronLeft size={20} aria-hidden />
                  Back
                </button>
                <button type="button" className="CompetitionWorkspace__taskQuizNextBtn" onClick={taskQuizGoNext}>
                  <FiCheckCircle size={22} aria-hidden />
                  Confirm
                </button>
              </div>
            </motion.div>
          )}

          {isTaskQuiz && taskQuizIsRequirementsStep && (
            <motion.div
              className="CompetitionWorkspace__taskQuizBriefing"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="CompetitionWorkspace__taskQuizWizardBar">
                <span className="CompetitionWorkspace__taskQuizWizardProgress">
                  Page {taskQuizCurrentPage} of {taskQuizTotalPages}
                </span>
                <span className="CompetitionWorkspace__taskQuizWizardStepLabel">Requirements</span>
              </div>
              <h2 className="CompetitionWorkspace__taskQuizBriefingTitle">Requirements</h2>
              <p className="CompetitionWorkspace__taskQuizBriefingIntro">
                Confirm when you have read the requirements
                {tasks.length > 0 ? ' to start the tasks (each task, then submit for that task).' : '.'}
              </p>
              <div className="CompetitionWorkspace__taskQuizBriefingScroll">
                <div className="CompetitionWorkspace__taskQuizBriefingBlock">
                  <div className="CompetitionWorkspace__requirements">{competition.requirements}</div>
                </div>
              </div>
              <div className="CompetitionWorkspace__taskQuizActions CompetitionWorkspace__taskQuizActions--wizard">
                <button type="button" className="CompetitionWorkspace__taskQuizPagerBtn" onClick={taskQuizGoBack}>
                  <FiChevronLeft size={20} aria-hidden />
                  Back
                </button>
                <button type="button" className="CompetitionWorkspace__taskQuizNextBtn" onClick={taskQuizGoNext}>
                  <FiCheckCircle size={22} aria-hidden />
                  Confirm
                </button>
              </div>
            </motion.div>
          )}

          {isTaskQuiz && taskQuizIsTaskStep && (
            <motion.div
              className="CompetitionWorkspace__taskQuizQuestion"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="CompetitionWorkspace__taskQuizWizardBar">
                <span className="CompetitionWorkspace__taskQuizWizardProgress">
                  Page {taskQuizCurrentPage} of {taskQuizTotalPages}
                </span>
                <span className="CompetitionWorkspace__taskQuizWizardStepLabel">
                  Task {taskQuizWizardTaskIndex + 1} of {tasks.length}
                </span>
              </div>
              <div className="CompetitionWorkspace__taskQuizHeading">
                <h2 className="CompetitionWorkspace__taskQuizTitle">{taskQuizPageTask?.title}</h2>
                {taskQuizPageTask &&
                  (taskSubmissionMap[taskQuizPageTask.task_id] ? (
                    <span className="CompetitionWorkspace__taskBadge">Submitted</span>
                  ) : (
                    <span className="CompetitionWorkspace__taskBadge CompetitionWorkspace__taskBadge--pending">
                      Not submitted
                    </span>
                  ))}
              </div>
              {taskQuizPageTask?.description ? (
                <div className="CompetitionWorkspace__taskQuizBody">{taskQuizPageTask.description}</div>
              ) : null}
              {taskQuizPageRefUrl ? (
                <div className="CompetitionWorkspace__taskQuizAssetWrap">
                  <p className="CompetitionWorkspace__taskQuizAssetCaption">Reference material</p>
                  <TaskQuizAssetMedia
                    url={taskQuizPageTask.assets_url}
                    variant="hero"
                    title={`Reference for ${taskQuizPageTask?.title || 'this task'}`}
                  />
                </div>
              ) : taskQuizPageTask?.assets_url ? (
                <p className="CompetitionWorkspace__taskRefNote">
                  A reference link is set for this task; only secure <code>http(s)</code> URLs are shown inline here.
                </p>
              ) : null}
              <div className="CompetitionWorkspace__taskQuizActions CompetitionWorkspace__taskQuizActions--wizard">
                <button
                  type="button"
                  className="CompetitionWorkspace__taskQuizPagerBtn"
                  onClick={taskQuizGoBack}
                  disabled={taskQuizWizardStep <= 0}
                >
                  <FiChevronLeft size={20} aria-hidden />
                  Back
                </button>
                <button
                  type="button"
                  className="CompetitionWorkspace__taskQuizNextBtn"
                  disabled={!taskQuizPageTask}
                  onClick={taskQuizGoNext}
                >
                  Next — Submit for this task
                  <FiChevronRight size={22} aria-hidden />
                </button>
              </div>
            </motion.div>
          )}

          {isTaskQuiz &&
            tasks.length === 0 &&
            taskQuizWizardStep === taskQuizBriefingCount && (
              <motion.div
                className="CompetitionWorkspace__taskQuizQuestion"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
              >
                <div className="CompetitionWorkspace__taskQuizWizardBar">
                  <span className="CompetitionWorkspace__taskQuizWizardProgress">
                    Page {taskQuizCurrentPage} of {taskQuizTotalPages}
                  </span>
                  <span className="CompetitionWorkspace__taskQuizWizardStepLabel">Tasks</span>
                </div>
                <p className="CompetitionWorkspace__description">
                  Tasks are not published yet. Check back after organizers add them in the admin panel.
                </p>
                <div className="CompetitionWorkspace__taskQuizActions CompetitionWorkspace__taskQuizActions--wizard">
                  <button
                    type="button"
                    className="CompetitionWorkspace__taskQuizPagerBtn"
                    onClick={taskQuizGoBack}
                    disabled={taskQuizBriefingCount === 0}
                  >
                    <FiChevronLeft size={20} aria-hidden />
                    Back
                  </button>
                  <span className="CompetitionWorkspace__taskQuizWizardSpacer" aria-hidden />
                </div>
              </motion.div>
            )}

          {(!isTaskQuiz || taskQuizIsSubmitStep) && (
          <motion.div
            key={
              isTaskQuiz && taskQuizIsSubmitStep
                ? `task-quiz-submit-${taskQuizSubmitForTaskIndex}`
                : 'workspace-submission'
            }
            className={
              isTaskQuiz
                ? 'CompetitionWorkspace__submission CompetitionWorkspace__submission--taskQuizFull'
                : 'CompetitionWorkspace__submission'
            }
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: isTaskQuiz ? 0 : 0.2 }}
          >
            {isTaskQuiz && taskQuizIsSubmitStep && (
              <div className="CompetitionWorkspace__taskQuizSubmitHeader">
                <button
                  type="button"
                  className="CompetitionWorkspace__taskQuizBackBtn"
                  onClick={taskQuizGoBack}
                >
                  <FiArrowLeft size={20} aria-hidden />
                  Back to task
                </button>
                <span className="CompetitionWorkspace__taskQuizWizardProgress">
                  Page {taskQuizCurrentPage} of {taskQuizTotalPages} — submission ·{' '}
                  {tasks[taskQuizSubmitForTaskIndex]?.title || `Task ${taskQuizSubmitForTaskIndex + 1}`}
                </span>
              </div>
            )}
            {/* Current Submission Status */}
            {!isClassicQuiz && submission && (
              <div className="CompetitionWorkspace__currentSubmission">
                <h3 className="CompetitionWorkspace__submissionTitle">
                  <FiCheckCircle size={20} />
                  Submitted Work
                </h3>
                <div className="CompetitionWorkspace__submissionInfo">
                  <p>
                    <strong>Submitted:</strong> {formatDateTime(submission.submitted_at)}
                  </p>
                  <p>
                    <strong>Type:</strong> {submission.submit_type.replace('_', ' + ').toUpperCase()}
                  </p>
                  {submission.repo_url && (
                    <p>
                      <strong>GitHub:</strong>{' '}
                      <a href={submission.repo_url} target="_blank" rel="noopener noreferrer">
                        {submission.repo_url}
                      </a>
                    </p>
                  )}
                  {submission.live_url &&
                    (() => {
                      const liveOpen = normalizeLiveDemoOpenUrl(submission.live_url);
                      return (
                        <>
                          <p>
                            <strong>Live URL:</strong>{' '}
                            {liveOpen ? (
                              <a href={liveOpen} target="_blank" rel="noopener noreferrer">
                                {submission.live_url}
                              </a>
                            ) : (
                              <span>{submission.live_url}</span>
                            )}
                          </p>
                          <LiveDemoEmbed liveUrl={submission.live_url} embedTitle="Your submission — live preview" />
                        </>
                      );
                    })()}
                  {submission.r2_key && (
                    <p>
                      <strong>File:</strong> Uploaded ✓
                    </p>
                  )}
                  {submission.score !== null && (
                    <div className="CompetitionWorkspace__score">
                      <strong>Score:</strong> {submission.score}/100
                      {submission.feedback && (
                        <div className="CompetitionWorkspace__feedback">
                          <strong>Feedback:</strong>
                          <p>{submission.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submission Form */}
            {!isClassicQuiz ? (
            <div className="CompetitionWorkspace__submitForm">
              <h3 className="CompetitionWorkspace__submissionTitle">
                <FiSend size={20} />
                {isTaskQuiz && selectedTaskId
                  ? `${submission ? 'Update' : 'Submit'} — ${
                      tasks.find((x) => x.task_id === selectedTaskId)?.title || 'Task'
                    }`
                  : submission
                    ? 'Update Submission'
                    : 'Submit Your Work'}
              </h3>

              {isTaskQuiz && competition?.evaluation_mode && ['auto', 'hybrid'].includes(competition.evaluation_mode) && (
                <div className="CompetitionWorkspace__alert CompetitionWorkspace__alert--warning">
                  <FiAlertCircle size={18} />
                  <span>
                    Automated scoring runs when you upload a <strong>ZIP</strong> (same engine as project
                    competitions). Link-only submissions are not auto-scored.
                  </span>
                </div>
              )}

              {!canSubmit() && (
                <div className="CompetitionWorkspace__alert CompetitionWorkspace__alert--warning">
                  <FiAlertCircle size={18} />
                  <span>
                    {!isCurrentUserLeader && ['project', 'task_quiz'].includes(competition?.type)
                      ? 'Only the team leader can submit. You can still view team progress and marks.'
                      : competition?.type === 'external' || competition?.submission_mode === 'none'
                      ? 'This is an external competition. Submissions are disabled.'
                      : competition?.status !== 'open'
                      ? 'Competition is not open for submissions'
                      : 'Submission deadline has passed'}
                  </span>
                </div>
              )}

              {isFrontendMultitask && (
                <div className="CompetitionWorkspace__alert CompetitionWorkspace__alert--warning">
                  <FiAlertCircle size={18} />
                  <span>Multi-task submission: ZIP must contain `/task1` and `/task2` folders.</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="CompetitionWorkspace__alert CompetitionWorkspace__alert--error">
                    <FiAlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Type Selection */}
                <div className="CompetitionWorkspace__formGroup">
                  <label className="CompetitionWorkspace__label">Submission Type</label>
                  <div className="CompetitionWorkspace__radioGroup">
                    <label className="CompetitionWorkspace__radio">
                      <input
                        type="radio"
                        value="zip"
                        checked={submitType === 'zip'}
                        onChange={(e) => setSubmitType(e.target.value)}
                        disabled={!canSubmit() || submitting || !allowedSubmitTypes.includes('zip')}
                      />
                      <span>ZIP File Only</span>
                    </label>
                    <label className="CompetitionWorkspace__radio">
                      <input
                        type="radio"
                        value="links"
                        checked={submitType === 'links'}
                        onChange={(e) => setSubmitType(e.target.value)}
                        disabled={!canSubmit() || submitting || !allowedSubmitTypes.includes('links')}
                      />
                      <span>Links Only</span>
                    </label>
                    <label className="CompetitionWorkspace__radio">
                      <input
                        type="radio"
                        value="zip_and_links"
                        checked={submitType === 'zip_and_links'}
                        onChange={(e) => setSubmitType(e.target.value)}
                        disabled={!canSubmit() || submitting || !allowedSubmitTypes.includes('zip_and_links')}
                      />
                      <span>ZIP + Links</span>
                    </label>
                  </div>
                </div>

                {/* File Upload */}
                {(submitType === 'zip' || submitType === 'zip_and_links') && (
                  <div className="CompetitionWorkspace__formGroup">
                    <label className="CompetitionWorkspace__label">
                      <FiFile size={18} />
                      Upload ZIP File (Max 50MB)
                    </label>
                    <div className="CompetitionWorkspace__fileUpload">
                      <input
                        type="file"
                        id="fileInput"
                        accept=".zip"
                        onChange={handleFileChange}
                        disabled={!canSubmit() || submitting}
                        className="CompetitionWorkspace__fileInput"
                      />
                      <label htmlFor="fileInput" className="CompetitionWorkspace__fileLabel">
                        <FiUpload size={24} />
                        <span>
                          {selectedFile
                            ? selectedFile.name
                            : submission?.r2_key
                            ? 'File uploaded ✓ - Click to replace'
                            : 'Click to upload or drag and drop'}
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Links */}
                {(submitType === 'links' || submitType === 'zip_and_links') && (
                  <>
                    <div className="CompetitionWorkspace__formGroup">
                      <label htmlFor="githubUrl" className="CompetitionWorkspace__label">
                        <FiLink size={18} />
                        GitHub Repository URL
                      </label>
                      <input
                        type="url"
                        id="githubUrl"
                        className="CompetitionWorkspace__input"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/username/repo"
                        disabled={!canSubmit() || submitting}
                      />
                    </div>

                    <div className="CompetitionWorkspace__formGroup">
                      <label htmlFor="liveUrl" className="CompetitionWorkspace__label">
                        <FiLink size={18} />
                        Live Demo URL
                      </label>
                      <input
                        type="url"
                        id="liveUrl"
                        className="CompetitionWorkspace__input"
                        value={liveUrl}
                        onChange={(e) => setLiveUrl(e.target.value)}
                        placeholder="https://your-demo.com"
                        disabled={!canSubmit() || submitting}
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="CompetitionWorkspace__submitBtn"
                  disabled={!canSubmit() || submitting}
                >
                  {submitting ? (
                    'Submitting...'
                  ) : submission ? (
                    'Update Submission'
                  ) : (
                    <>
                      <FiSend size={18} />
                      Submit Work
                    </>
                  )}
                </button>
              </form>
              {isTaskQuiz && taskQuizIsSubmitStep && taskQuizSubmitForTaskIndex < tasks.length - 1 && (
                <div className="CompetitionWorkspace__taskQuizPostSubmit">
                  <p className="CompetitionWorkspace__taskQuizPostSubmitHint">
                    When you are finished submitting for this task, continue to the next one.
                  </p>
                  <button
                    type="button"
                    className="CompetitionWorkspace__taskQuizNextBtn"
                    onClick={taskQuizGoNext}
                  >
                    Continue to next task
                    <FiChevronRight size={22} aria-hidden />
                  </button>
                </div>
              )}
            </div>
            ) : (
              <div className="CompetitionWorkspace__submitForm">
                <h3 className="CompetitionWorkspace__submissionTitle">
                  <FiFileText size={20} />
                  Quiz Competition
                </h3>
                <p className="CompetitionWorkspace__quizIntro">
                  There is no file or link submission here. Open the quiz page to answer questions; scoring is
                  automatic when you submit. The quiz must be <strong>published</strong> or{' '}
                  <strong>active</strong> (or its scheduled start time must be reached) for attempts.
                  {competition?.quiz_status ? (
                    <>
                      {' '}
                      Current quiz status: <strong>{competition.quiz_status}</strong>.
                    </>
                  ) : null}
                </p>
                <div className="CompetitionWorkspace__quizActions">
                  {quizUnlockedForTake && (
                    <button
                      type="button"
                      className="CompetitionWorkspace__submitBtn CompetitionWorkspace__submitBtn--quizStart"
                      onClick={() => navigate(`/quizpage/${competitionId}/take/1`)}
                    >
                      <FiPlayCircle size={20} aria-hidden />
                      Start Quiz
                    </button>
                  )}
                  {quizUnlockedForView ? (
                    <button
                      type="button"
                      className={
                        competition?.quiz_status === 'active'
                          ? 'CompetitionWorkspace__quizBtnSecondary'
                          : 'CompetitionWorkspace__submitBtn'
                      }
                      onClick={() => navigate(`/quizpage/${competitionId}`)}
                    >
                      <FiFileText size={18} aria-hidden />
                      {competition?.quiz_status === 'active' ? 'Quiz overview' : 'Open quiz page'}
                    </button>
                  ) : (
                    <div className="CompetitionWorkspace__alert CompetitionWorkspace__alert--warning">
                      <FiLock size={18} />
                      <span style={{ marginLeft: 8 }}>Quiz is locked until it activates or its start time is reached.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CompetitionWorkspace;
