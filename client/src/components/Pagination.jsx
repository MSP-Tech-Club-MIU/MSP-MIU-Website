import React from 'react';
import './Pagination.css';

/**
 * Shared pagination controls for list APIs.
 * @param {{ pagination?: { page: number, limit: number, total: number, totalPages: number, hasNext: boolean, hasPrev: boolean }, onPageChange: (page: number) => void, className?: string, disabled?: boolean }} props
 */
export default function Pagination({ pagination, onPageChange, className = '', disabled = false }) {
  if (!pagination || !pagination.totalPages || pagination.totalPages <= 1) {
    return null;
  }

  const { page, totalPages, total, hasNext, hasPrev } = pagination;

  return (
    <nav className={`Pagination ${className}`.trim()} aria-label="Pagination" aria-busy={disabled || undefined}>
      <button
        type="button"
        className="Pagination__btn"
        disabled={disabled || !hasPrev}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        Previous
      </button>
      <span className="Pagination__meta">
        Page {page} of {totalPages}
        {typeof total === 'number' ? ` · ${total} total` : ''}
      </span>
      <button
        type="button"
        className="Pagination__btn"
        disabled={disabled || !hasNext}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}
