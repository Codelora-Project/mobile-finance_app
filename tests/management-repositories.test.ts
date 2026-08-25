import { describe, expect, it } from '@jest/globals';
import type {
  SQLiteBindValue,
  SQLiteDatabase,
  SQLiteRunResult,
} from 'expo-sqlite';

import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/features/categories/category-repository';
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethod,
  updatePaymentMethod,
} from '@/features/payment-methods/payment-method-repository';

type CategoryRow = {
  id: number;
  name: string;
  type: 'expense' | 'income';
  icon_key: string | null;
  system_key: string | null;
  is_default: number;
  is_fallback: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
};

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

class ManagementDatabase {
  readonly categories: CategoryRow[] = [
    {
      id: 1,
      name: 'Travel',
      type: 'expense',
      icon_key: null,
      system_key: 'expense_travel',
      is_default: 1,
      is_fallback: 0,
      sort_order: 0,
      created_at: 1,
      updated_at: 1,
    },
    {
      id: 2,
      name: 'Other',
      type: 'expense',
      icon_key: null,
      system_key: 'expense_other',
      is_default: 1,
      is_fallback: 1,
      sort_order: 1,
      created_at: 1,
      updated_at: 1,
    },
    {
      id: 3,
      name: 'Salary',
      type: 'income',
      icon_key: null,
      system_key: 'income_salary',
      is_default: 1,
      is_fallback: 0,
      sort_order: 0,
      created_at: 1,
      updated_at: 1,
    },
    {
      id: 4,
      name: 'Other',
      type: 'income',
      icon_key: null,
      system_key: 'income_other',
      is_default: 1,
      is_fallback: 1,
      sort_order: 1,
      created_at: 1,
      updated_at: 1,
    },
  ];

  readonly paymentMethods: PaymentMethodRow[] = [
    {
      id: 10,
      name: 'Cash',
      system_key: 'cash',
      is_default: 1,
      is_fallback: 0,
      sort_order: 0,
      created_at: 1,
      updated_at: 1,
    },
    {
      id: 11,
      name: 'Other',
      system_key: 'other',
      is_default: 1,
      is_fallback: 1,
      sort_order: 1,
      created_at: 1,
      updated_at: 1,
    },
  ];

  readonly transactions: Array<{
    id: number;
    categoryId: number;
    paymentMethodId: number | null;
    transferFeeCategoryId: number | null;
    updatedAt: number;
  }> = [];
  readonly categoryBudgets = new Set<number>();

  private nextCategoryId = 20;
  private nextPaymentMethodId = 30;

  asSQLiteDatabase() {
    return this as unknown as SQLiteDatabase;
  }

  async withExclusiveTransactionAsync(
    task: (transaction: SQLiteDatabase) => Promise<void>,
  ) {
    await task(this.asSQLiteDatabase());
  }

  async getAllAsync<T>(source: string, ...params: SQLiteBindValue[]) {
    const sql = this.normalizeSql(source);

    if (sql === 'SELECT id, name FROM categories WHERE type = ?') {
      return this.categories
        .filter((category) => category.type === params[0])
        .map(({ id, name }) => ({ id, name })) as T[];
    }

    if (sql === 'PRAGMA foreign_key_check') {
      return [] as T[];
    }

    if (sql === 'SELECT id, name FROM payment_methods') {
      return this.paymentMethods.map(({ id, name }) => ({ id, name })) as T[];
    }

    if (sql.includes('FROM categories') && sql.includes('ORDER BY')) {
      const categories = sql.includes('WHERE type = ?')
        ? this.categories.filter((category) => category.type === params[0])
        : this.categories;
      return [...categories].sort((left, right) => {
        if (left.type !== right.type) {
          return left.type.localeCompare(right.type);
        }
        if (left.is_default !== right.is_default) {
          return right.is_default - left.is_default;
        }
        return left.sort_order - right.sort_order;
      }) as T[];
    }

    if (sql.includes('FROM payment_methods') && sql.includes('ORDER BY')) {
      return [...this.paymentMethods].sort(
        (left, right) =>
          right.is_default - left.is_default ||
          left.sort_order - right.sort_order,
      ) as T[];
    }

    throw new Error(`Unsupported getAllAsync SQL: ${sql}`);
  }

  async getFirstAsync<T>(source: string, ...params: SQLiteBindValue[]) {
    const sql = this.normalizeSql(source);
    let row: unknown = null;

    if (sql.includes('MAX(sort_order)') && sql.includes('FROM categories')) {
      const sortOrders = this.categories
        .filter((category) => category.type === params[0])
        .map((category) => category.sort_order);
      row = {
        next_sort_order:
          sortOrders.length === 0 ? 0 : Math.max(...sortOrders) + 1,
      };
    } else if (
      sql.includes('SELECT id, type, is_default, is_fallback') &&
      sql.includes('FROM categories')
    ) {
      const category = this.categories.find(
        (candidate) => candidate.id === params[0],
      );
      row = category
        ? {
            id: category.id,
            is_default: category.is_default,
            is_fallback: category.is_fallback,
            type: category.type,
          }
        : null;
    } else if (
      sql.includes('FROM categories') &&
      sql.includes('is_fallback = 1')
    ) {
      const category = this.categories.find(
        (candidate) =>
          candidate.type === params[0] && candidate.is_fallback === 1,
      );
      row = category ? { id: category.id } : null;
    } else if (
      sql.includes('FROM categories') &&
      sql.includes('WHERE id = ?')
    ) {
      row =
        this.categories.find((category) => category.id === params[0]) ?? null;
    } else if (
      sql.includes('MAX(sort_order)') &&
      sql.includes('FROM payment_methods')
    ) {
      row = {
        next_sort_order:
          Math.max(...this.paymentMethods.map((method) => method.sort_order)) +
          1,
      };
    } else if (
      sql.includes('SELECT id, is_default, is_fallback') &&
      sql.includes('FROM payment_methods')
    ) {
      const method = this.paymentMethods.find(
        (candidate) => candidate.id === params[0],
      );
      row = method
        ? {
            id: method.id,
            is_default: method.is_default,
            is_fallback: method.is_fallback,
          }
        : null;
    } else if (
      sql.includes('FROM payment_methods') &&
      sql.includes('is_fallback = 1')
    ) {
      const method = this.paymentMethods.find(
        (candidate) => candidate.is_fallback === 1,
      );
      row = method ? { id: method.id } : null;
    } else if (
      sql.includes('FROM payment_methods') &&
      sql.includes('WHERE id = ?')
    ) {
      row =
        this.paymentMethods.find((method) => method.id === params[0]) ?? null;
    } else {
      throw new Error(`Unsupported getFirstAsync SQL: ${sql}`);
    }

    return row as T | null;
  }

  async runAsync(
    source: string,
    ...params: SQLiteBindValue[]
  ): Promise<SQLiteRunResult> {
    const sql = this.normalizeSql(source);

    if (sql.startsWith('INSERT INTO categories')) {
      const id = this.nextCategoryId++;
      this.categories.push({
        id,
        name: String(params[0]),
        type: params[1] as 'expense' | 'income',
        icon_key: null,
        system_key: null,
        is_default: 0,
        is_fallback: 0,
        sort_order: Number(params[2]),
        created_at: Number(params[3]),
        updated_at: Number(params[4]),
      });
      return { changes: 1, lastInsertRowId: id };
    }

    if (sql.startsWith('UPDATE categories SET name')) {
      const category = this.categories.find(
        (candidate) => candidate.id === params[2],
      );
      if (category) {
        category.name = String(params[0]);
        category.updated_at = Number(params[1]);
      }
      return { changes: category ? 1 : 0, lastInsertRowId: 0 };
    }

    if (sql.startsWith('UPDATE transactions SET category_id')) {
      let changes = 0;
      for (const transaction of this.transactions) {
        if (transaction.categoryId === params[2]) {
          transaction.categoryId = Number(params[0]);
          transaction.updatedAt = Number(params[1]);
          changes += 1;
        }
      }
      return { changes, lastInsertRowId: 0 };
    }

    if (sql.startsWith('UPDATE transactions SET transfer_fee_category_id')) {
      let changes = 0;
      for (const transaction of this.transactions) {
        if (transaction.transferFeeCategoryId === params[2]) {
          transaction.transferFeeCategoryId = Number(params[0]);
          transaction.updatedAt = Number(params[1]);
          changes += 1;
        }
      }
      return { changes, lastInsertRowId: 0 };
    }

    if (sql === 'DELETE FROM category_budgets WHERE category_id = ?') {
      const existed = this.categoryBudgets.delete(Number(params[0]));
      return { changes: existed ? 1 : 0, lastInsertRowId: 0 };
    }

    if (sql.startsWith('DELETE FROM categories')) {
      const index = this.categories.findIndex(
        (category) =>
          category.id === params[0] &&
          category.is_default === 0 &&
          category.is_fallback === 0,
      );
      if (index >= 0) {
        this.categories.splice(index, 1);
      }
      return { changes: index >= 0 ? 1 : 0, lastInsertRowId: 0 };
    }

    if (sql.startsWith('INSERT INTO payment_methods')) {
      const id = this.nextPaymentMethodId++;
      this.paymentMethods.push({
        id,
        name: String(params[0]),
        system_key: null,
        is_default: 0,
        is_fallback: 0,
        sort_order: Number(params[1]),
        created_at: Number(params[2]),
        updated_at: Number(params[3]),
      });
      return { changes: 1, lastInsertRowId: id };
    }

    if (sql.startsWith('UPDATE payment_methods SET name')) {
      const method = this.paymentMethods.find(
        (candidate) => candidate.id === params[2],
      );
      if (method) {
        method.name = String(params[0]);
        method.updated_at = Number(params[1]);
      }
      return { changes: method ? 1 : 0, lastInsertRowId: 0 };
    }

    if (sql.startsWith('UPDATE transactions SET payment_method_id')) {
      let changes = 0;
      for (const transaction of this.transactions) {
        if (transaction.paymentMethodId === params[2]) {
          transaction.paymentMethodId = Number(params[0]);
          transaction.updatedAt = Number(params[1]);
          changes += 1;
        }
      }
      return { changes, lastInsertRowId: 0 };
    }

    if (sql.startsWith('DELETE FROM payment_methods')) {
      const index = this.paymentMethods.findIndex(
        (method) =>
          method.id === params[0] &&
          method.is_default === 0 &&
          method.is_fallback === 0,
      );
      if (index >= 0) {
        this.paymentMethods.splice(index, 1);
      }
      return { changes: index >= 0 ? 1 : 0, lastInsertRowId: 0 };
    }

    throw new Error(`Unsupported runAsync SQL: ${sql}`);
  }

  private normalizeSql(source: string) {
    return source.replace(/\s+/g, ' ').trim();
  }
}

describe('category management repository', () => {
  it('adds and edits a normalized custom category', async () => {
    const database = new ManagementDatabase();

    const category = await createCategory(database.asSQLiteDatabase(), {
      name: '  Pet   Care  ',
      type: 'expense',
    });

    expect(category).toMatchObject({
      isDefault: false,
      isFallback: false,
      name: 'Pet Care',
      type: 'expense',
    });

    await expect(
      updateCategory(database.asSQLiteDatabase(), category.id, {
        name: 'Pet supplies',
      }),
    ).resolves.toMatchObject({ name: 'Pet supplies', type: 'expense' });
  });

  it('rejects duplicates within a type but keeps types separate', async () => {
    const database = new ManagementDatabase();

    await expect(
      createCategory(database.asSQLiteDatabase(), {
        name: 'travel',
        type: 'expense',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });

    await expect(
      createCategory(database.asSQLiteDatabase(), {
        name: 'travel',
        type: 'income',
      }),
    ).resolves.toMatchObject({ name: 'travel', type: 'income' });

    const incomeCategories = await listCategories(
      database.asSQLiteDatabase(),
      'income',
    );
    expect(
      incomeCategories.every((category) => category.type === 'income'),
    ).toBe(true);
  });

  it('protects fallback and default categories', async () => {
    const database = new ManagementDatabase();

    await expect(
      deleteCategory(database.asSQLiteDatabase(), 2),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'The fallback Other category cannot be deleted.',
    });
    await expect(
      deleteCategory(database.asSQLiteDatabase(), 1),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('reassigns transactions to the type fallback before deleting', async () => {
    const database = new ManagementDatabase();
    const category = await createCategory(database.asSQLiteDatabase(), {
      name: 'Parking',
      type: 'expense',
    });
    database.transactions.push({
      categoryId: category.id,
      id: 100,
      paymentMethodId: null,
      transferFeeCategoryId: category.id,
      updatedAt: 1,
    });
    database.categoryBudgets.add(category.id);

    await expect(
      deleteCategory(database.asSQLiteDatabase(), category.id),
    ).resolves.toEqual({ reassignedTransactions: 1 });

    expect(database.transactions[0]?.categoryId).toBe(2);
    expect(database.transactions[0]?.transferFeeCategoryId).toBe(2);
    expect(database.categoryBudgets.has(category.id)).toBe(false);
    expect(
      database.categories.some((candidate) => candidate.id === category.id),
    ).toBe(false);
  });
});

describe('payment method management repository', () => {
  it('adds, renames, and deletes a custom method with reassignment', async () => {
    const database = new ManagementDatabase();
    const created = await createPaymentMethod(database.asSQLiteDatabase(), {
      name: '  Company   Card  ',
    });

    await expect(
      updatePaymentMethod(database.asSQLiteDatabase(), created.id, {
        name: 'Work Card',
      }),
    ).resolves.toMatchObject({ name: 'Work Card' });

    database.transactions.push({
      categoryId: 1,
      id: 101,
      paymentMethodId: created.id,
      transferFeeCategoryId: null,
      updatedAt: 1,
    });
    await expect(
      deletePaymentMethod(database.asSQLiteDatabase(), created.id),
    ).resolves.toEqual({ reassignedTransactions: 1 });

    expect(database.transactions[0]?.paymentMethodId).toBe(11);
    await expect(
      getPaymentMethod(database.asSQLiteDatabase(), created.id),
    ).resolves.toBeNull();
  });

  it('keeps every default method protected', async () => {
    const database = new ManagementDatabase();

    await expect(
      createPaymentMethod(database.asSQLiteDatabase(), { name: 'cash' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(
      updatePaymentMethod(database.asSQLiteDatabase(), 10, { name: 'Notes' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(
      deletePaymentMethod(database.asSQLiteDatabase(), 10),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(
      deletePaymentMethod(database.asSQLiteDatabase(), 11),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
