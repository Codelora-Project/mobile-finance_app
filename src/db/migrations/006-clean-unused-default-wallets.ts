import type { SQLiteDatabase } from 'expo-sqlite';

export const cleanUnusedDefaultWalletsMigration = {
  name: '006_clean_unused_default_wallets',
  version: 6,
  async up(database: SQLiteDatabase) {
    // Clean up old pre-seeded default wallets that are not used in any transactions
    await database.execAsync(`
      DELETE FROM payment_methods
      WHERE system_key IN (
        'bank_transfer',
        'debit_card',
        'credit_card',
        'gopay',
        'ovo',
        'dana',
        'shopeepay',
        'other'
      )
      AND id NOT IN (
        SELECT DISTINCT payment_method_id FROM transactions WHERE payment_method_id IS NOT NULL
        UNION
        SELECT DISTINCT transfer_to_payment_method_id FROM transactions WHERE transfer_to_payment_method_id IS NOT NULL
      );
    `);
  },
} as const;
