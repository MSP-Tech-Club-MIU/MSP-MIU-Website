import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ApiService from '../../services/api';
import { useSeason } from '../../context/SeasonContext';
import SeasonBadge from '../../components/SeasonBadge';
import './SeasonsAdminTab.css';

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

const SeasonsAdminTab = () => {
  const { refreshSeasons } = useSeason();
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [makeDefaultOnCreate, setMakeDefaultOnCreate] = useState(false);

  const nextLabel = useMemo(() => computeNextSeasonLabel(seasons), [seasons]);

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

  const handleCreateNext = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await ApiService.createSeason({
        label: nextLabel,
        is_default: makeDefaultOnCreate,
        is_active: true,
      });
      setMakeDefaultOnCreate(false);
      await load();
      await refreshSeasons({ includeInactive: false });
      ApiService.clearCache('/seasons');
    } catch (err) {
      setError(err.message || 'Failed to create season');
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
        is_active: !season.is_active,
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
          Create the next academic season and set which one is the platform default.
          The default season gates admin access and is what public pages show first.
        </p>
      </div>

      {error && <div className="AdminPanel__errorBanner">{error}</div>}

      <form className="SeasonsAdmin__createCard" onSubmit={handleCreateNext}>
        <div className="SeasonsAdmin__createInfo">
          <span className="SeasonsAdmin__createLabel">Create next season</span>
          <strong className="SeasonsAdmin__nextLabel">{nextLabel}</strong>
          <span className="AdminPanel__muted">
            Auto-increments from the latest season (same NN/NN format).
          </span>
        </div>
        <div className="SeasonsAdmin__createActions">
          <label className="SeasonsAdmin__checkbox">
            <input
              type="checkbox"
              checked={makeDefaultOnCreate}
              onChange={(e) => setMakeDefaultOnCreate(e.target.checked)}
            />
            Set as default after create
          </label>
          <button
            type="submit"
            className="SeasonsAdmin__createBtn"
            disabled={saving || loading}
          >
            Create {nextLabel}
          </button>
        </div>
      </form>

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
    </div>
  );
};

export default SeasonsAdminTab;
