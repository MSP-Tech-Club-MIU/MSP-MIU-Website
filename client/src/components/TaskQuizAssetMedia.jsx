import React from 'react';
import { safeTaskAssetUrl, taskQuizAssetKind } from '../utils/taskQuizAssets';
import './TaskQuizAssetMedia.css';

/**
 * Renders a task reference asset from an https URL (e.g. R2 public URL).
 * @param {'thumb'|'large'} variant
 */
export default function TaskQuizAssetMedia({ url, variant = 'large', title = 'Task reference' }) {
  const safe = safeTaskAssetUrl(url);
  if (!safe) return null;
  const kind = taskQuizAssetKind(safe);
  const rootClass =
    variant === 'thumb' ? 'TaskQuizAssetMedia TaskQuizAssetMedia--thumb' : 'TaskQuizAssetMedia TaskQuizAssetMedia--large';

  if (kind === 'image') {
    return (
      <div className={rootClass}>
        <img src={safe} alt={title} className="TaskQuizAssetMedia__img" loading="lazy" />
      </div>
    );
  }
  if (kind === 'pdf') {
    return (
      <div className={rootClass}>
        <iframe title={title} src={safe} className="TaskQuizAssetMedia__iframe" />
      </div>
    );
  }
  if (kind === 'video') {
    return (
      <div className={rootClass}>
        <video controls className="TaskQuizAssetMedia__video" src={safe} />
      </div>
    );
  }
  return (
    <div className={rootClass}>
      <a href={safe} target="_blank" rel="noopener noreferrer" className="TaskQuizAssetMedia__fileLink">
        Open reference file
      </a>
    </div>
  );
}
