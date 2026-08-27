import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import type { AccountScope } from '@/features/auth/auth-types';
import {
  archiveLegacyData,
  claimLegacyData,
  getLegacyDataSummary,
  legacyDatabaseExists,
  readLegacyDataState,
  retryPendingLegacyCleanup,
  type LegacyDataSummary,
} from '@/features/auth/legacy-data-service';
import { useReceiptStorage } from '@/features/receipts/receipt-storage-context';

type LegacyDataStatus =
  'checking' | 'none' | 'pending' | 'archived' | 'working' | 'error';

type LegacyDataContextValue = Readonly<{
  archive(): Promise<void>;
  claim(): Promise<void>;
  error: string | null;
  refresh(): Promise<void>;
  status: LegacyDataStatus;
  summary: LegacyDataSummary | null;
}>;

const LegacyDataContext = createContext<LegacyDataContextValue | null>(null);

export function LegacyDataProvider({
  accountScope,
  children,
}: PropsWithChildren<{ accountScope: AccountScope }>) {
  const database = useSQLiteContext();
  const receiptStorage = useReceiptStorage();
  const [status, setStatus] = useState<LegacyDataStatus>('checking');
  const [summary, setSummary] = useState<LegacyDataSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus('checking');
    setError(null);
    try {
      const state = await readLegacyDataState();
      if (state?.status === 'claimed') {
        setSummary(null);
        setStatus('none');
        if (state.cleanupPending === true) {
          void retryPendingLegacyCleanup().catch((cleanupError) => {
            if (__DEV__) {
              console.warn('Could not retry legacy cleanup.', cleanupError);
            }
          });
        }
        return;
      }
      if (!legacyDatabaseExists()) {
        setSummary(null);
        setStatus('none');
        return;
      }
      if (state?.status === 'archived') {
        setSummary(null);
        setStatus('archived');
        return;
      }
      const nextSummary = await getLegacyDataSummary();
      setSummary(nextSummary);
      setStatus('pending');
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not inspect legacy data.',
      );
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timeout);
  }, [refresh]);

  const archive = useCallback(async () => {
    setStatus('working');
    setError(null);
    try {
      await archiveLegacyData();
      setStatus('archived');
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : 'Could not archive legacy data.',
      );
      setStatus('error');
      throw archiveError;
    }
  }, []);

  const claim = useCallback(async () => {
    setStatus('working');
    setError(null);
    try {
      await claimLegacyData({
        accountScope,
        activeDatabase: database,
        activeReceiptStorage: receiptStorage,
      });
      setSummary(null);
      setStatus('none');
    } catch (claimError) {
      setError(
        claimError instanceof Error
          ? claimError.message
          : 'Could not connect legacy data.',
      );
      setStatus('error');
      throw claimError;
    }
  }, [accountScope, database, receiptStorage]);

  const value = useMemo<LegacyDataContextValue>(
    () => ({ archive, claim, error, refresh, status, summary }),
    [archive, claim, error, refresh, status, summary],
  );

  return (
    <LegacyDataContext.Provider value={value}>
      {children}
    </LegacyDataContext.Provider>
  );
}

export function useLegacyData() {
  const value = useContext(LegacyDataContext);
  if (!value) {
    throw new Error('useLegacyData must be used within LegacyDataProvider.');
  }
  return value;
}
