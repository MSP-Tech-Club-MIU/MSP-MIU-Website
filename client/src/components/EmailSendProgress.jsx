import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  MdEmail,
  MdSend,
  MdPauseCircle,
  MdCheckCircle,
  MdError,
  MdClose,
  MdRemove,
  MdOpenInFull,
  MdSearch,
  MdCancel,
  MdTimer,
  MdShield,
  MdRefresh
} from 'react-icons/md';
import ApiService from '../services/api';
import './EmailSendProgress.css';

/**
 * Interactive Email Sending Tracker with:
 * 1. Full Glassmorphic Modal with live progress, anti-spam pause countdown, and recipient logs.
 * 2. Minimized floating overlay bar with live progress and click-to-expand.
 */
export default function EmailSendProgress({
  jobId,
  title,
  initialMinimized = false,
  onDone,
  onClear,
  onViewTracker
}) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'sent' | 'failed' | 'skipped'
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [pauseRemainingSeconds, setPauseRemainingSeconds] = useState(0);

  const doneRef = useRef(false);
  const hideTimer = useRef(null);
  const onDoneRef = useRef(onDone);
  const onClearRef = useRef(onClear);
  onDoneRef.current = onDone;
  onClearRef.current = onClear;

  // Poll for job updates
  useEffect(() => {
    if (!jobId) return undefined;
    doneRef.current = false;
    setError(null);
    setJob(null);

    let cancelled = false;
    let timer = null;

    const poll = async () => {
      try {
        const data = await ApiService.getEmailJob(jobId);
        if (cancelled) return;
        setJob(data);
        setError(null);

        if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
          if (!doneRef.current) {
            doneRef.current = true;
            onDoneRef.current?.(data);
          }
          return;
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Failed to load send progress');
      }
      timer = setTimeout(poll, 850);
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [jobId]);

  // Anti-spam pause live second countdown timer
  useEffect(() => {
    if (!job?.pausedUntil) {
      setPauseRemainingSeconds(0);
      return undefined;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((job.pausedUntil - now) / 1000));
      setPauseRemainingSeconds(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 500);

    return () => clearInterval(interval);
  }, [job?.pausedUntil]);

  // Cancel job handler
  const handleCancelJob = async () => {
    if (!window.confirm('Are you sure you want to cancel the rest of this email broadcast?')) return;
    try {
      setCancelling(true);
      const updated = await ApiService.cancelEmailJob(jobId);
      setJob(updated);
    } catch (err) {
      alert(err.message || 'Failed to cancel email job');
    } finally {
      setCancelling(false);
    }
  };

  if (!jobId) return null;

  const status = job?.status || 'queued';
  const total = job?.total ?? 0;
  const sent = job?.sent ?? 0;
  const failed = job?.failed ?? 0;
  const skipped = job?.skipped ?? 0;
  const failures = Array.isArray(job?.failures) ? job.failures : [];
  const recipients = Array.isArray(job?.recipients) ? job.recipients : [];
  const percent = job?.percent ?? (total > 0 ? Math.round(((sent + failed) / total) * 100) : 0);
  const done = status === 'completed' || status === 'failed' || status === 'cancelled';
  const isPaused = status === 'paused' || (job?.pausedUntil && job.pausedUntil > Date.now() && !done);
  const displayTitle = job?.title || title || 'Email broadcast';

  // Format countdown string mm:ss
  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Filtered recipient logs
  const filteredRecipients = useMemo(() => {
    let list = recipients;
    if (activeTab === 'sent') {
      list = list.filter((r) => r.status === 'sent');
    } else if (activeTab === 'failed') {
      list = list.filter((r) => r.status === 'failed');
    } else if (activeTab === 'skipped') {
      list = list.filter((r) => r.status === 'skipped');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) => (r.email || '').toLowerCase().includes(q) || (r.reason || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [recipients, activeTab, searchQuery]);

  /* ═══════════════════════════════════════════════════════════
     1. MINIMIZED OVERLAY BAR
     ═══════════════════════════════════════════════════════════ */
  if (isMinimized) {
    return createPortal(
      <div
        className={`EmailSendProgress__barOverlay EmailSendProgress__barOverlay--${done ? status : isPaused ? 'paused' : 'running'}`}
        role="status"
        aria-live="polite"
        onClick={() => setIsMinimized(false)}
        title="Click to expand full tracker"
      >
        <div className="EmailSendProgress__barIconWrap">
          {!done ? (
            isPaused ? (
              <span className="EmailSendProgress__barPauseIcon">
                <MdTimer />
              </span>
            ) : (
              <span className="EmailSendProgress__spinner" />
            )
          ) : status === 'completed' && failed === 0 ? (
            <MdCheckCircle className="EmailSendProgress__barDoneIcon" />
          ) : status === 'cancelled' ? (
            <MdCancel className="EmailSendProgress__barCancelIcon" />
          ) : (
            <MdError className="EmailSendProgress__barErrorIcon" />
          )}
        </div>

        <div className="EmailSendProgress__barInfo">
          <div className="EmailSendProgress__barTitleRow">
            <span className="EmailSendProgress__barTitle">{displayTitle}</span>
            <span className="EmailSendProgress__barPercent">{done ? (status === 'completed' ? 'Done' : status) : `${percent}%`}</span>
          </div>

          <div className="EmailSendProgress__barSubRow">
            {error ? (
              <span className="EmailSendProgress__barErrorText">{error}</span>
            ) : isPaused ? (
              <span className="EmailSendProgress__barPausedText">
                ⏸️ Anti-Spam: Resuming in {formatCountdown(pauseRemainingSeconds)} (Batch {job?.batchNumber || 1}/{job?.totalBatches || 1})
              </span>
            ) : done ? (
              <span>
                {sent} sent{failed > 0 ? ` · ${failed} failed` : ''}{skipped > 0 ? ` · ${skipped} skipped` : ''}
              </span>
            ) : (
              <span>
                Sent {sent} of {total} ({percent}%){failed > 0 ? ` · ${failed} failed` : ''}
              </span>
            )}
          </div>

          {/* Mini progress line */}
          <div className="EmailSendProgress__barMiniTrack">
            <div
              className="EmailSendProgress__barMiniFill"
              style={{ width: `${done && total === 0 ? 100 : percent}%` }}
            />
          </div>
        </div>

        <div className="EmailSendProgress__barActions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="EmailSendProgress__barBtn"
            onClick={() => setIsMinimized(false)}
            title="Expand tracker"
            aria-label="Expand tracker"
          >
            <MdOpenInFull />
          </button>
          {done && (
            <button
              type="button"
              className="EmailSendProgress__barBtn EmailSendProgress__barBtn--close"
              onClick={() => onClearRef.current?.()}
              title="Dismiss"
              aria-label="Dismiss"
            >
              <MdClose />
            </button>
          )}
        </div>
      </div>,
      document.body
    );
  }

  /* ═══════════════════════════════════════════════════════════
     2. FULL MODAL VIEW
     ═══════════════════════════════════════════════════════════ */
  return createPortal(
    <div
      className="EmailSendProgress__modalBackdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-tracker-title"
    >
      <div className={`EmailSendProgress__modalCard EmailSendProgress__modalCard--${status}`}>
        {/* Header */}
        <div className="EmailSendProgress__modalHeader">
          <div className="EmailSendProgress__headerLeft">
            <div className="EmailSendProgress__statusBadgeWrap">
              <span className={`EmailSendProgress__statusBadge EmailSendProgress__statusBadge--${status}`}>
                {!done && !isPaused && <span className="EmailSendProgress__pulseDot" />}
                {isPaused ? (
                  <>
                    <MdTimer style={{ marginRight: 4 }} /> Paused (Spam Prevention)
                  </>
                ) : status === 'running' ? (
                  <>
                    <MdSend style={{ marginRight: 4 }} /> Sending…
                  </>
                ) : status === 'completed' && failed === 0 ? (
                  <>
                    <MdCheckCircle style={{ marginRight: 4 }} /> All Sent Successfully
                  </>
                ) : status === 'completed' ? (
                  <>
                    <MdCheckCircle style={{ marginRight: 4 }} /> Completed with issues
                  </>
                ) : status === 'cancelled' ? (
                  <>
                    <MdCancel style={{ marginRight: 4 }} /> Cancelled
                  </>
                ) : (
                  <>
                    <MdError style={{ marginRight: 4 }} /> Failed
                  </>
                )}
              </span>
            </div>
            <h3 id="email-tracker-title" className="EmailSendProgress__modalTitle">
              {displayTitle}
            </h3>
          </div>

          <div className="EmailSendProgress__headerRight">
            <button
              type="button"
              className="EmailSendProgress__headerBtn"
              onClick={() => setIsMinimized(true)}
              title="Minimize to floating overlay bar"
              aria-label="Minimize"
            >
              <MdRemove />
            </button>
            <button
              type="button"
              className="EmailSendProgress__headerBtn EmailSendProgress__headerBtn--close"
              onClick={() => {
                if (done) {
                  onClearRef.current?.();
                } else {
                  setIsMinimized(true);
                }
              }}
              title={done ? 'Close' : 'Minimize'}
              aria-label="Close"
            >
              <MdClose />
            </button>
          </div>
        </div>

        {/* Anti-Spam Throttle Pause Notice */}
        {isPaused && (
          <div className="EmailSendProgress__spamNotice">
            <div className="EmailSendProgress__spamNoticeIcon">
              <MdShield />
            </div>
            <div className="EmailSendProgress__spamNoticeBody">
              <div className="EmailSendProgress__spamNoticeTitle">
                Anti-Spam Rate Limit Active · Cooldown in progress
              </div>
              <p className="EmailSendProgress__spamNoticeDesc">
                Pausing between recipient batches to safeguard domain reputation and prevent inbox spam filters.
              </p>
              <div className="EmailSendProgress__spamNoticeCountdown">
                <span className="EmailSendProgress__timerValue">
                  {formatCountdown(pauseRemainingSeconds)}
                </span>
                <span className="EmailSendProgress__timerLabel">
                  remaining until Batch {job?.batchNumber || 1} of {job?.totalBatches || 1}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar & Percentage */}
        <div className="EmailSendProgress__progressSection">
          <div className="EmailSendProgress__progressHeader">
            <span className="EmailSendProgress__progressLabel">
              {done
                ? 'Dispatch Finished'
                : isPaused
                  ? 'Paused for SMTP safety'
                  : 'Delivering emails to inboxes…'}
            </span>
            <span className="EmailSendProgress__progressPercent">{percent}%</span>
          </div>

          <div className="EmailSendProgress__mainTrack">
            <div
              className={`EmailSendProgress__mainFill EmailSendProgress__mainFill--${status}${isPaused ? ' is-paused' : ''}`}
              style={{ width: `${done && total === 0 ? 100 : percent}%` }}
            />
          </div>
        </div>

        {/* Metric Cards */}
        <div className="EmailSendProgress__metricsGrid">
          <div className="EmailSendProgress__metricCard">
            <div className="EmailSendProgress__metricValue">{total}</div>
            <div className="EmailSendProgress__metricLabel">Total Audience</div>
          </div>
          <div className="EmailSendProgress__metricCard EmailSendProgress__metricCard--sent">
            <div className="EmailSendProgress__metricValue">{sent}</div>
            <div className="EmailSendProgress__metricLabel">Sent Successfully</div>
          </div>
          <div className="EmailSendProgress__metricCard EmailSendProgress__metricCard--failed">
            <div className="EmailSendProgress__metricValue">{failed}</div>
            <div className="EmailSendProgress__metricLabel">Failed</div>
          </div>
          <div className="EmailSendProgress__metricCard EmailSendProgress__metricCard--skipped">
            <div className="EmailSendProgress__metricValue">{skipped}</div>
            <div className="EmailSendProgress__metricLabel">Unsubscribed / Skipped</div>
          </div>
        </div>

        {/* Detailed Recipient Activity & Failure Inspector */}
        <div className="EmailSendProgress__logsSection">
          <div className="EmailSendProgress__logsHeader">
            <div className="EmailSendProgress__logsTabs">
              <button
                type="button"
                className={`EmailSendProgress__logsTab${activeTab === 'all' ? ' is-active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Activity ({recipients.length})
              </button>
              <button
                type="button"
                className={`EmailSendProgress__logsTab${activeTab === 'sent' ? ' is-active' : ''}`}
                onClick={() => setActiveTab('sent')}
              >
                Sent ({sent})
              </button>
              <button
                type="button"
                className={`EmailSendProgress__logsTab EmailSendProgress__logsTab--failed${activeTab === 'failed' ? ' is-active' : ''}`}
                onClick={() => setActiveTab('failed')}
              >
                Failed ({failed || failures.length})
              </button>
              {skipped > 0 && (
                <button
                  type="button"
                  className={`EmailSendProgress__logsTab${activeTab === 'skipped' ? ' is-active' : ''}`}
                  onClick={() => setActiveTab('skipped')}
                >
                  Skipped ({skipped})
                </button>
              )}
            </div>

            <div className="EmailSendProgress__logsSearch">
              <MdSearch className="EmailSendProgress__searchIcon" />
              <input
                type="text"
                placeholder="Search email or reason…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="EmailSendProgress__searchInput"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="EmailSendProgress__searchClear"
                  onClick={() => setSearchQuery('')}
                >
                  <MdClose />
                </button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="EmailSendProgress__logsList">
            {filteredRecipients.length === 0 ? (
              <div className="EmailSendProgress__logsEmpty">
                {searchQuery
                  ? 'No recipients match your search.'
                  : activeTab === 'failed'
                    ? 'No failures recorded! All attempted sends were successful.'
                    : 'Recipient events will appear here in real-time as emails are sent.'}
              </div>
            ) : (
              filteredRecipients.map((item, idx) => (
                <div
                  key={`${item.email}-${idx}`}
                  className={`EmailSendProgress__logItem EmailSendProgress__logItem--${item.status}`}
                >
                  <div className="EmailSendProgress__logStatusIcon">
                    {item.status === 'sent' ? (
                      <MdCheckCircle className="icon-sent" />
                    ) : item.status === 'failed' ? (
                      <MdError className="icon-failed" />
                    ) : (
                      <MdCancel className="icon-skipped" />
                    )}
                  </div>
                  <div className="EmailSendProgress__logContent">
                    <div className="EmailSendProgress__logEmail">{item.email}</div>
                    {item.reason && (
                      <div className="EmailSendProgress__logReason">
                        {item.reason}
                      </div>
                    )}
                  </div>
                  {item.at && (
                    <div className="EmailSendProgress__logTime">
                      {new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="EmailSendProgress__modalFooter">
          <div className="EmailSendProgress__footerLeft">
            {!done && !job?.isCancelled && (
              <button
                type="button"
                className="EmailSendProgress__cancelBtn"
                disabled={cancelling}
                onClick={handleCancelJob}
              >
                <MdCancel style={{ marginRight: 4 }} />
                {cancelling ? 'Cancelling…' : 'Cancel Broadcast'}
              </button>
            )}
          </div>

          <div className="EmailSendProgress__footerRight">
            <button
              type="button"
              className="EmailSendProgress__minimizeBtn"
              onClick={() => setIsMinimized(true)}
            >
              <MdRemove style={{ marginRight: 4 }} /> Minimize to Overlay Bar
            </button>
            {done && (
              <button
                type="button"
                className="EmailSendProgress__doneBtn"
                onClick={() => onClearRef.current?.()}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
