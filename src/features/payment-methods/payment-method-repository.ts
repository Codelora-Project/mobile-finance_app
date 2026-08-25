import type { SQLiteDatabase } from 'expo-sqlite';

import { createCodedError } from '@/lib/errors';
import { normalizeSearchText, normalizeText } from '@/lib/strings';

export type PaymentMethod = Readonly<{
  id: number;
  name: string;
  systemKey: string | null;
  isDefault: boolean;
  isFallback: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}>;

type PaymentMethodRow = {
  id: number;
  name: string;
  system_key: string | null;
  is_default: number;
  is_fallback: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
};

type PaymentMethodNameRow = Pick<PaymentMethodRow, 'id' | 'name'>;
type PaymentMethodManagementRow = Pick<
  PaymentMethodRow,
  'id' | 'is_default' | 'is_fallback'
>;

const PAYMENT_METHOD_SELECT = `
  SELECT
    id,
    name,
    system_key,
    is_default,
    is_fallback,
    sort_order,
    created_at,
    updated_at
  FROM payment_methods
`;

function mapPaymentMethod(row: PaymentMethodRow): PaymentMethod {
  return {
    id: row.id,
    name: row.name,
    systemKey: row.system_key,
    isDefault: row.is_default === 1,
    isFallback: row.is_fallback === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validatePaymentMethodName(value: string) {
  const name = normalizeText(value);
  if (name.length === 0) {
    throw createCodedError('VALIDATION_FAILED', 'Enter a payment method name.');
  }
  if (Array.from(name).length > 40) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Payment method name must be 40 characters or fewer.',
    );
  }
  return name;
}

async function assertUniquePaymentMethodName(
  database: SQLiteDatabase,
  name: string,
  excludedId?: number,
) {
  const rows = await database.getAllAsync<PaymentMethodNameRow>(
    'SELECT id, name FROM payment_methods',
  );
  const normalizedName = normalizeSearchText(name);
  const duplicate = rows.some(
    (row) =>
      row.id !== excludedId && normalizeSearchText(row.name) === normalizedName,
  );
  if (duplicate) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'A payment method with this name already exists.',
    );
  }
}

async function requirePaymentMethod(database: SQLiteDatabase, id: number) {
  const row = await database.getFirstAsync<PaymentMethodManagementRow>(
    `SELECT id, is_default, is_fallback
     FROM payment_methods
     WHERE id = ?`,
    id,
  );
  if (!row) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Payment method no longer exists.',
    );
  }
  return row;
}

export async function listPaymentMethods(database: SQLiteDatabase) {
  const rows = await database.getAllAsync<PaymentMethodRow>(
    `${PAYMENT_METHOD_SELECT}
     WHERE is_archived = 0
     ORDER BY is_default DESC, sort_order, name COLLATE NOCASE`,
  );
  return rows.map(mapPaymentMethod);
}

export async function getPaymentMethod(database: SQLiteDatabase, id: number) {
  const row = await database.getFirstAsync<PaymentMethodRow>(
    `${PAYMENT_METHOD_SELECT} WHERE id = ?`,
    id,
  );
  return row ? mapPaymentMethod(row) : null;
}

export async function createPaymentMethod(
  database: SQLiteDatabase,
  input: { name: string },
) {
  const name = validatePaymentMethodName(input.name);
  let createdId: number | null = null;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await assertUniquePaymentMethodName(transaction, name);
    const sortOrderRow = await transaction.getFirstAsync<{
      next_sort_order: number;
    }>(
      `SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_sort_order
       FROM payment_methods`,
    );
    const timestamp = Date.now();
    const result = await transaction.runAsync(
      `INSERT INTO payment_methods (
        name,
        system_key,
        is_default,
        is_fallback,
        sort_order,
        created_at,
        updated_at
      ) VALUES (?, NULL, 0, 0, ?, ?, ?)`,
      name,
      sortOrderRow?.next_sort_order ?? 0,
      timestamp,
      timestamp,
    );
    createdId = result.lastInsertRowId;
  });

  const paymentMethod =
    createdId === null ? null : await getPaymentMethod(database, createdId);
  if (!paymentMethod) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      'The payment method could not be loaded after saving.',
    );
  }
  return paymentMethod;
}

export async function updatePaymentMethod(
  database: SQLiteDatabase,
  id: number,
  input: { name: string },
) {
  const name = validatePaymentMethodName(input.name);

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const paymentMethod = await requirePaymentMethod(transaction, id);
    if (paymentMethod.is_default === 1) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Default payment methods cannot be edited.',
      );
    }
    await assertUniquePaymentMethodName(transaction, name, id);
    await transaction.runAsync(
      'UPDATE payment_methods SET name = ?, updated_at = ? WHERE id = ?',
      name,
      Date.now(),
      id,
    );
  });

  const paymentMethod = await getPaymentMethod(database, id);
  if (!paymentMethod) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      'The payment method could not be loaded after saving.',
    );
  }
  return paymentMethod;
}

export async function deletePaymentMethod(
  database: SQLiteDatabase,
  id: number,
) {
  let reassignedTransactions = 0;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const paymentMethod = await requirePaymentMethod(transaction, id);
    if (paymentMethod.is_fallback === 1) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'The fallback Other payment method cannot be deleted.',
      );
    }
    if (paymentMethod.is_default === 1) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Default payment methods cannot be deleted.',
      );
    }

    const fallback = await transaction.getFirstAsync<{ id: number }>(
      'SELECT id FROM payment_methods WHERE is_fallback = 1',
    );
    if (!fallback) {
      throw createCodedError(
        'DATABASE_WRITE_FAILED',
        'The fallback payment method is unavailable.',
      );
    }

    const updateResult = await transaction.runAsync(
      `UPDATE transactions
       SET payment_method_id = ?, updated_at = ?
       WHERE payment_method_id = ?`,
      fallback.id,
      Date.now(),
      id,
    );
    reassignedTransactions = updateResult.changes;
    await transaction.runAsync(
      `DELETE FROM payment_methods
       WHERE id = ? AND is_default = 0 AND is_fallback = 0`,
      id,
    );
  });

  return { reassignedTransactions };
}
