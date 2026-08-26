import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UndoToastBanner } from '@/components/ui/undo-toast-banner';
import {
  deleteTransaction,
  finalizeDeletedTransactionUndo,
  restoreDeletedTransaction,
  type DeletedTransactionSnapshot,
} from '@/features/transactions/transaction-repository';
import { useLanguage } from '@/lib/i18n/language-context';
import { spacing } from '@/theme/spacing';

type PendingUndo =
  | Readonly<{ kind: 'created'; transactionId: number }>
  | Readonly<{ kind: 'deleted'; snapshot: DeletedTransactionSnapshot }>;

type NoticeKind =
  | 'created'
  | 'deleted'
  | 'updated'
  | 'createUndone'
  | 'deleteRestored'
  | 'undoFailed';

export type TransactionMutationContextValue = Readonly<{
  dismissNotice: () => void;
  notifyCreated: (transactionId: number) => void;
  notifyDeleted: (snapshot: DeletedTransactionSnapshot) => void;
  notifyUpdated: () => void;
  revision: number;
  undo: () => Promise<void>;
}>;

const TransactionMutationContext =
  createContext<TransactionMutationContextValue | null>(null);

const UNDO_DURATION_MS = 5_000;
const RESULT_DURATION_MS = 2_500;

export function TransactionMutationProvider({
  children,
}: PropsWithChildren) {
  const database = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [revision, setRevision] = useState(0);
  const [noticeKind, setNoticeKind] = useState<NoticeKind | null>(null);
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const pendingUndoRef = useRef<PendingUndo | null>(null);
  const undoingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const cancelTimeout = useCallback(() => {
    if (!timeoutRef.current) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const finalizePending = useCallback((pending: PendingUndo | null) => {
    if (pending?.kind === 'deleted') {
      finalizeDeletedTransactionUndo(pending.snapshot);
    }
  }, []);

  const replacePending = useCallback(
    (next: PendingUndo | null) => {
      const previous = pendingUndoRef.current;
      if (previous !== next) finalizePending(previous);
      pendingUndoRef.current = next;
      setPendingUndo(next);
    },
    [finalizePending],
  );

  const scheduleHide = useCallback(
    (duration: number, finalizeOnHide: boolean) => {
      cancelTimeout();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        if (!mountedRef.current) return;
        setNoticeKind(null);
        if (finalizeOnHide) replacePending(null);
      }, duration);
    },
    [cancelTimeout, replacePending],
  );

  const showMutationNotice = useCallback(
    (kind: NoticeKind, pending: PendingUndo | null) => {
      cancelTimeout();
      replacePending(pending);
      setNoticeKind(kind);
      setRevision((current) => current + 1);
      scheduleHide(UNDO_DURATION_MS, true);
    },
    [cancelTimeout, replacePending, scheduleHide],
  );

  const notifyCreated = useCallback(
    (transactionId: number) => {
      showMutationNotice('created', { kind: 'created', transactionId });
    },
    [showMutationNotice],
  );

  const notifyDeleted = useCallback(
    (snapshot: DeletedTransactionSnapshot) => {
      showMutationNotice('deleted', { kind: 'deleted', snapshot });
    },
    [showMutationNotice],
  );

  const notifyUpdated = useCallback(() => {
    showMutationNotice('updated', null);
  }, [showMutationNotice]);

  const dismissNotice = useCallback(() => {
    cancelTimeout();
    replacePending(null);
    setNoticeKind(null);
  }, [cancelTimeout, replacePending]);

  const undo = useCallback(async () => {
    const pending = pendingUndoRef.current;
    if (!pending || undoingRef.current) return;
    undoingRef.current = true;
    cancelTimeout();
    setIsUndoing(true);
    const detachedDeleted = pending.kind === 'deleted' ? pending : null;
    if (detachedDeleted) {
      pendingUndoRef.current = null;
      setPendingUndo(null);
    }

    try {
      if (pending.kind === 'created') {
        await deleteTransaction(database, pending.transactionId);
        if (!mountedRef.current) return;
        pendingUndoRef.current = null;
        setPendingUndo(null);
        setNoticeKind('createUndone');
      } else {
        await restoreDeletedTransaction(database, pending.snapshot);
        if (!mountedRef.current) return;
        pendingUndoRef.current = null;
        setPendingUndo(null);
        setNoticeKind('deleteRestored');
      }
      setRevision((current) => current + 1);
      scheduleHide(RESULT_DURATION_MS, false);
    } catch (error) {
      if (__DEV__) console.warn('Transaction undo failed.', error);
      if (!mountedRef.current) {
        if (detachedDeleted) finalizePending(detachedDeleted);
        return;
      }
      if (detachedDeleted) {
        pendingUndoRef.current = detachedDeleted;
        setPendingUndo(detachedDeleted);
      }
      setNoticeKind('undoFailed');
      scheduleHide(RESULT_DURATION_MS, true);
    } finally {
      undoingRef.current = false;
      if (mountedRef.current) setIsUndoing(false);
    }
  }, [cancelTimeout, database, finalizePending, scheduleHide]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelTimeout();
      finalizePending(pendingUndoRef.current);
      pendingUndoRef.current = null;
    };
  }, [cancelTimeout, finalizePending]);

  const noticeMessage = noticeKind
    ? {
        created: t.transactions.createdSuccess,
        deleted: t.transactions.deletedSuccess,
        updated: t.transactions.updatedSuccess,
        createUndone: t.transactions.createUndone,
        deleteRestored: t.transactions.deleteRestored,
        undoFailed: t.transactions.undoFailed,
      }[noticeKind]
    : null;

  const value = useMemo<TransactionMutationContextValue>(
    () => ({
      dismissNotice,
      notifyCreated,
      notifyDeleted,
      notifyUpdated,
      revision,
      undo,
    }),
    [
      dismissNotice,
      notifyCreated,
      notifyDeleted,
      notifyUpdated,
      revision,
      undo,
    ],
  );

  return (
    <TransactionMutationContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        <UndoToastBanner
          canUndo={pendingUndo !== null}
          isUndoing={isUndoing}
          message={noticeMessage}
          onClose={dismissNotice}
          onUndo={() => void undo()}
          topOffset={insets.top + spacing.md}
          visible={noticeKind !== null}
        />
      </View>
    </TransactionMutationContext.Provider>
  );
}

export function useTransactionMutations() {
  const context = useContext(TransactionMutationContext);
  if (!context) {
    throw new Error(
      'useTransactionMutations must be used within TransactionMutationProvider.',
    );
  }
  return context;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
