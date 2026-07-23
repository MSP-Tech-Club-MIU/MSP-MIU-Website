import { useEffect, useState } from 'react';
import ApiService from '../services/api';

/**
 * Load one or more site-content keys with optional local fallbacks.
 * @param {string[]} keys
 * @param {Record<string, unknown>} [fallbacks]
 */
export default function useSiteContent(keys, fallbacks = {}) {
  const [data, setData] = useState(fallbacks);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const result = await ApiService.getSiteContent(keys);
        if (cancelled) return;
        setData({ ...fallbacks, ...(result?.data || {}) });
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setData(fallbacks);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // keys are stable arrays from callers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(',')]);

  return { data, loading, error };
}
