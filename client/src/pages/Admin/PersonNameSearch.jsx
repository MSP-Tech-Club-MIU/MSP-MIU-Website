import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [coords, setCoords] = useState(null);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const reqId = useRef(0);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const updateCoords = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    const width = Math.max(rect.width, 280);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    const top = rect.bottom + 6;
    setCoords((prev) => {
      if (
        prev &&
        prev.top === top &&
        prev.left === left &&
        prev.width === width
      ) {
        return prev;
      }
      return { top, left, width };
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updateCoords();
    const onReposition = () => updateCoords();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, results, loading, updateCoords]);

  useEffect(() => {
    const onDoc = (e) => {
      const inWrap = wrapRef.current?.contains(e.target);
      const inList = listRef.current?.contains(e.target);
      if (!inWrap && !inList) setOpen(false);
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
    setOpen(true);
    const t = setTimeout(async () => {
      try {
        const result = await ApiService.searchAdminPeople(q);
        if (reqId.current !== id) return;
        setResults(Array.isArray(result?.data) ? result.data : []);
        setOpen(true);
        setHighlight(0);
        requestAnimationFrame(() => updateCoords());
      } catch (err) {
        console.error('Person search failed:', err);
        if (reqId.current !== id) return;
        setResults([]);
        setOpen(true);
      } finally {
        if (reqId.current === id) setLoading(false);
      }
    }, 280);

    return () => clearTimeout(t);
  }, [query, updateCoords]);

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

  const showList =
    open && (loading || results.length > 0 || String(query).trim().length >= 2);

  return (
    <div className="PersonNameSearch" ref={wrapRef}>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange?.(e.target.value);
          setOpen(true);
          requestAnimationFrame(() => updateCoords());
        }}
        onFocus={() => {
          if (results.length || String(query).trim().length >= 2) {
            setOpen(true);
            requestAnimationFrame(() => updateCoords());
          }
        }}
        onKeyDown={onKeyDown}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {showList &&
        coords &&
        createPortal(
          <ul
            ref={listRef}
            className="PersonNameSearch__list"
            role="listbox"
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width
            }}
          >
            {loading && results.length === 0 && (
              <li className="PersonNameSearch__empty">Searching…</li>
            )}
            {!loading && results.length === 0 && (
              <li className="PersonNameSearch__empty">
                No matches — type a full name or pick later
              </li>
            )}
            {results.map((person, idx) => {
              const metaParts = [
                person.source_label,
                person.position,
                person.department_name,
                person.user_id ? `user #${person.user_id}` : 'no user link'
              ].filter(Boolean);
              return (
                <li
                  key={`${person.source}-${person.user_id || person.university_id || person.email || idx}`}
                >
                  <button
                    type="button"
                    className={`PersonNameSearch__option ${idx === highlight ? 'is-active' : ''}`}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => pick(person)}
                  >
                    <span className="PersonNameSearch__name">{person.full_name || '—'}</span>
                    <span className="PersonNameSearch__meta">{metaParts.join(' · ')}</span>
                    {(person.university_id || person.email) && (
                      <span className="PersonNameSearch__ids">
                        {[person.university_id, person.email].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}
