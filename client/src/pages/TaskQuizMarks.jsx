import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ApiService from '../services/api';
import SEO from '../components/SEO';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import { FiInfo, FiCheckCircle, FiClock } from 'react-icons/fi';
import './TaskQuizMarks.css';

const TaskQuizMarks = () => {
  const { id: competitionId, teamId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  const loadMarks = useCallback(async ({ withSpinner = true } = {}) => {
    if (withSpinner) setLoading(true);
    try {
      setError(null);
      const data = await ApiService.getMyTaskQuizEvaluation(competitionId, teamId);
      setPayload(data);
    } catch (err) {
      setError(err.message || 'Failed to load marks');
    } finally {
      if (withSpinner) setLoading(false);
    }
  }, [competitionId, teamId]);

  useEffect(() => {
    const run = async () => {
      if (!ApiService.isAuthenticated()) {
        navigate('/login', { replace: true });
        return;
      }
      await loadMarks();
    };
    run();
  }, [competitionId, teamId, navigate, loadMarks]);

  useEffect(() => {
    if (!payload?.readiness?.can_view_marks || payload?.readiness?.judges_evaluation_completed) return undefined;
    const timer = setInterval(() => {
      loadMarks({ withSpinner: false });
    }, 20000);
    return () => clearInterval(timer);
  }, [payload?.readiness?.can_view_marks, payload?.readiness?.judges_evaluation_completed, loadMarks]);

  if (loading) return <PageLoader />;
  const readiness = payload?.readiness || {};
  const canViewMarks = readiness.can_view_marks === true;
  const fullMarksReady = readiness.judges_evaluation_completed === true;

  return (
    <section className="TaskQuizMarks">
      <BackButton to={`/competitions/${competitionId}/team/${teamId}`} label="Back to Workspace" />
      <SEO title="My Task Quiz Marks" description="Your task quiz marks and evaluation status." />

      <div className="TaskQuizMarks__container">
        <h1 className="TaskQuizMarks__title">{payload?.competition?.title || 'Task Quiz Marks'}</h1>

        {error ? (
          <div className="TaskQuizMarks__error">{error}</div>
        ) : !canViewMarks ? (
          <div className="TaskQuizMarks__notice">
            <FiClock size={18} />
            <p>
              Your marks will appear after all tasks are submitted and automated code evaluation is complete for every task.
              Progress: {readiness.submitted_tasks_count || 0}/{readiness.tasks_total || 0} tasks submitted,{' '}
              {readiness.auto_evaluated_tasks_count || 0}/{readiness.tasks_total || 0} auto-evaluated.
            </p>
          </div>
        ) : (
          <>
            {!fullMarksReady ? (
              <div className="TaskQuizMarks__notice">
                <FiInfo size={18} />
                <p>
                  These are <strong>code-evaluation marks only</strong> (the 40% automated part). Judges will evaluate your
                  submissions soon, and this page will update automatically with your full final mark.
                </p>
              </div>
            ) : (
              <div className="TaskQuizMarks__notice">
                <FiCheckCircle size={18} />
                <p>
                  This is your <strong>full final mark</strong> after judges evaluation (automated code evaluation + judges scores).
                </p>
              </div>
            )}
            <div className="TaskQuizMarks__summary">
              <div className="TaskQuizMarks__summaryCard">
                <span>Average static-analysis mark</span>
                <strong>
                  {payload?.average_static_analysis_score != null
                    ? `${payload.average_static_analysis_score}/100`
                    : 'Pending'}
                </strong>
              </div>
              <div className="TaskQuizMarks__summaryCard">
                <span>40% weighted portion</span>
                <strong>
                  {payload?.average_static_analysis_score != null
                    ? `${Math.round(payload.average_static_analysis_score * 0.4 * 100) / 100}/40`
                    : 'Pending'}
                </strong>
              </div>
              <div className="TaskQuizMarks__summaryCard">
                <span>Final mark after judges</span>
                <strong>
                  {payload?.average_final_score != null ? `${payload.average_final_score}/100` : 'Pending judges'}
                </strong>
              </div>
            </div>

            <div className="TaskQuizMarks__list">
              {(payload?.task_marks || []).map((task) => (
                <article key={task.task_id} className="TaskQuizMarks__item">
                  <div className="TaskQuizMarks__itemHeader">
                    <h3>{task.task_title || `Task ${task.task_id}`}</h3>
                    {fullMarksReady ? (
                      <span className="TaskQuizMarks__badge TaskQuizMarks__badge--done">
                        <FiCheckCircle size={14} />
                        Finalized
                      </span>
                    ) : task.static_analysis_score != null ? (
                      <span className="TaskQuizMarks__badge TaskQuizMarks__badge--done">
                        <FiCheckCircle size={14} />
                        Evaluated
                      </span>
                    ) : (
                      <span className="TaskQuizMarks__badge TaskQuizMarks__badge--pending">
                        <FiClock size={14} />
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="TaskQuizMarks__score">
                    Static-analysis mark:{' '}
                    <strong>
                      {task.static_analysis_score != null ? `${task.static_analysis_score}/100` : 'Not available yet'}
                    </strong>
                  </p>
                  <p className="TaskQuizMarks__score">
                    Final mark after judges:{' '}
                    <strong>{task.final_score != null ? `${task.final_score}/100` : 'Pending judges'}</strong>
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default TaskQuizMarks;
