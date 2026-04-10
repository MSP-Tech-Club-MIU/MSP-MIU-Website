import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import QuizCompetitionPanel from '../components/quiz/QuizCompetitionPanel';
import './CompetitionWorkspace.css';
import {
  FiUpload,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiUsers,
  FiFileText,
  FiLink,
  FiFile,
  FiSend
} from 'react-icons/fi';

const CompetitionWorkspace = () => {
  const { id: competitionId, teamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [competition, setCompetition] = useState(null);
  const [team, setTeam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [error, setError] = useState(null);

  // Form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [submitType, setSubmitType] = useState('zip'); // 'zip' | 'links' | 'zip_and_links'

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [competitionData, teamData] = await Promise.all([
        ApiService.getCompetitionById(competitionId),
        ApiService.getTeamById(teamId),
      ]);
      const submissionData = competitionData?.type === 'quiz'
        ? null
        : await ApiService.getTeamSubmission(competitionId, teamId).catch(() => null);

      setCompetition(competitionData);
      setTeam(teamData);
      setSubmission(submissionData);

      const profile = await ApiService.getProfile().catch(() => null);
      setCurrentUserId(profile?.user_id || null);

      if (submissionData) {
        setSubmitType(submissionData.submit_type);
        setGithubUrl(submissionData.repo_url || '');
        setLiveUrl(submissionData.live_url || '');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load competition workspace');
    } finally {
      setLoading(false);
    }
  }, [competitionId, teamId]);

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
    if (competition.type === 'external' || competition.submission_mode === 'none') return false;
    if (competition.status !== 'open') return false;

    const now = new Date();
    const end = new Date(competition.end_at);
    return now < end;
  };
  const allowedSubmitTypes = getAllowedSubmitTypes();
  const isFrontendMultitask = competition?.config?.multiTask === true;
  const isQuizCompetition = competition?.type === 'quiz';

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
        </motion.header>

        <div className="CompetitionWorkspace__grid">
          {/* Left Column - Tasks & Description */}
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
                <div className="CompetitionWorkspace__rules">
                  {competition.rules}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Column - Submission */}
          <motion.div
            className="CompetitionWorkspace__submission"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Current Submission Status */}
            {!isQuizCompetition && submission && (
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
                  {submission.live_url && (
                    <p>
                      <strong>Live URL:</strong>{' '}
                      <a href={submission.live_url} target="_blank" rel="noopener noreferrer">
                        {submission.live_url}
                      </a>
                    </p>
                  )}
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
            {!isQuizCompetition ? (
            <div className="CompetitionWorkspace__submitForm">
              <h3 className="CompetitionWorkspace__submissionTitle">
                <FiSend size={20} />
                {submission ? 'Update Submission' : 'Submit Your Work'}
              </h3>

              {!canSubmit() && (
                <div className="CompetitionWorkspace__alert CompetitionWorkspace__alert--warning">
                  <FiAlertCircle size={18} />
                  <span>
                    {competition?.type === 'external' || competition?.submission_mode === 'none'
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
            </div>
            ) : (
              <div className="CompetitionWorkspace__submitForm">
                <h3 className="CompetitionWorkspace__submissionTitle">
                  <FiFileText size={20} />
                  Quiz Competition
                </h3>
                {currentUserId ? (
                  <QuizCompetitionPanel quizId={competitionId} userId={currentUserId} />
                ) : (
                  <div className="CompetitionWorkspace__alert CompetitionWorkspace__alert--warning">
                    <FiAlertCircle size={18} />
                    <span>Unable to load current user for quiz attempt.</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CompetitionWorkspace;
