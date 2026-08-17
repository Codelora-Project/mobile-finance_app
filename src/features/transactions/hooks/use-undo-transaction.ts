import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createTransaction,
  deleteTransaction,
  type SaveTransactionInput,
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
  const [undoDeletedPayload, setUndoDeletedPayload] =
    useState<SaveTransactionInput | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (feedbackMessage) {
      setToastMessage(feedbackMessage);
      if (undoCreatedId) {
        setUndoCreatedTransactionId(Number(undoCreatedId));
        setUndoDeletedPayload(null);
      } else if (undoPayload) {
        try {
          const parsed = JSON.parse(undoPayload) as SaveTransactionInput;
          setUndoDeletedPayload(parsed);
          setUndoCreatedTransactionId(null);
        } catch {
          setUndoDeletedPayload(null);
        }
      } else {
        setUndoCreatedTransactionId(null);
        setUndoDeletedPayload(null);
      }
      setToastVisible(true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastVisible(false);
      }, toastDuration);
    }
  }, [feedbackMessage, toastDuration, undoCreatedId, undoPayload]);

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
      } else if (undoDeletedPayload) {
        await createTransaction(database, undoDeletedPayload);
        setUndoDeletedPayload(null);
        setToastMessage(
          language === 'id'
            ? 'Transaksi berhasil dipulihkan'
            : 'Transaction restored',
        );
      }
      if (onSuccess) onSuccess();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastVisible(false);
      }, 2500);
    } catch (err) {
      if (__DEV__) console.warn('Could not execute undo action', err);
    } finally {
      setIsUndoing(false);
    }
  }, [
    database,
    isUndoing,
    language,
    onSuccess,
    undoCreatedTransactionId,
    undoDeletedPayload,
  ]);

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastVisible(false);
  }, []);

  return {
    canUndo: Boolean(undoCreatedTransactionId || undoDeletedPayload),
    dismissToast,
    handleUndo,
    isUndoing,
    toastMessage,
    toastVisible,
  };
}
