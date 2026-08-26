import type { SQLiteDatabase } from 'expo-sqlite';

import { createCodedError, isCodedError } from '@/lib/errors';

const databaseWriteTails = new WeakMap<SQLiteDatabase, Promise<void>>();

function isSQLiteBusyError(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  if (code === 5 || code === 6 || code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED') {
    return true;
  }

  const message = 'message' in error ? String(error.message) : String(error);
  return /SQLITE_(?:BUSY|LOCKED)|database(?: table)? is locked/i.test(message);
}

function mapDatabaseWriteError(error: unknown) {
  if (isCodedError(error) || !isSQLiteBusyError(error)) {
    return error;
  }

  return createCodedError(
    'DATABASE_BUSY',
    'The database is busy or locked by another write.',
  );
}

/**
 * Serializes runtime writes per SQLite database connection.
 *
 * A rejected task is converted to a settled queue tail so the next task can
 * still run. Separate database objects intentionally use separate queues.
 */
export async function runSerializedDatabaseWrite<T>(
  database: SQLiteDatabase,
  task: () => Promise<T>,
): Promise<T> {
  const previousTail = databaseWriteTails.get(database) ?? Promise.resolve();
  const operation = previousTail.then(task);
  const settledTail = operation.then(
    () => undefined,
    () => undefined,
  );
  databaseWriteTails.set(database, settledTail);

  try {
    return await operation;
  } catch (error) {
    throw mapDatabaseWriteError(error);
  } finally {
    if (databaseWriteTails.get(database) === settledTail) {
      databaseWriteTails.delete(database);
    }
  }
}
