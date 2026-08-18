import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  AccountType,
  CreateWalletInput,
  TransferTransactionInput,
  UpdateWalletInput,
  Wallet,
  WalletSummary,
} from '@/features/accounts/account-types';
import { createCodedError } from '@/lib/errors';
import { toLocalDate } from '@/lib/dates';
import { normalizeOptionalText } from '@/lib/strings';

type WalletRow = {
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
  current_balance_minor: number;
};

function mapWalletRow(row: WalletRow): Wallet {
  return {
    id: row.id,
    name: row.name,
    systemKey: row.system_key,
    accountType: (row.account_type as AccountType) || 'cash',
    accountNumber: row.account_number,
    color: row.color ?? '#2563EB',
    iconKey: row.icon_key ?? 'wallet',
    initialBalanceMinor: Number(row.initial_balance_minor ?? 0),
    currentBalanceMinor: Number(row.current_balance_minor ?? 0),
    includeInCashflow: row.include_in_cashflow === 1,
    isDefault: row.is_default === 1,
    isFallback: row.is_fallback === 1,
    isArchived: row.is_archived === 1,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: Number(row.created_at ?? 0),
    updatedAt: Number(row.updated_at ?? 0),
  };
}

const WALLET_SELECT_QUERY = `
  SELECT
    w.id,
    w.name,
    w.system_key,
    w.account_type,
    w.account_number,
    w.color,
    w.icon_key,
    w.initial_balance_minor,
    w.include_in_cashflow,
    w.is_default,
    w.is_fallback,
    w.is_archived,
    w.sort_order,
    w.created_at,
    w.updated_at,
    (
      w.initial_balance_minor
      + COALESCE((SELECT SUM(amount_minor) FROM transactions WHERE payment_method_id = w.id AND type = 'income'), 0)
      - COALESCE((SELECT SUM(amount_minor) FROM transactions WHERE payment_method_id = w.id AND type = 'expense'), 0)
      + COALESCE((SELECT SUM(amount_minor) FROM transactions WHERE transfer_to_payment_method_id = w.id AND type = 'transfer'), 0)
      - COALESCE((SELECT SUM(amount_minor) FROM transactions WHERE payment_method_id = w.id AND type = 'transfer'), 0)
      - COALESCE((SELECT SUM(transfer_fee_minor) FROM transactions WHERE payment_method_id = w.id AND type = 'transfer'), 0)
    ) AS current_balance_minor
  FROM payment_methods w
`;

export async function getWallets(
  database: SQLiteDatabase,
  options?: { includeArchived?: boolean },
): Promise<Wallet[]> {
  const whereClause = options?.includeArchived ? '' : 'WHERE w.is_archived = 0';
  const rows = await database.getAllAsync<WalletRow>(
    `${WALLET_SELECT_QUERY} ${whereClause} ORDER BY w.sort_order ASC, w.id ASC;`,
  );
  return rows.map(mapWalletRow);
}

export async function getWalletById(
  database: SQLiteDatabase,
  id: number,
): Promise<Wallet | null> {
  const row = await database.getFirstAsync<WalletRow>(
    `${WALLET_SELECT_QUERY} WHERE w.id = ?;`,
    [id],
  );
  return row ? mapWalletRow(row) : null;
}

export async function getWalletSummary(
  database: SQLiteDatabase,
): Promise<WalletSummary> {
  const wallets = await getWallets(database, { includeArchived: false });

  let totalNetWorthMinor = 0;
  let operationalCashMinor = 0;
  let trackingAssetsMinor = 0;

  for (const wallet of wallets) {
    totalNetWorthMinor += wallet.currentBalanceMinor;
    if (wallet.includeInCashflow) {
      operationalCashMinor += wallet.currentBalanceMinor;
    } else {
      trackingAssetsMinor += wallet.currentBalanceMinor;
    }
  }

  return {
    totalNetWorthMinor,
    operationalCashMinor,
    trackingAssetsMinor,
    wallets,
  };
}

export async function createWallet(
  database: SQLiteDatabase,
  input: CreateWalletInput,
): Promise<Wallet> {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Nama dompet / rekening tidak boleh kosong.',
    );
  }

  const existing = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM payment_methods WHERE name = ? COLLATE NOCASE;',
    [trimmedName],
  );
  if (existing) {
    throw createCodedError(
      'VALIDATION_FAILED',
      `Dompet dengan nama "${trimmedName}" sudah ada.`,
    );
  }

  const maxOrder = await database.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(sort_order) AS max_order FROM payment_methods;',
  );
  const nextOrder = (maxOrder?.max_order ?? 0) + 1;
  const now = Date.now();

  const result = await database.runAsync(
    `INSERT INTO payment_methods (
      name, system_key, account_type, account_number, color, icon_key,
      initial_balance_minor, include_in_cashflow, is_default, is_fallback,
      is_archived, sort_order, created_at, updated_at
    ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?);`,
    [
      trimmedName,
      input.accountType || 'cash',
      normalizeOptionalText(input.accountNumber ?? ''),
      input.color ?? '#2563EB',
      input.iconKey ?? 'wallet',
      Math.max(0, Math.round(input.initialBalanceMinor ?? 0)),
      input.includeInCashflow === false ? 0 : 1,
      input.isDefault ? 1 : 0,
      nextOrder,
      now,
      now,
    ],
  );

  const created = await getWalletById(database, result.lastInsertRowId);
  if (!created) {
    throw createCodedError('DATABASE_WRITE_FAILED', 'Gagal membuat dompet baru.');
  }
  return created;
}

export async function updateWallet(
  database: SQLiteDatabase,
  id: number,
  input: UpdateWalletInput,
): Promise<Wallet> {
  const current = await getWalletById(database, id);
  if (!current) {
    throw createCodedError('VALIDATION_FAILED', 'Dompet tidak ditemukan.');
  }

  const nextName = input.name !== undefined ? input.name.trim() : current.name;
  if (!nextName) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Nama dompet / rekening tidak boleh kosong.',
    );
  }

  if (nextName.toLowerCase() !== current.name.toLowerCase()) {
    const existing = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM payment_methods WHERE name = ? COLLATE NOCASE AND id != ?;',
      [nextName, id],
    );
    if (existing) {
      throw createCodedError(
        'VALIDATION_FAILED',
        `Dompet dengan nama "${nextName}" sudah digunakan.`,
      );
    }
  }

  const now = Date.now();
  await database.runAsync(
    `UPDATE payment_methods SET
      name = ?,
      account_type = ?,
      account_number = ?,
      color = ?,
      icon_key = ?,
      initial_balance_minor = ?,
      include_in_cashflow = ?,
      is_default = ?,
      is_archived = ?,
      sort_order = ?,
      updated_at = ?
    WHERE id = ?;`,
    [
      nextName,
      input.accountType ?? current.accountType,
      input.accountNumber !== undefined
        ? normalizeOptionalText(input.accountNumber ?? '')
        : current.accountNumber,
      input.color ?? current.color,
      input.iconKey ?? current.iconKey,
      input.initialBalanceMinor !== undefined
        ? Math.round(input.initialBalanceMinor)
        : current.initialBalanceMinor,
      input.includeInCashflow !== undefined
        ? input.includeInCashflow ? 1 : 0
        : current.includeInCashflow ? 1 : 0,
      input.isDefault !== undefined
        ? input.isDefault ? 1 : 0
        : current.isDefault ? 1 : 0,
      input.isArchived !== undefined
        ? input.isArchived ? 1 : 0
        : current.isArchived ? 1 : 0,
      input.sortOrder ?? current.sortOrder,
      now,
      id,
    ],
  );

  const updated = await getWalletById(database, id);
  if (!updated) {
    throw createCodedError('DATABASE_WRITE_FAILED', 'Gagal memperbarui dompet.');
  }
  return updated;
}

export async function archiveWallet(
  database: SQLiteDatabase,
  id: number,
): Promise<void> {
  const current = await getWalletById(database, id);
  if (!current) {
    throw createCodedError('VALIDATION_FAILED', 'Dompet tidak ditemukan.');
  }
  if (current.isFallback) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Dompet default sistem tidak dapat diarsipkan.',
    );
  }
  await database.runAsync(
    'UPDATE payment_methods SET is_archived = 1, updated_at = ? WHERE id = ?;',
    [Date.now(), id],
  );
}

export async function unarchiveWallet(
  database: SQLiteDatabase,
  id: number,
): Promise<void> {
  const current = await getWalletById(database, id);
  if (!current) {
    throw createCodedError('VALIDATION_FAILED', 'Dompet tidak ditemukan.');
  }
  await database.runAsync(
    'UPDATE payment_methods SET is_archived = 0, updated_at = ? WHERE id = ?;',
    [Date.now(), id],
  );
}

export async function recordTransfer(
  database: SQLiteDatabase,
  input: TransferTransactionInput,
): Promise<number> {
  if (input.fromWalletId === input.toWalletId) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Dompet asal dan dompet tujuan tidak boleh sama.',
    );
  }
  if (!input.amountMinor || input.amountMinor <= 0) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Nominal transfer harus lebih besar dari 0.',
    );
  }

  const [fromWallet, toWallet] = await Promise.all([
    getWalletById(database, input.fromWalletId),
    getWalletById(database, input.toWalletId),
  ]);

  if (!fromWallet || !toWallet) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Dompet pengirim atau penerima tidak ditemukan.',
    );
  }

  // Find a fallback or transfer category
  let categoryId = input.transferFeeCategoryId;
  if (!categoryId) {
    const fallbackCategory = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM categories WHERE is_fallback = 1 LIMIT 1;',
    );
    categoryId = fallbackCategory?.id ?? 1;
  }

  const now = Date.now();
  const timezoneOffsetMinutes = new Date(input.occurredAt).getTimezoneOffset();
  const localDate = toLocalDate(input.occurredAt, timezoneOffsetMinutes);

  const result = await database.runAsync(
    `INSERT INTO transactions (
      type, amount_minor, currency_code, category_id,
      payment_method_id, transfer_to_payment_method_id,
      transfer_fee_minor, transfer_fee_category_id, transfer_fee_note,
      counterparty, note, occurred_at, timezone_offset_minutes,
      local_date, is_reimbursable, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      NULL, ?, ?, ?,
      ?, 0, ?, ?
    );`,
    [
      'transfer',
      Math.round(input.amountMinor),
      input.currencyCode.toUpperCase(),
      categoryId,
      input.fromWalletId,
      input.toWalletId,
      Math.max(0, Math.round(input.transferFeeMinor ?? 0)),
      input.transferFeeCategoryId ?? null,
      normalizeOptionalText(input.transferFeeNote ?? ''),
      normalizeOptionalText(input.note ?? ''),
      input.occurredAt,
      timezoneOffsetMinutes,
      localDate,
      now,
      now,
    ],
  );

  return result.lastInsertRowId;
}

export async function reconcileWalletBalance(
  database: SQLiteDatabase,
  walletId: number,
  targetBalanceMinor: number,
  currencyCode: string,
  note?: string,
): Promise<void> {
  const wallet = await getWalletById(database, walletId);
  if (!wallet) {
    throw createCodedError('VALIDATION_FAILED', 'Dompet tidak ditemukan.');
  }

  const difference = Math.round(targetBalanceMinor) - wallet.currentBalanceMinor;
  if (difference === 0) return;

  const now = Date.now();
  const timezoneOffsetMinutes = new Date(now).getTimezoneOffset();
  const localDate = toLocalDate(now, timezoneOffsetMinutes);

  if (difference > 0) {
    // Income adjustment
    const incomeCategory = await database.getFirstAsync<{ id: number }>(
      `SELECT id FROM categories WHERE type = 'income' AND system_key = 'income_refund'
       UNION SELECT id FROM categories WHERE type = 'income' LIMIT 1;`,
    );
    const categoryId = incomeCategory?.id ?? 1;

    await database.runAsync(
      `INSERT INTO transactions (
        type, amount_minor, currency_code, category_id, payment_method_id,
        transfer_to_payment_method_id, transfer_fee_minor, transfer_fee_category_id, transfer_fee_note,
        counterparty, note, occurred_at, timezone_offset_minutes, local_date,
        is_reimbursable, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        NULL, 0, NULL, NULL,
        'Penyesuaian Saldo', ?, ?, ?, ?,
        0, ?, ?
      );`,
      [
        'income',
        difference,
        currencyCode.toUpperCase(),
        categoryId,
        walletId,
        normalizeOptionalText(note ?? '') ?? 'Penyesuaian Saldo (Koreksi)',
        now,
        timezoneOffsetMinutes,
        localDate,
        now,
        now,
      ],
    );
  } else {
    // Expense adjustment
    const expenseCategory = await database.getFirstAsync<{ id: number }>(
      `SELECT id FROM categories WHERE type = 'expense' AND system_key = 'expense_other'
       UNION SELECT id FROM categories WHERE type = 'expense' LIMIT 1;`,
    );
    const categoryId = expenseCategory?.id ?? 1;

    await database.runAsync(
      `INSERT INTO transactions (
        type, amount_minor, currency_code, category_id, payment_method_id,
        transfer_to_payment_method_id, transfer_fee_minor, transfer_fee_category_id, transfer_fee_note,
        counterparty, note, occurred_at, timezone_offset_minutes, local_date,
        is_reimbursable, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        NULL, 0, NULL, NULL,
        'Penyesuaian Saldo', ?, ?, ?, ?,
        0, ?, ?
      );`,
      [
        'expense',
        Math.abs(difference),
        currencyCode.toUpperCase(),
        categoryId,
        walletId,
        normalizeOptionalText(note ?? '') ?? 'Penyesuaian Saldo (Koreksi)',
        now,
        timezoneOffsetMinutes,
        localDate,
        now,
        now,
      ],
    );
  }
}
