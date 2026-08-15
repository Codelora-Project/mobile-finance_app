import type { SQLiteDatabase } from 'expo-sqlite';

export const initialMigration = {
  name: '001_initial',
  version: 1,
  async up(database: SQLiteDatabase) {
    await database.execAsync(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE,
        type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
        icon_key TEXT,
        system_key TEXT UNIQUE,
        is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
        is_fallback INTEGER NOT NULL DEFAULT 0 CHECK (is_fallback IN (0, 1)),
        sort_order INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE (type, name)
      );

      CREATE TABLE payment_methods (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        system_key TEXT UNIQUE,
        is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
        is_fallback INTEGER NOT NULL DEFAULT 0 CHECK (is_fallback IN (0, 1)),
        sort_order INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
        amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        currency_code TEXT NOT NULL CHECK (
          length(currency_code) = 3 AND currency_code = upper(currency_code)
        ),
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE RESTRICT,
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

      CREATE TABLE receipts (
        id INTEGER PRIMARY KEY,
        transaction_id INTEGER NOT NULL UNIQUE
          REFERENCES transactions(id) ON DELETE CASCADE,
        storage_key TEXT NOT NULL UNIQUE,
        mime_type TEXT NOT NULL,
        ocr_status TEXT NOT NULL DEFAULT 'not_processed'
          CHECK (ocr_status IN ('not_processed', 'processed', 'partial', 'failed')),
        ocr_raw_text TEXT,
        subtotal_minor INTEGER CHECK (subtotal_minor IS NULL OR subtotal_minor >= 0),
        tax_minor INTEGER CHECK (tax_minor IS NULL OR tax_minor >= 0),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE claims (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft', 'submitted', 'reimbursed', 'rejected')),
        period_mode TEXT NOT NULL DEFAULT 'auto'
          CHECK (period_mode IN ('auto', 'manual')),
        period_start TEXT,
        period_end TEXT,
        submitted_at INTEGER,
        reimbursed_at INTEGER,
        rejected_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        CHECK (
          period_start IS NULL OR period_end IS NULL OR period_start <= period_end
        )
      );

      CREATE TABLE claim_items (
        id INTEGER PRIMARY KEY,
        claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
        transaction_id INTEGER NOT NULL UNIQUE
          REFERENCES transactions(id) ON DELETE RESTRICT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX idx_transactions_local_date
        ON transactions(local_date DESC, id DESC);
      CREATE INDEX idx_transactions_type_date
        ON transactions(type, local_date DESC, id DESC);
      CREATE INDEX idx_transactions_category_date
        ON transactions(category_id, local_date DESC, id DESC);
      CREATE INDEX idx_transactions_payment_date
        ON transactions(payment_method_id, local_date DESC, id DESC);
      CREATE INDEX idx_transactions_reimbursable_date
        ON transactions(is_reimbursable, local_date DESC, id DESC);
      CREATE INDEX idx_claims_status_updated
        ON claims(status, updated_at DESC, id DESC);
      CREATE INDEX idx_claim_items_claim
        ON claim_items(claim_id);
    `);
  },
} as const;
