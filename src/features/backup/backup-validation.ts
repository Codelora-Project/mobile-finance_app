import type {
  BackupPayload,
  BackupStats,
} from '@/features/backup/backup-types';
import { createCodedError } from '@/lib/errors';

const requiredCollections = [
  'categories',
  'payment_methods',
  'transactions',
  'receipts',
  'claims',
  'claim_items',
  'app_settings',
  'savings_goals',
  'goal_transactions',
  'category_budgets',
] as const;

export function parseBackupPayload(textContent: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(textContent);
  } catch {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Format file tidak valid (Bukan JSON yang valid).',
    );
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as Record<string, unknown>).app_identifier !==
      'personal_finance_app'
  ) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'File ini bukan file cadangan resmi dari aplikasi Personal Finance.',
    );
  }

  const payload = parsed as BackupPayload;
  if (payload.version !== 1 && payload.version !== 2) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Versi file backup belum didukung oleh aplikasi ini.',
    );
  }
  if (!payload.data || typeof payload.data !== 'object') {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Struktur data dalam file backup rusak atau tidak lengkap.',
    );
  }
  if (!requiredCollections.every((key) => Array.isArray(payload.data[key]))) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Koleksi data dalam file backup rusak atau tidak lengkap.',
    );
  }

  return payload;
}

export function getBackupPayloadStats(payload: BackupPayload): BackupStats {
  return {
    transactionsCount: payload.data.transactions.length,
    categoriesCount: payload.data.categories.length,
    paymentMethodsCount: payload.data.payment_methods.length,
    goalsCount: payload.data.savings_goals.length,
    claimsCount: payload.data.claims.length,
    budgetsCount: payload.data.category_budgets.length,
  };
}
