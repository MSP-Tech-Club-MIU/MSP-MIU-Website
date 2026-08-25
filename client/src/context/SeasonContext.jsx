import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ApiService from '../services/api';

const STORAGE_KEY = 'msp-season';
const STORAGE_DEFAULT_KEY = 'msp-season-default-id';

const SeasonContext = createContext(null);

function readStoredSelection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'all') return 'all';
    if (raw === 'current' || raw == null || raw === '') return 'current';
    const id = parseInt(raw, 10);
    return Number.isFinite(id) ? id : 'current';
  } catch {
    return 'current';
  }
}

export function SeasonProvider({ children }) {
  const [seasons, setSeasons] = useState([]);
  const [defaultSeasonId, setDefaultSeasonId] = useState(null);
  const [selected, setSelected] = useState(readStoredSelection);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshSeasons = useCallback(async (opts = {}) => {
    try {
      setError(null);
      const result = await ApiService.getSeasons(opts);
      const list = result.data || [];
      const defId = result.default_season_id ?? list.find((s) => s.is_default)?.season_id ?? null;
      setSeasons(list);
      setDefaultSeasonId(defId);

      try {
        const prevDefault = localStorage.getItem(STORAGE_DEFAULT_KEY);
        if (defId != null && prevDefault && String(prevDefault) !== String(defId)) {
          setSelected('current');
          localStorage.setItem(STORAGE_KEY, 'current');
        }
        if (defId != null) {
          localStorage.setItem(STORAGE_DEFAULT_KEY, String(defId));
        }
      } catch {
        /* ignore storage */
      }

      return result;
    } catch (err) {
      console.error('Failed to load seasons:', err);
      setError(err.message || 'Failed to load seasons');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSeasons();
  }, [refreshSeasons]);

  const setSelectedSeasonId = useCallback((value) => {
    setSelected(value);
    try {
      localStorage.setItem(STORAGE_KEY, value === 'current' ? 'current' : String(value));
    } catch {
      /* ignore */
    }
  }, []);

  const isAll = selected === 'all';
  const seasonApiParam = useMemo(() => {
    if (selected === 'all') return 'all';
    if (selected === 'current') return 'current';
    return selected;
  }, [selected]);

  /** Spread into API filter objects */
  const seasonFilters = useMemo(
    () => ({ season_id: seasonApiParam }),
    [seasonApiParam]
  );

  const defaultSeason = useMemo(
    () => seasons.find((s) => s.season_id === defaultSeasonId) || seasons.find((s) => s.is_default) || null,
    [seasons, defaultSeasonId]
  );

  const value = useMemo(
    () => ({
      seasons,
      defaultSeasonId,
      defaultSeason,
      selectedSeasonId: selected,
      setSelectedSeasonId,
      isAll,
      seasonApiParam,
      seasonFilters,
      loading,
      error,
      refreshSeasons,
    }),
    [
      seasons,
      defaultSeasonId,
      defaultSeason,
      selected,
      setSelectedSeasonId,
      isAll,
      seasonApiParam,
      seasonFilters,
      loading,
      error,
      refreshSeasons,
    ]
  );

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}

export function useSeason() {
  const ctx = useContext(SeasonContext);
  if (!ctx) {
    throw new Error('useSeason must be used within SeasonProvider');
  }
  return ctx;
}

/** Safe variant for components that may render outside provider during tests */
export function useSeasonOptional() {
  return useContext(SeasonContext);
}

export default SeasonContext;
