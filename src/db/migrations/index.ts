import type { SQLiteDatabase } from 'expo-sqlite';

import { initialMigration } from '@/db/migrations/001-initial';
import { goalsAndHabitsMigration } from '@/db/migrations/002-goals-and-habits';
import { categoryBudgetsMigration } from '@/db/migrations/003-category-budgets';
import { queryOptimizationIndexesMigration } from '@/db/migrations/004-query-optimization-indexes';
import { multiWalletsAndTransfersMigration } from '@/db/migrations/005-multi-wallets-and-transfers';
import { cleanUnusedDefaultWalletsMigration } from '@/db/migrations/006-clean-unused-default-wallets';

const migrations = [
  initialMigration,
  goalsAndHabitsMigration,
  categoryBudgetsMigration,
  queryOptimizationIndexesMigration,
  multiWalletsAndTransfersMigration,
  cleanUnusedDefaultWalletsMigration,
] as const;

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
