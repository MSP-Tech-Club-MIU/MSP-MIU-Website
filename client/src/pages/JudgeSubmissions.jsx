import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import ApiService from '../services/api';
import TaskQuizAssetMedia from '../components/TaskQuizAssetMedia';
import LiveDemoEmbed from '../components/LiveDemoEmbed';
import Pagination from '../components/Pagination';
import { buildR2PublicObjectUrl, sanitizeDownloadBasename, normalizeLiveDemoOpenUrl } from '../utils/taskQuizAssets';
import './JudgeSubmissions.css';

const emptyJudgeForm = {
  design_score: '',
  creativity_score: '',
  ux_score: '',
  innovation_score: '',
  comment: ''
};

const LIMIT = 20;

const JudgeSubmissions = () => {
  const { id: competitionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [competition, setCompetition] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [judgeForm, setJudgeForm] = useState(emptyJudgeForm);
  const [manualScore, setManualScore] = useState('');
  const [manualFeedback, setManualFeedback] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  const selectedSubmission = useMemo(
    () => submissions.find((s) => Number(s.submission_id) === Number(selectedSubmissionId)) || null,
    [submissions, selectedSubmissionId]
  );

  const submissionZipUrl = useMemo(
    () => (selectedSubmission ? buildR2PublicObjectUrl(selectedSubmission.r2_key) : null),
    [selectedSubmission?.r2_key]
  );

  const submissionZipDownloadName = useMemo(() => {
    if (!selectedSubmission) return 'submission.zip';
    const base = sanitizeDownloadBasename(selectedSubmission.team_name, {
      fallback: `team-${selectedSubmission.submission_id}-${selectedSubmission.task_id}`
    });
    return `${base}.zip`;
  }, [selectedSubmission?.team_name, selectedSubmission?.submission_id, selectedSubmission?.task_id]);

  const liveOpenUrl = useMemo(
    () => normalizeLiveDemoOpenUrl(selectedSubmission?.live_url),
    [selectedSubmission?.live_url]
  );

  const loadPage = async (pageNum = page) => {
    try {
      setLoading(true);
      setError('');
      const [profile, comp] = await Promise.all([
        ApiService.getProfile(),
        ApiService.getCompetitionById(competitionId)
      ]);
      setUser(profile);
      setCompetition(comp);

      if (!['project', 'task_quiz'].includes(comp?.type)) {
        throw new Error('Judging is available only for project and task quiz competitions.');
      }
      if (!['manual', 'hybrid'].includes(comp?.evaluation_mode)) {
        throw new Error('Judging is enabled only for manual and hybrid evaluation modes.');
      }

      const result = await ApiService.getCompetitionSubmissions(competitionId, {
        page: pageNum,
        limit: LIMIT
      });
      const list = Array.isArray(result?.data) ? result.data : [];
      setSubmissions(list);
      setPagination(result?.pagination || null);
      setSelectedSubmissionId((prev) => {
        if (prev && list.some((s) => Number(s.submission_id) === Number(prev))) return prev;
        return list[0]?.submission_id || null;
      });
      setMessage('');
    } catch (err) {
      setError(err.message || 'Failed to load judging workspace');
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluation = async (submissionId) => {
    if (!submissionId) {
      setEvaluation(null);
      setJudgeForm(emptyJudgeForm);
      setManualScore('');
      setManualFeedback('');
      return;
    }

    try {
      setError('');
      const data = await ApiService.getSubmissionEvaluation(submissionId);
      setEvaluation(data);

      const mine = (data?.judge_scores || []).find((row) => row?.judge_id === user?.user_id);
      if (mine) {
        setJudgeForm({
          design_score: mine.design_score ?? '',
          creativity_score: mine.creativity_score ?? '',
          ux_score: mine.ux_score ?? '',
          innovation_score: mine.innovation_score ?? '',
          comment: mine.comment || ''
        });
      } else {
        setJudgeForm(emptyJudgeForm);
      }

      const scoreValue = data?.submission?.score;
      setManualScore(scoreValue == null ? '' : String(scoreValue));
      setManualFeedback(data?.submission?.feedback || '');
    } catch (err) {
      setError(err.message || 'Failed to load evaluation');
    }
  };

  useEffect(() => {
    if (!ApiService.isAuthenticated()) {
      navigate('/login', { replace: true });
      return;
    }
    loadPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId, page]);

  useEffect(() => {
    loadEvaluation(selectedSubmissionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubmissionId, user?.user_id]);

  const submitJudge = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await ApiService.submitJudgeScore(selectedSubmissionId, {
        design_score: Number(judgeForm.design_score),
        creativity_score: Number(judgeForm.creativity_score),
        ux_score: Number(judgeForm.ux_score),
        innovation_score: Number(judgeForm.innovation_score),
        comment: judgeForm.comment
      });
      await loadEvaluation(selectedSubmissionId);
      setMessage('Judge score saved.');
    } catch (err) {
      setError(err.message || 'Failed to save judge score');
    } finally {
      setSaving(false);
    }
  };

  const submitManualGrade = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await ApiService.gradeSubmission(selectedSubmissionId, Number(manualScore), manualFeedback);
      await loadEvaluation(selectedSubmissionId);
      setMessage('Manual score saved.');
    } catch (err) {
      setError(err.message || 'Failed to save manual score');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <section className="JudgeSubmissions">
      <BackButton to={`/competitions/${competitionId}`} label="Back to competition" />
      <SEO title="Judge Submissions" description="Judge project and task-quiz submissions." noindex />
      <div className="JudgeSubmissions__container">
        <h1>Judging workspace</h1>
        <p className="JudgeSubmissions__muted">
          {competition?.title} - {competition?.type} - {competition?.evaluation_mode}
        </p>

        {error ? <div className="JudgeSubmissions__alert JudgeSubmissions__alert--error">{error}</div> : null}
        {message ? <div className="JudgeSubmissions__alert JudgeSubmissions__alert--ok">{message}</div> : null}

        <div className="JudgeSubmissions__layout">
          <aside className="JudgeSubmissions__list">
            <h3>Submissions ({pagination?.total ?? submissions.length})</h3>
            {submissions.length === 0 ? (
              <p className="JudgeSubmissions__muted">No submissions yet.</p>
            ) : (
              submissions.map((row) => (
                <button
                  key={row.submission_id}
                  type="button"
                  className={`JudgeSubmissions__item ${
                    Number(selectedSubmissionId) === Number(row.submission_id) ? 'is-active' : ''
                  }`}
                  onClick={() => setSelectedSubmissionId(row.submission_id)}
                >
                  <strong>{row.team_name}</strong>
                  <span>
                    {competition?.type === 'task_quiz'
                      ? `${row.task_title || `Task #${row.task_id}`} — ${row.status}`
                      : `Project — ${row.status}`}
                  </span>
                </button>
              ))
            )}
            <Pagination pagination={pagination} onPageChange={(p) => { setPage(p); }} />
          </aside>

          <div className="JudgeSubmissions__panel">
            {!selectedSubmission ? (
              <p className="JudgeSubmissions__muted">Select a submission to judge.</p>
            ) : (
              <>
                <h3>Submission #{selectedSubmission.submission_id}</h3>

                {competition?.type === 'task_quiz' ? (
                  <div className="JudgeSubmissions__task">
                    <h4>Task</h4>
                    {(() => {
                      const bits = [];
                      if (
                        selectedSubmission.task_position != null &&
                        String(selectedSubmission.task_position).trim() !== ''
                      ) {
                        bits.push(`Position ${selectedSubmission.task_position}`);
                      }
                      if (selectedSubmission.task_id) {
                        bits.push(`Task id ${selectedSubmission.task_id}`);
                      }
                      return bits.length ? (
                        <p className="JudgeSubmissions__taskMeta">{bits.join(' · ')}</p>
                      ) : null;
                    })()}
                    {selectedSubmission.task_title ? (
                      <p className="JudgeSubmissions__taskTitle">{selectedSubmission.task_title}</p>
                    ) : null}
                    {selectedSubmission.task_description ? (
                      <div className="JudgeSubmissions__taskDesc">{selectedSubmission.task_description}</div>
                    ) : null}
                    <TaskQuizAssetMedia
                      url={selectedSubmission.task_assets_url}
                      variant="large"
                      title="Task reference"
                    />
                  </div>
                ) : null}

                <div className="JudgeSubmissions__preview">
                  <h4>Review submission</h4>
                  <div className="JudgeSubmissions__links">
                    {selectedSubmission.repo_url ? (
                      <a href={selectedSubmission.repo_url} target="_blank" rel="noreferrer">
                        Repository
                      </a>
                    ) : null}
                    {liveOpenUrl ? (
                      <a href={liveOpenUrl} target="_blank" rel="noreferrer">
                        Open live demo
                      </a>
                    ) : null}
                    {submissionZipUrl ? (
                      <a
                        href={submissionZipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={submissionZipDownloadName}
                      >
                        Download submission (.zip)
                      </a>
                    ) : null}
                    {selectedSubmission.r2_key && !submissionZipUrl ? (
                      <span className="JudgeSubmissions__zipHint">
                        ZIP is on file; set <code>VITE_R2_PUBLIC_DOMAIN</code> in the client env to build a public
                        download link.
                      </span>
                    ) : null}
                  </div>
                  <LiveDemoEmbed liveUrl={selectedSubmission.live_url} embedTitle="Live submission preview" />
                </div>

                <form className="JudgeSubmissions__form" onSubmit={submitJudge}>
                  <h4>Judge score (criteria)</h4>
                  <div className="JudgeSubmissions__grid">
                    {['design_score', 'creativity_score', 'ux_score', 'innovation_score'].map((name) => (
                      <label key={name}>
                        {name.replace('_', ' ')}
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={judgeForm[name]}
                          onChange={(e) => setJudgeForm((f) => ({ ...f, [name]: e.target.value }))}
                          required
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    Comment
                    <textarea
                      value={judgeForm.comment}
                      onChange={(e) => setJudgeForm((f) => ({ ...f, comment: e.target.value }))}
                      rows={3}
                    />
                  </label>
                  <button type="submit" disabled={saving}>Save judge score</button>
                </form>

                <form className="JudgeSubmissions__form" onSubmit={submitManualGrade}>
                  <h4>Manual grade</h4>
                  <label>
                    Final score
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={manualScore}
                      onChange={(e) => setManualScore(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Feedback
                    <textarea
                      value={manualFeedback}
                      onChange={(e) => setManualFeedback(e.target.value)}
                      rows={3}
                    />
                  </label>
                  <button type="submit" disabled={saving}>Save manual grade</button>
                </form>

                {evaluation ? (
                  <div className="JudgeSubmissions__meta">
                    <p>Auto score: {evaluation?.evaluation?.total_auto_score ?? 'N/A'}</p>
                    <p>Judge average: {evaluation?.judge_average ?? 'N/A'}</p>
                    <p>Final score: {evaluation?.final_score ?? 'N/A'}</p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default JudgeSubmissions;
