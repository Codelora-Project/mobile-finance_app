import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDatabase } from '@/db/migrations';
import { seedDefaults } from '@/db/seeds';
import { maintainReceiptStorage } from '@/features/receipts/receipt-maintenance';

export const databaseName = 'personal-finance.db';

type ForeignKeysRow = {
  foreign_keys: number;
};

type JournalModeRow = {
  journal_mode: string;
};

export async function initializeDatabase(database: SQLiteDatabase) {
  await database.execAsync('PRAGMA foreign_keys = ON');
  await database.execAsync('PRAGMA busy_timeout = 3000');
  await database.execAsync('PRAGMA journal_mode = WAL');
  await database.execAsync('PRAGMA synchronous = NORMAL');
  await database.execAsync('PRAGMA cache_size = -2000');
  await database.execAsync('PRAGMA temp_store = MEMORY');

  const foreignKeys = await database.getFirstAsync<ForeignKeysRow>(
    'PRAGMA foreign_keys',
  );
  if (foreignKeys?.foreign_keys !== 1) {
    throw new Error('SQLite foreign key enforcement could not be enabled.');
  }

  const journalMode = await database.getFirstAsync<JournalModeRow>(
    'PRAGMA journal_mode',
  );
  if (journalMode?.journal_mode.toLowerCase() !== 'wal') {
    throw new Error('SQLite WAL journal mode could not be enabled.');
  }

  await migrateDatabase(database);
  await seedDefaults(database);
  await maintainReceiptStorage(database);
}
