import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  legacyReceiptStorage,
  type ReceiptStorage,
} from '@/features/receipts/receipt-storage';

const ACTIVE_RECEIPT_DIRECTORY = 'receipts';
const ORPHAN_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
const QUARANTINE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type ReceiptStorageRow = { storage_key: string };

function isOldEnough(
  modificationTime: number | null,
  now: number,
  minimumAge: number,
) {
  return modificationTime !== null && now - modificationTime >= minimumAge;
}

function getQuarantinedAt(fileName: string) {
  const match = /^(\d+)-/.exec(fileName);
  if (!match?.[1]) return null;
  const timestamp = Number(match[1]);
  return Number.isSafeInteger(timestamp) ? timestamp : null;
}

function reportMaintenanceFailure(message: string, error: unknown) {
  if (__DEV__) {
    console.warn(message, error);
  }
}

/** Best-effort cleanup that never mutates receipt metadata. */
export async function maintainReceiptStorage(
  database: SQLiteDatabase,
  now = Date.now(),
  storage: ReceiptStorage = legacyReceiptStorage,
) {
  try {
    if (typeof database.getAllAsync !== 'function') return;
    const rows = await database.getAllAsync<ReceiptStorageRow>(
      'SELECT storage_key FROM receipts',
    );
    const referencedStorageKeys = new Set(rows.map((row) => row.storage_key));
    const activeDirectory = storage.directory;
    const quarantineDirectory = storage.quarantineDirectory;

    if (activeDirectory.exists) {
      for (const entry of activeDirectory.list()) {
        if (!(entry instanceof File)) continue;
        const storageKey = `${ACTIVE_RECEIPT_DIRECTORY}/${entry.name}`;
        if (
          referencedStorageKeys.has(storageKey) ||
          !isOldEnough(entry.modificationTime, now, ORPHAN_GRACE_PERIOD_MS)
        ) {
          continue;
        }
        try {
          quarantineDirectory.create({ idempotent: true, intermediates: true });
          await entry.move(
            new File(quarantineDirectory, `${now}-${entry.name}`),
          );
        } catch (error) {
          reportMaintenanceFailure('Receipt quarantine move failed.', error);
        }
      }
    }

    if (quarantineDirectory.exists) {
      for (const entry of quarantineDirectory.list()) {
        if (!(entry instanceof File)) {
          continue;
        }
        const quarantinedAt = getQuarantinedAt(entry.name);
        if (
          quarantinedAt === null ||
          now - quarantinedAt < QUARANTINE_RETENTION_MS
        ) {
          continue;
        }
        try {
          entry.delete();
        } catch (error) {
          reportMaintenanceFailure('Receipt quarantine cleanup failed.', error);
        }
      }
    }
  } catch (error) {
    reportMaintenanceFailure('Receipt maintenance failed.', error);
  }
}
