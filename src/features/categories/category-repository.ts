import type { SQLiteDatabase } from 'expo-sqlite';

import { withIntegrityCheckedTransaction } from '@/db/transactions';
import { createCodedError } from '@/lib/errors';
import { normalizeSearchText, normalizeText } from '@/lib/strings';

export type CategoryType = 'expense' | 'income';

export type Category = Readonly<{
  id: number;
  name: string;
  type: CategoryType;
  iconKey: string | null;
  systemKey: string | null;
  isDefault: boolean;
  isFallback: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}>;

type CategoryRow = {
  id: number;
  name: string;
  type: CategoryType;
  icon_key: string | null;
  system_key: string | null;
  is_default: number;
  is_fallback: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
};

type CategoryNameRow = Pick<CategoryRow, 'id' | 'name'>;
type CategoryManagementRow = Pick<
  CategoryRow,
  'id' | 'type' | 'is_default' | 'is_fallback'
>;

const CATEGORY_SELECT = `
  SELECT
    id,
    name,
    type,
    icon_key,
    system_key,
    is_default,
    is_fallback,
    sort_order,
    created_at,
    updated_at
  FROM categories
`;

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    iconKey: row.icon_key,
    systemKey: row.system_key,
    isDefault: row.is_default === 1,
    isFallback: row.is_fallback === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateCategoryName(value: string) {
  const name = normalizeText(value);
  if (name.length === 0) {
    throw createCodedError('VALIDATION_FAILED', 'Enter a category name.');
  }
  if (Array.from(name).length > 40) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Category name must be 40 characters or fewer.',
    );
  }
  return name;
}

async function assertUniqueCategoryName(
  database: SQLiteDatabase,
  name: string,
  type: CategoryType,
  excludedId?: number,
) {
  const rows = await database.getAllAsync<CategoryNameRow>(
    'SELECT id, name FROM categories WHERE type = ?',
    type,
  );
  const normalizedName = normalizeSearchText(name);
  const duplicate = rows.some(
    (row) =>
      row.id !== excludedId && normalizeSearchText(row.name) === normalizedName,
  );

  if (duplicate) {
    throw createCodedError(
      'VALIDATION_FAILED',
      `A category with this name already exists for ${type}.`,
    );
  }
}

async function requireCategory(database: SQLiteDatabase, id: number) {
  const row = await database.getFirstAsync<CategoryManagementRow>(
    `SELECT id, type, is_default, is_fallback
     FROM categories
     WHERE id = ?`,
    id,
  );
  if (!row) {
    throw createCodedError('VALIDATION_FAILED', 'Category no longer exists.');
  }
  return row;
}

export async function listCategories(
  database: SQLiteDatabase,
  type?: CategoryType,
) {
  const rows = type
    ? await database.getAllAsync<CategoryRow>(
        `${CATEGORY_SELECT}
         WHERE type = ?
         ORDER BY is_default DESC, sort_order, name COLLATE NOCASE`,
        type,
      )
    : await database.getAllAsync<CategoryRow>(
        `${CATEGORY_SELECT}
         ORDER BY type, is_default DESC, sort_order, name COLLATE NOCASE`,
      );
  return rows.map(mapCategory);
}

export async function getCategory(database: SQLiteDatabase, id: number) {
  const row = await database.getFirstAsync<CategoryRow>(
    `${CATEGORY_SELECT} WHERE id = ?`,
    id,
  );
  return row ? mapCategory(row) : null;
}

export async function createCategory(
  database: SQLiteDatabase,
  input: { name: string; type: CategoryType },
) {
  const name = validateCategoryName(input.name);
  let createdId: number | null = null;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await assertUniqueCategoryName(transaction, name, input.type);
    const sortOrderRow = await transaction.getFirstAsync<{
      next_sort_order: number;
    }>(
      `SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_sort_order
       FROM categories
       WHERE type = ?`,
      input.type,
    );
    const timestamp = Date.now();
    const result = await transaction.runAsync(
      `INSERT INTO categories (
        name,
        type,
        icon_key,
        system_key,
        is_default,
        is_fallback,
        sort_order,
        created_at,
        updated_at
      ) VALUES (?, ?, NULL, NULL, 0, 0, ?, ?, ?)`,
      name,
      input.type,
      sortOrderRow?.next_sort_order ?? 0,
      timestamp,
      timestamp,
    );
    createdId = result.lastInsertRowId;
  });

  const category =
    createdId === null ? null : await getCategory(database, createdId);
  if (!category) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      'The category could not be loaded after saving.',
    );
  }
  return category;
}

export async function updateCategory(
  database: SQLiteDatabase,
  id: number,
  input: { name: string },
) {
  const name = validateCategoryName(input.name);

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const category = await requireCategory(transaction, id);
    if (category.is_default === 1) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Default categories cannot be edited.',
      );
    }
    await assertUniqueCategoryName(transaction, name, category.type, id);
    await transaction.runAsync(
      'UPDATE categories SET name = ?, updated_at = ? WHERE id = ?',
      name,
      Date.now(),
      id,
    );
  });

  const category = await getCategory(database, id);
  if (!category) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      'The category could not be loaded after saving.',
    );
  }
  return category;
}

export async function deleteCategory(database: SQLiteDatabase, id: number) {
  let reassignedTransactions = 0;

  await withIntegrityCheckedTransaction(database, async (transaction) => {
    const category = await requireCategory(transaction, id);
    if (category.is_fallback === 1) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'The fallback Other category cannot be deleted.',
      );
    }
    if (category.is_default === 1) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Default categories cannot be deleted.',
      );
    }

    const fallback = await transaction.getFirstAsync<{ id: number }>(
      `SELECT id
       FROM categories
       WHERE type = ? AND is_fallback = 1`,
      category.type,
    );
    if (!fallback) {
      throw createCodedError(
        'DATABASE_WRITE_FAILED',
        'The fallback category is unavailable.',
      );
    }

    const timestamp = Date.now();
    const updateResult = await transaction.runAsync(
      `UPDATE transactions
       SET category_id = ?, updated_at = ?
       WHERE category_id = ?`,
      fallback.id,
      timestamp,
      id,
    );
    reassignedTransactions = updateResult.changes;
    await transaction.runAsync(
      `UPDATE transactions
       SET transfer_fee_category_id = ?, updated_at = ?
       WHERE transfer_fee_category_id = ?`,
      fallback.id,
      timestamp,
      id,
    );
    await transaction.runAsync(
      'DELETE FROM category_budgets WHERE category_id = ?',
      id,
    );
    await transaction.runAsync(
      `DELETE FROM categories
       WHERE id = ? AND is_default = 0 AND is_fallback = 0`,
      id,
    );
  });

  return { reassignedTransactions };
}
