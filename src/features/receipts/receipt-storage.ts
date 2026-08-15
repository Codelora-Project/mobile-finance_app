import { Directory, File, Paths } from 'expo-file-system';

import type { ReceiptMimeType } from '@/features/receipts/receipt-types';
import { createCodedError } from '@/lib/errors';

const RECEIPT_DIRECTORY = 'receipts';
const STORAGE_KEY_PATTERN = /^receipts\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

const extensionByMimeType: Record<ReceiptMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function receiptDirectory() {
  return new Directory(Paths.document, RECEIPT_DIRECTORY);
}

function assertStorageKey(storageKey: string) {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'The stored receipt path is invalid.',
    );
  }
}

function receiptFile(storageKey: string) {
  assertStorageKey(storageKey);
  const fileName = storageKey.slice(RECEIPT_DIRECTORY.length + 1);
  return new File(receiptDirectory(), fileName);
}

function createStorageKey(mimeType: ReceiptMimeType) {
  const uniquePart = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
  return `${RECEIPT_DIRECTORY}/${uniquePart}.${extensionByMimeType[mimeType]}`;
}

export function isReceiptStorageKey(value: string) {
  return STORAGE_KEY_PATTERN.test(value);
}

export function getReceiptFileUri(storageKey: string) {
  return receiptFile(storageKey).uri;
}

export function receiptFileExists(storageKey: string) {
  return receiptFile(storageKey).exists;
}

export async function readReceiptBase64(storageKey: string) {
  const file = receiptFile(storageKey);
  return file.exists ? file.base64() : null;
}

export async function copyReceiptToStorage(
  sourceImageUri: string,
  mimeType: ReceiptMimeType,
) {
  const source = new File(sourceImageUri);
  if (!source.exists) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'The receipt image is no longer available.',
    );
  }

  const directory = receiptDirectory();
  directory.create({ idempotent: true, intermediates: true });
  const storageKey = createStorageKey(mimeType);
  const destination = receiptFile(storageKey);
  try {
    await source.copy(destination);
    if (!destination.exists) {
      throw createCodedError(
        'FILE_OPERATION_FAILED',
        'The receipt image could not be stored.',
      );
    }
  } catch (error) {
    if (destination.exists) {
      destination.delete();
    }
    throw error;
  }
  return storageKey;
}

export function removeReceiptFile(storageKey: string) {
  const file = receiptFile(storageKey);
  if (file.exists) {
    file.delete();
  }
}
