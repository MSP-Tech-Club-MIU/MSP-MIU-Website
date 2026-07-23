import React from 'react';
import { useSeasonOptional } from '../context/SeasonContext';
import './SeasonSelector.css';

/**
 * Compact season dropdown for Navbar / AdminShell.
 */
const SeasonSelector = ({ className = '', compact = false }) => {
  const seasonCtx = useSeasonOptional();
  if (!seasonCtx) return null;

  const {
    seasons,
    selectedSeasonId,
    setSelectedSeasonId,
    defaultSeasonId,
    loading,
  } = seasonCtx;

  const value =
    selectedSeasonId === 'all' || selectedSeasonId === 'current'
      ? selectedSeasonId
      : String(selectedSeasonId);

  return (
    <label className={`SeasonSelector ${compact ? 'SeasonSelector--compact' : ''} ${className}`.trim()}>
      <span className="SeasonSelector__label">Season</span>
      <select
        className="SeasonSelector__select"
        value={value}
        disabled={loading && seasons.length === 0}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'all' || v === 'current') {
            setSelectedSeasonId(v);
          } else {
            setSelectedSeasonId(parseInt(v, 10));
          }
        }}
        aria-label="Select season"
      >
        <option value="current">
          Current
          {seasons.find((s) => s.season_id === defaultSeasonId)?.label
            ? ` (${seasons.find((s) => s.season_id === defaultSeasonId).label})`
            : ''}
        </option>
        <option value="all">All</option>
        {seasons.map((s) => (
          <option key={s.season_id} value={String(s.season_id)}>
            {s.label}
            {s.season_id === defaultSeasonId ? ' · Current' : ''}
          </option>
        ))}
      </select>
    </label>
  );
};

export default SeasonSelector;
