import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ApiService from '../../services/api';
import { useSeason } from '../../context/SeasonContext';
import SeasonBadge from '../../components/SeasonBadge';
import { departments as fallbackDepts } from '../../data/departments';
import './SeasonsAdminTab.css';

const ADMIN_POSITIONS = ['President', 'Vice President', 'Head'];
const ALL_POSITIONS = ['President', 'Vice President', 'Head', 'Co-Head', 'Founder'];
const ADMIN_DEPT_IDS = new Set([1, 2]);

/** Next label after the latest season, e.g. 25/26 → 26/27 */
function computeNextSeasonLabel(seasons) {
  if (!Array.isArray(seasons) || seasons.length === 0) return '25/26';
  const latest = [...seasons].sort((a, b) => {
    const dy = (b.start_year || 0) - (a.start_year || 0);
    if (dy !== 0) return dy;
    return (b.season_id || 0) - (a.season_id || 0);
  })[0];

  if (latest?.label && /^\d{2}\/\d{2}$/.test(latest.label)) {
    const [a, b] = latest.label.split('/').map((x) => parseInt(x, 10));
    return `${String((a + 1) % 100).padStart(2, '0')}/${String((b + 1) % 100).padStart(2, '0')}`;
  }

  const start = ((latest?.start_year || 2025) % 100) + 1;
  return `${String(start % 100).padStart(2, '0')}/${String((start + 1) % 100).padStart(2, '0')}`;
}

function isAdminEligibleDraft(member) {
  const userId = Number(member.user_id);
  if (!Number.isFinite(userId) || userId < 1) return false;
  if (member.position === 'President' || member.position === 'Vice President') return true;
  const deptId = Number(member.department_id);
  return member.position === 'Head' && ADMIN_DEPT_IDS.has(deptId);
}

function emptyBoardDraft(overrides = {}) {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    full_name: '',
    position: 'President',
    department_id: '',
    user_id: '',
    email: '',
    ...overrides
  };
}

const SeasonsAdminTab = () => {
  const { refreshSeasons, defaultSeasonId } = useSeason();
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [makeDefaultOnCreate, setMakeDefaultOnCreate] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [boardDrafts, setBoardDrafts] = useState([emptyBoardDraft()]);
  const [modalError, setModalError] = useState('');
  const [depts, setDepts] = useState(fallbackDepts);
  const [importing, setImporting] = useState(false);

  const nextLabel = useMemo(() => computeNextSeasonLabel(seasons), [seasons]);
  const nextYearRange = useMemo(() => {
    if (!/^\d{2}\/\d{2}$/.test(nextLabel)) return '';
    const [a] = nextLabel.split('/').map((x) => parseInt(x, 10));
    const start = 2000 + a;
    return `${start}-${start + 1}`;
  }, [nextLabel]);

  const hasAdminEligible = useMemo(
    () => boardDrafts.some(isAdminEligibleDraft),
    [boardDrafts]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ApiService.getSeasons({ includeInactive: true });
      setSeasons(result.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load seasons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const result = await ApiService.getDepartments({ limit: 100, page: 1 });
        const rows = Array.isArray(result?.data) ? result.data : [];
        if (rows.length) {
          setDepts(rows.map((d) => ({ id: d.department_id, name: d.name })));
        }
      } catch {
        /* keep fallback */
      }
    })();
  }, []);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [modalOpen, saving]);

  const openCreateModal = async () => {
    setModalError('');
    setMakeDefaultOnCreate(false);
    let draft = emptyBoardDraft({ position: 'President' });
    try {
      const profile = await ApiService.getProfile();
      if (profile?.user_id) {
        draft = emptyBoardDraft({
          full_name: profile.full_name || profile.name || '',
          email: profile.email || '',
          user_id: String(profile.user_id),
          position: 'President'
        });
      }
    } catch {
      /* ignore — empty form */
    }
    setBoardDrafts([draft]);
    setModalOpen(true);
  };

  const updateDraft = (key, patch) => {
    setBoardDrafts((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  };

  const removeDraft = (key) => {
    setBoardDrafts((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== key)));
  };

  const addDraft = () => {
    setBoardDrafts((rows) => [...rows, emptyBoardDraft({ position: 'Head', department_id: '1' })]);
  };

  const importFromCurrentSeason = async () => {
    setImporting(true);
    setModalError('');
    try {
      const result = await ApiService.getBoard({
        page: 1,
        limit: 100,
        includeHidden: true,
        season_id: defaultSeasonId || 'current'
      });
      const rows = Array.isArray(result?.data) ? result.data : [];
      if (!rows.length) {
        setModalError('Current season has no board members to import.');
        return;
      }
      setBoardDrafts(
        rows.map((row) =>
          emptyBoardDraft({
            full_name: row.full_name || '',
            position: ALL_POSITIONS.includes(row.position) ? row.position : 'Head',
            department_id: row.department_id != null ? String(row.department_id) : '',
            user_id: row.user_id != null ? String(row.user_id) : '',
            email: row.email || ''
          })
        )
      );
    } catch (err) {
      setModalError(err.message || 'Failed to import board from current season');
    } finally {
      setImporting(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!hasAdminEligible) {
      setModalError(
        'Add at least one President, Vice President, or Head of Software Development / Technical Training with a linked User ID.'
      );
      return;
    }

    for (let i = 0; i < boardDrafts.length; i += 1) {
      const m = boardDrafts[i];
      if (!String(m.full_name || '').trim()) {
        setModalError(`Board member #${i + 1}: name is required.`);
        return;
      }
      if (m.position === 'Head' && (m.department_id === '' || m.department_id == null)) {
        setModalError(`Board member #${i + 1}: department is required for Head.`);
        return;
      }
    }

    setSaving(true);
    try {
      await ApiService.createSeason({
        label: nextLabel,
        is_default: makeDefaultOnCreate,
        is_active: true,
        board_members: boardDrafts.map((m) => ({
          full_name: String(m.full_name).trim(),
          position: m.position,
          department_id: m.department_id === '' ? null : Number(m.department_id),
          user_id: m.user_id === '' ? null : Number(m.user_id),
          email: m.email || null,
          year: nextYearRange || undefined
        }))
      });
      setModalOpen(false);
      setMakeDefaultOnCreate(false);
      await load();
      await refreshSeasons({ includeInactive: false });
      ApiService.clearCache('/seasons');
      ApiService.clearCache('/board');
    } catch (err) {
      setModalError(err.message || 'Failed to create season');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id) => {
    setSaving(true);
    setError('');
    try {
      await ApiService.setDefaultSeason(id);
      await load();
      await refreshSeasons();
      ApiService.clearCache('/seasons');
    } catch (err) {
      setError(err.message || 'Failed to set default season');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (season) => {
    setSaving(true);
    setError('');
    try {
      await ApiService.updateSeason(season.season_id, {
        is_active: !season.is_active
      });
      await load();
      await refreshSeasons();
    } catch (err) {
      setError(err.message || 'Failed to update season');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="AdminPanel__section SeasonsAdmin">
      <div className="AdminPanel__sectionHeader">
        <h2>Season</h2>
        <p className="AdminPanel__muted">
          Create the next academic season with at least one admin-eligible board member,
          then set which season is the platform default. The default season gates admin
          access and is what public pages show first.
        </p>
      </div>

      {error && <div className="AdminPanel__errorBanner">{error}</div>}

      <div className="SeasonsAdmin__createCard">
        <div className="SeasonsAdmin__createInfo">
          <span className="SeasonsAdmin__createLabel">Create next season</span>
          <strong className="SeasonsAdmin__nextLabel">{nextLabel}</strong>
          <span className="AdminPanel__muted">
            Opens a form to add board members (required so you keep Admin Panel access).
          </span>
        </div>
        <div className="SeasonsAdmin__createActions">
          <button
            type="button"
            className="SeasonsAdmin__createBtn"
            disabled={saving || loading}
            onClick={openCreateModal}
          >
            Create {nextLabel}
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading seasons…</p>
      ) : (
        <div className="AdminPanel__tableWrap">
          <table className="AdminPanel__table">
            <thead>
              <tr>
                <th>Season</th>
                <th>Years</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((s) => (
                <tr key={s.season_id}>
                  <td>
                    <SeasonBadge season={s} muted={!s.is_default} />
                    {s.is_default && (
                      <span className="SeasonsAdmin__currentTag">Default</span>
                    )}
                  </td>
                  <td>
                    {s.start_year}–{s.end_year}
                  </td>
                  <td>{s.is_active ? 'Visible' : 'Hidden'}</td>
                  <td className="AdminPanel__rowActions">
                    {!s.is_default ? (
                      <button
                        type="button"
                        className="SeasonsAdmin__actionBtn"
                        disabled={saving}
                        onClick={() => handleSetDefault(s.season_id)}
                      >
                        Set as default
                      </button>
                    ) : (
                      <span className="AdminPanel__muted">Current default</span>
                    )}
                    <button
                      type="button"
                      className="SeasonsAdmin__actionBtn SeasonsAdmin__actionBtn--ghost"
                      disabled={saving || s.is_default}
                      onClick={() => handleToggleActive(s)}
                      title={s.is_default ? 'Default season must stay visible' : undefined}
                    >
                      {s.is_active ? 'Hide' : 'Show'}
                    </button>
                  </td>
                </tr>
              ))}
              {seasons.length === 0 && (
                <tr>
                  <td colSpan={4}>No seasons yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen
        ? createPortal(
            <div
              className="AdminPanel__modalOverlay"
              onClick={() => {
                if (!saving) setModalOpen(false);
              }}
              role="presentation"
            >
              <div
                className="AdminPanel__modalContent SeasonsAdmin__modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="season-create-title"
              >
                <h3 className="AdminPanel__modalTitle" id="season-create-title">
                  Create season {nextLabel}
                </h3>
                <p className="SeasonsAdmin__modalHint">
                  Add one or more board members for this season. At least one must be{' '}
                  <strong>President</strong>, <strong>Vice President</strong>, or{' '}
                  <strong>Head</strong> of Software Development / Technical Training, with a{' '}
                  <strong>linked User ID</strong> — otherwise you will lose Admin Panel access
                  when this season becomes default.
                </p>

                {modalError && (
                  <div className="AdminPanel__errorBanner">{modalError}</div>
                )}

                <form onSubmit={handleCreateSubmit}>
                  <div className="SeasonsAdmin__boardList">
                    {boardDrafts.map((row, index) => {
                      const eligible = isAdminEligibleDraft(row);
                      return (
                        <div
                          key={row.key}
                          className={`SeasonsAdmin__boardCard ${eligible ? 'SeasonsAdmin__boardCard--ok' : ''}`}
                        >
                          <div className="SeasonsAdmin__boardCardHeader">
                            <span>Board member #{index + 1}</span>
                            {eligible ? (
                              <span className="SeasonsAdmin__eligibleTag">Admin eligible</span>
                            ) : (
                              <span className="SeasonsAdmin__notEligibleTag">Not admin-eligible</span>
                            )}
                            {boardDrafts.length > 1 && (
                              <button
                                type="button"
                                className="SeasonsAdmin__actionBtn SeasonsAdmin__actionBtn--ghost"
                                onClick={() => removeDraft(row.key)}
                                disabled={saving}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="AdminPanel__formGrid">
                            <label>
                              Full name
                              <input
                                required
                                value={row.full_name}
                                onChange={(e) => updateDraft(row.key, { full_name: e.target.value })}
                                disabled={saving}
                              />
                            </label>
                            <label>
                              Position
                              <select
                                value={row.position}
                                onChange={(e) => {
                                  const position = e.target.value;
                                  const patch = { position };
                                  if (position !== 'Head') patch.department_id = '';
                                  else if (!row.department_id) patch.department_id = '1';
                                  updateDraft(row.key, patch);
                                }}
                                disabled={saving}
                              >
                                {ALL_POSITIONS.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                    {ADMIN_POSITIONS.includes(p) ? '' : ' (display only)'}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Department
                              <select
                                value={row.department_id}
                                onChange={(e) =>
                                  updateDraft(row.key, { department_id: e.target.value })
                                }
                                disabled={saving || row.position !== 'Head'}
                                required={row.position === 'Head'}
                              >
                                <option value="">
                                  {row.position === 'Head' ? 'Select department' : 'None / Leadership'}
                                </option>
                                {depts.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                    {ADMIN_DEPT_IDS.has(Number(d.id)) ? ' (admin if Head)' : ''}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Linked user ID
                              <input
                                type="number"
                                min={1}
                                value={row.user_id}
                                onChange={(e) => updateDraft(row.key, { user_id: e.target.value })}
                                disabled={saving}
                                placeholder="Required for admin access"
                              />
                            </label>
                            <label>
                              Email
                              <input
                                type="email"
                                value={row.email}
                                onChange={(e) => updateDraft(row.key, { email: e.target.value })}
                                disabled={saving}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="SeasonsAdmin__modalToolbar">
                    <button
                      type="button"
                      className="SeasonsAdmin__actionBtn"
                      onClick={addDraft}
                      disabled={saving}
                    >
                      Add another member
                    </button>
                    <button
                      type="button"
                      className="SeasonsAdmin__actionBtn SeasonsAdmin__actionBtn--ghost"
                      onClick={importFromCurrentSeason}
                      disabled={saving || importing}
                    >
                      {importing ? 'Importing…' : 'Import from current season'}
                    </button>
                  </div>

                  <label className="SeasonsAdmin__checkbox SeasonsAdmin__checkbox--modal">
                    <input
                      type="checkbox"
                      checked={makeDefaultOnCreate}
                      onChange={(e) => setMakeDefaultOnCreate(e.target.checked)}
                      disabled={saving}
                    />
                    Set as default after create
                  </label>

                  {!hasAdminEligible && (
                    <p className="SeasonsAdmin__warnText">
                      Need at least one admin-eligible member with a User ID before you can create.
                    </p>
                  )}

                  <div className="AdminPanel__modalActions">
                    <button
                      type="button"
                      className="AdminPanel__actionBtn"
                      onClick={() => setModalOpen(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="AdminPanel__addBtn"
                      disabled={saving || !hasAdminEligible}
                    >
                      {saving ? 'Creating…' : `Create ${nextLabel}`}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default SeasonsAdminTab;
