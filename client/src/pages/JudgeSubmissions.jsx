import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import ApiService from '../services/api';
import './JudgeSubmissions.css';

const emptyJudgeForm = {
  design_score: '',
  creativity_score: '',
  ux_score: '',
  innovation_score: '',
  comment: ''
};

const JudgeSubmissions = () => {
  const { id: competitionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [competition, setCompetition] = useState(null);
  const [submissions, setSubmissions] = useState([]);
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

  const loadPage = async () => {
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

      const rows = await ApiService.getCompetitionSubmissions(competitionId);
      const list = Array.isArray(rows) ? rows : [];
      setSubmissions(list);
      setSelectedSubmissionId(list[0]?.submission_id || null);
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
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

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
            <h3>Submissions ({submissions.length})</h3>
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
                    {competition?.type === 'task_quiz' ? `Task #${row.task_id}` : 'Project'} - {row.status}
                  </span>
                </button>
              ))
            )}
          </aside>

          <div className="JudgeSubmissions__panel">
            {!selectedSubmission ? (
              <p className="JudgeSubmissions__muted">Select a submission to judge.</p>
            ) : (
              <>
                <h3>Submission #{selectedSubmission.submission_id}</h3>
                <p className="JudgeSubmissions__links">
                  {selectedSubmission.repo_url ? <a href={selectedSubmission.repo_url} target="_blank" rel="noreferrer">Repository</a> : null}
                  {selectedSubmission.live_url ? <a href={selectedSubmission.live_url} target="_blank" rel="noreferrer">Live demo</a> : null}
                  {selectedSubmission.r2_key ? <span>ZIP uploaded</span> : null}
                </p>

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
