import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createCloudBackup,
  downloadLatestCloudBackup,
  queryLatestCloudBackup,
  shouldRunAutomaticCloudBackup,
} from '@/features/cloud-backup/cloud-backup-service';
import type { DriveBackupFile } from '@/features/cloud-backup/cloud-backup-types';
import type { ReceiptStorage } from '@/features/receipts/receipt-storage';

const mockCreateBackupPayload = jest.fn<() => Promise<unknown>>();
const mockDeleteDriveBackup = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockDigest = jest.fn<() => Promise<string>>();
const mockDownloadDriveBackup = jest.fn<() => Promise<string>>();
const mockGetCloudBackupState = jest.fn<() => Promise<unknown>>();
const mockListDriveBackups = jest.fn<() => Promise<DriveBackupFile[]>>();
const mockMarkComplete = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockMarkError = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUploadDriveBackup =
  jest.fn<(...args: unknown[]) => Promise<DriveBackupFile>>();

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: () => mockDigest(),
}));
jest.mock('@/features/backup/create-backup', () => ({
  createBackupPayload: () => mockCreateBackupPayload(),
}));
jest.mock('@/features/cloud-backup/cloud-backup-state-repository', () => ({
  getCloudBackupState: () => mockGetCloudBackupState(),
  markCloudBackupComplete: (...args: unknown[]) => mockMarkComplete(...args),
  markCloudBackupError: (...args: unknown[]) => mockMarkError(...args),
}));
jest.mock('@/features/cloud-backup/drive-api-client', () => ({
  deleteDriveBackup: (...args: unknown[]) => mockDeleteDriveBackup(...args),
  downloadDriveBackup: () => mockDownloadDriveBackup(),
  listDriveBackups: () => mockListDriveBackups(),
  uploadDriveBackup: (...args: unknown[]) => mockUploadDriveBackup(...args),
}));

const payload = {
  app_identifier: 'keuanganku_app',
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
  exported_at: '2026-08-28T01:00:00.000Z',
  summary: {
    budgets_count: 0,
    categories_count: 0,
    claims_count: 0,
    goals_count: 0,
    payment_methods_count: 0,
    transactions_count: 0,
  },
  version: 2,
} as const;

function driveFile(
  id: string,
  index = 0,
  prefix = 'keuanganku_backup_',
): DriveBackupFile {
  return {
    appProperties: {
      accountId: 'google-1',
      backupType: 'full',
      payloadSha256: 'valid-sha',
    },
    id,
    modifiedTime: `2026-08-28T0${index}:00:00.000Z`,
    name: `${prefix}${id}.json`,
    sizeBytes: 100,
  };
}

describe('cloud backup service', () => {
  const database = {
    getFirstAsync: jest.fn(async () => ({ revision: 7 })),
    withExclusiveTransactionAsync: jest.fn(
      async (task: (transaction: SQLiteDatabase) => Promise<void>) => {
        await task(database);
      },
    ),
  } as unknown as SQLiteDatabase;
  const receiptStorage = {} as ReceiptStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateBackupPayload.mockResolvedValue(payload);
    mockDigest.mockResolvedValue('valid-sha');
    mockUploadDriveBackup.mockResolvedValue(driveFile('new'));
    mockListDriveBackups.mockResolvedValue([
      driveFile('new'),
      driveFile('old-1', 1),
      driveFile('old-2', 2),
      driveFile('old-3', 3),
    ]);
  });

  it('uploads a checksummed snapshot and retains three versions', async () => {
    await expect(
      createCloudBackup(database, receiptStorage, 'google-1'),
    ).resolves.toMatchObject({ revision: 7 });

    expect(mockUploadDriveBackup).toHaveBeenCalledWith(
      expect.objectContaining({
        appProperties: expect.objectContaining({
          accountId: 'google-1',
          backupVersion: expect.any(String),
          payloadSha256: 'valid-sha',
        }),
      }),
    );
    expect(mockMarkComplete).toHaveBeenCalledWith(
      database,
      expect.objectContaining({ fileId: 'new', revision: 7 }),
    );
    expect(mockDeleteDriveBackup).toHaveBeenCalledWith('old-3');
  });

  it('validates the downloaded checksum before parsing', async () => {
    mockListDriveBackups.mockResolvedValue([driveFile('remote')]);
    mockDownloadDriveBackup.mockResolvedValue(JSON.stringify(payload));
    mockDigest.mockResolvedValue('different-sha');

    await expect(downloadLatestCloudBackup('google-1')).rejects.toThrow(
      /rusak atau tidak lengkap/i,
    );
  });

  it('falls back to an older retained snapshot when the newest is corrupt', async () => {
    mockListDriveBackups.mockResolvedValue([
      driveFile('newest'),
      driveFile('older', 1),
    ]);
    mockDownloadDriveBackup.mockResolvedValue(JSON.stringify(payload));
    mockDigest
      .mockResolvedValueOnce('different-sha')
      .mockResolvedValueOnce('valid-sha');

    await expect(downloadLatestCloudBackup('google-1')).resolves.toMatchObject({
      file: { id: 'older' },
    });
  });

  it('discovers and downloads backups created before the rebrand', async () => {
    const legacyFile = driveFile('legacy', 0, 'personal_finance_backup_');
    mockListDriveBackups.mockResolvedValue([legacyFile]);
    mockDownloadDriveBackup.mockResolvedValue(
      JSON.stringify({ ...payload, app_identifier: 'personal_finance_app' }),
    );

    await expect(queryLatestCloudBackup('google-1')).resolves.toEqual(
      legacyFile,
    );
    await expect(downloadLatestCloudBackup('google-1')).resolves.toMatchObject({
      file: { id: 'legacy' },
      payload: { app_identifier: 'personal_finance_app' },
    });
  });

  it('blocks automatic upload until the initial restore decision is resolved', async () => {
    mockGetCloudBackupState.mockResolvedValue({
      enabled: true,
      isDirty: true,
      restorePromptDismissed: false,
    });

    await expect(shouldRunAutomaticCloudBackup(database)).resolves.toBe(false);
  });
});
