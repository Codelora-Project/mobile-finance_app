import { useCallback, useEffect, useRef, useState } from 'react';

import { mapError } from '@/lib/errors';

type UsePickerDataOptions<T> = {
  diagnosticLabel: string;
  load: () => Promise<readonly T[]>;
  resourceKey: string;
};

/** Shared load/retry lifecycle for modal pickers backed by SQLite. */
export function usePickerData<T>({
  diagnosticLabel,
  load,
  resourceKey,
}: UsePickerDataOptions<T>) {
  const requestRef = useRef(0);
  const [items, setItems] = useState<readonly T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [settledKey, setSettledKey] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const nextItems = await load();
      if (requestId !== requestRef.current) return;
      setItems(nextItems);
      setSettledKey(resourceKey);
    } catch (caughtError) {
      if (requestId !== requestRef.current) return;
      if (__DEV__) {
        console.error(`${diagnosticLabel} could not load data.`, caughtError);
      }
      setError(mapError(caughtError, 'DATABASE_WRITE_FAILED').message);
      setSettledKey(resourceKey);
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [diagnosticLabel, load, resourceKey]);

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      void reload();
    }, 0);
    return () => {
      clearTimeout(loadTimer);
      requestRef.current += 1;
    };
  }, [reload]);

  return {
    error,
    items,
    loading: loading || settledKey !== resourceKey,
    reload,
  } as const;
}
