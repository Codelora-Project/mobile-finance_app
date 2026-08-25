import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  deleteTransaction,
  finalizeDeletedTransactionUndo,
  restoreDeletedTransaction,
  type DeletedTransactionSnapshot,
} from '@/features/transactions/transaction-repository';
import { useLanguage } from '@/lib/i18n/language-context';

export type UseUndoTransactionOptions = {
  onSuccess?: () => void;
  toastDuration?: number;
};

export function useUndoTransaction({
  onSuccess,
  toastDuration = 5000,
}: UseUndoTransactionOptions = {}) {
  const database = useSQLiteContext();
  const { language } = useLanguage();
  const { feedback, undoCreatedId, undoPayload } = useLocalSearchParams<{
    feedback?: string | string[];
    undoCreatedId?: string;
    undoPayload?: string;
  }>();

  const feedbackMessage = Array.isArray(feedback) ? feedback[0] : feedback;
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [undoCreatedTransactionId, setUndoCreatedTransactionId] = useState<
    number | null
  >(null);
  const [undoDeletedSnapshot, setUndoDeletedSnapshot] =
    useState<DeletedTransactionSnapshot | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const snapshotRef = useRef<DeletedTransactionSnapshot | null>(null);
  const undoingRef = useRef(false);
  const mountedRef = useRef(true);

  const cancelToastTimeout = useCallback(() => {
    if (!toastTimeoutRef.current) return;
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = null;
  }, []);

  const clearPendingSnapshot = useCallback((removeReceipt: boolean) => {
    if (removeReceipt && snapshotRef.current) {
      finalizeDeletedTransactionUndo(snapshotRef.current);
    }
    snapshotRef.current = null;
    setUndoDeletedSnapshot(null);
  }, []);

  const scheduleHide = useCallback(
    (snapshot: DeletedTransactionSnapshot | null, duration = toastDuration) => {
      cancelToastTimeout();
      toastTimeoutRef.current = setTimeout(() => {
        toastTimeoutRef.current = null;
        setToastVisible(false);
        if (snapshot && snapshotRef.current === snapshot) {
          clearPendingSnapshot(true);
        }
      }, duration);
    },
    [cancelToastTimeout, clearPendingSnapshot, toastDuration],
  );

  const showDeletedTransactionUndo = useCallback(
    (snapshot: DeletedTransactionSnapshot, message: string) => {
      clearPendingSnapshot(true);
      snapshotRef.current = snapshot;
      setUndoDeletedSnapshot(snapshot);
      setUndoCreatedTransactionId(null);
      setToastMessage(message);
      setToastVisible(true);
      scheduleHide(snapshot);
    },
    [clearPendingSnapshot, scheduleHide],
  );

  useEffect(() => {
    if (!feedbackMessage) return;
    const timeoutId = setTimeout(() => {
      setToastMessage(feedbackMessage);
      if (undoCreatedId) {
        clearPendingSnapshot(true);
        setUndoCreatedTransactionId(Number(undoCreatedId));
        scheduleHide(null);
      } else if (undoPayload) {
        try {
          const parsed = JSON.parse(undoPayload) as DeletedTransactionSnapshot;
          if (!parsed.input) throw new Error('Invalid undo payload');
          snapshotRef.current = parsed;
          setUndoDeletedSnapshot(parsed);
          setUndoCreatedTransactionId(null);
          scheduleHide(parsed);
        } catch {
          clearPendingSnapshot(true);
          scheduleHide(null);
        }
      } else {
        clearPendingSnapshot(true);
        setUndoCreatedTransactionId(null);
        scheduleHide(null);
      }
      setToastVisible(true);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [
    clearPendingSnapshot,
    feedbackMessage,
    scheduleHide,
    undoCreatedId,
    undoPayload,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelToastTimeout();
      if (snapshotRef.current)
        finalizeDeletedTransactionUndo(snapshotRef.current);
    };
  }, [cancelToastTimeout]);

  const handleUndo = useCallback(async () => {
    if (undoingRef.current) return;
    undoingRef.current = true;
    cancelToastTimeout();
    setIsUndoing(true);
    let detachedSnapshot: DeletedTransactionSnapshot | null = null;
    try {
      if (undoCreatedTransactionId) {
        await deleteTransaction(database, undoCreatedTransactionId);
        if (mountedRef.current) {
          setUndoCreatedTransactionId(null);
          setToastMessage(
            language === 'id'
              ? 'Penambahan transaksi dibatalkan'
              : 'Transaction addition undone',
          );
        }
      } else if (undoDeletedSnapshot) {
        detachedSnapshot = undoDeletedSnapshot;
        if (snapshotRef.current === detachedSnapshot) {
          snapshotRef.current = null;
        }
        setUndoDeletedSnapshot(null);
        await restoreDeletedTransaction(database, detachedSnapshot);
        if (mountedRef.current) {
          clearPendingSnapshot(false);
          setToastMessage(
            language === 'id'
              ? 'Transaksi berhasil dipulihkan'
              : 'Transaction restored',
          );
        }
      }
      if (mountedRef.current) {
        onSuccess?.();
        scheduleHide(null, 2500);
      }
    } catch (err) {
      if (__DEV__) console.warn('Could not execute undo action', err);
      if (!mountedRef.current) {
        if (detachedSnapshot) {
          finalizeDeletedTransactionUndo(detachedSnapshot);
        }
        return;
      }
      if (detachedSnapshot) {
        snapshotRef.current = detachedSnapshot;
        setUndoDeletedSnapshot(detachedSnapshot);
        scheduleHide(detachedSnapshot);
      } else {
        scheduleHide(null, 2500);
      }
      setToastMessage(
        language === 'id'
          ? 'Tindakan tidak dapat dibatalkan. Coba lagi.'
          : 'The action could not be undone. Try again.',
      );
      setToastVisible(true);
    } finally {
      undoingRef.current = false;
      if (mountedRef.current) setIsUndoing(false);
    }
  }, [
    cancelToastTimeout,
    clearPendingSnapshot,
    database,
    language,
    onSuccess,
    scheduleHide,
    undoCreatedTransactionId,
    undoDeletedSnapshot,
  ]);

  const dismissToast = useCallback(() => {
    cancelToastTimeout();
    clearPendingSnapshot(true);
    setToastVisible(false);
  }, [cancelToastTimeout, clearPendingSnapshot]);

  return {
    canUndo: Boolean(undoCreatedTransactionId || undoDeletedSnapshot),
    dismissToast,
    handleUndo,
    isUndoing,
    showDeletedTransactionUndo,
    toastMessage,
    toastVisible,
  };
}
