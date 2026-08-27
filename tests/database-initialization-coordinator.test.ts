import { describe, expect, it, jest } from '@jest/globals';

import { runSerializedDatabaseInitialization } from '@/db/database-initialization-coordinator';

describe('database initialization coordinator', () => {
  it('runs repeated initialization for one database sequentially', async () => {
    let releaseFirst: (() => void) | undefined;
    const firstCanFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const events: string[] = [];

    const first = runSerializedDatabaseInitialization(
      'account.db',
      async () => {
        events.push('first-start');
        await firstCanFinish;
        events.push('first-end');
      },
    );
    const secondTask = jest.fn(async () => {
      events.push('second-start');
    });
    const second = runSerializedDatabaseInitialization(
      'account.db',
      secondTask,
    );

    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(events).toEqual(['first-start']);
    expect(secondTask).not.toHaveBeenCalled();

    releaseFirst?.();
    await Promise.all([first, second]);

    expect(events).toEqual(['first-start', 'first-end', 'second-start']);
  });

  it('allows a retry after a failed initialization', async () => {
    await expect(
      runSerializedDatabaseInitialization('retry.db', async () => {
        throw new Error('first attempt failed');
      }),
    ).rejects.toThrow('first attempt failed');

    await expect(
      runSerializedDatabaseInitialization('retry.db', async () => undefined),
    ).resolves.toBeUndefined();
  });
});
