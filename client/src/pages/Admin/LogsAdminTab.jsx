import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MdBugReport,
  MdRefresh,
  MdDeleteSweep,
  MdTune,
  MdSearch,
  MdPause,
  MdPlayArrow
} from 'react-icons/md';
import ApiService from '../../services/api';
import './LogsAdminTab.css';

const LEVEL_OPTIONS = ['debug', 'info', 'warn', 'error', 'fatal', 'silent'];
const FILTER_LEVELS = ['', 'debug', 'info', 'warn', 'error', 'fatal'];
const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'http', label: 'HTTP' },
  { value: 'audit', label: 'Audit' },
  { value: 'security', label: 'Security' },
  { value: 'error', label: 'Error context' }
];

const formatTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const entryMeta = (entry) => {
  const { id, level, time, msg, ...rest } = entry || {};
  return rest;
};

const LogsAdminTab = ({ onAlert }) => {
  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [levelFilter, setLevelFilter] = useState('info');
  const [typeFilter, setTypeFilter] = useState('');
  const [query, setQuery] = useState('');
  const [queryDraft, setQueryDraft] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [levelDraft, setLevelDraft] = useState('info');
  const [savingLevel, setSavingLevel] = useState(false);
  const [clearing, setClearing] = useState(false);
  const listRef = useRef(null);
  const stickToBottom = useRef(true);

  const load = useCallback(async () => {
    try {
      const result = await ApiService.getAdminLogs({
        level: levelFilter || undefined,
        type: typeFilter || undefined,
        q: query || undefined,
        limit: 300
      });
      const data = result.data || {};
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setMeta(data.meta || null);
      if (data.meta?.level) setLevelDraft(data.meta.level);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [levelFilter, typeFilter, query]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => {
      load();
    }, 4000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  useEffect(() => {
    if (!stickToBottom.current || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [entries]);

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    stickToBottom.current = nearBottom;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setQuery(queryDraft.trim());
  };

  const handleSetLevel = async () => {
    setSavingLevel(true);
    try {
      const result = await ApiService.setAdminLogLevel(levelDraft);
      setMeta(result.data || null);
      onAlert?.({
        type: 'success',
        message: result.message || `Log level set to ${levelDraft}`
      });
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to update log level' });
    } finally {
      setSavingLevel(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear the in-memory log buffer? This cannot be undone.')) return;
    setClearing(true);
    try {
      const result = await ApiService.clearAdminLogs();
      setMeta(result.data || null);
      onAlert?.({ type: 'success', message: result.message || 'Log buffer cleared' });
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to clear logs' });
    } finally {
      setClearing(false);
    }
  };

  const counts = useMemo(() => {
    const c = { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 };
    for (const e of entries) {
      if (c[e.level] != null) c[e.level] += 1;
    }
    return c;
  }, [entries]);

  return (
    <div className="AdminPanel__section LogsAdmin">
      <div className="AdminPanel__sectionHeader">
        <h2 className="AdminPanel__sectionTitle">
          <MdBugReport /> Server logs
        </h2>
        <p className="AdminPanel__muted LogsAdmin__hint">
          Live view of recent server logs kept in memory on this instance
          ({meta?.bufferCount ?? '—'} / {meta?.bufferMax ?? '—'} entries). Cleared on
          deploy or restart. Visible only to President, Vice President, and Head of
          Software Development.
        </p>
      </div>

      <div className="LogsAdmin__toolbar">
        <div className="LogsAdmin__filters">
          <label className="LogsAdmin__field">
            <span>Min level</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              {FILTER_LEVELS.map((l) => (
                <option key={l || 'all'} value={l}>
                  {l ? l : 'all'}
                </option>
              ))}
            </select>
          </label>

          <label className="LogsAdmin__field">
            <span>Type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value || 'all'} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <form className="LogsAdmin__search" onSubmit={handleSearch}>
            <MdSearch aria-hidden />
            <input
              type="search"
              placeholder="Search message / fields…"
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
            />
            <button type="submit" className="LogsAdmin__btn">
              Search
            </button>
          </form>
        </div>

        <div className="LogsAdmin__actions">
          <button
            type="button"
            className="LogsAdmin__btn"
            onClick={() => {
              setLoading(true);
              load();
            }}
            disabled={loading}
          >
            <MdRefresh /> Refresh
          </button>
          <button
            type="button"
            className={`LogsAdmin__btn ${autoRefresh ? 'LogsAdmin__btn--active' : ''}`}
            onClick={() => setAutoRefresh((v) => !v)}
          >
            {autoRefresh ? <MdPause /> : <MdPlayArrow />}
            {autoRefresh ? 'Pause' : 'Live'}
          </button>
          <button
            type="button"
            className="LogsAdmin__btn LogsAdmin__btn--danger"
            onClick={handleClear}
            disabled={clearing}
          >
            <MdDeleteSweep /> Clear
          </button>
        </div>
      </div>

      <div className="LogsAdmin__settings">
        <div className="LogsAdmin__settingsTitle">
          <MdTune /> Runtime log level
        </div>
        <div className="LogsAdmin__settingsRow">
          <select
            value={levelDraft}
            onChange={(e) => setLevelDraft(e.target.value)}
          >
            {LEVEL_OPTIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="LogsAdmin__btn LogsAdmin__btn--primary"
            onClick={handleSetLevel}
            disabled={savingLevel}
          >
            Apply
          </button>
          <span className="LogsAdmin__metaText">
            Active: <strong>{meta?.level || '—'}</strong>
            {meta?.runtimeOverride
              ? ` (runtime override; env=${meta.envLevel || 'default'})`
              : meta?.envLevel
                ? ` (from LOG_LEVEL=${meta.envLevel})`
                : ' (default for NODE_ENV)'}
            {meta?.nodeEnv ? ` · NODE_ENV=${meta.nodeEnv}` : ''}
          </span>
        </div>
      </div>

      <div className="LogsAdmin__stats">
        <span>Showing {entries.length}</span>
        <span className="LogsAdmin__chip LogsAdmin__chip--debug">debug {counts.debug}</span>
        <span className="LogsAdmin__chip LogsAdmin__chip--info">info {counts.info}</span>
        <span className="LogsAdmin__chip LogsAdmin__chip--warn">warn {counts.warn}</span>
        <span className="LogsAdmin__chip LogsAdmin__chip--error">error {counts.error}</span>
        <span className="LogsAdmin__chip LogsAdmin__chip--fatal">fatal {counts.fatal}</span>
      </div>

      {loading && entries.length === 0 ? (
        <div className="AdminPanel__empty">
          <p>Loading logs…</p>
        </div>
      ) : error ? (
        <div className="AdminPanel__empty">
          <p>{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="AdminPanel__empty">
          <p>No log entries match these filters yet.</p>
        </div>
      ) : (
        <div
          className="LogsAdmin__list"
          ref={listRef}
          onScroll={onListScroll}
        >
          {entries.map((entry) => {
            const metaFields = entryMeta(entry);
            const hasMeta = Object.keys(metaFields).length > 0;
            return (
              <article
                key={entry.id}
                className={`LogsAdmin__row LogsAdmin__row--${entry.level || 'info'}`}
              >
                <div className="LogsAdmin__rowTop">
                  <span className={`LogsAdmin__level LogsAdmin__level--${entry.level}`}>
                    {(entry.level || 'info').toUpperCase()}
                  </span>
                  <time dateTime={entry.time}>{formatTime(entry.time)}</time>
                  {entry.type ? (
                    <span className="LogsAdmin__type">{entry.type}</span>
                  ) : null}
                  <span className="LogsAdmin__id">#{entry.id}</span>
                </div>
                <div className="LogsAdmin__msg">{entry.msg}</div>
                {hasMeta ? (
                  <pre className="LogsAdmin__meta">{JSON.stringify(metaFields, null, 2)}</pre>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LogsAdminTab;
