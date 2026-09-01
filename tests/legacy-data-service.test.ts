import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  archiveLegacyData,
  claimLegacyData,
  getLegacyDataSummary,
  LEGACY_DATABASE_NAME,
  legacyDatabaseExists,
} from '@/features/auth/legacy-data-service';
import type { BackupPayload } from '@/features/backup/backup-types';
import type { ReceiptStorage } from '@/features/receipts/receipt-storage';

const mockSecureSet = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockDeleteDatabase = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockOpenDatabase = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockBackupDatabase = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockInitializeDatabase = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockCreateBackupPayload =
  jest.fn<(...args: unknown[]) => Promise<BackupPayload>>();
const mockRestoreBackupData =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockLegacyRemoveAll = jest.fn<() => void>();
let mockLegacyFileExists = true;
const mockFileConstructorArguments: unknown[][] = [];

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: (...args: unknown[]) => mockSecureSet(...args),
}));
jest.mock('expo-file-system', () => ({
  Directory: class MockDirectory {
    exists = false;
    delete = jest.fn();
  },
  File: class MockFile {
    constructor(...arguments_: unknown[]) {
      mockFileConstructorArguments.push(arguments_);
    }

    get exists() {
      return mockLegacyFileExists;
    }
  },
  Paths: { document: 'file:///documents' },
}));
jest.mock('expo-sqlite', () => ({
  defaultDatabaseDirectory: '/data/user/0/com.codelora.keuanganku/files/SQLite',
  deleteDatabaseAsync: (...args: unknown[]) => mockDeleteDatabase(...args),
  openDatabaseAsync: (...args: unknown[]) => mockOpenDatabase(...args),
  backupDatabaseAsync: (...args: unknown[]) => mockBackupDatabase(...args),
}));
jest.mock('@/db/database', () => ({
  initializeDatabase: (...args: unknown[]) => mockInitializeDatabase(...args),
}));
jest.mock('@/features/backup/create-backup', () => ({
  createBackupPayload: (...args: unknown[]) => mockCreateBackupPayload(...args),
}));
jest.mock('@/features/backup/restore-backup', () => ({
  restoreBackupData: (...args: unknown[]) => mockRestoreBackupData(...args),
}));
jest.mock('@/features/receipts/receipt-storage', () => ({
  legacyReceiptStorage: {
    exists: jest.fn(() => true),
    removeAll: () => mockLegacyRemoveAll(),
  },
}));

const payload: BackupPayload = {
  app_identifier: 'personal_finance_app',
  app_version: '1.0.0',
  data: {
    app_settings: [],
    categories: [],
    category_budgets: [],
    claim_items: [],
    claims: [],
    goal_transactions: [],
    payment_methods: [],
    receipts: [],
    savings_goals: [],
    transactions: [],
  },
  exported_at: '2026-08-26T00:00:00.000Z',
  summary: {
    budgets_count: 0,
    categories_count: 0,
    claims_count: 0,
    goals_count: 0,
    payment_methods_count: 0,
    transactions_count: 0,
  },
  version: 2,
};

function emptyActiveDatabase() {
  return {
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => ({ count: 0 })),
  } as unknown as SQLiteDatabase;
}

const accountScope = {
  accountId: 'google-user-1',
  databaseName: 'keuanganku-google-user-1.db',
  receiptDirectory: 'accounts/google-user-1/receipts',
};

describe('legacy data migration', () => {
  const sourceCloseAsync = jest.fn<() => Promise<void>>();
  const snapshotCloseAsync = jest.fn<() => Promise<void>>();
  const sourceDatabase = { closeAsync: sourceCloseAsync };
  const snapshotDatabase = {
    closeAsync: snapshotCloseAsync,
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => ({ count: 0 })),
  };
  const accountStorage = {
    exists: jest.fn(() => true),
    removeAll: jest.fn(),
  } as unknown as ReceiptStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenDatabase.mockReset();
    mockDeleteDatabase.mockReset();
    mockSecureSet.mockReset();
    mockFileConstructorArguments.length = 0;
    mockLegacyFileExists = true;
    sourceCloseAsync.mockResolvedValue(undefined);
    snapshotCloseAsync.mockResolvedValue(undefined);
    mockOpenDatabase
      .mockResolvedValueOnce(sourceDatabase)
      .mockResolvedValueOnce(snapshotDatabase);
    mockBackupDatabase.mockResolvedValue(undefined);
    mockInitializeDatabase.mockResolvedValue(undefined);
    mockCreateBackupPayload.mockResolvedValue(payload);
    mockRestoreBackupData.mockResolvedValue({ stats: payload.summary });
    mockDeleteDatabase.mockResolvedValue(undefined);
    mockSecureSet.mockResolvedValue(undefined);
  });

  it('converts the raw SQLite directory to an absolute file URI', () => {
    expect(legacyDatabaseExists()).toBe(true);
    expect(mockFileConstructorArguments).toEqual([
      [
        'file:///data/user/0/com.codelora.keuanganku/files/SQLite',
        LEGACY_DATABASE_NAME,
      ],
    ]);
  });

  it('records an archive choice without deleting the legacy source', async () => {
    await archiveLegacyData();

    expect(mockSecureSet).toHaveBeenCalledWith(
      'finance.legacy-data.v1',
      expect.stringContaining('"status":"archived"'),
    );
    expect(mockDeleteDatabase).not.toHaveBeenCalled();
  });

  it('inspects a migrated snapshot without initializing the legacy source', async () => {
    await getLegacyDataSummary();

    expect(mockBackupDatabase).toHaveBeenCalledWith({
      destDatabase: snapshotDatabase,
      sourceDatabase,
    });
    expect(mockInitializeDatabase).toHaveBeenCalledWith(
      snapshotDatabase,
      undefined,
      { runReceiptMaintenance: false },
    );
    expect(mockInitializeDatabase).not.toHaveBeenCalledWith(
      sourceDatabase,
      expect.anything(),
      expect.anything(),
    );
    expect(mockDeleteDatabase).not.toHaveBeenCalledWith(LEGACY_DATABASE_NAME);
  });

  it('deletes legacy files only after restore and verification succeed', async () => {
    const activeDatabase = emptyActiveDatabase();

    await claimLegacyData({
      accountScope,
      activeDatabase,
      activeReceiptStorage: accountStorage,
    });

    expect(mockRestoreBackupData).toHaveBeenCalledWith(
      activeDatabase,
      payload,
      accountStorage,
    );
    expect(mockSecureSet).toHaveBeenCalledWith(
      'finance.legacy-data.v1',
      expect.stringContaining('"status":"claimed"'),
    );
    expect(mockDeleteDatabase).toHaveBeenCalledWith(LEGACY_DATABASE_NAME);
  });

  it('keeps the archive when restore fails', async () => {
    mockRestoreBackupData.mockRejectedValueOnce(new Error('restore failed'));

    await expect(
      claimLegacyData({
        accountScope,
        activeDatabase: emptyActiveDatabase(),
        activeReceiptStorage: accountStorage,
      }),
    ).rejects.toThrow('restore failed');

    expect(mockDeleteDatabase).not.toHaveBeenCalledWith(LEGACY_DATABASE_NAME);
    expect(mockSecureSet).not.toHaveBeenCalledWith(
      'finance.legacy-data.v1',
      expect.stringContaining('"status":"claimed"'),
    );
  });

  it('rolls back the active account when claimed state cannot be persisted', async () => {
    mockSecureSet.mockRejectedValueOnce(new Error('secure store unavailable'));

    await expect(
      claimLegacyData({
        accountScope,
        activeDatabase: emptyActiveDatabase(),
        activeReceiptStorage: accountStorage,
      }),
    ).rejects.toThrow('secure store unavailable');

    expect(mockRestoreBackupData).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      payload,
      accountStorage,
    );
    expect(mockRestoreBackupData).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      payload,
      accountStorage,
    );
    expect(mockDeleteDatabase).not.toHaveBeenCalledWith(LEGACY_DATABASE_NAME);
  });

  it('keeps a successful claim when source cleanup must be retried', async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    mockDeleteDatabase.mockImplementation(async (databaseName) => {
      if (databaseName === LEGACY_DATABASE_NAME) {
        throw new Error('database is busy');
      }
    });

    await expect(
      claimLegacyData({
        accountScope,
        activeDatabase: emptyActiveDatabase(),
        activeReceiptStorage: accountStorage,
      }),
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(
      'Legacy source cleanup deferred.',
      expect.any(Error),
    );
    warn.mockRestore();
    expect(mockRestoreBackupData).toHaveBeenCalledTimes(1);
    expect(mockSecureSet).toHaveBeenCalledWith(
      'finance.legacy-data.v1',
      expect.stringContaining('"cleanupPending":true'),
    );
    expect(mockSecureSet).not.toHaveBeenCalledWith(
      'finance.legacy-data.v1',
      expect.stringContaining('"cleanupPending":false'),
    );
    expect(mockLegacyRemoveAll).toHaveBeenCalledTimes(1);
  });
});
