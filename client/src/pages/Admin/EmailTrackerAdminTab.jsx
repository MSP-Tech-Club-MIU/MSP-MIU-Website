import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MdTrackChanges,
  MdRefresh,
  MdSend,
  MdTimer,
  MdCheckCircle,
  MdError,
  MdCancel,
  MdSearch,
  MdOpenInNew,
  MdShield,
  MdEmail,
  MdOutlineMarkEmailRead,
  MdOutlineRunningWithErrors,
  MdPlayArrow
} from 'react-icons/md';
import ApiService from '../../services/api';
import './EmailTrackerAdminTab.css';

export default function EmailTrackerAdminTab({ onAlert, onOpenJob }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchJobs = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const data = await ApiService.getEmailJobs({ limit: 100 });
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!quiet) {
        onAlert?.({ type: 'error', message: err.message || 'Failed to load email jobs' });
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [onAlert]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Auto-refresh every 3s if active jobs exist and autoRefresh is enabled
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => {
      fetchJobs(true);
    }, 2800);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchJobs]);

  // Derived statistics
  const stats = useMemo(() => {
    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalRecipients = 0;
    let activeCount = 0;

    jobs.forEach((j) => {
      totalSent += j.sent || 0;
      totalFailed += j.failed || 0;
      totalSkipped += j.skipped || 0;
      totalRecipients += j.total || 0;
      if (j.status === 'running' || j.status === 'paused' || j.status === 'queued') {
        activeCount += 1;
      }
    });

    const totalAttempted = totalSent + totalFailed;
    const successRate = totalAttempted > 0 ? Math.round((totalSent / totalAttempted) * 100) : 100;

    return {
      activeCount,
      totalSent,
      totalFailed,
      totalSkipped,
      totalRecipients,
      successRate,
      jobCount: jobs.length
    };
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    let list = jobs;
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        list = list.filter((j) => j.status === 'running' || j.status === 'paused' || j.status === 'queued');
      } else {
        list = list.filter((j) => j.status === statusFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (j) =>
          (j.title || '').toLowerCase().includes(q) ||
          (j.id || '').toLowerCase().includes(q) ||
          (j.type || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [jobs, statusFilter, searchQuery]);

  const activeJobs = useMemo(() => {
    return jobs.filter((j) => j.status === 'running' || j.status === 'paused' || j.status === 'queued');
  }, [jobs]);

  const formatDuration = (startedAt, finishedAt) => {
    if (!startedAt) return '—';
    const end = finishedAt || Date.now();
    const sec = Math.max(0, Math.round((end - startedAt) / 1000));
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="EmailTracker">
      {/* Header */}
      <div className="AdminPanel__sectionHeader" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="AdminPanel__sectionTitle" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <MdTrackChanges style={{ color: '#03a9f4' }} /> Email Dispatch Tracker & Anti-Spam Monitor
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: 'rgba(234, 242, 255, 0.7)', fontSize: '0.88rem' }}>
            Monitor live email sending progress in real-time, inspect recipient delivery statuses, and track anti-spam throttling cooldowns.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: 'rgba(234, 242, 255, 0.8)',
              fontSize: '0.84rem',
              cursor: 'pointer',
              background: 'rgba(14, 39, 68, 0.6)',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(142, 194, 240, 0.2)'
            }}
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Live Auto-Refresh</span>
          </label>

          <button
            type="button"
            className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
            onClick={() => fetchJobs(false)}
            disabled={loading}
          >
            <MdRefresh style={{ marginRight: 4 }} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="EmailTracker__statsGrid">
        <div className="EmailTracker__statCard">
          <div className="EmailTracker__statIcon EmailTracker__statIcon--active">
            <MdSend />
          </div>
          <div className="EmailTracker__statContent">
            <div className="EmailTracker__statValue">
              {stats.activeCount}
              {stats.activeCount > 0 && <span className="EmailTracker__activePulse" />}
            </div>
            <div className="EmailTracker__statLabel">Active Dispatches</div>
          </div>
        </div>

        <div className="EmailTracker__statCard">
          <div className="EmailTracker__statIcon EmailTracker__statIcon--sent">
            <MdOutlineMarkEmailRead />
          </div>
          <div className="EmailTracker__statContent">
            <div className="EmailTracker__statValue">{stats.totalSent}</div>
            <div className="EmailTracker__statLabel">Total Emails Delivered</div>
          </div>
        </div>

        <div className="EmailTracker__statCard">
          <div className="EmailTracker__statIcon EmailTracker__statIcon--rate">
            <MdShield />
          </div>
          <div className="EmailTracker__statContent">
            <div className="EmailTracker__statValue">{stats.successRate}%</div>
            <div className="EmailTracker__statLabel">Delivery Success Rate</div>
          </div>
        </div>

        <div className="EmailTracker__statCard">
          <div className="EmailTracker__statIcon EmailTracker__statIcon--failed">
            <MdOutlineRunningWithErrors />
          </div>
          <div className="EmailTracker__statContent">
            <div className="EmailTracker__statValue">{stats.totalFailed}</div>
            <div className="EmailTracker__statLabel">Failed Delivery Attempts</div>
          </div>
        </div>
      </div>

      {/* Active Jobs Live Cards (if any) */}
      {activeJobs.length > 0 && (
        <div className="EmailTracker__activeSection">
          <h3 className="EmailTracker__sectionHeading">
            <span className="EmailTracker__liveDot" /> Live Dispatch In Progress ({activeJobs.length})
          </h3>

          <div className="EmailTracker__activeCardsGrid">
            {activeJobs.map((job) => {
              const isPaused = job.status === 'paused' || (job.pausedUntil && job.pausedUntil > Date.now());
              const percent = job.percent || 0;
              return (
                <div
                  key={job.id}
                  className={`EmailTracker__activeCard${isPaused ? ' is-paused' : ''}`}
                  onClick={() => onOpenJob?.({ id: job.id, title: job.title })}
                >
                  <div className="EmailTracker__activeCardTop">
                    <div>
                      <div className="EmailTracker__activeBadge">
                        {isPaused ? (
                          <span className="badge-paused">
                            <MdTimer /> Anti-Spam Throttle Active
                          </span>
                        ) : (
                          <span className="badge-running">
                            <MdSend /> Delivering to Inboxes
                          </span>
                        )}
                      </div>
                      <h4 className="EmailTracker__activeTitle">{job.title}</h4>
                    </div>

                    <button
                      type="button"
                      className="EmailTracker__openModalBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenJob?.({ id: job.id, title: job.title });
                      }}
                    >
                      <MdOpenInNew /> Open Live Tracker
                    </button>
                  </div>

                  {isPaused && (
                    <div className="EmailTracker__activePauseBanner">
                      <MdShield style={{ fontSize: '1.2rem', color: '#ffca28' }} />
                      <div>
                        <strong>Spam Prevention Cooldown:</strong> Pausing 15s between batches. Batch {job.batchNumber || 1} of {job.totalBatches || 1}
                      </div>
                    </div>
                  )}

                  <div className="EmailTracker__activeProgress">
                    <div className="EmailTracker__activeProgressText">
                      <span>{job.sent} of {job.total} sent ({percent}%)</span>
                      {job.failed > 0 && <span style={{ color: '#ef5350' }}>{job.failed} failed</span>}
                    </div>
                    <div className="EmailTracker__activeTrack">
                      <div
                        className={`EmailTracker__activeFill${isPaused ? ' is-paused' : ''}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historical Jobs List */}
      <div className="AdminPanel__section" style={{ marginTop: '1.5rem' }}>
        <div className="EmailTracker__filterBar">
          <div className="EmailTracker__filterTabs">
            {[
              { key: 'all', label: 'All Jobs' },
              { key: 'active', label: `Active (${stats.activeCount})` },
              { key: 'completed', label: 'Completed' },
              { key: 'failed', label: 'Failed' }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`EmailTracker__filterTab${statusFilter === tab.key ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="EmailTracker__searchBox">
            <MdSearch className="EmailTracker__searchIcon" />
            <input
              type="text"
              placeholder="Search dispatch by title or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="EmailTracker__searchInput"
            />
          </div>
        </div>

        {loading && jobs.length === 0 ? (
          <div className="AdminPanel__empty">
            <div className="AdminPanel__spinner" style={{ margin: '0 auto 12px' }} />
            <p>Loading email dispatch logs…</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="AdminPanel__empty">
            <MdEmail style={{ fontSize: '2.5rem', opacity: 0.5, marginBottom: 8 }} />
            <p>No email broadcast jobs found matching your filter.</p>
          </div>
        ) : (
          <div className="AdminPanel__tableWrap">
            <table className="AdminPanel__table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Delivery Progress</th>
                  <th>Failures</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((j) => {
                  const percent = j.percent || 0;
                  const isPaused = j.status === 'paused' || (j.pausedUntil && j.pausedUntil > Date.now());
                  return (
                    <tr key={j.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ color: '#ffffff' }}>{j.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(142, 194, 240, 0.6)', fontFamily: 'monospace' }}>
                          ID: {j.id.slice(0, 8)}…
                        </div>
                      </td>

                      <td>
                        <span className="AdminPanel__badge AdminPanel__badge--info">
                          {j.type || 'announcement'}
                        </span>
                      </td>

                      <td>
                        {isPaused ? (
                          <span className="AdminPanel__badge" style={{ background: 'rgba(255, 183, 77, 0.2)', color: '#ffb74d', border: '1px solid rgba(255, 183, 77, 0.4)' }}>
                            <MdTimer style={{ verticalAlign: 'middle', marginRight: 2 }} /> Paused (Anti-Spam)
                          </span>
                        ) : j.status === 'running' ? (
                          <span className="AdminPanel__badge AdminPanel__badge--active">
                            <span className="EmailTracker__pulseDot" /> Sending
                          </span>
                        ) : j.status === 'completed' && j.failed === 0 ? (
                          <span className="AdminPanel__badge AdminPanel__badge--approved">
                            <MdCheckCircle style={{ verticalAlign: 'middle', marginRight: 2 }} /> Done
                          </span>
                        ) : j.status === 'completed' ? (
                          <span className="AdminPanel__badge" style={{ background: 'rgba(255, 152, 0, 0.2)', color: '#ff9800' }}>
                            Done (Errors)
                          </span>
                        ) : j.status === 'cancelled' ? (
                          <span className="AdminPanel__badge" style={{ background: 'rgba(176, 190, 197, 0.2)', color: '#b0bec5' }}>
                            Cancelled
                          </span>
                        ) : (
                          <span className="AdminPanel__badge AdminPanel__badge--failed">
                            Failed
                          </span>
                        )}
                      </td>

                      <td style={{ minWidth: 150 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                          <span>{j.sent || 0} / {j.total || 0}</span>
                          <span style={{ fontWeight: 700 }}>{percent}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${percent}%`,
                              background: j.status === 'completed' ? '#81c784' : isPaused ? '#ffb74d' : '#03a9f4',
                              borderRadius: 999
                            }}
                          />
                        </div>
                      </td>

                      <td>
                        {j.failed > 0 ? (
                          <span style={{ color: '#ef5350', fontWeight: 600 }}>{j.failed} failed</span>
                        ) : (
                          <span style={{ color: '#81c784' }}>0</span>
                        )}
                      </td>

                      <td style={{ fontSize: '0.82rem', color: 'rgba(234, 242, 255, 0.8)' }}>
                        {j.startedAt ? new Date(j.startedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>

                      <td style={{ fontSize: '0.82rem', color: 'rgba(142, 194, 240, 0.8)' }}>
                        {formatDuration(j.startedAt, j.finishedAt)}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                          onClick={() => onOpenJob?.({ id: j.id, title: j.title })}
                          title="Inspect live tracker and recipient logs"
                        >
                          <MdOpenInNew style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
