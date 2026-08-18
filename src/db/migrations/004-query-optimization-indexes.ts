import type { SQLiteDatabase } from 'expo-sqlite';

export const queryOptimizationIndexesMigration = {
  name: '004_query_optimization_indexes',
  version: 4,
  async up(database: SQLiteDatabase) {
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at
        ON transactions(occurred_at DESC, id DESC);

      CREATE INDEX IF NOT EXISTS idx_transactions_type_occurred
        ON transactions(type, occurred_at DESC, id DESC);

      CREATE INDEX IF NOT EXISTS idx_transactions_category_occurred
        ON transactions(category_id, occurred_at DESC, id DESC);

      CREATE INDEX IF NOT EXISTS idx_transactions_counterparty
        ON transactions(counterparty COLLATE NOCASE);

      CREATE INDEX IF NOT EXISTS idx_savings_goals_completed_updated
        ON savings_goals(is_completed, updated_at DESC);
    `);
  },
};
