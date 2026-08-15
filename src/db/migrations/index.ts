import type { SQLiteDatabase } from 'expo-sqlite';

import { initialMigration } from '@/db/migrations/001-initial';

const migrations = [initialMigration] as const;

export const latestDatabaseVersion = migrations.at(-1)?.version ?? 0;

type UserVersionRow = {
  user_version: number;
};

export async function migrateDatabase(database: SQLiteDatabase) {
  const versionRow = await database.getFirstAsync<UserVersionRow>(
    'PRAGMA user_version',
  );
  let currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > latestDatabaseVersion) {
    throw new Error(
      `Database version ${currentVersion} is newer than supported version ${latestDatabaseVersion}.`,
    );
  }

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    if (migration.version !== currentVersion + 1) {
      throw new Error(
        `Missing database migration after version ${currentVersion}.`,
      );
    }

    await database.withExclusiveTransactionAsync(async (transaction) => {
      await migration.up(transaction);
      await transaction.execAsync(`PRAGMA user_version = ${migration.version}`);
    });

    currentVersion = migration.version;
  }
}
