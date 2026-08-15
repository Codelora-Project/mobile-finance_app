import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  copyReceiptToStorage,
  getReceiptFileUri,
  isReceiptStorageKey,
  receiptFileExists,
  removeReceiptFile,
} from '@/features/receipts/receipt-storage';

const mockFiles = new Set<string>();
const mockDirectories = new Set<string>();

jest.mock('expo-file-system', () => {
  class MockDirectory {
    readonly uri: string;

    constructor(parent: { uri: string } | string, name?: string) {
      const parentUri = typeof parent === 'string' ? parent : parent.uri;
      this.uri = name ? `${parentUri.replace(/\/$/, '')}/${name}/` : parentUri;
    }

    get exists() {
      return mockDirectories.has(this.uri);
    }

    create() {
      mockDirectories.add(this.uri);
    }
  }

  class MockFile {
    readonly uri: string;

    constructor(parent: { uri: string } | string, name?: string) {
      const parentUri = typeof parent === 'string' ? parent : parent.uri;
      this.uri = name ? `${parentUri.replace(/\/$/, '')}/${name}` : parentUri;
    }

    get exists() {
      return mockFiles.has(this.uri);
    }

    async copy(destination: MockFile) {
      if (!this.exists) {
        throw new Error('source missing');
      }
      mockFiles.add(destination.uri);
    }

    delete() {
      mockFiles.delete(this.uri);
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: new MockDirectory('file:///documents/') },
  };
});

describe('receipt storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFiles.clear();
    mockDirectories.clear();
  });

  it('copies a temporary image into persistent document storage', async () => {
    mockFiles.add('file:///cache/gallery-image.jpg');

    const storageKey = await copyReceiptToStorage(
      'file:///cache/gallery-image.jpg',
      'image/jpeg',
    );

    expect(storageKey).toMatch(/^receipts\/[a-z0-9-]+\.jpg$/);
    expect(storageKey).not.toContain('file:///cache');
    expect(isReceiptStorageKey(storageKey)).toBe(true);
    expect(receiptFileExists(storageKey)).toBe(true);
    expect(getReceiptFileUri(storageKey)).toBe(
      `file:///documents/${storageKey}`,
    );
  });

  it('removes a stored file and rejects unsafe relative keys', async () => {
    mockFiles.add('file:///cache/receipt.png');
    const storageKey = await copyReceiptToStorage(
      'file:///cache/receipt.png',
      'image/png',
    );

    removeReceiptFile(storageKey);
    expect(receiptFileExists(storageKey)).toBe(false);
    expect(() => getReceiptFileUri('../outside.jpg')).toThrow(
      'The stored receipt path is invalid.',
    );
  });

  it('does not create a persistent record for a missing source file', async () => {
    await expect(
      copyReceiptToStorage('file:///cache/missing.webp', 'image/webp'),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'The receipt image is no longer available.',
    });
  });
});
