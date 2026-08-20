import type { SQLiteDatabase } from 'expo-sqlite';

import { seedDefaultsInTransaction } from '@/db/seeds';
import { removeCachedClaimPdfs } from '@/features/claims/claim-pdf';
import { removeAllReceiptFiles } from '@/features/receipts/receipt-storage';
import { createCodedError } from '@/lib/errors';

async function resetDatabase(database: SQLiteDatabase) {
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync(`
      DELETE FROM goal_transactions;
      DELETE FROM savings_goals;
      DELETE FROM category_budgets;
      DELETE FROM claim_items;
      DELETE FROM receipts;
      DELETE FROM claims;
      DELETE FROM transactions;
      DELETE FROM categories WHERE is_default = 0;
      DELETE FROM payment_methods WHERE is_default = 0;
      DELETE FROM app_settings;
    `);
    await seedDefaultsInTransaction(transaction);
  });
}

function removeManagedFiles() {
  const failures: unknown[] = [];
  for (const removeFiles of [removeAllReceiptFiles, removeCachedClaimPdfs]) {
    try {
      removeFiles();
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length > 0) {
    throw createCodedError(
      'FILE_OPERATION_FAILED',
      'Your records were reset, but some local files could not be removed. Try again.',
    );
  }
}

export async function resetApplicationData(database: SQLiteDatabase) {
  try {
    await resetDatabase(database);
  } catch (error) {
    if (__DEV__) console.warn('Database reset failed.', error);
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      "We couldn't delete your data. Nothing was reset.",
    );
  }

  removeManagedFiles();
}
