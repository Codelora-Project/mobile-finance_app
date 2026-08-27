import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { initialMigration } from '@/db/migrations/001-initial';
import { goalsAndHabitsMigration } from '@/db/migrations/002-goals-and-habits';
import { categoryBudgetsMigration } from '@/db/migrations/003-category-budgets';
import { queryOptimizationIndexesMigration } from '@/db/migrations/004-query-optimization-indexes';
import { latestDatabaseVersion, migrateDatabase } from '@/db/migrations';

class NodeSQLiteAdapter {
  constructor(private readonly sqlite: DatabaseSync) {}

  asSQLiteDatabase() {
    return this as unknown as SQLiteDatabase;
  }

  async execAsync(source: string) {
    this.sqlite.exec(source);
  }

  async getAllAsync<T>(source: string): Promise<T[]> {
    return this.sqlite.prepare(source).all() as T[];
  }

  async getFirstAsync<T>(source: string): Promise<T | null> {
    return (this.sqlite.prepare(source).get() as T | undefined) ?? null;
  }

  async withTransactionAsync(task: () => Promise<void>) {
    this.sqlite.exec('BEGIN');
    try {
      await task();
      this.sqlite.exec('COMMIT');
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }
}

describe('migration 005 multi-wallet table rebuild', () => {
  let sqlite: DatabaseSync;
  let database: NodeSQLiteAdapter;

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    database = new NodeSQLiteAdapter(sqlite);
    sqlite.exec('PRAGMA foreign_keys = ON');
    await initialMigration.up(database.asSQLiteDatabase());
    await goalsAndHabitsMigration.up(database.asSQLiteDatabase());
    await categoryBudgetsMigration.up(database.asSQLiteDatabase());
    await queryOptimizationIndexesMigration.up(database.asSQLiteDatabase());
    sqlite.exec(`
      PRAGMA user_version = 4;
      INSERT INTO categories (
        id, name, type, icon_key, system_key, is_default, is_fallback,
        sort_order, created_at, updated_at
      ) VALUES (1, 'Food', 'expense', NULL, 'expense_food', 1, 0, 0, 1, 1);
      INSERT INTO payment_methods (
        id, name, system_key, is_default, is_fallback, sort_order,
        created_at, updated_at
      ) VALUES (1, 'Cash', 'cash', 1, 1, 0, 1, 1);
      INSERT INTO transactions (
        id, type, amount_minor, currency_code, category_id,
        payment_method_id, counterparty, note, occurred_at,
        timezone_offset_minutes, local_date, is_reimbursable,
        created_at, updated_at
      ) VALUES (
        1, 'expense', 25000, 'IDR', 1, 1, 'Store', NULL,
        1700000000000, -420, '2023-11-15', 1, 1700000000000, 1700000000000
      );
      INSERT INTO receipts (
        id, transaction_id, storage_key, mime_type, ocr_status,
        ocr_raw_text, subtotal_minor, tax_minor, created_at, updated_at
      ) VALUES (
        1, 1, 'receipts/legacy.jpg', 'image/jpeg', 'not_processed',
        NULL, NULL, NULL, 1700000000000, 1700000000000
      );
      INSERT INTO claims (
        id, title, description, status, period_mode, period_start,
        period_end, submitted_at, reimbursed_at, rejected_at,
        created_at, updated_at
      ) VALUES (
        1, 'Work expense', NULL, 'draft', 'auto', '2023-11-15',
        '2023-11-15', NULL, NULL, NULL, 1700000000000, 1700000000000
      );
      INSERT INTO claim_items (id, claim_id, transaction_id, created_at)
      VALUES (1, 1, 1, 1700000000000);
    `);
  });

  afterEach(() => sqlite.close());

  it('preserves transactions, receipts, and claim membership', async () => {
    await migrateDatabase(database.asSQLiteDatabase());

    expect(
      sqlite.prepare('SELECT COUNT(*) AS count FROM transactions').get(),
    ).toMatchObject({ count: 1 });
    expect(
      sqlite.prepare('SELECT COUNT(*) AS count FROM receipts').get(),
    ).toMatchObject({ count: 1 });
    expect(
      sqlite.prepare('SELECT COUNT(*) AS count FROM claim_items').get(),
    ).toMatchObject({ count: 1 });
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(sqlite.prepare('PRAGMA foreign_keys').get()).toMatchObject({
      foreign_keys: 1,
    });
    expect(sqlite.prepare('PRAGMA user_version').get()).toMatchObject({
      user_version: latestDatabaseVersion,
    });
  });
});
