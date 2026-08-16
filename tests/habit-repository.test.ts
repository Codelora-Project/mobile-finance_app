import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getHabitStats } from '@/features/habits/habit-repository';

const getAllAsync = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
let database: SQLiteDatabase;

beforeEach(() => {
  jest.clearAllMocks();
  database = {
    getAllAsync,
  } as unknown as SQLiteDatabase;
});

describe('habit repository', () => {
  it('calculates current streak, best streak, and no-spend days', async () => {
    getAllAsync.mockResolvedValueOnce([
      { local_date: '2026-08-14', type: 'expense' },
      { local_date: '2026-08-15', type: 'expense' },
      { local_date: '2026-08-16', type: 'income' },
    ]);

    // If today is 2026-08-16: streak should be 3
    const statsToday = await getHabitStats(database, '2026-08-16');
    expect(statsToday.currentStreak).toBe(3);
    expect(statsToday.bestStreak).toBe(3);
    expect(statsToday.currentBadge.emoji).toBe('🔥');
    expect(statsToday.currentBadge.title).toBe('Api Semangat');
    // On 2026-08-16 (day 16 of month): 14 days had 0 expenses
    expect(statsToday.noSpendDaysThisMonth).toBe(14);
  });

  it('resets current streak to 0 if last logged date is older than yesterday', async () => {
    getAllAsync.mockResolvedValueOnce([
      { local_date: '2026-08-10', type: 'expense' },
    ]);

    // Today is 2026-08-17, last logged is 2026-08-10 (> 1 day ago)
    const stats = await getHabitStats(database, '2026-08-17');
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(1);
  });
});
