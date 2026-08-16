import type { SQLiteDatabase } from 'expo-sqlite';

export const categoryBudgetsMigration = {
  name: '003_category_budgets',
  version: 3,
  async up(database: SQLiteDatabase) {
    await database.execAsync(`
      CREATE TABLE category_budgets (
        id INTEGER PRIMARY KEY,
        category_id INTEGER NOT NULL UNIQUE REFERENCES categories(id) ON DELETE CASCADE,
        monthly_limit_minor INTEGER NOT NULL CHECK (monthly_limit_minor > 0),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX idx_category_budgets_category ON category_budgets(category_id);
    `);
  },
};
