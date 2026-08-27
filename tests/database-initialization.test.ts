import { describe, expect, it } from '@jest/globals';
import type {
  SQLiteBindValue,
  SQLiteDatabase,
  SQLiteRunResult,
} from 'expo-sqlite';

import { initializeDatabase } from '@/db/database';
import { latestDatabaseVersion } from '@/db/migrations';
import { defaultCategories, defaultPaymentMethods } from '@/db/seeds';

class FakeDatabase {
  readonly categories = new Set<string>();
  readonly executedSql: string[] = [];
  readonly paymentMethods = new Set<string>();
  readonly settings = new Map<string, string>();
  foreignKeys = 0;
  journalMode = 'delete';
  migrationRuns = 0;
  exclusiveTransactionRuns = 0;
  transactionRuns = 0;
  userVersion = 0;

  asSQLiteDatabase() {
    return this as unknown as SQLiteDatabase;
  }

  async execAsync(source: string) {
    this.executedSql.push(source);

    if (source === 'PRAGMA foreign_keys = ON') {
      this.foreignKeys = 1;
    }

    if (source === 'PRAGMA foreign_keys = OFF') {
      this.foreignKeys = 0;
    }

    if (source === 'PRAGMA journal_mode = WAL') {
      this.journalMode = 'wal';
    }

    const versionMatch = source.match(/PRAGMA user_version = (\d+)/);
    if (versionMatch?.[1]) {
      this.userVersion = Number(versionMatch[1]);
    }

    if (source.includes('CREATE TABLE categories')) {
      this.migrationRuns += 1;
    }
  }

  async getFirstAsync<T>(source: string): Promise<T | null> {
    let row: unknown = null;

    if (source === 'PRAGMA foreign_keys') {
      row = { foreign_keys: this.foreignKeys };
    } else if (source === 'PRAGMA journal_mode') {
      row = { journal_mode: this.journalMode };
    } else if (source === 'PRAGMA user_version') {
      row = { user_version: this.userVersion };
    }

    return row as T | null;
  }

  async getAllAsync<T>(): Promise<T[]> {
    return [];
  }

  async runAsync(
    source: string,
    ...params: SQLiteBindValue[]
  ): Promise<SQLiteRunResult> {
    let changes = 0;

    if (source.includes('INTO categories')) {
      changes = this.addUnique(this.categories, String(params[3]));
    } else if (source.includes('INTO payment_methods')) {
      changes = this.addUnique(this.paymentMethods, String(params[1]));
    } else if (source.includes('INTO app_settings')) {
      const key = String(params[0]);
      if (!this.settings.has(key)) {
        this.settings.set(key, String(params[1]));
        changes = 1;
      }
    }

    return { changes, lastInsertRowId: 0 };
  }

  async withTransactionAsync(task: () => Promise<void>) {
    this.transactionRuns += 1;
    await task();
  }

  async withExclusiveTransactionAsync(
    task: (transaction: SQLiteDatabase) => Promise<void>,
  ) {
    this.exclusiveTransactionRuns += 1;
    await task(this.asSQLiteDatabase());
  }

  private addUnique(values: Set<string>, value: string) {
    const previousSize = values.size;
    values.add(value);
    return values.size === previousSize ? 0 : 1;
  }
}

describe('database initialization', () => {
  it('runs the initial migration and seeds all required defaults', async () => {
    const database = new FakeDatabase();

    await initializeDatabase(database.asSQLiteDatabase());

    expect(database.userVersion).toBe(latestDatabaseVersion);
    expect(database.migrationRuns).toBe(1);
    expect(database.categories.size).toBe(18);
    expect(database.paymentMethods.size).toBe(1);
    expect(database.settings.get('default_currency_code')).toBe('IDR');
    expect(database.settings.get('welcome_seen')).toBe('false');
    expect(database.settings.get('language')).toBe('id');
    expect(database.categories).toContain('expense_other');
    expect(database.categories).toContain('income_other');
    expect(database.paymentMethods).toContain('cash');
    expect(
      database.executedSql.some(
        (source) =>
          source.includes("system_key = 'wallet_transfer'") &&
          source.includes("WHERE type = 'transfer'"),
      ),
    ).toBe(true);
  });

  it('keeps migration and seed data idempotent across restart', async () => {
    const database = new FakeDatabase();

    await initializeDatabase(database.asSQLiteDatabase());
    await initializeDatabase(database.asSQLiteDatabase());

    expect(database.migrationRuns).toBe(1);
    expect(database.categories.size).toBe(defaultCategories.length);
    expect(database.paymentMethods.size).toBe(defaultPaymentMethods.length);
    expect(database.settings.size).toBe(3);
  });

  it('enables foreign keys and WAL before using the database', async () => {
    const database = new FakeDatabase();

    await initializeDatabase(database.asSQLiteDatabase());

    expect(database.foreignKeys).toBe(1);
    expect(database.journalMode).toBe('wal');
    expect(database.executedSql.slice(0, 3)).toEqual([
      'PRAGMA foreign_keys = ON',
      'PRAGMA busy_timeout = 3000',
      'PRAGMA journal_mode = WAL',
    ]);
  });

  it('runs startup migrations on the provider connection', async () => {
    const database = new FakeDatabase();

    await initializeDatabase(database.asSQLiteDatabase());

    expect(database.transactionRuns).toBeGreaterThan(0);
    expect(database.exclusiveTransactionRuns).toBe(0);
  });

  it('creates the final currency-aware tables, relationships, and indexes', async () => {
    const database = new FakeDatabase();

    await initializeDatabase(database.asSQLiteDatabase());

    const migrationSql = database.executedSql.find((source) =>
      source.includes('CREATE TABLE categories'),
    );

    expect(migrationSql).toBeDefined();
    for (const table of [
      'categories',
      'payment_methods',
      'transactions',
      'receipts',
      'claims',
      'claim_items',
      'app_settings',
    ]) {
      expect(migrationSql).toContain(`CREATE TABLE ${table}`);
    }

    expect(migrationSql).toContain('amount_minor INTEGER NOT NULL');
    expect(migrationSql).toContain('currency_code TEXT NOT NULL');
    expect(migrationSql).toContain('ON DELETE CASCADE');
    expect(migrationSql).toContain('ON DELETE RESTRICT');

    for (const index of [
      'idx_transactions_local_date',
      'idx_transactions_type_date',
      'idx_transactions_category_date',
      'idx_transactions_payment_date',
      'idx_transactions_reimbursable_date',
      'idx_claims_status_updated',
      'idx_claim_items_claim',
    ]) {
      expect(migrationSql).toContain(`CREATE INDEX ${index}`);
    }
  });
});
