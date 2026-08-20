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

  const clearPendingSnapshot = useCallback((removeReceipt: boolean) => {
    if (removeReceipt && snapshotRef.current) {
      finalizeDeletedTransactionUndo(snapshotRef.current);
    }
    snapshotRef.current = null;
    setUndoDeletedSnapshot(null);
  }, []);

  const scheduleHide = useCallback(
    (snapshot: DeletedTransactionSnapshot | null, duration = toastDuration) => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastVisible(false);
        if (snapshot && snapshotRef.current === snapshot) {
          clearPendingSnapshot(true);
        }
      }, duration);
    },
    [clearPendingSnapshot, toastDuration],
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

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (snapshotRef.current)
        finalizeDeletedTransactionUndo(snapshotRef.current);
    },
    [],
  );

  const handleUndo = useCallback(async () => {
    if (isUndoing) return;
    setIsUndoing(true);
    try {
      if (undoCreatedTransactionId) {
        await deleteTransaction(database, undoCreatedTransactionId);
        setUndoCreatedTransactionId(null);
        setToastMessage(
          language === 'id'
            ? 'Penambahan transaksi dibatalkan'
            : 'Transaction addition undone',
        );
      } else if (undoDeletedSnapshot) {
        await restoreDeletedTransaction(database, undoDeletedSnapshot);
        clearPendingSnapshot(false);
        setToastMessage(
          language === 'id'
            ? 'Transaksi berhasil dipulihkan'
            : 'Transaction restored',
        );
      }
      onSuccess?.();
      scheduleHide(null, 2500);
    } catch (err) {
      if (__DEV__) console.warn('Could not execute undo action', err);
    } finally {
      setIsUndoing(false);
    }
  }, [
    clearPendingSnapshot,
    database,
    isUndoing,
    language,
    onSuccess,
    scheduleHide,
    undoCreatedTransactionId,
    undoDeletedSnapshot,
  ]);

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    clearPendingSnapshot(true);
    setToastVisible(false);
  }, [clearPendingSnapshot]);

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
