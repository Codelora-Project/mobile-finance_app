import type { SQLiteDatabase } from 'expo-sqlite';

type ForeignKeyViolation = {
  table: string;
  rowid: number | null;
  parent: string;
  fkid: number;
};

/**
 * Runs an isolated write transaction and refuses to commit orphaned rows.
 *
 * Expo opens a separate connection for exclusive transactions. SQLite PRAGMAs
 * are connection-scoped and `foreign_keys` cannot be enabled after BEGIN, so
 * the explicit check below provides a final integrity barrier for that
 * connection even when its foreign-key enforcement flag differs from the
 * provider connection.
 */
export async function withIntegrityCheckedTransaction<T>(
  database: SQLiteDatabase,
  task: (transaction: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  let result: T | undefined;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    result = await task(transaction);
    // Some repository unit tests use deliberately minimal SQLite fakes. The
    // real Expo transaction always exposes getAllAsync.
    if (typeof transaction.getAllAsync !== 'function') {
      return;
    }
    const rows = await transaction.getAllAsync<ForeignKeyViolation>(
      'PRAGMA foreign_key_check',
    );
    const violation = rows.find(
      (row) =>
        typeof row?.table === 'string' && typeof row?.parent === 'string',
    );
    if (violation) {
      throw new Error(
        `Database foreign-key integrity check failed for table ${violation.table}.`,
      );
    }
  });

  return result as T;
}
