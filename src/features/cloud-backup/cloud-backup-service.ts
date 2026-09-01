import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import type { SQLiteDatabase } from 'expo-sqlite';

import { latestDatabaseVersion } from '@/db/migrations';
import { runSerializedDatabaseWrite } from '@/db/write-coordinator';
import { createBackupPayload } from '@/features/backup/create-backup';
import type { BackupPayload } from '@/features/backup/backup-types';
import {
  getBackupPayloadStats,
  MAX_BACKUP_TEXT_LENGTH,
  parseBackupPayload,
} from '@/features/backup/backup-validation';
import {
  getCloudBackupState,
  markCloudBackupComplete,
  markCloudBackupError,
} from '@/features/cloud-backup/cloud-backup-state-repository';
import type {
  CloudBackupResult,
  DownloadedCloudBackup,
  DriveBackupFile,
} from '@/features/cloud-backup/cloud-backup-types';
import {
  deleteDriveBackup,
  downloadDriveBackup,
  listDriveBackups,
  uploadDriveBackup,
} from '@/features/cloud-backup/drive-api-client';
import type { ReceiptStorage } from '@/features/receipts/receipt-storage';

const RETAINED_BACKUP_COUNT = 3;
const BACKUP_FILE_PREFIX = 'keuanganku_backup_';
const LEGACY_BACKUP_FILE_PREFIX = 'personal_finance_backup_';

function isSupportedBackupFile(file: DriveBackupFile) {
  return (
    file.name.startsWith(BACKUP_FILE_PREFIX) ||
    file.name.startsWith(LEGACY_BACKUP_FILE_PREFIX)
  );
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Google Drive backup gagal.';
}

async function sha256(content: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, content);
}

function timestampForFileName(date: Date) {
  return date.toISOString().replace(/[-:.]/g, '').replace('Z', 'Z');
}

async function createConsistentSnapshot(
  database: SQLiteDatabase,
  receiptStorage: ReceiptStorage,
) {
  return runSerializedDatabaseWrite(database, async () => {
    let payload: Awaited<ReturnType<typeof createBackupPayload>> | null = null;
    let revision = 0;
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const state = await getCloudBackupStateDirect(transaction);
      revision = state.revision;
      payload = await createBackupPayload(transaction, receiptStorage);
    });
    if (!payload) throw new Error('Snapshot cadangan tidak dapat dibuat.');
    return { payload: payload as BackupPayload, revision };
  });
}

async function getCloudBackupStateDirect(database: SQLiteDatabase) {
  const row = await database.getFirstAsync<{ revision: number }>(
    'SELECT revision FROM cloud_backup_state WHERE id = 1;',
  );
  if (!row) throw new Error('Cloud backup state is unavailable.');
  return row;
}

async function pruneOldBackups(files: readonly DriveBackupFile[]) {
  const staleFiles = files.slice(RETAINED_BACKUP_COUNT);
  await Promise.allSettled(
    staleFiles.map((file) => deleteDriveBackup(file.id)),
  );
}

export async function queryLatestCloudBackup(accountId: string) {
  const files = await listDriveBackups();
  return (
    files.find(
      (file) =>
        file.appProperties.accountId === accountId &&
        isSupportedBackupFile(file),
    ) ?? null
  );
}

export async function createCloudBackup(
  database: SQLiteDatabase,
  receiptStorage: ReceiptStorage,
  accountId: string,
): Promise<CloudBackupResult> {
  try {
    const { payload, revision } = await createConsistentSnapshot(
      database,
      receiptStorage,
    );
    const content = JSON.stringify(payload);
    if (content.length > MAX_BACKUP_TEXT_LENGTH) {
      throw new Error('Ukuran cadangan melebihi batas 50 MB.');
    }
    const contentSha256 = await sha256(content);
    const createdAt = new Date();
    const sizeBytes = new TextEncoder().encode(content).length;
    if (sizeBytes > MAX_BACKUP_TEXT_LENGTH) {
      throw new Error('Ukuran cadangan melebihi batas 50 MB.');
    }
    const file = await uploadDriveBackup({
      appProperties: {
        accountId,
        appVersion: payload.app_version,
        backupVersion: String(latestDatabaseVersion),
        backupFormatVersion: String(payload.version),
        backupType: 'full',
        databaseSchemaVersion: String(latestDatabaseVersion),
        deviceName: Device.deviceName ?? Device.modelName ?? 'Android',
        exportedAt: payload.exported_at,
        payloadSha256: contentSha256,
        transactionCount: String(payload.summary.transactions_count),
      },
      content,
      fileName: `${BACKUP_FILE_PREFIX}${timestampForFileName(createdAt)}.json`,
    });

    await markCloudBackupComplete(database, {
      fileId: file.id,
      revision,
      sizeBytes,
      transactionCount: payload.summary.transactions_count,
    });

    const allFiles = (await listDriveBackups()).filter(
      (candidate) =>
        candidate.appProperties.accountId === accountId &&
        isSupportedBackupFile(candidate),
    );
    await pruneOldBackups(allFiles);
    return { file, revision };
  } catch (error) {
    await markCloudBackupError(database, safeErrorMessage(error)).catch(
      () => undefined,
    );
    throw error;
  }
}

export async function downloadLatestCloudBackup(
  accountId: string,
): Promise<DownloadedCloudBackup | null> {
  const files = (await listDriveBackups()).filter(
    (file) =>
      file.appProperties.accountId === accountId && isSupportedBackupFile(file),
  );
  if (files.length === 0) return null;

  let lastError: unknown = null;
  for (const file of files.slice(0, RETAINED_BACKUP_COUNT)) {
    try {
      if (file.sizeBytes > MAX_BACKUP_TEXT_LENGTH) {
        throw new Error('Ukuran cadangan Google Drive melebihi batas 50 MB.');
      }
      const content = await downloadDriveBackup(file.id);
      if (content.length > MAX_BACKUP_TEXT_LENGTH) {
        throw new Error('Ukuran cadangan Google Drive melebihi batas 50 MB.');
      }
      const expectedSha256 = file.appProperties.payloadSha256;
      if (expectedSha256 && (await sha256(content)) !== expectedSha256) {
        throw new Error('Cadangan Google Drive rusak atau tidak lengkap.');
      }
      const payload = parseBackupPayload(content);
      return {
        file,
        payload,
        stats: getBackupPayloadStats(payload),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Tidak ada cadangan Google Drive yang dapat dipulihkan.');
}

export async function shouldRunAutomaticCloudBackup(database: SQLiteDatabase) {
  const state = await getCloudBackupState(database);
  return state.enabled && state.isDirty && state.restorePromptDismissed;
}
