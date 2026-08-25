import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { formatTimestampForFilename } from '@/features/backup/backup-utils';
import {
  getBackupPayloadStats,
  MAX_BACKUP_TEXT_LENGTH,
  parseBackupPayload,
} from '@/features/backup/backup-validation';
import { createBackupPayload } from '@/features/backup/create-backup';
import type {
  BackupPayload,
  BackupStats,
} from '@/features/backup/backup-types';
import { createCodedError } from '@/lib/errors';

const BACKUP_DIRECTORY = 'backups';

export async function exportBackupToJsonFile(
  database: SQLiteDatabase,
): Promise<{
  fileName: string;
  sizeBytes: number;
  summary: BackupPayload['summary'];
  uri: string;
}> {
  const payload = await createBackupPayload(database);
  const jsonContent = JSON.stringify(payload, null, 2);
  if (jsonContent.length > MAX_BACKUP_TEXT_LENGTH) {
    throw createCodedError(
      'FILE_OPERATION_FAILED',
      'Ukuran backup melebihi batas 50 MB. Kurangi jumlah lampiran struk lalu coba lagi.',
    );
  }
  const directory = new Directory(Paths.cache, BACKUP_DIRECTORY);
  directory.create({ idempotent: true, intermediates: true });

  const fileName = `backup_finance_${formatTimestampForFilename()}.json`;
  const file = new File(directory, fileName);
  if (file.exists) file.delete();
  await file.write(jsonContent);

  return {
    uri: file.uri,
    fileName,
    sizeBytes: new TextEncoder().encode(jsonContent).length,
    summary: payload.summary,
  };
}

export async function shareFile(
  fileUri: string,
  dialogTitle: string,
  mimeType: string,
  uti: string,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw createCodedError(
      'FILE_OPERATION_FAILED',
      'Fitur berbagi tidak tersedia di perangkat ini.',
    );
  }
  await Sharing.shareAsync(fileUri, { dialogTitle, mimeType, UTI: uti });
}

export async function pickBackupFile(): Promise<{
  fileName: string;
  payload: BackupPayload;
  stats: BackupStats;
  uri: string;
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  if (typeof asset.size === 'number' && asset.size > MAX_BACKUP_TEXT_LENGTH) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Ukuran file backup melebihi batas 50 MB.',
    );
  }
  const file = new File(asset.uri);
  if (!file.exists) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'File backup tidak ditemukan atau tidak dapat dibaca.',
    );
  }

  let textContent: string;
  try {
    textContent = await file.text();
  } catch (error) {
    if (__DEV__) console.warn('Failed to read backup file:', error);
    throw createCodedError(
      'VALIDATION_FAILED',
      'Gagal membaca isi file backup. Pastikan file berformat teks JSON.',
    );
  }

  const payload = parseBackupPayload(textContent);
  return {
    uri: asset.uri,
    fileName: asset.name,
    payload,
    stats: getBackupPayloadStats(payload),
  };
}
