import { Directory, File, Paths } from 'expo-file-system';

import type { ReceiptMimeType } from '@/features/receipts/receipt-types';
import { createCodedError } from '@/lib/errors';

const RECEIPT_KEY_PREFIX = 'receipts';
const STORAGE_KEY_PATTERN = /^receipts\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

const extensionByMimeType: Record<ReceiptMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type ReceiptStorage = {
  readonly directory: Directory;
  readonly quarantineDirectory: Directory;
  copy(sourceImageUri: string, mimeType: ReceiptMimeType): Promise<string>;
  exists(storageKey: string): boolean;
  getUri(storageKey: string): string;
  readBase64(storageKey: string): Promise<string | null>;
  remove(storageKey: string): void;
  removeAll(): void;
  writeBase64(base64: string, mimeType: ReceiptMimeType): Promise<string>;
};

function directoryFromRelativePath(relativePath: string) {
  const segments = relativePath.split('/').filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === '..')) {
    throw new Error('Receipt directory is invalid.');
  }
  return new Directory(Paths.document, ...segments);
}

function assertStorageKey(storageKey: string) {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'The stored receipt path is invalid.',
    );
  }
}

function createStorageKey(mimeType: ReceiptMimeType) {
  const uniquePart = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
  return `${RECEIPT_KEY_PREFIX}/${uniquePart}.${extensionByMimeType[mimeType]}`;
}

export function createReceiptStorage(
  receiptDirectory: string,
  quarantineDirectory = receiptDirectory.replace(
    /\/receipts$/,
    '/receipt-quarantine',
  ),
): ReceiptStorage {
  const directory = directoryFromRelativePath(receiptDirectory);
  const quarantine = directoryFromRelativePath(quarantineDirectory);

  function fileFor(storageKey: string) {
    assertStorageKey(storageKey);
    return new File(directory, storageKey.slice(RECEIPT_KEY_PREFIX.length + 1));
  }

  return {
    directory,
    quarantineDirectory: quarantine,
    async copy(sourceImageUri, mimeType) {
      const source = new File(sourceImageUri);
      if (!source.exists) {
        throw createCodedError(
          'VALIDATION_FAILED',
          'The receipt image is no longer available.',
        );
      }

      directory.create({ idempotent: true, intermediates: true });
      const storageKey = createStorageKey(mimeType);
      const destination = fileFor(storageKey);
      try {
        await source.copy(destination);
        if (!destination.exists) {
          throw createCodedError(
            'FILE_OPERATION_FAILED',
            'The receipt image could not be stored.',
          );
        }
      } catch (error) {
        if (destination.exists) destination.delete();
        throw error;
      }
      return storageKey;
    },
    exists(storageKey) {
      return fileFor(storageKey).exists;
    },
    getUri(storageKey) {
      return fileFor(storageKey).uri;
    },
    async readBase64(storageKey) {
      const file = fileFor(storageKey);
      return file.exists ? file.base64() : null;
    },
    remove(storageKey) {
      const file = fileFor(storageKey);
      if (file.exists) file.delete();
    },
    removeAll() {
      if (directory.exists) directory.delete();
      if (quarantine.exists) quarantine.delete();
    },
    async writeBase64(base64, mimeType) {
      if (!base64.trim()) {
        throw createCodedError(
          'VALIDATION_FAILED',
          'The receipt backup does not contain image data.',
        );
      }

      directory.create({ idempotent: true, intermediates: true });
      const storageKey = createStorageKey(mimeType);
      const destination = fileFor(storageKey);
      try {
        await destination.write(base64, { encoding: 'base64' });
        if (!destination.exists) {
          throw createCodedError(
            'FILE_OPERATION_FAILED',
            'The restored receipt image could not be stored.',
          );
        }
      } catch (error) {
        if (destination.exists) destination.delete();
        throw error;
      }
      return storageKey;
    },
  };
}

export const legacyReceiptStorage = createReceiptStorage(
  'receipts',
  'receipt-quarantine',
);

export function isReceiptStorageKey(value: string) {
  return STORAGE_KEY_PATTERN.test(value);
}

// Compatibility exports are used by repository tests and legacy migration.
// App features use the account-scoped ReceiptStorage from context.
export const writeReceiptBase64ToStorage =
  legacyReceiptStorage.writeBase64.bind(legacyReceiptStorage);
export const getReceiptFileUri =
  legacyReceiptStorage.getUri.bind(legacyReceiptStorage);
export const receiptFileExists =
  legacyReceiptStorage.exists.bind(legacyReceiptStorage);
export const readReceiptBase64 =
  legacyReceiptStorage.readBase64.bind(legacyReceiptStorage);
export const copyReceiptToStorage =
  legacyReceiptStorage.copy.bind(legacyReceiptStorage);
export const removeReceiptFile =
  legacyReceiptStorage.remove.bind(legacyReceiptStorage);
export const removeAllReceiptFiles =
  legacyReceiptStorage.removeAll.bind(legacyReceiptStorage);
