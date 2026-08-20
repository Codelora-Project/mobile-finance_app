import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  copyReceiptToStorage,
  getReceiptFileUri,
  isReceiptStorageKey,
  readReceiptBase64,
  removeAllReceiptFiles,
  receiptFileExists,
  removeReceiptFile,
  writeReceiptBase64ToStorage,
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

    delete() {
      mockDirectories.delete(this.uri);
      for (const file of [...mockFiles]) {
        if (file.startsWith(this.uri)) mockFiles.delete(file);
      }
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

    async base64() {
      if (!this.exists) throw new Error('source missing');
      return 'aW1hZ2U=';
    }

    async write(_content: string, _options?: { encoding?: string }) {
      mockFiles.add(this.uri);
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

  it('reads a stored receipt as base64 for temporary PDF embedding', async () => {
    mockFiles.add('file:///documents/receipts/receipt.jpg');
    await expect(readReceiptBase64('receipts/receipt.jpg')).resolves.toBe(
      'aW1hZ2U=',
    );
    await expect(readReceiptBase64('receipts/missing.jpg')).resolves.toBeNull();
  });

  it('restores base64 receipt data into a new managed file', async () => {
    const storageKey = await writeReceiptBase64ToStorage(
      'aW1hZ2U=',
      'image/webp',
    );

    expect(storageKey).toMatch(/^receipts\/[a-z0-9-]+\.webp$/);
    expect(receiptFileExists(storageKey)).toBe(true);
  });

  it('does not create a persistent record for a missing source file', async () => {
    await expect(
      copyReceiptToStorage('file:///cache/missing.webp', 'image/webp'),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'The receipt image is no longer available.',
    });
  });

  it('recursively clears the managed receipt directory', () => {
    mockDirectories.add('file:///documents/receipts/');
    mockFiles.add('file:///documents/receipts/one.jpg');
    mockFiles.add('file:///documents/receipts/two.png');

    removeAllReceiptFiles();

    expect(mockDirectories.has('file:///documents/receipts/')).toBe(false);
    expect(mockFiles.size).toBe(0);
    expect(() => removeAllReceiptFiles()).not.toThrow();
  });
});
