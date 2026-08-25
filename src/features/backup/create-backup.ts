import Constants from 'expo-constants';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  BackupAppSetting,
  BackupCategory,
  BackupCategoryBudget,
  BackupClaim,
  BackupClaimItem,
  BackupGoalTransaction,
  BackupPayload,
  BackupPaymentMethod,
  BackupReceipt,
  BackupSavingsGoal,
  BackupStats,
  BackupTransaction,
} from '@/features/backup/backup-types';
import { MAX_RECEIPT_BASE64_LENGTH } from '@/features/backup/backup-validation';
import { readReceiptBase64 } from '@/features/receipts/receipt-storage';
import { createCodedError } from '@/lib/errors';

export async function fetchBackupStats(
  database: SQLiteDatabase,
): Promise<BackupStats> {
  const [txRes, catRes, pmRes, goalRes, claimRes, budgetRes] =
    await Promise.all([
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM transactions;',
      ),
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM categories;',
      ),
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM payment_methods;',
      ),
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM savings_goals;',
      ),
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM claims;',
      ),
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM category_budgets;',
      ),
    ]);

  return {
    transactionsCount: txRes?.count ?? 0,
    categoriesCount: catRes?.count ?? 0,
    paymentMethodsCount: pmRes?.count ?? 0,
    goalsCount: goalRes?.count ?? 0,
    claimsCount: claimRes?.count ?? 0,
    budgetsCount: budgetRes?.count ?? 0,
  };
}

export async function createBackupPayload(
  database: SQLiteDatabase,
): Promise<BackupPayload> {
  const [
    categories,
    payment_methods,
    transactions,
    receiptRows,
    claims,
    claim_items,
    app_settings,
    savings_goals,
    goal_transactions,
    category_budgets,
  ] = await Promise.all([
    database.getAllAsync<BackupCategory>(
      'SELECT * FROM categories ORDER BY sort_order ASC, id ASC;',
    ),
    database.getAllAsync<BackupPaymentMethod>(
      'SELECT * FROM payment_methods ORDER BY sort_order ASC, id ASC;',
    ),
    database.getAllAsync<BackupTransaction>(
      'SELECT * FROM transactions ORDER BY id ASC;',
    ),
    database.getAllAsync<BackupReceipt>(
      'SELECT * FROM receipts ORDER BY id ASC;',
    ),
    database.getAllAsync<BackupClaim>('SELECT * FROM claims ORDER BY id ASC;'),
    database.getAllAsync<BackupClaimItem>(
      'SELECT * FROM claim_items ORDER BY id ASC;',
    ),
    database.getAllAsync<BackupAppSetting>(
      'SELECT * FROM app_settings ORDER BY key ASC;',
    ),
    database.getAllAsync<BackupSavingsGoal>(
      'SELECT * FROM savings_goals ORDER BY id ASC;',
    ),
    database.getAllAsync<BackupGoalTransaction>(
      'SELECT * FROM goal_transactions ORDER BY id ASC;',
    ),
    database.getAllAsync<BackupCategoryBudget>(
      'SELECT * FROM category_budgets ORDER BY id ASC;',
    ),
  ]);

  const receipts = await Promise.all(
    receiptRows.map(async (receipt) => {
      const fileBase64 = await readReceiptBase64(receipt.storage_key);
      if (!fileBase64) {
        throw createCodedError(
          'FILE_OPERATION_FAILED',
          'Backup could not be created because a receipt image is missing.',
        );
      }
      if (fileBase64.length > MAX_RECEIPT_BASE64_LENGTH) {
        throw createCodedError(
          'FILE_OPERATION_FAILED',
          'Backup could not be created because a receipt image is too large.',
        );
      }
      return { ...receipt, file_base64: fileBase64 };
    }),
  );

  return {
    app_identifier: 'personal_finance_app',
    version: 2,
    exported_at: new Date().toISOString(),
    app_version: Constants.expoConfig?.version ?? '1.0.0',
    summary: {
      transactions_count: transactions.length,
      categories_count: categories.length,
      payment_methods_count: payment_methods.length,
      goals_count: savings_goals.length,
      claims_count: claims.length,
      budgets_count: category_budgets.length,
    },
    data: {
      categories,
      payment_methods,
      transactions,
      receipts,
      claims,
      claim_items,
      app_settings,
      savings_goals,
      goal_transactions,
      category_budgets,
    },
  };
}
