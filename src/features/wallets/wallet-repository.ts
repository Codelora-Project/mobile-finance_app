import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  AccountType,
  CreateWalletInput,
  PaymentMethod,
  TransferTransactionInput,
  UpdateWalletInput,
  Wallet,
  WalletSummary,
} from '@/features/wallets/wallet-types';
import { toLocalDate } from '@/lib/dates';
import { createCodedError } from '@/lib/errors';
import { normalizeOptionalText } from '@/lib/strings';

type WalletRow = {
  account_number: string | null;
  account_type: string;
  color: string | null;
  created_at: number;
  current_balance_minor: number;
  icon_key: string | null;
  id: number;
  include_in_cashflow: number;
  initial_balance_minor: number;
  is_archived: number;
  is_default: number;
  is_fallback: number;
  name: string;
  sort_order: number;
  system_key: string | null;
  updated_at: number;
};

function mapWalletRow(row: WalletRow): Wallet {
  return {
    accountNumber: row.account_number,
    accountType: (row.account_type as AccountType) || 'cash',
    color: row.color ?? '#2563EB',
    createdAt: Number(row.created_at ?? 0),
    currentBalanceMinor: Number(row.current_balance_minor ?? 0),
    iconKey: row.icon_key ?? 'wallet',
    id: row.id,
    includeInCashflow: row.include_in_cashflow === 1,
    initialBalanceMinor: Number(row.initial_balance_minor ?? 0),
    isArchived: row.is_archived === 1,
    isDefault: row.is_default === 1,
    isFallback: row.is_fallback === 1,
    name: row.name,
    sortOrder: Number(row.sort_order ?? 0),
    systemKey: row.system_key,
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
  const query = `${WALLET_SELECT_QUERY} ${whereClause} ORDER BY w.sort_order ASC, w.id ASC;`;
  const rows = await database.getAllAsync<WalletRow>(query);
  return rows.map(mapWalletRow);
}

export async function getWalletById(
  database: SQLiteDatabase,
  walletId: number,
): Promise<Wallet | null> {
  const query = `${WALLET_SELECT_QUERY} WHERE w.id = ?;`;
  const row = await database.getFirstAsync<WalletRow>(query, [walletId]);
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
    operationalCashMinor,
    totalNetWorthMinor,
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
    throw createCodedError('VALIDATION_FAILED', 'Nama dompet tidak boleh kosong.');
  }

  const existing = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM payment_methods WHERE LOWER(name) = LOWER(?) LIMIT 1;',
    [trimmedName],
  );
  if (existing) {
    throw createCodedError(
      'VALIDATION_FAILED',
      `Dompet dengan nama "${trimmedName}" sudah ada.`,
    );
  }

  const now = Date.now();
  const maxOrder = await database.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(sort_order) as max_order FROM payment_methods;',
  );
  const nextOrder = (maxOrder?.max_order ?? 0) + 1;

  const result = await database.runAsync(
    `INSERT INTO payment_methods (
      name,
      account_type,
      account_number,
      color,
      icon_key,
      initial_balance_minor,
      include_in_cashflow,
      is_default,
      is_fallback,
      is_archived,
      sort_order,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?);`,
    [
      trimmedName,
      input.accountType,
      normalizeOptionalText(input.accountNumber),
      input.color ?? '#2563EB',
      input.iconKey ?? 'wallet',
      input.initialBalanceMinor ?? 0,
      input.includeInCashflow !== false ? 1 : 0,
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
  const existing = await getWalletById(database, id);
  if (!existing) {
    throw createCodedError('VALIDATION_FAILED', 'Dompet tidak ditemukan.');
  }

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) {
    throw createCodedError('VALIDATION_FAILED', 'Nama dompet tidak boleh kosong.');
  }

  if (name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM payment_methods WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1;',
      [name, id],
    );
    if (duplicate) {
      throw createCodedError(
        'VALIDATION_FAILED',
        `Dompet dengan nama "${name}" sudah ada.`,
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
      name,
      input.accountType ?? existing.accountType,
      input.accountNumber !== undefined
        ? normalizeOptionalText(input.accountNumber)
        : existing.accountNumber,
      input.color ?? existing.color,
      input.iconKey ?? existing.iconKey,
      input.initialBalanceMinor ?? existing.initialBalanceMinor,
      input.includeInCashflow !== undefined
        ? input.includeInCashflow ? 1 : 0
        : existing.includeInCashflow ? 1 : 0,
      input.isDefault !== undefined
        ? input.isDefault ? 1 : 0
        : existing.isDefault ? 1 : 0,
      input.isArchived !== undefined
        ? input.isArchived ? 1 : 0
        : existing.isArchived ? 1 : 0,
      input.sortOrder ?? existing.sortOrder,
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
  const existing = await getWalletById(database, id);
  if (!existing) {
    throw createCodedError('VALIDATION_FAILED', 'Dompet tidak ditemukan.');
  }
  if (existing.isFallback) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Dompet bawaan sistem tidak dapat diarsipkan.',
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
  await database.runAsync(
    'UPDATE payment_methods SET is_archived = 0, updated_at = ? WHERE id = ?;',
    [Date.now(), id],
  );
}

export async function reconcileWalletBalance(
  database: SQLiteDatabase,
  walletId: number,
  actualBalanceMinor: number,
  currencyCode = 'IDR',
  note?: string,
): Promise<{ id: number; type: 'income' | 'expense' } | null> {
  const wallet = await getWalletById(database, walletId);
  if (!wallet) {
    throw createCodedError('VALIDATION_FAILED', 'Dompet tidak ditemukan.');
  }

  const diffMinor = actualBalanceMinor - wallet.currentBalanceMinor;
  if (diffMinor === 0) return null;

  const now = Date.now();
  const localDate = toLocalDate(now, 0);
  const type = diffMinor > 0 ? 'income' : 'expense';
  const amountMinor = Math.abs(diffMinor);

  // Find or create Reconciliation system category
  let category = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM categories WHERE name = 'Penyesuaian Saldo' LIMIT 1;",
  );
  if (!category) {
    const catResult = await database.runAsync(
      `INSERT INTO categories (name, type, icon, color, is_default, sort_order, created_at, updated_at)
       VALUES ('Penyesuaian Saldo', 'expense', 'tune-vertical', '#64748B', 1, 999, ?, ?);`,
      [now, now],
    );
    category = { id: catResult.lastInsertRowId };
  }

  const result = await database.runAsync(
    `INSERT INTO transactions (
      type, amount_minor, currency_code, category_id, payment_method_id,
      counterparty, note, occurred_at, timezone_offset_minutes, local_date,
      is_reimbursable, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?);`,
    [
      type,
      amountMinor,
      currencyCode,
      category.id,
      walletId,
      'Penyesuaian Saldo',
      note ?? 'Penyesuaian Saldo Riil (Rekonsiliasi)',
      now,
      localDate,
      now,
      now,
    ],
  );

  return { id: result.lastInsertRowId, type };
}

export async function transferBetweenWallets(
  database: SQLiteDatabase,
  input: TransferTransactionInput,
): Promise<number> {
  const {
    amountMinor,
    currencyCode,
    fromWalletId,
    note,
    occurredAt,
    toWalletId,
    transferFeeCategoryId,
    transferFeeMinor = 0,
    transferFeeNote,
  } = input;

  if (fromWalletId === toWalletId) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Dompet asal dan tujuan tidak boleh sama.',
    );
  }

  if (amountMinor <= 0) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Nominal transfer harus lebih besar dari 0.',
    );
  }

  const [fromWallet, toWallet] = await Promise.all([
    getWalletById(database, fromWalletId),
    getWalletById(database, toWalletId),
  ]);

  if (!fromWallet || !toWallet) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Dompet asal atau tujuan tidak ditemukan.',
    );
  }

  // Find or create Transfer system category
  let category = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM categories WHERE name = 'Transfer Antar Dompet' LIMIT 1;",
  );
  if (!category) {
    const catResult = await database.runAsync(
      `INSERT INTO categories (name, type, icon, color, is_default, sort_order, created_at, updated_at)
       VALUES ('Transfer Antar Dompet', 'transfer', 'swap-horizontal', '#2563EB', 1, 998, ?, ?);`,
      [occurredAt, occurredAt],
    );
    category = { id: catResult.lastInsertRowId };
  }

  const now = Date.now();
  const localDate = toLocalDate(occurredAt, 0);

  const result = await database.runAsync(
    `INSERT INTO transactions (
      type, amount_minor, currency_code, category_id, payment_method_id,
      transfer_to_payment_method_id, transfer_fee_minor, transfer_fee_category_id,
      transfer_fee_note, counterparty, note, occurred_at, timezone_offset_minutes,
      local_date, is_reimbursable, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?);`,
    [
      'transfer',
      amountMinor,
      currencyCode,
      category.id,
      fromWalletId,
      toWalletId,
      transferFeeMinor,
      transferFeeCategoryId ?? null,
      transferFeeNote ? transferFeeNote.trim() : null,
      toWallet.name,
      note ? note.trim() : `Transfer ke ${toWallet.name}`,
      occurredAt,
      0,
      localDate,
      now,
      now,
    ],
  );

  return result.lastInsertRowId;
}

/** Compatibility helper for payment method picker components */
export async function listPaymentMethods(
  database: SQLiteDatabase,
): Promise<readonly PaymentMethod[]> {
  const rows = await database.getAllAsync<{
    created_at: number;
    id: number;
    is_default: number;
    is_fallback: number;
    name: string;
    sort_order: number;
    system_key: string | null;
    updated_at: number;
  }>(
    'SELECT id, name, system_key, is_default, is_fallback, sort_order, created_at, updated_at FROM payment_methods WHERE is_archived = 0 ORDER BY sort_order ASC, id ASC;',
  );

  return rows.map((r) => ({
    createdAt: r.created_at,
    id: r.id,
    isDefault: r.is_default === 1,
    isFallback: r.is_fallback === 1,
    name: r.name,
    sortOrder: r.sort_order,
    systemKey: r.system_key,
    updatedAt: r.updated_at,
  }));
}

export { transferBetweenWallets as recordTransfer };
