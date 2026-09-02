import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockFiles = new Map<string, number>();
const mockDirectories = new Set<string>();

jest.mock('expo-file-system', () => {
  class MockDirectory {
    uri: string;

    constructor(parent: { uri: string }, name: string) {
      this.uri = `${parent.uri}${name}/`;
    }

    get exists() {
      return mockDirectories.has(this.uri);
    }

    create() {
      mockDirectories.add(this.uri);
    }

    delete() {
      mockDirectories.delete(this.uri);
      for (const uri of mockFiles.keys()) {
        if (uri.startsWith(this.uri)) mockFiles.delete(uri);
      }
    }

    list() {
      return [...mockFiles.keys()]
        .filter((uri) => uri.startsWith(this.uri))
        .map((uri) => new MockFile(uri));
    }
  }

  class MockFile {
    uri: string;

    constructor(parentOrUri: { uri: string } | string, name?: string) {
      this.uri =
        typeof parentOrUri === 'string'
          ? parentOrUri
          : `${parentOrUri.uri}${name ?? ''}`;
    }

    get exists() {
      return mockFiles.has(this.uri);
    }

    get size() {
      return mockFiles.get(this.uri) ?? 0;
    }

    delete() {
      mockFiles.delete(this.uri);
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { cache: { uri: 'file:///cache/' } },
  };
});

import {
  clearManagedCache,
  getManagedCacheSizeBytes,
  removeManagedCacheFile,
  resetManagedCacheDirectory,
} from '@/lib/storage/managed-cache';

describe('managed cache', () => {
  beforeEach(() => {
    mockDirectories.clear();
    mockFiles.clear();
  });

  it('replaces stale files only in the requested managed directory', () => {
    mockDirectories.add('file:///cache/backups/');
    mockDirectories.add('file:///cache/exports/');
    mockFiles.set('file:///cache/backups/old.json', 120);
    mockFiles.set('file:///cache/exports/report.csv', 80);

    const directory = resetManagedCacheDirectory('backups');

    expect(directory.uri).toBe('file:///cache/backups/');
    expect(directory.exists).toBe(true);
    expect(mockFiles.has('file:///cache/backups/old.json')).toBe(false);
    expect(mockFiles.has('file:///cache/exports/report.csv')).toBe(true);
  });

  it('measures and clears all managed export cache', () => {
    mockDirectories.add('file:///cache/backups/');
    mockDirectories.add('file:///cache/exports/');
    mockFiles.set('file:///cache/backups/backup.json', 120);
    mockFiles.set('file:///cache/exports/report.csv', 80);

    expect(getManagedCacheSizeBytes()).toBe(200);
    expect(clearManagedCache()).toEqual({ freedBytes: 200 });
    expect(getManagedCacheSizeBytes()).toBe(0);
  });

  it('only deletes files located under the application cache root', () => {
    mockFiles.set('file:///cache/backups/backup.json', 120);
    mockFiles.set('file:///documents/backup.json', 120);

    expect(removeManagedCacheFile('file:///documents/backup.json')).toBe(false);
    expect(removeManagedCacheFile('file:///cache/backups/backup.json')).toBe(
      true,
    );
    expect(mockFiles.has('file:///documents/backup.json')).toBe(true);
    expect(mockFiles.has('file:///cache/backups/backup.json')).toBe(false);
  });
});
