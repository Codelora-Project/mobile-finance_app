import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

export type StorageStats = Readonly<{
  transactionsCount: number;
  receiptsCount: number;
  receiptsSizeBytes: number;
  claimsCount: number;
  cacheSizeBytes: number;
}>;

export async function getStorageStats(
  database: SQLiteDatabase,
): Promise<StorageStats> {
  const [txRes, receiptsRes, claimsRes] = await Promise.all([
    database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions;',
    ),
    database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM receipts;',
    ),
    database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM claims;',
    ),
  ]);

  let receiptsSizeBytes = 0;
  let receiptsCount = receiptsRes?.count ?? 0;
  try {
    const receiptDir = new Directory(Paths.document, 'receipts');
    if (receiptDir.exists) {
      const items = receiptDir.list();
      let calculatedBytes = 0;
      for (const item of items) {
        if (item instanceof File && item.exists) {
          calculatedBytes += item.size || 0;
        }
      }
      receiptsSizeBytes = calculatedBytes;
    }
  } catch {
    // Fallback if filesystem access fails
  }

  let cacheSizeBytes = 0;
  try {
    const exportsDir = new Directory(Paths.cache, 'exports');
    if (exportsDir.exists) {
      const items = exportsDir.list();
      for (const item of items) {
        if (item instanceof File && item.exists) {
          cacheSizeBytes += item.size || 0;
        }
      }
    }
  } catch {
    // Fallback if cache access fails
  }

  return {
    cacheSizeBytes,
    claimsCount: claimsRes?.count ?? 0,
    receiptsCount,
    receiptsSizeBytes,
    transactionsCount: txRes?.count ?? 0,
  };
}

export async function clearTemporaryCache(): Promise<{ freedBytes: number }> {
  let freedBytes = 0;
  try {
    const exportsDir = new Directory(Paths.cache, 'exports');
    if (exportsDir.exists) {
      const items = exportsDir.list();
      for (const item of items) {
        if (item instanceof File && item.exists) {
          freedBytes += item.size || 0;
        }
      }
      exportsDir.delete();
    }
  } catch (err) {
    if (__DEV__) console.warn('Cache clearing error:', err);
  }
  return { freedBytes };
}

export function formatStorageSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
