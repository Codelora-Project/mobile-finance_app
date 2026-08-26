import { describe, expect, it } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { runSerializedDatabaseWrite } from '@/db/write-coordinator';

function fakeDatabase() {
  return {} as SQLiteDatabase;
}

describe('runSerializedDatabaseWrite', () => {
  it('runs writes against the same database in order', async () => {
    const database = fakeDatabase();
    const events: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const first = runSerializedDatabaseWrite(database, async () => {
      events.push('first:start');
      await new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      events.push('first:end');
    });
    const second = runSerializedDatabaseWrite(database, async () => {
      events.push('second:start');
    });

    await Promise.resolve();
    expect(events).toEqual(['first:start']);
    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(['first:start', 'first:end', 'second:start']);
  });

  it('continues the queue after a failed write', async () => {
    const database = fakeDatabase();
    const second = runSerializedDatabaseWrite(database, async () => {
      throw new Error('first failed');
    });
    const following = runSerializedDatabaseWrite(database, async () => 'saved');

    await expect(second).rejects.toThrow('first failed');
    await expect(following).resolves.toBe('saved');
  });

  it('does not serialize different database objects together', async () => {
    const firstDatabase = fakeDatabase();
    const secondDatabase = fakeDatabase();
    let releaseFirst: () => void = () => undefined;
    const first = runSerializedDatabaseWrite(firstDatabase, async () =>
      new Promise<void>((resolve) => {
        releaseFirst = resolve;
      }),
    );
    const second = runSerializedDatabaseWrite(secondDatabase, async () => 'ready');

    await expect(second).resolves.toBe('ready');
    releaseFirst();
    await first;
  });

  it('maps SQLite busy errors without retrying the task', async () => {
    const database = fakeDatabase();
    let attempts = 0;

    await expect(
      runSerializedDatabaseWrite(database, async () => {
        attempts += 1;
        throw new Error('SQLITE_BUSY: database is locked');
      }),
    ).rejects.toMatchObject({ code: 'DATABASE_BUSY' });
    expect(attempts).toBe(1);
  });
});
