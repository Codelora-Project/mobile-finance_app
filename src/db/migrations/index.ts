import type { SQLiteDatabase } from 'expo-sqlite';

import { initialMigration } from '@/db/migrations/001-initial';
import { goalsAndHabitsMigration } from '@/db/migrations/002-goals-and-habits';
import { categoryBudgetsMigration } from '@/db/migrations/003-category-budgets';
import { queryOptimizationIndexesMigration } from '@/db/migrations/004-query-optimization-indexes';
import { multiWalletsAndTransfersMigration } from '@/db/migrations/005-multi-wallets-and-transfers';
import { cleanUnusedDefaultWalletsMigration } from '@/db/migrations/006-clean-unused-default-wallets';
import { normalizeWalletTransferCategoryMigration } from '@/db/migrations/007-normalize-wallet-transfer-category';
import { enforceTransactionShapeMigration } from '@/db/migrations/008-enforce-transaction-shape';

const migrations = [
  initialMigration,
  goalsAndHabitsMigration,
  categoryBudgetsMigration,
  queryOptimizationIndexesMigration,
  multiWalletsAndTransfersMigration,
  cleanUnusedDefaultWalletsMigration,
  normalizeWalletTransferCategoryMigration,
  enforceTransactionShapeMigration,
] as const;

export const latestDatabaseVersion = migrations.at(-1)?.version ?? 0;

type UserVersionRow = {
  user_version: number;
};

type ForeignKeysRow = {
  foreign_keys: number;
};

type ForeignKeyViolation = {
  fkid: number;
  parent: string;
  rowid: number | null;
  table: string;
};

async function setForeignKeys(database: SQLiteDatabase, enabled: boolean) {
  await database.execAsync(`PRAGMA foreign_keys = ${enabled ? 'ON' : 'OFF'}`);
  const row = await database.getFirstAsync<ForeignKeysRow>(
    'PRAGMA foreign_keys',
  );
  if (row?.foreign_keys !== (enabled ? 1 : 0)) {
    throw new Error(
      `SQLite foreign keys could not be ${enabled ? 'enabled' : 'disabled'} for a database migration.`,
    );
  }
}

async function assertForeignKeyIntegrity(database: SQLiteDatabase) {
  const violations = await database.getAllAsync<ForeignKeyViolation>(
    'PRAGMA foreign_key_check',
  );
  const violation = violations[0];
  if (violation) {
    throw new Error(
      `Database migration created an invalid ${violation.table} reference to ${violation.parent}.`,
    );
  }
}

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

    const requiresForeignKeysDisabled =
      'requiresForeignKeysDisabled' in migration &&
      migration.requiresForeignKeysDisabled === true;

    if (requiresForeignKeysDisabled) {
      await setForeignKeys(database, false);
    }

    try {
      await database.withTransactionAsync(async () => {
        await migration.up(database);
        if (requiresForeignKeysDisabled) {
          await assertForeignKeyIntegrity(database);
        }
        await database.execAsync(`PRAGMA user_version = ${migration.version}`);
      });
    } finally {
      if (requiresForeignKeysDisabled) {
        await setForeignKeys(database, true);
      }
    }

    currentVersion = migration.version;
  }
}
