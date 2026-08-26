import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { maintainReceiptStorage } from '@/features/receipts/receipt-maintenance';

const mockDirectories = new Set<string>();
const mockFiles = new Map<string, number | null>();
const mockMovedFiles: Array<{ from: string; to: string }> = [];

jest.mock('expo-file-system', () => {
  class MockFile {
    readonly uri: string;

    constructor(parent: { uri: string } | string, name?: string) {
      const parentUri = typeof parent === 'string' ? parent : parent.uri;
      this.uri = name ? `${parentUri.replace(/\/$/, '')}/${name}` : parentUri;
    }

    get name() {
      return this.uri.slice(this.uri.lastIndexOf('/') + 1);
    }

    get modificationTime() {
      return mockFiles.get(this.uri) ?? null;
    }

    async move(destination: MockFile) {
      const modificationTime = mockFiles.get(this.uri) ?? null;
      mockMovedFiles.push({ from: this.uri, to: destination.uri });
      mockFiles.delete(this.uri);
      mockFiles.set(destination.uri, modificationTime);
    }

    delete() {
      mockFiles.delete(this.uri);
    }
  }

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

    list() {
      return [...mockFiles.keys()]
        .filter((uri) => {
          const remainder = uri.slice(this.uri.length);
          return uri.startsWith(this.uri) && !remainder.includes('/');
        })
        .map((uri) => new MockFile(uri));
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: new MockDirectory('file:///documents/') },
  };
});

function databaseWithReferences(storageKeys: string[]) {
  return {
    getAllAsync: async () =>
      storageKeys.map((storage_key) => ({ storage_key })),
  } as unknown as SQLiteDatabase;
}

describe('receipt maintenance', () => {
  beforeEach(() => {
    mockDirectories.clear();
    mockFiles.clear();
    mockMovedFiles.length = 0;
  });

  it('quarantines only unreferenced active files older than 24 hours', async () => {
    const now = 2_000_000_000_000;
    const day = 24 * 60 * 60 * 1000;
    mockDirectories.add('file:///documents/receipts/');
    mockFiles.set('file:///documents/receipts/referenced.jpg', now - 2 * day);
    mockFiles.set('file:///documents/receipts/recent.jpg', now - day + 1);
    mockFiles.set('file:///documents/receipts/orphan.jpg', now - day);
    mockFiles.set('file:///documents/receipts/unknown.jpg', null);

    await maintainReceiptStorage(
      databaseWithReferences(['receipts/referenced.jpg', 'receipts/missing.jpg']),
      now,
    );

    expect(mockMovedFiles).toEqual([
      {
        from: 'file:///documents/receipts/orphan.jpg',
        to: `file:///documents/receipt-quarantine/${now}-orphan.jpg`,
      },
    ]);
    expect(mockFiles.has('file:///documents/receipts/referenced.jpg')).toBe(true);
    expect(mockFiles.has('file:///documents/receipts/recent.jpg')).toBe(true);
    expect(mockFiles.has('file:///documents/receipts/unknown.jpg')).toBe(true);
  });

  it('deletes quarantine files only after seven days in quarantine', async () => {
    const now = 2_000_000_000_000;
    const week = 7 * 24 * 60 * 60 * 1000;
    mockDirectories.add('file:///documents/receipt-quarantine/');
    const expired = `file:///documents/receipt-quarantine/${now - week}-old.jpg`;
    const retained = `file:///documents/receipt-quarantine/${now - week + 1}-new.jpg`;
    const unknown = 'file:///documents/receipt-quarantine/unknown.jpg';
    mockFiles.set(expired, now);
    mockFiles.set(retained, now - week - 1);
    mockFiles.set(unknown, null);

    await maintainReceiptStorage(databaseWithReferences([]), now);

    expect(mockFiles.has(expired)).toBe(false);
    expect(mockFiles.has(retained)).toBe(true);
    expect(mockFiles.has(unknown)).toBe(true);
  });
});
