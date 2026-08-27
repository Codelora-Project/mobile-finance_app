import * as SecureStore from 'expo-secure-store';
import { File } from 'expo-file-system';
import {
  backupDatabaseAsync,
  defaultDatabaseDirectory,
  deleteDatabaseAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from 'expo-sqlite';

import { initializeDatabase } from '@/db/database';
import { createBackupPayload } from '@/features/backup/create-backup';
import { restoreBackupData } from '@/features/backup/restore-backup';
import type { BackupStats } from '@/features/backup/backup-types';
import type { AccountScope } from '@/features/auth/auth-types';
import {
  legacyReceiptStorage,
  type ReceiptStorage,
} from '@/features/receipts/receipt-storage';

export const LEGACY_DATABASE_NAME = 'personal-finance.db';
const LEGACY_STATE_KEY = 'finance.legacy-data.v1';
const LEGACY_SNAPSHOT_PREFIX = 'personal-finance-legacy-snapshot';

type LegacyDataState = Readonly<{
  accountId?: string;
  cleanupPending?: boolean;
  status: 'archived' | 'claimed';
  updatedAt: number;
  version: 1;
}>;

export type LegacyDataSummary = BackupStats & {
  receiptFilesCount: number;
};

function legacyDatabaseFile() {
  const databaseDirectoryUri = defaultDatabaseDirectory.startsWith('file:')
    ? defaultDatabaseDirectory
    : `file://${defaultDatabaseDirectory}`;
  return new File(databaseDirectoryUri, LEGACY_DATABASE_NAME);
}

function isLegacyDataState(value: unknown): value is LegacyDataState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<LegacyDataState>;
  return (
    state.version === 1 &&
    (state.status === 'archived' || state.status === 'claimed') &&
    Number.isSafeInteger(state.updatedAt) &&
    (state.accountId === undefined || typeof state.accountId === 'string') &&
    (state.cleanupPending === undefined ||
      typeof state.cleanupPending === 'boolean')
  );
}

export async function readLegacyDataState() {
  const raw = await SecureStore.getItemAsync(LEGACY_STATE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isLegacyDataState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeLegacyDataState(state: LegacyDataState) {
  await SecureStore.setItemAsync(LEGACY_STATE_KEY, JSON.stringify(state));
}

export function legacyDatabaseExists() {
  return legacyDatabaseFile().exists;
}

function createLegacySnapshotName() {
  const uniquePart = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  return `${LEGACY_SNAPSHOT_PREFIX}-${uniquePart}.db`;
}

async function withLegacyDatabaseSnapshot<T>(
  operation: (database: SQLiteDatabase) => Promise<T>,
) {
  if (!legacyDatabaseExists()) {
    throw new Error('Legacy database is no longer available.');
  }
  const snapshotName = createLegacySnapshotName();
  let sourceDatabase: SQLiteDatabase | null = null;
  let snapshotDatabase: SQLiteDatabase | null = null;
  try {
    sourceDatabase = await openDatabaseAsync(LEGACY_DATABASE_NAME, {
      useNewConnection: true,
    });
    snapshotDatabase = await openDatabaseAsync(snapshotName, {
      useNewConnection: true,
    });
    await backupDatabaseAsync({
      destDatabase: snapshotDatabase,
      sourceDatabase,
    });

    await sourceDatabase.closeAsync();
    sourceDatabase = null;

    // The snapshot can be upgraded freely. Receipt maintenance is skipped so
    // inspecting legacy data never moves or deletes files in the source tree.
    await initializeDatabase(snapshotDatabase, undefined, {
      runReceiptMaintenance: false,
    });
    return await operation(snapshotDatabase);
  } finally {
    await sourceDatabase?.closeAsync().catch(() => undefined);
    await snapshotDatabase?.closeAsync().catch(() => undefined);
    await deleteDatabaseAsync(snapshotName).catch(() => undefined);
  }
}

async function readStats(database: SQLiteDatabase): Promise<BackupStats> {
  const [transactions, categories, paymentMethods, goals, claims, budgets] =
    await Promise.all([
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM transactions',
      ),
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM categories',
      ),
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM payment_methods',
      ),
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM savings_goals',
      ),
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM claims',
      ),
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM category_budgets',
      ),
    ]);
  return {
    budgetsCount: budgets?.count ?? 0,
    categoriesCount: categories?.count ?? 0,
    claimsCount: claims?.count ?? 0,
    goalsCount: goals?.count ?? 0,
    paymentMethodsCount: paymentMethods?.count ?? 0,
    transactionsCount: transactions?.count ?? 0,
  };
}

export async function getLegacyDataSummary(): Promise<LegacyDataSummary> {
  return withLegacyDatabaseSnapshot(async (database) => {
    const [stats, receipts] = await Promise.all([
      readStats(database),
      database.getAllAsync<{ storage_key: string }>(
        'SELECT storage_key FROM receipts',
      ),
    ]);
    return {
      ...stats,
      receiptFilesCount: receipts.filter((receipt) =>
        legacyReceiptStorage.exists(receipt.storage_key),
      ).length,
    };
  });
}

export async function archiveLegacyData() {
  await writeLegacyDataState({
    status: 'archived',
    updatedAt: Date.now(),
    version: 1,
  });
}

function statsMatch(expected: BackupStats, actual: BackupStats) {
  return (Object.keys(expected) as (keyof BackupStats)[]).every(
    (key) => expected[key] === actual[key],
  );
}

type LegacyRelationshipStats = Readonly<{
  appSettingsCount: number;
  claimItemsCount: number;
  goalTransactionsCount: number;
  receiptsCount: number;
}>;

async function readRelationshipStats(
  database: SQLiteDatabase,
): Promise<LegacyRelationshipStats> {
  const [appSettings, claimItems, goalTransactions, receipts] =
    await Promise.all([
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM app_settings',
      ),
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM claim_items',
      ),
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM goal_transactions',
      ),
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM receipts',
      ),
    ]);
  return {
    appSettingsCount: appSettings?.count ?? 0,
    claimItemsCount: claimItems?.count ?? 0,
    goalTransactionsCount: goalTransactions?.count ?? 0,
    receiptsCount: receipts?.count ?? 0,
  };
}

async function verifyRestoredLegacyData(
  database: SQLiteDatabase,
  payload: Awaited<ReturnType<typeof createBackupPayload>>,
  receiptStorage: ReceiptStorage,
) {
  const [restoredStats, relationshipStats, receiptRows, foreignKeyViolations] =
    await Promise.all([
      readStats(database),
      readRelationshipStats(database),
      database.getAllAsync<{ storage_key: string }>(
        'SELECT storage_key FROM receipts',
      ),
      database.getAllAsync<{ table: string }>('PRAGMA foreign_key_check'),
    ]);
  const expectedStats: BackupStats = {
    budgetsCount: payload.data.category_budgets.length,
    categoriesCount: payload.data.categories.length,
    claimsCount: payload.data.claims.length,
    goalsCount: payload.data.savings_goals.length,
    paymentMethodsCount: payload.data.payment_methods.length,
    transactionsCount: payload.data.transactions.length,
  };
  const relationshipsMatch =
    relationshipStats.appSettingsCount === payload.data.app_settings.length &&
    relationshipStats.claimItemsCount === payload.data.claim_items.length &&
    relationshipStats.goalTransactionsCount ===
      payload.data.goal_transactions.length &&
    relationshipStats.receiptsCount === payload.data.receipts.length;
  const receiptFilesExist = receiptRows.every((receipt) =>
    receiptStorage.exists(receipt.storage_key),
  );

  if (
    !statsMatch(expectedStats, restoredStats) ||
    !relationshipsMatch ||
    !receiptFilesExist ||
    foreignKeyViolations.length > 0
  ) {
    throw new Error('Legacy data verification failed.');
  }
}

async function removeLegacySource() {
  const failures: unknown[] = [];
  if (legacyDatabaseExists()) {
    await deleteDatabaseAsync(LEGACY_DATABASE_NAME).catch((error) => {
      failures.push(error);
    });
  }
  try {
    legacyReceiptStorage.removeAll();
  } catch (error) {
    failures.push(error);
  }
  if (failures.length > 0) {
    throw new Error('Legacy source cleanup is still pending.');
  }
}

async function finalizeClaimedLegacyCleanup(state: LegacyDataState) {
  try {
    await removeLegacySource();
    await writeLegacyDataState({ ...state, cleanupPending: false });
    return true;
  } catch (error) {
    if (__DEV__) console.warn('Legacy source cleanup deferred.', error);
    return false;
  }
}

export async function retryPendingLegacyCleanup() {
  const state = await readLegacyDataState();
  if (state?.status !== 'claimed' || state.cleanupPending !== true) return;
  await finalizeClaimedLegacyCleanup(state);
}

export async function claimLegacyData({
  accountScope,
  activeDatabase,
  activeReceiptStorage,
}: {
  accountScope: AccountScope;
  activeDatabase: SQLiteDatabase;
  activeReceiptStorage: ReceiptStorage;
}) {
  const rollbackPayload = await createBackupPayload(
    activeDatabase,
    activeReceiptStorage,
  );

  const legacyPayload = await withLegacyDatabaseSnapshot((legacyDatabase) =>
    createBackupPayload(legacyDatabase, legacyReceiptStorage),
  );

  let legacyRestoreCompleted = false;
  try {
    await restoreBackupData(
      activeDatabase,
      legacyPayload,
      activeReceiptStorage,
    );
    legacyRestoreCompleted = true;
    await verifyRestoredLegacyData(
      activeDatabase,
      legacyPayload,
      activeReceiptStorage,
    );
    await writeLegacyDataState({
      accountId: accountScope.accountId,
      cleanupPending: true,
      status: 'claimed',
      updatedAt: Date.now(),
      version: 1,
    });
  } catch (error) {
    if (legacyRestoreCompleted) {
      await restoreBackupData(
        activeDatabase,
        rollbackPayload,
        activeReceiptStorage,
      ).catch(() => undefined);
    }
    throw error;
  }

  await finalizeClaimedLegacyCleanup({
    accountId: accountScope.accountId,
    cleanupPending: true,
    status: 'claimed',
    updatedAt: Date.now(),
    version: 1,
  });
}
