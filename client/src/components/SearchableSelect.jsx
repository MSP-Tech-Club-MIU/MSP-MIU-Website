import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiSearch, FiChevronDown, FiCheck, FiX, FiLoader } from 'react-icons/fi';
import './SearchableSelect.css';

/**
 * SearchableSelect
 * A high-performance dropdown component that searches and loads items in small batches
 * from the backend, ensuring not all items are fetched at once.
 */
export default function SearchableSelect({
  label,
  value,
  onChange,
  fetchOptions,
  getOptionLabel = (item) => item?.title || item?.name || '',
  getOptionValue = (item) => String(item?.course_id ?? item?.event_id ?? item?.competition_id ?? item?.id ?? ''),
  getOptionSubtitle = null,
  placeholder = 'Select an item...',
  searchPlaceholder = 'Search by name or keyword...',
  typeIcon = null,
  disabled = false,
  emptyMessage = 'No matching items found.'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 280);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Initial load or search query change
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setPage(1);

    if (fetchOptions) {
      fetchOptions(debouncedQuery, 1)
        .then((res) => {
          if (isCancelled) return;
          const items = Array.isArray(res?.items) ? res.items : [];
          setOptions(items);
          setHasNext(Boolean(res?.hasNext));
          setTotalCount(res?.total ?? items.length);
          setHasLoaded(true);

          // If current value matches an item, cache it
          if (value) {
            const found = items.find((it) => getOptionValue(it) === String(value));
            if (found) setSelectedItem(found);
          } else if (items.length > 0 && !debouncedQuery) {
            // Auto select first item if nothing selected
            setSelectedItem(items[0]);
            onChange?.(items[0]);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            console.error('SearchableSelect error loading options:', err);
            setOptions([]);
            setHasLoaded(true);
          }
        })
        .finally(() => {
          if (!isCancelled) setLoading(false);
        });
    } else {
      setLoading(false);
      setHasLoaded(true);
    }

    return () => {
      isCancelled = true;
    };
  }, [fetchOptions, debouncedQuery]);

  // Sync selectedItem when value changes externally
  useEffect(() => {
    if (value && options.length > 0) {
      const match = options.find((opt) => getOptionValue(opt) === String(value));
      if (match) setSelectedItem(match);
    }
  }, [value, options, getOptionValue]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard events (Escape to close)
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    []
  );

  // Load next page
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasNext || !fetchOptions) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await fetchOptions(debouncedQuery, nextPage);
      const newItems = Array.isArray(res?.items) ? res.items : [];
      setOptions((prev) => [...prev, ...newItems]);
      setPage(nextPage);
      setHasNext(Boolean(res?.hasNext));
    } catch (err) {
      console.error('Failed to load more options:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasNext, fetchOptions, debouncedQuery, page]);

  const handleSelectOption = useCallback(
    (item) => {
      setSelectedItem(item);
      onChange?.(item);
      setIsOpen(false);
    },
    [onChange]
  );

  const isInitialLoading = loading && !hasLoaded;

  const selectedDisplayLabel = isInitialLoading && !selectedItem
    ? 'Loading available...'
    : selectedItem
      ? getOptionLabel(selectedItem)
      : placeholder;

  return (
    <div
      className={`SearchableSelect ${disabled ? 'SearchableSelect--disabled' : ''} ${isOpen ? 'SearchableSelect--open' : ''}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {label && <label className="SearchableSelect__label">{label}</label>}

      {/* Trigger Button */}
      <button
        type="button"
        className="SearchableSelect__trigger"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="SearchableSelect__triggerContent">
          {typeIcon && <span className="SearchableSelect__triggerIcon">{typeIcon}</span>}
          {isInitialLoading && !selectedItem && (
            <FiLoader className="SearchableSelect__spinner" style={{ color: '#00e5ff', marginRight: 6 }} />
          )}
          <span className={`SearchableSelect__triggerValue ${!selectedItem ? 'SearchableSelect__triggerValue--placeholder' : ''}`}>
            {selectedDisplayLabel}
          </span>
        </div>
        <FiChevronDown className={`SearchableSelect__chevron ${isOpen ? 'SearchableSelect__chevron--flipped' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="SearchableSelect__popover" role="listbox">
          {/* Search Box Header */}
          <div className="SearchableSelect__searchBox">
            <FiSearch className="SearchableSelect__searchIcon" />
            <input
              ref={searchInputRef}
              type="text"
              className="SearchableSelect__searchInput"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                className="SearchableSelect__clearBtn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <FiX />
              </button>
            )}
          </div>

          {/* Meta Bar */}
          <div className="SearchableSelect__metaBar">
            <span>
              {isInitialLoading ? (
                <span className="SearchableSelect__searchingIndicator">
                  <FiLoader className="SearchableSelect__spinner" /> Loading recent items...
                </span>
              ) : debouncedQuery ? (
                `Results for "${debouncedQuery}" (${options.length}${totalCount ? ` of ${totalCount}` : ''})`
              ) : (
                `Recent / Available (${options.length}${totalCount ? ` of ${totalCount}` : ''})`
              )}
            </span>
            {loading && hasLoaded && (
              <span className="SearchableSelect__searchingIndicator">
                <FiLoader className="SearchableSelect__spinner" /> Updating...
              </span>
            )}
          </div>

          {/* Options List */}
          <div className="SearchableSelect__optionsList">
            {isInitialLoading ? (
              <div className="SearchableSelect__loadingSkeleton" aria-busy="true">
                <div className="SearchableSelect__stateMessage" style={{ padding: '16px 12px 10px' }}>
                  <FiLoader className="SearchableSelect__spinner" />
                  <span>Loading recent options...</span>
                </div>
                <div className="SearchableSelect__skeletonItem">
                  <div className="SearchableSelect__skeletonBar" style={{ width: '70%' }} />
                  <div className="SearchableSelect__skeletonBar" style={{ width: '40%', height: 10, opacity: 0.5 }} />
                </div>
                <div className="SearchableSelect__skeletonItem">
                  <div className="SearchableSelect__skeletonBar" style={{ width: '85%' }} />
                  <div className="SearchableSelect__skeletonBar" style={{ width: '32%', height: 10, opacity: 0.5 }} />
                </div>
              </div>
            ) : options.length === 0 ? (
              <div className="SearchableSelect__stateMessage">
                <span>{emptyMessage}</span>
                {searchQuery && (
                  <button
                    type="button"
                    className="SearchableSelect__resetSearchBtn"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              options.map((item) => {
                const itemVal = getOptionValue(item);
                const isSelected = selectedItem && getOptionValue(selectedItem) === itemVal;
                const subtitle = getOptionSubtitle ? getOptionSubtitle(item) : null;

                return (
                  <button
                    key={itemVal}
                    type="button"
                    className={`SearchableSelect__option ${isSelected ? 'SearchableSelect__option--selected' : ''}`}
                    onClick={() => handleSelectOption(item)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="SearchableSelect__optionInfo">
                      <div className="SearchableSelect__optionTitle">
                        {getOptionLabel(item)}
                      </div>
                      {subtitle && (
                        <div className="SearchableSelect__optionSubtitle">
                          {subtitle}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <FiCheck className="SearchableSelect__checkIcon" />
                    )}
                  </button>
                );
              })
            )}

            {/* Load More Button */}
            {hasNext && !loading && hasLoaded && (
              <div className="SearchableSelect__loadMoreWrapper">
                <button
                  type="button"
                  className="SearchableSelect__loadMoreBtn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <FiLoader className="SearchableSelect__spinner" /> Loading more...
                    </>
                  ) : (
                    `Load more (${options.length} of ${totalCount})`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
