import { isCodedError } from '@/lib/errors';
import type { TranslationSchema } from '@/lib/i18n/translations';

export function getTransactionErrorMessage(
  error: unknown,
  t: TranslationSchema,
  fallback: 'load' | 'save' = 'save',
) {
  if (__DEV__) console.warn('Transaction operation failed.', error);
  if (!isCodedError(error)) {
    return fallback === 'load'
      ? t.transactions.loadFailed
      : t.transactions.saveFailed;
  }
  if (error.code === 'DATABASE_BUSY') return t.transactions.databaseBusy;
  if (error.code === 'FILE_OPERATION_FAILED') {
    return t.transactions.receiptSaveFailed;
  }
  if (error.code === 'CLAIM_LOCKED') return t.transactions.lockedByClaim;
  return fallback === 'load'
    ? t.transactions.loadFailed
    : t.transactions.saveFailed;
}
