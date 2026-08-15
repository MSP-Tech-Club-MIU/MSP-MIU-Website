import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ApiService from '../services/api';
import './EmailSendProgress.css';

/**
 * Persistent floating progress for announcement email jobs.
 * Polls until completed/failed, then auto-hides after a short delay.
 */
export default function EmailSendProgress({ jobId, title, onDone, onClear }) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [showFailures, setShowFailures] = useState(false);
  const doneRef = useRef(false);
  const hideTimer = useRef(null);
  const onDoneRef = useRef(onDone);
  const onClearRef = useRef(onClear);
  onDoneRef.current = onDone;
  onClearRef.current = onClear;

  useEffect(() => {
    if (!jobId) return undefined;
    doneRef.current = false;
    setError(null);
    setJob(null);
    setShowFailures(false);

    let cancelled = false;
    let timer = null;

    const poll = async () => {
      try {
        const data = await ApiService.getAnnouncementEmailJob(jobId);
        if (cancelled) return;
        setJob(data);
        setError(null);

        if (data.status === 'completed' || data.status === 'failed') {
          if (!doneRef.current) {
            doneRef.current = true;
            onDoneRef.current?.(data);
          }
          const hasFailures = (data.failed || 0) > 0 || (data.failures || []).length > 0;
          hideTimer.current = setTimeout(() => {
            if (!cancelled && !hasFailures) onClearRef.current?.();
          }, hasFailures ? 12000 : 4500);
          return;
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Failed to load send progress');
      }
      timer = setTimeout(poll, 900);
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [jobId]);

  if (!jobId) return null;

  const status = job?.status || 'queued';
  const total = job?.total ?? 0;
  const sent = job?.sent ?? 0;
  const failed = job?.failed ?? 0;
  const skipped = job?.skipped ?? 0;
  const failures = Array.isArray(job?.failures) ? job.failures : [];
  const percent = job?.percent ?? 0;
  const done = status === 'completed' || status === 'failed';
  const displayTitle = job?.title || title || 'Announcement';
  const canExpandFailures = failed > 0 || failures.length > 0;

  let subtitle = 'Preparing to send…';
  if (error) {
    subtitle = error;
  } else if (status === 'running' && total > 0) {
    subtitle = `Sent ${sent} of ${total}${failed ? ` · ${failed} failed` : ''}${skipped ? ` · ${skipped} skipped` : ''}`;
  } else if (status === 'running') {
    subtitle = 'Sending to members…';
  } else if (status === 'completed') {
    const parts = [];
    if (failed) parts.push(`${sent} sent, ${failed} failed`);
    else parts.push(`All ${sent || total} emails sent`);
    if (skipped) parts.push(`${skipped} unsubscribed skipped`);
    subtitle = parts.join(' · ');
  } else if (status === 'failed') {
    subtitle = job?.error || 'Email broadcast failed';
  }

  return createPortal(
    <div
      className={`EmailSendProgress EmailSendProgress--${done ? status : 'active'}${showFailures ? ' EmailSendProgress--expanded' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={!done}
    >
      <div className="EmailSendProgress__icon" aria-hidden="true">
        {!done ? (
          <span className="EmailSendProgress__spinner" />
        ) : status === 'completed' && failed === 0 ? (
          '✓'
        ) : (
          '!'
        )}
      </div>
      <div className="EmailSendProgress__body">
        <p className="EmailSendProgress__title">
          {done
            ? (status === 'completed' && failed === 0
              ? 'Emails sent'
              : 'Email send finished with errors')
            : 'Sending announcement emails'}
        </p>
        <p className="EmailSendProgress__subtitle">{displayTitle}</p>
        <p className="EmailSendProgress__meta">{subtitle}</p>
        <div className="EmailSendProgress__barTrack" aria-hidden="true">
          <div
            className="EmailSendProgress__barFill"
            style={{ width: `${done && total === 0 ? 100 : percent}%` }}
          />
        </div>
        {canExpandFailures && (
          <div className="EmailSendProgress__failures">
            <button
              type="button"
              className="EmailSendProgress__failuresToggle"
              onClick={() => setShowFailures((v) => !v)}
              aria-expanded={showFailures}
            >
              {showFailures ? 'Hide failed sends' : 'View failed sends'}
              {failures.length ? ` (${failures.length})` : failed ? ` (${failed})` : ''}
            </button>
            {showFailures && (
              <ul className="EmailSendProgress__failuresList">
                {failures.length > 0 ? (
                  failures.map((f, i) => (
                    <li key={`${f.email}-${i}`}>
                      <span className="EmailSendProgress__failEmail">{f.email}</span>
                      <span className="EmailSendProgress__failReason">{f.reason || 'failed'}</span>
                    </li>
                  ))
                ) : (
                  <li className="EmailSendProgress__failEmpty">
                    {failed} send(s) failed (details unavailable)
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
      {done && (
        <button
          type="button"
          className="EmailSendProgress__close"
          onClick={() => onClearRef.current?.()}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>,
    document.body
  );
}
