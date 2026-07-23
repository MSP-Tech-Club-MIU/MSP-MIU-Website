import React from 'react';
import './SeasonBadge.css';

/**
 * Small chip showing season label (e.g. 25/26).
 * @param {string|object} season - label string or { label, season_id }
 * @param {boolean} muted - past/non-active styling
 */
const SeasonBadge = ({ season, muted = false, className = '' }) => {
  const label =
    typeof season === 'string'
      ? season
      : season?.label || null;

  if (!label) return null;

  return (
    <span
      className={`SeasonBadge ${muted ? 'SeasonBadge--muted' : ''} ${className}`.trim()}
      title={`Season ${label}`}
    >
      {label}
    </span>
  );
};

export default SeasonBadge;
