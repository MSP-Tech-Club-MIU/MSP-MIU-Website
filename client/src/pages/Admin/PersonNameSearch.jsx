import React, { useEffect, useRef, useState } from 'react';
import ApiService from '../../services/api';
import './PersonNameSearch.css';

/**
 * Autocomplete for full name that searches board / members / users
 * and fills identity fields on select.
 */
export default function PersonNameSearch({
  value,
  onChange,
  onSelectPerson,
  disabled = false,
  placeholder = 'Type a name to search…',
  inputId
}) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const reqId = useRef(0);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const q = String(query || '').trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    const id = ++reqId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const result = await ApiService.searchAdminPeople(q);
        if (reqId.current !== id) return;
        setResults(Array.isArray(result?.data) ? result.data : []);
        setOpen(true);
        setHighlight(0);
      } catch {
        if (reqId.current !== id) return;
        setResults([]);
      } finally {
        if (reqId.current === id) setLoading(false);
      }
    }, 280);

    return () => clearTimeout(t);
  }, [query]);

  const pick = (person) => {
    onChange?.(person.full_name || '');
    onSelectPerson?.(person);
    setQuery(person.full_name || '');
    setOpen(false);
    setResults([]);
  };

  const onKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(results[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="PersonNameSearch" ref={wrapRef}>
      <input
        id={inputId}
        type="text"
        autoComplete="off"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange?.(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (results.length) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && (loading || results.length > 0 || String(query).trim().length >= 2) && (
        <ul className="PersonNameSearch__list" role="listbox">
          {loading && results.length === 0 && (
            <li className="PersonNameSearch__empty">Searching…</li>
          )}
          {!loading && results.length === 0 && (
            <li className="PersonNameSearch__empty">No matches — type a full name or pick later</li>
          )}
          {results.map((person, idx) => (
            <li key={`${person.source}-${person.user_id || person.university_id || person.email || idx}`}>
              <button
                type="button"
                className={`PersonNameSearch__option ${idx === highlight ? 'is-active' : ''}`}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => pick(person)}
              >
                <span className="PersonNameSearch__name">{person.full_name || '—'}</span>
                <span className="PersonNameSearch__meta">
                  {person.source_label}
                  {person.position ? ` · ${person.position}` : ''}
                  {person.user_id ? ` · user #${person.user_id}` : ' · no user link'}
                </span>
                {(person.university_id || person.email) && (
                  <span className="PersonNameSearch__ids">
                    {[person.university_id, person.email].filter(Boolean).join(' · ')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
