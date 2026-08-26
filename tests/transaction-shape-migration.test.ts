import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { enforceTransactionShapeMigration } from '@/db/migrations/008-enforce-transaction-shape';

describe('migration 008 transaction shape triggers', () => {
  let sqlite: DatabaseSync;

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY,
        type TEXT NOT NULL,
        system_key TEXT
      );
      CREATE TABLE payment_methods (id INTEGER PRIMARY KEY);
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY,
        type TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        payment_method_id INTEGER,
        transfer_to_payment_method_id INTEGER,
        transfer_fee_minor INTEGER DEFAULT 0,
        transfer_fee_category_id INTEGER,
        transfer_fee_note TEXT
      );
      CREATE TABLE receipts (
        id INTEGER PRIMARY KEY,
        transaction_id INTEGER NOT NULL
      );
      INSERT INTO categories (id, type, system_key) VALUES
        (1, 'expense', 'expense_food'),
        (2, 'income', 'income_salary'),
        (3, 'expense', 'wallet_transfer'),
        (4, 'expense', 'expense_fee');
      INSERT INTO payment_methods (id) VALUES (10), (11);
    `);
    await enforceTransactionShapeMigration.up({
      execAsync: async (source: string) => sqlite.exec(source),
    } as SQLiteDatabase);
  });

  afterEach(() => sqlite.close());

  function insertTransaction(values: readonly (string | number | null)[]) {
    sqlite
      .prepare(
        `INSERT INTO transactions (
          id, type, category_id, payment_method_id,
          transfer_to_payment_method_id, transfer_fee_minor,
          transfer_fee_category_id, transfer_fee_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(...values);
  }

  it('accepts valid expense, income, and transfer shapes', () => {
    expect(() =>
      insertTransaction([1, 'expense', 1, 10, null, 0, null, null]),
    ).not.toThrow();
    expect(() =>
      insertTransaction([2, 'income', 2, 10, null, 0, null, null]),
    ).not.toThrow();
    expect(() =>
      insertTransaction([3, 'transfer', 3, 10, 11, 2500, 4, 'admin']),
    ).not.toThrow();
  });

  it.each([
    {
      label: 'same transfer wallet',
      values: [10, 'transfer', 3, 10, 10, 0, null, null],
      error: 'transaction_transfer_wallets_invalid',
    },
    {
      label: 'transfer fields on an expense',
      values: [11, 'expense', 1, 10, 11, 0, null, null],
      error: 'transaction_non_transfer_fields_invalid',
    },
    {
      label: 'category with the wrong type',
      values: [12, 'income', 1, 10, null, 0, null, null],
      error: 'transaction_category_type_invalid',
    },
    {
      label: 'non-expense transfer fee category',
      values: [13, 'transfer', 3, 10, 11, 100, 2, null],
      error: 'transaction_transfer_fee_category_invalid',
    },
  ])('rejects $label', ({ error, values }) => {
    expect(() => insertTransaction(values)).toThrow(error);
  });

  it('rejects receipts for income or transfer transactions on insert and update', () => {
    insertTransaction([20, 'expense', 1, 10, null, 0, null, null]);
    insertTransaction([21, 'income', 2, 10, null, 0, null, null]);
    insertTransaction([22, 'transfer', 3, 10, 11, 0, null, null]);

    sqlite.prepare('INSERT INTO receipts (id, transaction_id) VALUES (?, ?)').run(1, 20);
    expect(() =>
      sqlite
        .prepare('INSERT INTO receipts (id, transaction_id) VALUES (?, ?)')
        .run(2, 21),
    ).toThrow('receipt_transaction_type_invalid');
    expect(() =>
      sqlite.prepare('UPDATE receipts SET transaction_id = ? WHERE id = ?').run(22, 1),
    ).toThrow('receipt_transaction_type_invalid');
  });

  it('enforces relevant transaction changes on update', () => {
    insertTransaction([30, 'expense', 1, 10, null, 0, null, null]);
    expect(() =>
      sqlite
        .prepare('UPDATE transactions SET category_id = ? WHERE id = ?')
        .run(2, 30),
    ).toThrow('transaction_category_type_invalid');
  });
});
