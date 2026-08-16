import type { SQLiteDatabase } from 'expo-sqlite';

import { seedDefaultsInTransaction } from '@/db/seeds';
import { removeCachedClaimPdfs } from '@/features/claims/claim-pdf';
import { removeAllReceiptFiles } from '@/features/receipts/receipt-storage';
import { createCodedError } from '@/lib/errors';

type SettingRow = {
  value: string;
};

export type SettingsOverview = Readonly<{
  currencyCode: 'IDR';
  currencyName: 'Indonesian Rupiah';
  language: 'id' | 'en';
}>;

export async function getSettingsOverview(
  database: SQLiteDatabase,
): Promise<SettingsOverview> {
  const currency = await database.getFirstAsync<SettingRow>(
    `SELECT value
     FROM app_settings
     WHERE key = 'default_currency_code'`,
  );

  if (currency?.value !== 'IDR') {
    throw createCodedError(
      'VALIDATION_FAILED',
      'The default currency setting is invalid.',
    );
  }

  const langRow = await database.getFirstAsync<SettingRow>(
    `SELECT value
     FROM app_settings
     WHERE key = 'language'`,
  );

  return {
    currencyCode: 'IDR',
    currencyName: 'Indonesian Rupiah',
    language: langRow?.value === 'en' ? 'en' : 'id',
  };
}

export async function setLanguageSetting(
  database: SQLiteDatabase,
  language: 'id' | 'en',
) {
  const timestamp = Date.now();
  await database.runAsync(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('language', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    language,
    timestamp,
  );
}

async function resetDatabase(database: SQLiteDatabase) {
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync(`
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
