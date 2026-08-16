import type { SQLiteDatabase } from 'expo-sqlite';

import { getTimezoneOffsetMinutes, toLocalDate } from '@/lib/dates';

export type StreakBadge = Readonly<{
  title: string;
  emoji: string;
  minDays: number;
}>;

export const STREAK_BADGES: readonly StreakBadge[] = [
  { emoji: '🌱', minDays: 1, title: 'Pemula Disiplin' },
  { emoji: '🔥', minDays: 3, title: 'Api Semangat' },
  { emoji: '⚡', minDays: 7, title: '1 Minggu Konsisten' },
  { emoji: '🌟', minDays: 14, title: '2 Minggu Juara' },
  { emoji: '💎', minDays: 30, title: 'Master Finansial 1 Bulan' },
  { emoji: '👑', minDays: 60, title: 'Legenda Disiplin' },
];

export type HabitStats = Readonly<{
  currentStreak: number;
  bestStreak: number;
  noSpendDaysThisMonth: number;
  activeLoggingDaysThisMonth: number;
  currentBadge: StreakBadge;
  nextBadge: StreakBadge | null;
}>;

type DateTypeRow = {
  local_date: string;
  type: 'expense' | 'income';
};

function parseDateToEpochDays(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return 0;
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function getBadge(streak: number): {
  current: StreakBadge;
  next: StreakBadge | null;
} {
  let current = STREAK_BADGES[0]!;
  let next: StreakBadge | null = null;

  for (let i = 0; i < STREAK_BADGES.length; i++) {
    const badge = STREAK_BADGES[i]!;
    if (streak >= badge.minDays) {
      current = badge;
      next = STREAK_BADGES[i + 1] ?? null;
    } else {
      if (!next) next = badge;
      break;
    }
  }

  return { current, next };
}

export async function getHabitStats(
  database: SQLiteDatabase,
  todayStr: string = toLocalDate(Date.now(), getTimezoneOffsetMinutes()),
): Promise<HabitStats> {
  const rows = await database.getAllAsync<DateTypeRow>(
    `SELECT DISTINCT local_date, type FROM transactions ORDER BY local_date ASC`,
  );

  const distinctLoggingDates = Array.from(
    new Set(rows.map((r) => r.local_date)),
  ).sort();

  const todayEpochDays = parseDateToEpochDays(todayStr);

  // Calculate current streak & best streak
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  let prevEpochDays: number | null = null;

  for (const dateStr of distinctLoggingDates) {
    const epochDays = parseDateToEpochDays(dateStr);
    if (prevEpochDays === null) {
      tempStreak = 1;
    } else if (epochDays === prevEpochDays + 1) {
      tempStreak += 1;
    } else if (epochDays > prevEpochDays + 1) {
      tempStreak = 1;
    }
    prevEpochDays = epochDays;
    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
  }

  // Check if the streak is currently active (includes today or yesterday)
  if (distinctLoggingDates.length > 0) {
    const lastDate = distinctLoggingDates[distinctLoggingDates.length - 1]!;
    const lastEpochDays = parseDateToEpochDays(lastDate);

    // Active if recorded today or yesterday
    if (
      lastEpochDays === todayEpochDays ||
      lastEpochDays === todayEpochDays - 1
    ) {
      let streakCount = 1;
      for (let i = distinctLoggingDates.length - 1; i > 0; i--) {
        const curr = parseDateToEpochDays(distinctLoggingDates[i]!);
        const prev = parseDateToEpochDays(distinctLoggingDates[i - 1]!);
        if (curr - prev === 1) {
          streakCount += 1;
        } else {
          break;
        }
      }
      currentStreak = streakCount;
    } else {
      currentStreak = 0;
    }
  }

  // Calculate monthly stats
  const currentMonthPrefix = todayStr.slice(0, 7); // "YYYY-MM"
  const currentDayNum = parseInt(todayStr.slice(8, 10), 10) || 1;

  const monthExpenseDates = new Set(
    rows
      .filter(
        (r) =>
          r.local_date.startsWith(currentMonthPrefix) && r.type === 'expense',
      )
      .map((r) => r.local_date),
  );

  const monthLoggingDates = new Set(
    rows
      .filter((r) => r.local_date.startsWith(currentMonthPrefix))
      .map((r) => r.local_date),
  );

  // No-spend days: days passed so far this month where expense count is 0
  let noSpendDaysCount = 0;
  for (let day = 1; day <= currentDayNum; day++) {
    const dayStr = `${currentMonthPrefix}-${String(day).padStart(2, '0')}`;
    if (!monthExpenseDates.has(dayStr)) {
      noSpendDaysCount += 1;
    }
  }

  const { current, next } = getBadge(currentStreak);

  return {
    currentStreak,
    bestStreak,
    noSpendDaysThisMonth: noSpendDaysCount,
    activeLoggingDaysThisMonth: monthLoggingDates.size,
    currentBadge: current,
    nextBadge: next,
  };
}
