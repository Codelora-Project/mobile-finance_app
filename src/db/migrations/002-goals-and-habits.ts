import type { SQLiteDatabase } from 'expo-sqlite';

export const goalsAndHabitsMigration = {
  name: '002_goals_and_habits',
  version: 2,
  async up(database: SQLiteDatabase) {
    await database.execAsync(`
      CREATE TABLE savings_goals (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE,
        target_amount_minor INTEGER NOT NULL CHECK (target_amount_minor > 0),
        current_amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (current_amount_minor >= 0),
        icon_key TEXT NOT NULL DEFAULT 'target',
        color_key TEXT NOT NULL DEFAULT '#3B82F6',
        target_date TEXT,
        is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE goal_transactions (
        id INTEGER PRIMARY KEY,
        goal_id INTEGER NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
        amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        note TEXT,
        occurred_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX idx_goal_transactions_goal ON goal_transactions(goal_id, occurred_at);
    `);
  },
};
