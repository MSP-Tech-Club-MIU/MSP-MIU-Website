import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import './CompetitionDetails.css';
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUsers,
  FiAward,
  FiCheckCircle,
  FiLock,
  FiEye,
  FiAlertCircle,
  FiFileText,
  FiUserPlus,
  FiPlayCircle
} from 'react-icons/fi';

const CompetitionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userTeam, setUserTeam] = useState(null);

  // Check user role and fetch competition
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let resolvedUserId = null;

        if (ApiService.isAuthenticated()) {
          try {
            const user = await ApiService.getProfile();
            resolvedUserId = user.user_id;
            setUserRole(user.role);
            setUserId(user.user_id);
          } catch (err) {
            console.error('Error fetching user profile:', err);
            setUserRole(null);
            setUserId(null);
          }
        } else {
          setUserRole(null);
          setUserId(null);
        }

        const compData = await ApiService.getCompetitionById(id);
        setCompetition(compData);

        if (resolvedUserId && compData) {
          try {
            const team = await ApiService.getUserTeamForCompetition(id);
            setUserTeam(team);
          } catch (err) {
            setUserTeam(null);
          }
        } else {
          setUserTeam(null);
        }

      } catch (err) {
        console.error('Error fetching competition details:', err);
        setError(err.message || 'Failed to load competition details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getTimeRemaining = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      const diff = start - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return `Starts in ${days}d ${hours}h`;
    } else if (now >= start && now <= end) {
      const diff = end - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return `Ends in ${days}d ${hours}h`;
    } else {
      return 'Competition Ended';
    }
  };

  const getStatusConfig = (status) => {
    const statusConfigs = {
      draft: { icon: FiEye, color: '#757575', label: 'Draft', bg: 'rgba(117, 117, 117, .15)' },
      open: { icon: FiCheckCircle, color: '#83BD00', label: 'Open for Registration', bg: 'rgba(131, 189, 0, .15)' },
      locked: { icon: FiLock, color: '#FFC107', label: 'Registration Locked', bg: 'rgba(255, 193, 7, .15)' },
      judging: { icon: FiAward, color: '#03A9F4', label: 'Under Judging', bg: 'rgba(3, 169, 244, .15)' },
      finished: { icon: FiCheckCircle, color: '#F4581F', label: 'Finished', bg: 'rgba(244, 88, 31, .15)' }
    };
    return statusConfigs[status] || statusConfigs.draft;
  };

  const canRegister = () => {
    if (!competition) return false;
    if (competition.type === 'quiz' && !isQuizRegistrationOpen()) return false;
    // Can register if competition is open and user doesn't have a team (or is a guest)
    return competition.status === 'open' && !userTeam;
  };

  const canCreateTeam = () => {
    if (!competition) return false;
    if (competition.type === 'quiz' && !isQuizRegistrationOpen()) return false;
    // Guests can create teams, authenticated users can if they don't have a team
    return competition.status === 'open' && (!userId || !userTeam);
  };

  const isQuizRegistrationOpen = () => {
    if (!competition || competition.type !== 'quiz') return true;
    const now = new Date();
    const startDate = new Date(competition.start_at);
    if (Number.isNaN(startDate.getTime())) return true;
    return now < startDate;
  };

  const isCompetitionActive = () => {
    if (!competition) return false;
    const now = new Date();
    const startDate = new Date(competition.start_at);
    const endDate = new Date(competition.end_at);
    // Competition is active if current time is between start and end dates
    return now >= startDate && now < endDate;
  };

  const isSoloCompetition = () =>
    competition && (competition.is_team_based === false || competition.is_team_based === 0);

  const formatSubmissionLabel = () => {
    if (!competition) return '';
    if (competition.type === 'quiz') {
      return 'Answer in the team workspace (no ZIP or repository upload).';
    }
    if (competition.type === 'task_quiz') {
      return 'Complete each task from the team workspace (ZIP and/or links per organizer settings).';
    }
    const mode = competition.submission_mode;
    if (mode === 'upload') return 'ZIP file via workspace upload (stored securely).';
    if (mode === 'link') return 'Repository and/or live demo links.';
    if (mode === 'both') return 'ZIP upload and/or links.';
    if (mode === 'none' || competition.type === 'external') return 'No submission through this site.';
    return mode || '—';
  };

  const formatEvaluationLabel = () => {
    if (!competition) return '';
    if (competition.type === 'quiz') {
      return 'Auto-graded from your quiz answers.';
    }
    if (competition.type === 'task_quiz') {
      const ev = competition.evaluation_mode;
      if (ev === 'manual') return 'Judges review each task submission manually.';
      if (ev === 'auto') return 'Automated scoring on each ZIP upload (when provided).';
      if (ev === 'hybrid') return 'Automated ZIP scoring plus manual judge input.';
      if (ev === 'none') return 'No scoring pipeline configured.';
      return ev || '—';
    }
    const ev = competition.evaluation_mode;
    if (ev === 'manual') return 'Judges review submissions manually.';
    if (ev === 'auto') return 'Automated scoring runs on your uploaded ZIP (when a ZIP is on file).';
    if (ev === 'hybrid') return 'Automated scoring on ZIP plus manual judge input.';
    if (ev === 'none') return 'No automated scoring pipeline for this competition.';
    return ev || '—';
  };

  const handleJoinSoloCompetition = async () => {
    try {
      // For solo competitions, create a team automatically with user's name
      const teamName = userId ? `Solo - ${Date.now()}` : `Guest - ${Date.now()}`;
      
      const teamData = await ApiService.createTeam({
        competition_id: id,
        team_name: teamName,
        leader_name: competition.temp_leader_name || 'Participant',
        leader_university_id: competition.temp_leader_id || '',
        leader_email: competition.temp_leader_email || ''
      });

      // Navigate to the team workspace
      if (teamData.pending_leader_activation) {
        navigate('/', {
          state: {
            message: 'Registration successful! Check your email to activate your account.'
          }
        });
      } else {
        navigate(`/competitions/${id}/team/${teamData.team_id}`);
      }
    } catch (error) {
      console.error('Error joining solo competition:', error);
      // If error, fall back to create team page
      navigate(`/competitions/${id}/create-team`);
    }
  };

  const handleCreateTeam = () => {
    // For solo competitions, join directly
    if (isSoloCompetition()) {
      handleJoinSoloCompetition();
      return;
    }
    navigate(`/competitions/${id}/create-team`);
  };

  const handleStartCompetition = () => {
    if (userTeam) {
      navigate(`/competitions/${id}/team/${userTeam.team_id}`);
    }
  };

  const handleViewTeam = () => {
    if (userTeam) {
      navigate(`/competitions/${id}/team/${userTeam.team_id}`);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !competition) {
    return (
      <section className="CompetitionDetailsPage">
        <BackButton to="/competitions" label="Back to Competitions" />
        <div className="CompetitionDetailsPage__error">
          <FiAlertCircle size={60} />
          <h2>Competition Not Found</h2>
          <p>{error || 'The competition you are looking for does not exist.'}</p>
          <button onClick={() => navigate('/competitions')} className="CompetitionDetailsPage__errorBtn">
            View All Competitions
          </button>
        </div>
      </section>
    );
  }

  const statusConfig = getStatusConfig(competition.status);
  const StatusIcon = statusConfig.icon;

  return (
    <section className="CompetitionDetailsPage">
      <BackButton to="/competitions" label="Back to Competitions" />
      <SEO
        title={competition.title}
        description={competition.description}
        keywords={`MSP competition, ${competition.title}, tech challenge, MIU`}
      />

      <div className="CompetitionDetailsPage__container">
        {/* Header Section */}
        <motion.header
          className="CompetitionDetailsPage__header"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="CompetitionDetailsPage__statusBadge" style={{ background: statusConfig.bg }}>
            <StatusIcon size={20} style={{ color: statusConfig.color }} />
            <span style={{ color: statusConfig.color }}>{statusConfig.label}</span>
          </div>

          <h1 className="CompetitionDetailsPage__title">{competition.title}</h1>
          <p className="CompetitionDetailsPage__description">{competition.description}</p>

          <div className="CompetitionDetailsPage__timer">
            <FiClock size={20} />
            <span>{getTimeRemaining(competition.start_at, competition.end_at)}</span>
          </div>
        </motion.header>

        {/* Main Info Grid */}
        <motion.div
          className="CompetitionDetailsPage__infoGrid"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="CompetitionDetailsPage__infoCard">
            <FiCalendar size={24} className="CompetitionDetailsPage__infoIcon" />
            <h3>Start Date</h3>
            <p>{formatDateTime(competition.start_at)}</p>
          </div>

          <div className="CompetitionDetailsPage__infoCard">
            <FiClock size={24} className="CompetitionDetailsPage__infoIcon" />
            <h3>End Date</h3>
            <p>{formatDateTime(competition.end_at)}</p>
          </div>

          <div className="CompetitionDetailsPage__infoCard">
            <FiMapPin size={24} className="CompetitionDetailsPage__infoIcon" />
            <h3>Location</h3>
            <p>
              <strong>{competition.location_type === 'on-campus' ? 'On-Campus' : 'Online'}</strong>
              <br />
              {competition.location_details || 'Details TBA'}
            </p>
          </div>

          <div className="CompetitionDetailsPage__infoCard">
            <FiUsers size={24} className="CompetitionDetailsPage__infoIcon" />
            <h3>Team Size</h3>
            <p>
              {competition.min_team_size === competition.max_team_size
                ? `Exactly ${competition.max_team_size} member${competition.max_team_size > 1 ? 's' : ''}`
                : `${competition.min_team_size}-${competition.max_team_size} members`}
            </p>
          </div>

          <div className="CompetitionDetailsPage__infoCard CompetitionDetailsPage__infoCard--wide">
            <FiFileText size={24} className="CompetitionDetailsPage__infoIcon" />
            <h3>How this competition works</h3>
            <p>
              <strong>Type:</strong>{' '}
              {competition.type === 'quiz'
                ? 'Quiz (MCQ / text)'
                : competition.type === 'task_quiz'
                  ? 'Task quiz'
                  : competition.type === 'external'
                    ? 'External'
                    : 'Project'}
            </p>
            <p style={{ marginTop: 8 }}>
              <strong>Submissions:</strong> {formatSubmissionLabel()}
            </p>
            <p style={{ marginTop: 8 }}>
              <strong>Evaluation:</strong> {formatEvaluationLabel()}
            </p>
            {competition.type === 'quiz' && (
              <div className="CompetitionDetailsPage__quizCta">
                <p className="CompetitionDetailsPage__quizCtaHint">
                  {competition.quiz_status && (
                    <>
                      Quiz status: <strong>{competition.quiz_status}</strong>
                      {competition.quiz_status === 'active'
                        ? ' — the quiz is live; you can open the quiz page to begin.'
                        : competition.quiz_status === 'published'
                          ? ' — open the quiz page for schedule and rules; question wording appears when the quiz is active.'
                          : ' — check back when organizers publish or activate the quiz.'}
                    </>
                  )}
                  {!competition.quiz_status && (
                    <>Quiz details will appear once the quiz is set up for this competition.</>
                  )}
                </p>
                <div className="CompetitionDetailsPage__quizCtaButtons">
                  {competition.quiz_status === 'active' && (
                    <button
                      type="button"
                      onClick={() => navigate(`/quizpage/${id}/take/1`)}
                      className="CompetitionDetailsPage__btn CompetitionDetailsPage__btn--primary CompetitionDetailsPage__btn--quizStart"
                    >
                      <FiPlayCircle size={20} aria-hidden />
                      Start Quiz
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/quizpage/${id}`)}
                    className={
                      competition.quiz_status === 'active'
                        ? 'CompetitionDetailsPage__btn CompetitionDetailsPage__btn--secondary'
                        : 'CompetitionDetailsPage__btn CompetitionDetailsPage__btn--primary'
                    }
                  >
                    <FiFileText size={18} aria-hidden style={{ marginRight: 8 }} />
                    {competition.quiz_status === 'active' ? 'Quiz overview' : 'Open quiz page'}
                  </button>
                </div>
              </div>
            )}
            {competition.type === 'task_quiz' && (
              <div className="CompetitionDetailsPage__quizCta">
                <p className="CompetitionDetailsPage__quizCtaHint">
                  Tasks (instructions and optional reference images) live in your{' '}
                  <strong>team workspace</strong>. Submit each task separately—ZIP and/or links follow this
                  competition&apos;s submission mode. Evaluation follows the evaluation mode above.
                </p>
                {userTeam ? (
                  <div className="CompetitionDetailsPage__quizCtaButtons">
                    <button
                      type="button"
                      onClick={() => navigate(`/competitions/${id}/team/${userTeam.team_id}`)}
                      className="CompetitionDetailsPage__btn CompetitionDetailsPage__btn--primary CompetitionDetailsPage__btn--quizStart"
                    >
                      <FiPlayCircle size={20} aria-hidden />
                      Open team workspace
                    </button>
                  </div>
                ) : (
                  <p className="CompetitionDetailsPage__quizCtaHint" style={{ marginTop: 8 }}>
                    Join or create a team below, then open the workspace to see the task list.
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Rules Section */}
        {competition.rules && (
          <motion.div
            className="CompetitionDetailsPage__section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="CompetitionDetailsPage__sectionHeader">
              <FiFileText size={24} />
              <h2>Competition Rules</h2>
            </div>
            <div className="CompetitionDetailsPage__rules">
              <p>{competition.rules}</p>
            </div>
          </motion.div>
        )}

        {/* Team Status / Registration Section */}
        <motion.div
          className="CompetitionDetailsPage__actions"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {userTeam && isCompetitionActive() ? (
            <div className="CompetitionDetailsPage__activeCompetition">
              <FiAward size={32} className="CompetitionDetailsPage__activeIcon" />
              <h3>Competition is Live!</h3>
              <p>Team: <strong>{userTeam.team_name}</strong></p>
              <button onClick={handleStartCompetition} className="CompetitionDetailsPage__btn CompetitionDetailsPage__btn--primary">
                Access Team Workspace
              </button>
            </div>
          ) : userTeam ? (
            <div className="CompetitionDetailsPage__teamStatus">
              <FiCheckCircle size={32} className="CompetitionDetailsPage__teamStatusIcon" />
              <h3>You're Part of a Team</h3>
              <p>Team: <strong>{userTeam.team_name}</strong></p>
              <button onClick={handleViewTeam} className="CompetitionDetailsPage__btn CompetitionDetailsPage__btn--primary">
                Access Team Workspace
              </button>
            </div>
          ) : canRegister() ? (
            <div className="CompetitionDetailsPage__registration">
              <FiUserPlus size={32} className="CompetitionDetailsPage__regIcon" />
              <h3>Ready to Compete?</h3>
              <p>{isSoloCompetition() 
                ? 'Register to participate in this solo competition.'
                : 'Create a team to participate in this competition. Teams can only be joined through invitations.'
              }</p>
              <div className="CompetitionDetailsPage__regButtons">
                {canCreateTeam() && (
                  <button onClick={handleCreateTeam} className="CompetitionDetailsPage__btn CompetitionDetailsPage__btn--primary">
                    {isSoloCompetition() ? 'Join Competition' : 'Create Team'}
                  </button>
                )}
              </div>
            </div>
          ) : !userId && competition?.status === 'open' ? (
            <div className="CompetitionDetailsPage__registration">
              <FiUserPlus size={32} className="CompetitionDetailsPage__regIcon" />
              <h3>Ready to Compete?</h3>
              <p>{isSoloCompetition()
                ? 'Register to participate in this solo competition.'
                : 'Create a team to participate in this competition. Teams can only be joined through invitations.'
              }</p>
              <div className="CompetitionDetailsPage__regButtons">
                <button onClick={handleCreateTeam} className="CompetitionDetailsPage__btn CompetitionDetailsPage__btn--primary">
                  {isSoloCompetition() ? 'Join Competition' : 'Create Team'}
                </button>
              </div>
            </div>
          ) : competition?.type === 'quiz' && competition?.status === 'open' && !isQuizRegistrationOpen() ? (
            <div className="CompetitionDetailsPage__lockedNotice">
              <FiLock size={32} />
              <h3>Quiz Registration Closed</h3>
              <p>Registrations for this quiz are no longer accepted after the quiz start time.</p>
            </div>
          ) : competition?.status === 'locked' ? (
            <div className="CompetitionDetailsPage__lockedNotice">
              <FiLock size={32} />
              <h3>Registration Closed</h3>
              <p>Team registration for this competition has been locked.</p>
            </div>
          ) : competition.status === 'finished' ? (
            <div className="CompetitionDetailsPage__finishedNotice">
              <FiCheckCircle size={32} />
              <h3>Competition Finished</h3>
              <p>This competition has ended. Check back for results!</p>
            </div>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
};

export default CompetitionDetails;
