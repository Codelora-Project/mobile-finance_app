import type {
  BackupPayload,
  BackupStats,
} from '@/features/backup/backup-types';

export type CloudBackupState = Readonly<{
  enabled: boolean;
  isDirty: boolean;
  lastBackedUpRevision: number;
  lastBackupAt: number | null;
  lastBackupFileId: string | null;
  lastBackupSizeBytes: number | null;
  lastError: string | null;
  lastTransactionCount: number | null;
  restorePromptDismissed: boolean;
  revision: number;
}>;

export type DriveBackupFile = Readonly<{
  appProperties: Readonly<Record<string, string>>;
  id: string;
  modifiedTime: string;
  name: string;
  sizeBytes: number;
}>;

export type DownloadedCloudBackup = Readonly<{
  file: DriveBackupFile;
  payload: BackupPayload;
  stats: BackupStats;
}>;

export type CloudBackupResult = Readonly<{
  file: DriveBackupFile;
  revision: number;
}>;
