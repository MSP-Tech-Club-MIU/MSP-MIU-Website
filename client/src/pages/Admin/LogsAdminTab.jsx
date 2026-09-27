import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MdBugReport,
  MdRefresh,
  MdDeleteSweep,
  MdTune,
  MdSearch,
  MdPause,
  MdPlayArrow,
  MdFilterAltOff
} from 'react-icons/md';
import ApiService from '../../services/api';
import { confirmModal } from '../../context/ModalContext';
import './LogsAdminTab.css';

const LEVEL_OPTIONS = ['debug', 'info', 'warn', 'error', 'fatal', 'silent'];
const LEVEL_WEIGHTS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50
};

const FILTER_LEVEL_OPTIONS = [
  { value: '', label: 'All levels' },
  { value: 'warn+', label: 'Warnings & Errors (≥ warn)' },
  { value: 'error+', label: 'Errors & Fatal (≥ error)' },
  { value: 'only:debug', label: 'Only debug' },
  { value: 'only:info', label: 'Only info' },
  { value: 'only:warn', label: 'Only warn' },
  { value: 'only:error', label: 'Only error' },
  { value: 'only:fatal', label: 'Only fatal' }
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'http_error', label: 'Failed / Rejected (4xx, 5xx & Ineligible)' },
  { value: 'error', label: 'Errors & Exceptions' },
  { value: 'application', label: 'Applications (/api/applications)' },
  { value: 'auth', label: 'Auth & Account Activation' },
  { value: 'security', label: 'Security Events' },
  { value: 'audit', label: 'Audit Events' },
  { value: 'http', label: 'All HTTP Requests' }
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

const matchesLevelClient = (entry, rawLevel) => {
  if (!rawLevel || rawLevel === 'all') return true;
  const lvl = String(entry?.level || 'info').toLowerCase();
  const weight = LEVEL_WEIGHTS[lvl] || 0;

  if (rawLevel.startsWith('only:') || rawLevel.startsWith('exact:')) {
    const target = rawLevel.split(':')[1];
    return lvl === target;
  }
  if (rawLevel.startsWith('min:')) {
    const target = rawLevel.split(':')[1];
    const minW = LEVEL_WEIGHTS[target];
    return minW != null ? weight >= minW : true;
  }
  if (rawLevel.endsWith('+')) {
    const target = rawLevel.slice(0, -1);
    const minW = LEVEL_WEIGHTS[target];
    return minW != null ? weight >= minW : true;
  }
  if (LEVEL_WEIGHTS[rawLevel] != null) {
    return lvl === rawLevel;
  }
  return true;
};

const matchesTypeClient = (entry, typeFilter) => {
  if (!typeFilter) return true;
  const tf = String(typeFilter).toLowerCase();
  const t = String(entry?.type || '').toLowerCase();
  const lvl = String(entry?.level || '').toLowerCase();
  const path = String(entry?.path || '').toLowerCase();
  const ctx = String(entry?.context || '').toLowerCase();
  const evt = String(entry?.event || '').toLowerCase();
  const msg = String(entry?.msg || '').toLowerCase();
  const status = Number(entry?.status);

  switch (tf) {
    case 'error':
      return (
        t === 'error' ||
        lvl === 'error' ||
        lvl === 'fatal' ||
        Boolean(entry?.err) ||
        (Number.isFinite(status) && status >= 500)
      );
    case 'http_error':
      return (
        (Number.isFinite(status) && status >= 400) ||
        entry?.eligible === false ||
        lvl === 'warn' ||
        lvl === 'error' ||
        lvl === 'fatal'
      );
    case 'application':
      return (
        t === 'application' ||
        path.includes('/api/applications') ||
        ctx.startsWith('application') ||
        msg.includes('application')
      );
    case 'auth':
      return (
        t === 'auth' ||
        t === 'security' ||
        path.includes('/api/auth') ||
        path.includes('/api/users') ||
        ctx.startsWith('auth.') ||
        ctx.startsWith('user.') ||
        evt.includes('login') ||
        evt.includes('register') ||
        evt.includes('activat') ||
        evt.includes('password') ||
        evt.includes('token')
      );
    default:
      return t === tf;
  }
};

const matchesQueryClient = (entry, q) => {
  if (!q) return true;
  const needle = String(q).toLowerCase().trim();
  if (!needle) return true;
  try {
    return JSON.stringify(entry).toLowerCase().includes(needle);
  } catch {
    return String(entry?.msg || '').toLowerCase().includes(needle);
  }
};

const LogsAdminTab = ({ onAlert }) => {
  const [entries, setEntries] = useState([]);
  const [serverTotalCounts, setServerTotalCounts] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [queryDraft, setQueryDraft] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [levelDraft, setLevelDraft] = useState('info');
  const [savingLevel, setSavingLevel] = useState(false);
  const [clearing, setClearing] = useState(false);
  const listRef = useRef(null);
  const stickToBottom = useRef(true);

  const load = useCallback(async () => {
    try {
      // Fetch full buffer so client-side filters and level count chips work instantaneously
      const result = await ApiService.getAdminLogs({
        limit: 500
      });
      const data = result.data || {};
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      if (data.totalCounts) setServerTotalCounts(data.totalCounts);
      setMeta(data.meta || null);
      if (data.meta?.level) setLevelDraft(data.meta.level);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const filteredEntries = useMemo(() => {
    return entries.filter(
      (entry) =>
        matchesLevelClient(entry, levelFilter) &&
        matchesTypeClient(entry, typeFilter) &&
        matchesQueryClient(entry, queryDraft)
    );
  }, [entries, levelFilter, typeFilter, queryDraft]);

  useEffect(() => {
    if (!stickToBottom.current || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [filteredEntries]);

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    stickToBottom.current = nearBottom;
  };

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const hasActiveFilters = Boolean(levelFilter || typeFilter || queryDraft.trim());

  const handleResetFilters = () => {
    setLevelFilter('');
    setTypeFilter('');
    setQueryDraft('');
  };

  const handleChipClick = (lvl) => {
    const target = `only:${lvl}`;
    setLevelFilter((prev) => (prev === target ? '' : target));
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
    const ok = await confirmModal({
      title: 'Clear Log Buffer?',
      message: 'Clear the in-memory log buffer? This cannot be undone.',
      confirmText: 'Clear Logs',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
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
    return serverTotalCounts || c;
  }, [entries, serverTotalCounts]);

  return (
    <div className="AdminPanel__section LogsAdmin">
      <div className="AdminPanel__sectionHeader">
        <h2 className="AdminPanel__sectionTitle">
          <MdBugReport /> Server logs
        </h2>
        <p className="AdminPanel__muted LogsAdmin__hint">
          Live view of recent server logs kept in memory on this instance
          ({meta?.bufferCount ?? entries.length} / {meta?.bufferMax ?? '—'} entries). Cleared on
          deploy or restart. Visible only to President, Vice President, and Head of
          Software Development.
        </p>
      </div>

      <div className="LogsAdmin__toolbar">
        <div className="LogsAdmin__filters">
          <label className="LogsAdmin__field">
            <span>Level</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              {FILTER_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
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
              placeholder="Filter by message, email, ID, path, error…"
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
            />
            {hasActiveFilters ? (
              <button
                type="button"
                className="LogsAdmin__btn"
                onClick={handleResetFilters}
                title="Clear all active filters"
              >
                <MdFilterAltOff /> Reset
              </button>
            ) : null}
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
        <span>
          Showing <strong>{filteredEntries.length}</strong> of {entries.length}
        </span>
        {(['debug', 'info', 'warn', 'error', 'fatal']).map((lvl) => {
          const isSelected = levelFilter === `only:${lvl}` || levelFilter === lvl;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => handleChipClick(lvl)}
              className={`LogsAdmin__chip LogsAdmin__chip--${lvl} ${
                isSelected ? 'LogsAdmin__chip--selected' : ''
              }`}
              title={`Click to filter by ${lvl.toUpperCase()} only`}
            >
              {lvl} {counts[lvl] ?? 0}
            </button>
          );
        })}
      </div>

      {loading && entries.length === 0 ? (
        <div className="AdminPanel__empty">
          <p>Loading logs…</p>
        </div>
      ) : error ? (
        <div className="AdminPanel__empty">
          <p>{error}</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="AdminPanel__empty">
          <p>No log entries match these filters yet.</p>
          {hasActiveFilters ? (
            <button
              type="button"
              className="LogsAdmin__btn"
              style={{ marginTop: '0.6rem' }}
              onClick={handleResetFilters}
            >
              <MdFilterAltOff /> Clear Filters
            </button>
          ) : null}
        </div>
      ) : (
        <div
          className="LogsAdmin__list"
          ref={listRef}
          onScroll={onListScroll}
        >
          {filteredEntries.map((entry) => {
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
                  {entry.status ? (
                    <span
                      className={`LogsAdmin__type ${
                        entry.status >= 500
                          ? 'LogsAdmin__level--error'
                          : entry.status >= 400
                            ? 'LogsAdmin__level--warn'
                            : ''
                      }`}
                    >
                      HTTP {entry.status}
                    </span>
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

