import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from 'react';

export type LoadDataState<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
  refresh: () => void;
};

/**
 * A hook that manages async data loading with race-condition protection.
 *
 * It encapsulates the `requestId` + `currentRequest` guard pattern that was
 * duplicated across home-screen, analytics-screen, and
 * transaction-history-screen.
 *
 * @param loader - An async function that returns the data. Re-invoked when
 *   `deps` change or `reload()` / `refresh()` is called.
 * @param deps - Dependency array (same as `useCallback`).
 * @param mapErrorFn - Optional function to convert a caught error into a
 *   user-facing string. Defaults to the error's message.
 *
 * @example
 * ```ts
 * const { data, loading, error, refresh } = useLoadData(
 *   () => getAnalyticsData(database),
 *   [database],
 *   (err) => mapError(err, 'DATABASE_WRITE_FAILED').message,
 * );
 * ```
 */
export function useLoadData<T>(
  loader: () => Promise<T>,
  deps: DependencyList,
  mapErrorFn?: (err: unknown) => string,
): LoadDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableLoader = useCallback(loader, deps);

  const load = useCallback(
    async (mode: 'focus' | 'refresh' = 'focus') => {
      const currentRequest = ++requestId.current;
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await stableLoader();
        if (requestId.current === currentRequest) {
          setData(result);
        }
      } catch (err) {
        if (requestId.current === currentRequest) {
          const message = mapErrorFn
            ? mapErrorFn(err)
            : err instanceof Error
              ? err.message
              : String(err);
          setError(message);
        }
      } finally {
        if (requestId.current === currentRequest) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // mapErrorFn intentionally excluded — caller should keep it stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stableLoader],
  );

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  return {
    data,
    error,
    loading,
    refresh: () => void load('refresh'),
    refreshing,
    reload: () => void load('focus'),
  };
}

/**
 * A simple debounce hook that delays updating the returned value until
 * `delayMs` milliseconds have elapsed without a new value being provided.
 *
 * Replaces the repeated `useEffect` + `setTimeout` pattern used in
 * transaction-history-screen.
 *
 * @example
 * ```ts
 * const debouncedSearch = useDebounce(search, 275);
 * ```
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debouncedValue;
}
