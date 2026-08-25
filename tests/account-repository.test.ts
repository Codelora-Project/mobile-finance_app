import { beforeEach, describe, expect, it } from '@jest/globals';
import type {
  SQLiteBindValue,
  SQLiteDatabase,
  SQLiteRunResult,
} from 'expo-sqlite';

import {
  archiveWallet,
  createWallet,
  getWalletById,
  getWallets,
  getWalletSummary,
  reconcileWalletBalance,
  recordTransfer,
  updateWallet,
} from '@/features/wallets/wallet-repository';
import { getTimezoneOffsetMinutes, toLocalDate } from '@/lib/dates';

type PaymentMethodRow = {
  id: number;
  name: string;
  system_key: string | null;
  account_type: string;
  account_number: string | null;
  color: string | null;
  icon_key: string | null;
  initial_balance_minor: number;
  include_in_cashflow: number;
  is_default: number;
  is_fallback: number;
  is_archived: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
};

type TransactionRow = {
  id: number;
  type: 'expense' | 'income' | 'transfer';
  amount_minor: number;
  currency_code: string;
  category_id: number;
  payment_method_id: number | null;
  transfer_to_payment_method_id: number | null;
  transfer_fee_minor: number;
  transfer_fee_category_id: number | null;
  transfer_fee_note: string | null;
  counterparty: string | null;
  note: string | null;
  occurred_at: number;
  timezone_offset_minutes: number;
  local_date: string;
  is_reimbursable: number;
  created_at: number;
  updated_at: number;
};

class MockAccountDatabase {
  paymentMethods: PaymentMethodRow[] = [
    {
      id: 1,
      name: 'Tunai',
      system_key: 'cash',
      account_type: 'cash',
      account_number: null,
      color: '#10B981',
      icon_key: 'cash',
      initial_balance_minor: 0,
      include_in_cashflow: 1,
      is_default: 1,
      is_fallback: 0,
      is_archived: 0,
      sort_order: 1,
      created_at: 1000,
      updated_at: 1000,
    },
    {
      id: 2,
      name: 'Bank Transfer',
      system_key: 'bank_transfer',
      account_type: 'bank',
      account_number: null,
      color: '#2563EB',
      icon_key: 'bank',
      initial_balance_minor: 0,
      include_in_cashflow: 1,
      is_default: 0,
      is_fallback: 0,
      is_archived: 0,
      sort_order: 2,
      created_at: 1000,
      updated_at: 1000,
    },
  ];

  transactions: TransactionRow[] = [];
  private nextId = 100;

  private calculateBalance(walletId: number, initialBalance: number): number {
    let balance = initialBalance;
    for (const t of this.transactions) {
      if (t.type === 'income' && t.payment_method_id === walletId) {
        balance += t.amount_minor;
      } else if (t.type === 'expense' && t.payment_method_id === walletId) {
        balance -= t.amount_minor;
      } else if (t.type === 'transfer') {
        if (t.payment_method_id === walletId) {
          balance -= t.amount_minor + (t.transfer_fee_minor || 0);
        }
        if (t.transfer_to_payment_method_id === walletId) {
          balance += t.amount_minor;
        }
      }
    }
    return balance;
  }

  async getFirstAsync<T>(
    sql: string,
    ...parameters: SQLiteBindValue[]
  ): Promise<T | null> {
    const flattened = parameters.flat();
    const cleanSql = sql.replace(/\s+/g, ' ').trim();

    if (cleanSql.includes('SELECT MAX(sort_order)')) {
      const max = Math.max(0, ...this.paymentMethods.map((p) => p.sort_order));
      return { max_order: max } as T;
    }

    if (
      cleanSql.includes(
        'SELECT id FROM payment_methods WHERE name = ? COLLATE NOCASE AND id != ?',
      )
    ) {
      const name = String(flattened[0]);
      const id = Number(flattened[1]);
      const found = this.paymentMethods.find(
        (p) => p.name.toLowerCase() === name.toLowerCase() && p.id !== id,
      );
      return found ? ({ id: found.id } as T) : null;
    }

    if (
      cleanSql.includes(
        'SELECT id FROM payment_methods WHERE name = ? COLLATE NOCASE',
      )
    ) {
      const name = String(flattened[0]);
      const found = this.paymentMethods.find(
        (p) => p.name.toLowerCase() === name.toLowerCase(),
      );
      return found ? ({ id: found.id } as T) : null;
    }

    if (cleanSql.includes('SELECT id FROM payment_methods WHERE id = ?')) {
      const id = Number(flattened[0]);
      const found = this.paymentMethods.find((p) => p.id === id);
      return found ? ({ id: found.id } as T) : null;
    }

    if (cleanSql.includes('WHERE w.id = ?')) {
      const id = Number(flattened[0]);
      const p = this.paymentMethods.find((item) => item.id === id);
      if (!p) return null;
      return {
        ...p,
        current_balance_minor: this.calculateBalance(
          p.id,
          p.initial_balance_minor,
        ),
      } as T;
    }

    if (cleanSql.includes('SELECT id FROM categories WHERE is_fallback = 1')) {
      return { id: 1 } as T;
    }

    if (cleanSql.includes('categories WHERE type =')) {
      return { id: 1 } as T;
    }

    return null;
  }

  async getAllAsync<T>(
    sql: string,
    ..._parameters: SQLiteBindValue[]
  ): Promise<T[]> {
    const cleanSql = sql.replace(/\s+/g, ' ').trim();
    let rows = [...this.paymentMethods];

    if (cleanSql.includes('WHERE w.is_archived = 0')) {
      rows = rows.filter((p) => p.is_archived === 0);
    }

    return rows.map((p) => ({
      ...p,
      current_balance_minor: this.calculateBalance(
        p.id,
        p.initial_balance_minor,
      ),
    })) as T[];
  }

  async runAsync(
    sql: string,
    ...parameters: SQLiteBindValue[]
  ): Promise<SQLiteRunResult> {
    const flattened = parameters.flat();
    const cleanSql = sql.replace(/\s+/g, ' ').trim();

    if (cleanSql.startsWith('INSERT INTO payment_methods')) {
      const id = this.nextId++;
      this.paymentMethods.push({
        id,
        name: String(flattened[0]),
        system_key: null,
        account_type: String(flattened[1]),
        account_number: flattened[2] ? String(flattened[2]) : null,
        color: String(flattened[3]),
        icon_key: String(flattened[4]),
        initial_balance_minor: Number(flattened[5]),
        include_in_cashflow: Number(flattened[6]),
        is_default: Number(flattened[7]),
        is_fallback: 0,
        is_archived: 0,
        sort_order: Number(flattened[8]),
        created_at: Number(flattened[9]),
        updated_at: Number(flattened[10]),
      });
      return { changes: 1, lastInsertRowId: id };
    }

    if (cleanSql.startsWith('UPDATE payment_methods SET name = ?')) {
      const id = Number(flattened[11]);
      const item = this.paymentMethods.find((p) => p.id === id);
      if (item) {
        item.name = String(flattened[0]);
        item.account_type = String(flattened[1]);
        item.account_number = flattened[2] ? String(flattened[2]) : null;
        item.color = String(flattened[3]);
        item.icon_key = String(flattened[4]);
        item.initial_balance_minor = Number(flattened[5]);
        item.include_in_cashflow = Number(flattened[6]);
        item.is_default = Number(flattened[7]);
        item.is_archived = Number(flattened[8]);
        item.sort_order = Number(flattened[9]);
        item.updated_at = Number(flattened[10]);
      }
      return { changes: 1, lastInsertRowId: id };
    }

    if (cleanSql.startsWith('UPDATE payment_methods SET is_archived = 1')) {
      const id = Number(flattened[1]);
      const item = this.paymentMethods.find((p) => p.id === id);
      if (item) {
        item.is_archived = 1;
      }
      return { changes: 1, lastInsertRowId: id };
    }

    if (cleanSql.startsWith('INSERT INTO transactions')) {
      const id = this.nextId++;
      const type = String(flattened[0]) as 'expense' | 'income' | 'transfer';
      const isTransfer = type === 'transfer';
      this.transactions.push({
        id,
        type,
        amount_minor: Number(flattened[1]),
        currency_code: String(flattened[2]),
        category_id: Number(flattened[3]),
        payment_method_id: Number(flattened[4]),
        transfer_to_payment_method_id:
          isTransfer && flattened[5] ? Number(flattened[5]) : null,
        transfer_fee_minor:
          isTransfer && flattened[6] ? Number(flattened[6]) : 0,
        transfer_fee_category_id:
          isTransfer && flattened[7] ? Number(flattened[7]) : null,
        transfer_fee_note:
          isTransfer && flattened[8] ? String(flattened[8]) : null,
        counterparty: flattened[isTransfer ? 9 : 5]
          ? String(flattened[isTransfer ? 9 : 5])
          : null,
        note: flattened[isTransfer ? 10 : 6]
          ? String(flattened[isTransfer ? 10 : 6])
          : null,
        occurred_at: Number(flattened[isTransfer ? 11 : 7]),
        timezone_offset_minutes: Number(flattened[isTransfer ? 12 : 8]),
        local_date: String(flattened[isTransfer ? 13 : 9]),
        is_reimbursable: 0,
        created_at: Number(flattened[isTransfer ? 14 : 10] || Date.now()),
        updated_at: Number(flattened[isTransfer ? 15 : 11] || Date.now()),
      });
      return { changes: 1, lastInsertRowId: id };
    }

    return { changes: 0, lastInsertRowId: 0 };
  }

  async withExclusiveTransactionAsync<T>(
    callback: (tx: SQLiteDatabase) => Promise<T>,
  ): Promise<T> {
    return callback(this as unknown as SQLiteDatabase);
  }
}

describe('account-repository (Multi-Wallet & Transfers)', () => {
  let db: MockAccountDatabase;
  let sqliteDb: SQLiteDatabase;

  beforeEach(() => {
    db = new MockAccountDatabase();
    sqliteDb = db as unknown as SQLiteDatabase;
  });

  it('loads seeded wallets with correct attributes and zero initial ledger mutasi', async () => {
    const wallets = await getWallets(sqliteDb);

    expect(wallets.length).toBeGreaterThan(0);
    const cashWallet = wallets.find((w) => w.systemKey === 'cash');
    expect(cashWallet).toBeDefined();
    expect(cashWallet?.accountType).toBe('cash');
    expect(cashWallet?.includeInCashflow).toBe(true);
    expect(cashWallet?.currentBalanceMinor).toBe(0);
  });

  it('creates a new custom wallet with initial balance and tracking classification', async () => {
    const created = await createWallet(sqliteDb, {
      name: 'Bibit Reksadana',
      accountType: 'investment',
      color: '#059669',
      iconKey: 'trending-up',
      initialBalanceMinor: 5000000,
      includeInCashflow: false, // Tracking asset (not cashflow)
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Bibit Reksadana');
    expect(created.accountType).toBe('investment');
    expect(created.initialBalanceMinor).toBe(5000000);
    expect(created.currentBalanceMinor).toBe(5000000);
    expect(created.includeInCashflow).toBe(false);

    const fetched = await getWalletById(sqliteDb, created.id);
    expect(fetched?.name).toBe('Bibit Reksadana');
    expect(fetched?.currentBalanceMinor).toBe(5000000);
  });

  it('calculates live wallet balance dynamically from income and expense transactions', async () => {
    const bca = await createWallet(sqliteDb, {
      name: 'Bank BCA',
      accountType: 'bank',
      initialBalanceMinor: 10000000,
      includeInCashflow: true,
    });

    // 1. Income of Rp 2.000.000 to BCA
    await db.runAsync(
      'INSERT INTO transactions',
      'income',
      2000000,
      'IDR',
      12,
      bca.id,
      null,
      0,
      null,
      null,
      'Kantor',
      'Gaji',
      Date.now(),
      0,
      '2026-08-18',
    );

    // 2. Expense of Rp 500.000 from BCA
    await db.runAsync(
      'INSERT INTO transactions',
      'expense',
      500000,
      'IDR',
      1,
      bca.id,
      null,
      0,
      null,
      null,
      'Restoran',
      'Makan',
      Date.now(),
      0,
      '2026-08-18',
    );

    const updatedBca = await getWalletById(sqliteDb, bca.id);
    // 10.000.000 + 2.000.000 - 500.000 = 11.500.000
    expect(updatedBca?.currentBalanceMinor).toBe(11500000);
  });

  it('handles wallet-to-wallet transfer with optional transfer fee correctly', async () => {
    const bca = await createWallet(sqliteDb, {
      name: 'Bank BCA',
      accountType: 'bank',
      initialBalanceMinor: 5000000,
      includeInCashflow: true,
    });

    const gopay = await createWallet(sqliteDb, {
      name: 'GoPay Personal',
      accountType: 'ewallet',
      initialBalanceMinor: 100000,
      includeInCashflow: true,
    });

    // Transfer Rp 500.000 from BCA to GoPay with Rp 2.500 transfer fee
    const transferId = await recordTransfer(sqliteDb, {
      fromWalletId: bca.id,
      toWalletId: gopay.id,
      amountMinor: 500000,
      currencyCode: 'IDR',
      occurredAt: Date.now(),
      note: 'Top Up GoPay',
      transferFeeMinor: 2500,
      transferFeeCategoryId: 4, // Bills
      transferFeeNote: 'Biaya Admin Topup',
    });

    expect(transferId).toBeGreaterThan(0);

    const updatedBca = await getWalletById(sqliteDb, bca.id);
    const updatedGopay = await getWalletById(sqliteDb, gopay.id);

    // BCA: 5.000.000 - 500.000 - 2.500 = 4.497.500
    expect(updatedBca?.currentBalanceMinor).toBe(4497500);

    // GoPay: 100.000 + 500.000 = 600.000
    expect(updatedGopay?.currentBalanceMinor).toBe(600000);
  });

  it('correctly computes Net Worth vs Operational Cash vs Tracking Assets', async () => {
    // 1. Operational Wallet 1: BCA Rp 10.000.000 (Cashflow)
    await createWallet(sqliteDb, {
      name: 'BCA Utama',
      accountType: 'bank',
      initialBalanceMinor: 10000000,
      includeInCashflow: true,
    });

    // 2. Operational Wallet 2: Tunai Rp 500.000 (Cashflow)
    await createWallet(sqliteDb, {
      name: 'Dompet Tunai',
      accountType: 'cash',
      initialBalanceMinor: 500000,
      includeInCashflow: true,
    });

    // 3. Asset Wallet: Bibit Saham Rp 25.000.000 (NON-Cashflow Tracking)
    await createWallet(sqliteDb, {
      name: 'Bibit Portofolio',
      accountType: 'investment',
      initialBalanceMinor: 25000000,
      includeInCashflow: false,
    });

    const summary = await getWalletSummary(sqliteDb);

    // Operational Cash: 10.000.000 + 500.000 = 10.500.000
    expect(summary.operationalCashMinor).toBe(10500000);

    // Tracking Assets: 25.000.000
    expect(summary.trackingAssetsMinor).toBe(25000000);

    // Total Net Worth: 10.500.000 + 25.000.000 = 35.500.000
    expect(summary.totalNetWorthMinor).toBe(35500000);
  });

  it('reconciles wallet balance accurately with automated adjustment transactions', async () => {
    const cashWallet = await createWallet(sqliteDb, {
      name: 'Uang Saku',
      accountType: 'cash',
      initialBalanceMinor: 100000,
      includeInCashflow: true,
    });

    expect(cashWallet.currentBalanceMinor).toBe(100000);

    // Reconcile: User physically has Rp 85.000 (Rp 15.000 was spent without recording)
    await reconcileWalletBalance(
      sqliteDb,
      cashWallet.id,
      85000,
      'IDR',
      'Penyesuaian Fisik',
    );

    const updated = await getWalletById(sqliteDb, cashWallet.id);
    expect(updated?.currentBalanceMinor).toBe(85000);
    const adjustment = db.transactions.at(-1)!;
    expect(adjustment.timezone_offset_minutes).toBe(
      getTimezoneOffsetMinutes(adjustment.occurred_at),
    );
    expect(adjustment.local_date).toBe(
      toLocalDate(adjustment.occurred_at, adjustment.timezone_offset_minutes),
    );

    // Reconcile up: User found Rp 50.000 extra -> new balance Rp 135.000
    await reconcileWalletBalance(
      sqliteDb,
      cashWallet.id,
      135000,
      'IDR',
      'Uang Ditemukan',
    );
    const updatedAgain = await getWalletById(sqliteDb, cashWallet.id);
    expect(updatedAgain?.currentBalanceMinor).toBe(135000);
  });

  it('allows updating and archiving wallets safely', async () => {
    const wallet = await createWallet(sqliteDb, {
      name: 'OVO Lama',
      accountType: 'ewallet',
      initialBalanceMinor: 50000,
    });

    const updated = await updateWallet(sqliteDb, wallet.id, {
      name: 'OVO Akun Bisnis',
      color: '#4C2A86',
    });
    expect(updated.name).toBe('OVO Akun Bisnis');
    expect(updated.color).toBe('#4C2A86');

    await archiveWallet(sqliteDb, wallet.id);
    const activeWallets = await getWallets(sqliteDb, {
      includeArchived: false,
    });
    expect(activeWallets.some((w) => w.id === wallet.id)).toBe(false);

    const allWallets = await getWallets(sqliteDb, { includeArchived: true });
    expect(allWallets.some((w) => w.id === wallet.id)).toBe(true);
  });

  it('rejects unsafe balances and archived-wallet mutations', async () => {
    await expect(
      createWallet(sqliteDb, {
        accountType: 'cash',
        initialBalanceMinor: 1.5,
        name: 'Invalid Balance',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });

    const archived = await createWallet(sqliteDb, {
      accountType: 'cash',
      initialBalanceMinor: 10_000,
      name: 'Archived Cash',
    });
    await archiveWallet(sqliteDb, archived.id);

    await expect(
      reconcileWalletBalance(sqliteDb, archived.id, 20_000, 'IDR'),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(
      recordTransfer(sqliteDb, {
        amountMinor: 1_000,
        currencyCode: 'IDR',
        fromWalletId: archived.id,
        occurredAt: Date.now(),
        toWalletId: 1,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
