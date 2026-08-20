import type { SQLiteDatabase } from 'expo-sqlite';

export const normalizeWalletTransferCategoryMigration = {
  name: '007_normalize_wallet_transfer_category',
  version: 7,
  async up(database: SQLiteDatabase) {
    await database.execAsync(`
      INSERT OR IGNORE INTO categories (
        name, type, icon_key, system_key, is_default, is_fallback,
        sort_order, created_at, updated_at
      ) VALUES (
        'Transfer Antar Dompet', 'expense', 'swap-horizontal',
        'wallet_transfer', 1, 0, 998,
        CAST(strftime('%s', 'now') AS INTEGER) * 1000,
        CAST(strftime('%s', 'now') AS INTEGER) * 1000
      );

      UPDATE categories
      SET system_key = 'wallet_transfer',
          icon_key = COALESCE(icon_key, 'swap-horizontal'),
          is_default = 1
      WHERE system_key IS NULL
        AND type = 'expense'
        AND name = 'Transfer Antar Dompet'
        AND NOT EXISTS (
          SELECT 1 FROM categories WHERE system_key = 'wallet_transfer'
        );

      UPDATE transactions
      SET category_id = (
        SELECT id FROM categories
        WHERE system_key = 'wallet_transfer'
        LIMIT 1
      )
      WHERE type = 'transfer'
        AND EXISTS (
          SELECT 1 FROM categories WHERE system_key = 'wallet_transfer'
        );
    `);
  },
} as const;
