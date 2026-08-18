import type { SQLiteDatabase } from 'expo-sqlite';

type CategorySeed = {
  name: string;
  type: 'expense' | 'income';
  systemKey: string;
  isFallback?: boolean;
};

type PaymentMethodSeed = {
  name: string;
  systemKey: string;
  isFallback?: boolean;
};

export const defaultCategories: readonly CategorySeed[] = [
  { name: 'Food & Drink', type: 'expense', systemKey: 'expense_food' },
  {
    name: 'Transportation',
    type: 'expense',
    systemKey: 'expense_transportation',
  },
  { name: 'Shopping', type: 'expense', systemKey: 'expense_shopping' },
  { name: 'Bills', type: 'expense', systemKey: 'expense_bills' },
  {
    name: 'Entertainment',
    type: 'expense',
    systemKey: 'expense_entertainment',
  },
  { name: 'Health', type: 'expense', systemKey: 'expense_health' },
  { name: 'Education', type: 'expense', systemKey: 'expense_education' },
  {
    name: 'Subscription',
    type: 'expense',
    systemKey: 'expense_subscription',
  },
  { name: 'Work', type: 'expense', systemKey: 'expense_work' },
  { name: 'Travel', type: 'expense', systemKey: 'expense_travel' },
  {
    name: 'Other',
    type: 'expense',
    systemKey: 'expense_other',
    isFallback: true,
  },
  { name: 'Salary', type: 'income', systemKey: 'income_salary' },
  { name: 'Freelance', type: 'income', systemKey: 'income_freelance' },
  { name: 'Business', type: 'income', systemKey: 'income_business' },
  { name: 'Allowance', type: 'income', systemKey: 'income_allowance' },
  { name: 'Refund', type: 'income', systemKey: 'income_refund' },
  { name: 'Gift', type: 'income', systemKey: 'income_gift' },
  {
    name: 'Other',
    type: 'income',
    systemKey: 'income_other',
    isFallback: true,
  },
];

export const defaultPaymentMethods: readonly PaymentMethodSeed[] = [
  { name: 'Cash', systemKey: 'cash', isFallback: true },
];

const defaultSettings = [
  { key: 'welcome_seen', value: 'false' },
  { key: 'default_currency_code', value: 'IDR' },
  { key: 'language', value: 'id' },
] as const;

type SeedDatabase = Pick<SQLiteDatabase, 'runAsync'>;

export async function seedDefaultsInTransaction(database: SeedDatabase) {
  const timestamp = Date.now();

  for (const [sortOrder, category] of defaultCategories.entries()) {
    await database.runAsync(
      `INSERT OR IGNORE INTO categories (
          name,
          type,
          icon_key,
          system_key,
          is_default,
          is_fallback,
          sort_order,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      category.name,
      category.type,
      null,
      category.systemKey,
      1,
      category.isFallback ? 1 : 0,
      sortOrder,
      timestamp,
      timestamp,
    );
  }

  for (const [sortOrder, paymentMethod] of defaultPaymentMethods.entries()) {
    await database.runAsync(
      `INSERT OR IGNORE INTO payment_methods (
          name,
          system_key,
          is_default,
          is_fallback,
          sort_order,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      paymentMethod.name,
      paymentMethod.systemKey,
      1,
      paymentMethod.isFallback ? 1 : 0,
      sortOrder,
      timestamp,
      timestamp,
    );
  }

  for (const setting of defaultSettings) {
    await database.runAsync(
      `INSERT OR IGNORE INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)`,
      setting.key,
      setting.value,
      timestamp,
    );
  }
}

export async function seedDefaults(database: SQLiteDatabase) {
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await seedDefaultsInTransaction(transaction);
  });
}
