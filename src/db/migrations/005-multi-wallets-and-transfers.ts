import type { SQLiteDatabase } from 'expo-sqlite';

export const multiWalletsAndTransfersMigration = {
  name: '005_multi_wallets_and_transfers',
  requiresForeignKeysDisabled: true,
  version: 5,
  async up(database: SQLiteDatabase) {
    // 1. Extend payment_methods table with wallet attributes
    await database.execAsync(`
      ALTER TABLE payment_methods ADD COLUMN initial_balance_minor INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE payment_methods ADD COLUMN account_type TEXT NOT NULL DEFAULT 'cash';
      ALTER TABLE payment_methods ADD COLUMN account_number TEXT;
      ALTER TABLE payment_methods ADD COLUMN color TEXT DEFAULT '#2563EB';
      ALTER TABLE payment_methods ADD COLUMN icon_key TEXT DEFAULT 'wallet';
      ALTER TABLE payment_methods ADD COLUMN include_in_cashflow INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE payment_methods ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;
    `);

    // 2. Set beautiful visual defaults for existing seeded payment methods
    await database.execAsync(`
      UPDATE payment_methods SET
        account_type = 'cash',
        icon_key = 'cash',
        color = '#10B981',
        include_in_cashflow = 1
      WHERE system_key = 'cash';

      UPDATE payment_methods SET
        account_type = 'bank',
        icon_key = 'bank',
        color = '#2563EB',
        include_in_cashflow = 1
      WHERE system_key = 'bank_transfer';

      UPDATE payment_methods SET
        account_type = 'bank',
        icon_key = 'credit-card',
        color = '#3B82F6',
        include_in_cashflow = 1
      WHERE system_key = 'debit_card';

      UPDATE payment_methods SET
        account_type = 'credit_card',
        icon_key = 'credit-card-outline',
        color = '#8B5CF6',
        include_in_cashflow = 1
      WHERE system_key = 'credit_card';

      UPDATE payment_methods SET
        account_type = 'ewallet',
        icon_key = 'cellphone',
        color = '#00AED6',
        include_in_cashflow = 1
      WHERE system_key = 'gopay';

      UPDATE payment_methods SET
        account_type = 'ewallet',
        icon_key = 'cellphone',
        color = '#4C2A86',
        include_in_cashflow = 1
      WHERE system_key = 'ovo';

      UPDATE payment_methods SET
        account_type = 'ewallet',
        icon_key = 'cellphone',
        color = '#118EEA',
        include_in_cashflow = 1
      WHERE system_key = 'dana';

      UPDATE payment_methods SET
        account_type = 'ewallet',
        icon_key = 'cellphone',
        color = '#EE4D2D',
        include_in_cashflow = 1
      WHERE system_key = 'shopeepay';

      UPDATE payment_methods SET
        account_type = 'other',
        icon_key = 'wallet',
        color = '#64748B',
        include_in_cashflow = 1
      WHERE system_key = 'other';
    `);

    // 3. Migrate transactions table to support type = 'transfer' and transfer fee attributes
    await database.execAsync(`
      CREATE TABLE transactions_v5 (
        id INTEGER PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
        amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        currency_code TEXT NOT NULL CHECK (
          length(currency_code) = 3 AND currency_code = upper(currency_code)
        ),
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE RESTRICT,
        transfer_to_payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE RESTRICT,
        transfer_fee_minor INTEGER DEFAULT 0 CHECK (transfer_fee_minor >= 0),
        transfer_fee_category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
        transfer_fee_note TEXT,
        counterparty TEXT,
        note TEXT,
        occurred_at INTEGER NOT NULL,
        timezone_offset_minutes INTEGER NOT NULL,
        local_date TEXT NOT NULL,
        is_reimbursable INTEGER NOT NULL DEFAULT 0 CHECK (is_reimbursable IN (0, 1)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        CHECK (type = 'expense' OR is_reimbursable = 0)
      );

      INSERT INTO transactions_v5 (
        id, type, amount_minor, currency_code, category_id, payment_method_id,
        transfer_to_payment_method_id, transfer_fee_minor, transfer_fee_category_id, transfer_fee_note,
        counterparty, note, occurred_at, timezone_offset_minutes, local_date,
        is_reimbursable, created_at, updated_at
      )
      SELECT
        id, type, amount_minor, currency_code, category_id, payment_method_id,
        NULL, 0, NULL, NULL,
        counterparty, note, occurred_at, timezone_offset_minutes, local_date,
        is_reimbursable, created_at, updated_at
      FROM transactions;

      DROP TABLE transactions;
      ALTER TABLE transactions_v5 RENAME TO transactions;

      CREATE INDEX IF NOT EXISTS idx_transactions_local_date
        ON transactions(local_date DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_type_date
        ON transactions(type, local_date DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_category_date
        ON transactions(category_id, local_date DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_payment_date
        ON transactions(payment_method_id, local_date DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_transfer_to_date
        ON transactions(transfer_to_payment_method_id, local_date DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_reimbursable_date
        ON transactions(is_reimbursable, local_date DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at
        ON transactions(occurred_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_type_occurred
        ON transactions(type, occurred_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_category_occurred
        ON transactions(category_id, occurred_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_counterparty
        ON transactions(counterparty COLLATE NOCASE);

    `);
  },
} as const;
