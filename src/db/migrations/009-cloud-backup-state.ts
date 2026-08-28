import type { SQLiteDatabase } from 'expo-sqlite';

const trackedTables = [
  'categories',
  'payment_methods',
  'transactions',
  'receipts',
  'claims',
  'claim_items',
  'app_settings',
  'savings_goals',
  'goal_transactions',
  'category_budgets',
] as const;

function createRevisionTriggers() {
  return trackedTables
    .flatMap((table) =>
      ['insert', 'update', 'delete'].map(
        (operation) => `
          CREATE TRIGGER cloud_backup_revision_${table}_${operation}
          AFTER ${operation.toUpperCase()} ON ${table}
          FOR EACH ROW
          BEGIN
            UPDATE cloud_backup_state
            SET revision = revision + 1
            WHERE id = 1;
          END;
        `,
      ),
    )
    .join('\n');
}

export const cloudBackupStateMigration = {
  name: '009_cloud_backup_state',
  version: 9,
  async up(database: SQLiteDatabase) {
    await database.execAsync(`
      CREATE TABLE cloud_backup_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
        revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
        last_backed_up_revision INTEGER NOT NULL DEFAULT 0
          CHECK (last_backed_up_revision >= 0),
        last_backup_at INTEGER,
        last_backup_file_id TEXT,
        last_backup_size_bytes INTEGER,
        last_transaction_count INTEGER,
        last_error TEXT,
        restore_prompt_dismissed INTEGER NOT NULL DEFAULT 0
          CHECK (restore_prompt_dismissed IN (0, 1))
      );

      INSERT INTO cloud_backup_state (id) VALUES (1);

      ${createRevisionTriggers()}
    `);
  },
} as const;
