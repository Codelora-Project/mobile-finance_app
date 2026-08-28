import type { SQLiteDatabase } from 'expo-sqlite';

import { runSerializedDatabaseWrite } from '@/db/write-coordinator';
import type { CloudBackupState } from '@/features/cloud-backup/cloud-backup-types';

type CloudBackupStateRow = {
  enabled: number;
  last_backed_up_revision: number;
  last_backup_at: number | null;
  last_backup_file_id: string | null;
  last_backup_size_bytes: number | null;
  last_error: string | null;
  last_transaction_count: number | null;
  restore_prompt_dismissed: number;
  revision: number;
};

function mapState(row: CloudBackupStateRow): CloudBackupState {
  return {
    enabled: row.enabled === 1,
    isDirty: row.revision > row.last_backed_up_revision,
    lastBackedUpRevision: row.last_backed_up_revision,
    lastBackupAt: row.last_backup_at,
    lastBackupFileId: row.last_backup_file_id,
    lastBackupSizeBytes: row.last_backup_size_bytes,
    lastError: row.last_error,
    lastTransactionCount: row.last_transaction_count,
    restorePromptDismissed: row.restore_prompt_dismissed === 1,
    revision: row.revision,
  };
}

export async function getCloudBackupState(
  database: SQLiteDatabase,
): Promise<CloudBackupState> {
  const row = await database.getFirstAsync<CloudBackupStateRow>(
    'SELECT * FROM cloud_backup_state WHERE id = 1;',
  );
  if (!row) throw new Error('Cloud backup state is unavailable.');
  return mapState(row);
}

export async function setCloudBackupEnabled(
  database: SQLiteDatabase,
  enabled: boolean,
) {
  await runSerializedDatabaseWrite(database, () =>
    database.runAsync(
      `UPDATE cloud_backup_state
       SET enabled = ?, last_error = NULL
       WHERE id = 1;`,
      enabled ? 1 : 0,
    ),
  );
}

export async function markCloudBackupComplete(
  database: SQLiteDatabase,
  input: {
    fileId: string;
    revision: number;
    sizeBytes: number;
    transactionCount: number;
  },
) {
  await runSerializedDatabaseWrite(database, () =>
    database.runAsync(
      `UPDATE cloud_backup_state
       SET last_backed_up_revision = MAX(last_backed_up_revision, ?),
           last_backup_at = ?,
           last_backup_file_id = ?,
           last_backup_size_bytes = ?,
           last_transaction_count = ?,
           last_error = NULL,
           restore_prompt_dismissed = 1
       WHERE id = 1;`,
      input.revision,
      Date.now(),
      input.fileId,
      input.sizeBytes,
      input.transactionCount,
    ),
  );
}

export async function markCloudBackupError(
  database: SQLiteDatabase,
  message: string,
) {
  await runSerializedDatabaseWrite(database, () =>
    database.runAsync(
      `UPDATE cloud_backup_state
       SET last_error = ?
       WHERE id = 1;`,
      message.slice(0, 500),
    ),
  );
}

export async function markCloudRestoreComplete(database: SQLiteDatabase) {
  await runSerializedDatabaseWrite(database, () =>
    database.runAsync(
      `UPDATE cloud_backup_state
       SET last_backed_up_revision = revision,
           last_backup_at = ?,
           last_error = NULL,
           restore_prompt_dismissed = 1
       WHERE id = 1;`,
      Date.now(),
    ),
  );
}

export async function dismissCloudRestorePrompt(database: SQLiteDatabase) {
  await runSerializedDatabaseWrite(database, () =>
    database.runAsync(
      `UPDATE cloud_backup_state
       SET restore_prompt_dismissed = 1
       WHERE id = 1;`,
    ),
  );
}

export async function hasLocalUserData(database: SQLiteDatabase) {
  const row = await database.getFirstAsync<{ count: number }>(`
    SELECT
      (SELECT COUNT(*) FROM transactions) +
      (SELECT COUNT(*) FROM savings_goals) +
      (SELECT COUNT(*) FROM claims) +
      (SELECT COUNT(*) FROM category_budgets) +
      (SELECT COUNT(*) FROM categories WHERE is_default = 0) +
      (SELECT COUNT(*) FROM payment_methods WHERE is_default = 0)
      AS count;
  `);
  return (row?.count ?? 0) > 0;
}
