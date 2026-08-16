import type { SQLiteDatabase } from 'expo-sqlite';

import { getTimezoneOffsetMinutes, toLocalDate } from '@/lib/dates';

export type CategoryBreakdownItem = Readonly<{
  categoryId: number;
  categoryName: string;
  amountMinor: number;
  percentage: number;
  transactionCount: number;
}>;

export type DailyComparisonItem = Readonly<{
  dayName: string;
  dayIndex: number;
  thisWeekMinor: number;
  lastWeekMinor: number;
}>;

export type WeeklyComparison = Readonly<{
  thisWeekTotalMinor: number;
  lastWeekTotalMinor: number;
  percentChange: number; // positive = increased spending, negative = decreased
  dailyBreakdown: readonly DailyComparisonItem[];
}>;

export type MonthlyCashFlowItem = Readonly<{
  monthStart: string;
  monthLabel: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
}>;

export type AnalyticsData = Readonly<{
  referenceDate: string;
  monthStart: string;
  totalExpenseMinor: number;
  totalIncomeMinor: number;
  totalTransactionsCount: number;
  averageDailyExpenseMinor: number;
  topExpenseCategory: CategoryBreakdownItem | null;
  categoryBreakdown: readonly CategoryBreakdownItem[];
  weeklyComparison: WeeklyComparison;
  monthlyCashFlow: readonly MonthlyCashFlowItem[];
}>;

type ExpenseRow = {
  category_id: number;
  category_name: string;
  amount_minor: number;
  tx_count: number;
};

type DailyExpenseRow = {
  local_date: string;
  amount_minor: number;
};

type MonthlyRow = {
  type: string;
  amount_minor: number;
  month_str: string;
};

function parseEpochDays(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
  return Math.floor(date.getTime() / 86_400_000);
}

function formatEpochDays(epochDays: number): string {
  const date = new Date(epochDays * 86_400_000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAY_LABELS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export async function getAnalyticsData(
  database: SQLiteDatabase,
  referenceDateStr?: string,
): Promise<AnalyticsData> {
  const today =
    referenceDateStr || toLocalDate(Date.now(), getTimezoneOffsetMinutes());
  const [yearStr, monthStr, dayStr] = today.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const monthStart = `${yearStr}-${String(month).padStart(2, '0')}-01`;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthStart = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

  // 1. Category Breakdown for current month
  const categoryRows = await database.getAllAsync<ExpenseRow>(
    `SELECT
      c.id AS category_id,
      c.name AS category_name,
      COALESCE(SUM(t.amount_minor), 0) AS amount_minor,
      COUNT(t.id) AS tx_count
    FROM categories c
    INNER JOIN transactions t ON t.category_id = c.id
      AND t.type = 'expense'
      AND t.local_date >= ?
      AND t.local_date < ?
    GROUP BY c.id
    ORDER BY amount_minor DESC`,
    [monthStart, nextMonthStart],
  );

  const totalExpenseMinor = categoryRows.reduce(
    (acc, r) => acc + r.amount_minor,
    0,
  );
  const totalExpenseTxCount = categoryRows.reduce(
    (acc, r) => acc + r.tx_count,
    0,
  );

  const categoryBreakdown: CategoryBreakdownItem[] = categoryRows.map(
    (row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      amountMinor: row.amount_minor,
      percentage:
        totalExpenseMinor > 0
          ? Math.round((row.amount_minor / totalExpenseMinor) * 100)
          : 0,
      transactionCount: row.tx_count,
    }),
  );

  const topExpenseCategory = categoryBreakdown[0] ?? null;
  const daysPassed = Math.max(1, day);
  const averageDailyExpenseMinor = Math.round(totalExpenseMinor / daysPassed);

  // Total income for current month
  const incomeRow = await database.getFirstAsync<{ total_income: number }>(
    `SELECT COALESCE(SUM(amount_minor), 0) AS total_income
     FROM transactions
     WHERE type = 'income' AND local_date >= ? AND local_date < ?`,
    [monthStart, nextMonthStart],
  );
  const totalIncomeMinor = incomeRow?.total_income ?? 0;

  // 2. Weekly Comparison (This Week: last 7 days including today vs Previous 7 days)
  const todayEpochDays = parseEpochDays(today);
  const thisWeekStartEpoch = todayEpochDays - 6;
  const lastWeekStartEpoch = todayEpochDays - 13;
  const lastWeekStartDate = formatEpochDays(lastWeekStartEpoch);

  const dailyRows = await database.getAllAsync<DailyExpenseRow>(
    `SELECT local_date, COALESCE(SUM(amount_minor), 0) AS amount_minor
     FROM transactions
     WHERE type = 'expense' AND local_date >= ? AND local_date <= ?
     GROUP BY local_date`,
    [lastWeekStartDate, today],
  );

  const dailyMap = new Map<string, number>();
  for (const row of dailyRows) {
    dailyMap.set(row.local_date, row.amount_minor);
  }

  const dailyBreakdown: DailyComparisonItem[] = [];
  let thisWeekTotalMinor = 0;
  let lastWeekTotalMinor = 0;

  for (let i = 0; i < 7; i++) {
    const thisDateStr = formatEpochDays(thisWeekStartEpoch + i);
    const lastDateStr = formatEpochDays(lastWeekStartEpoch + i);

    const thisMinor = dailyMap.get(thisDateStr) ?? 0;
    const lastMinor = dailyMap.get(lastDateStr) ?? 0;

    thisWeekTotalMinor += thisMinor;
    lastWeekTotalMinor += lastMinor;

    const dateObj = new Date((thisWeekStartEpoch + i) * 86_400_000);
    const dayOfWeek = dateObj.getUTCDay();

    dailyBreakdown.push({
      dayIndex: i,
      dayName: DAY_LABELS_ID[dayOfWeek] ?? '',
      thisWeekMinor: thisMinor,
      lastWeekMinor: lastMinor,
    });
  }

  let percentChange = 0;
  if (lastWeekTotalMinor > 0) {
    percentChange = Math.round(
      ((thisWeekTotalMinor - lastWeekTotalMinor) / lastWeekTotalMinor) * 100,
    );
  }

  const weeklyComparison: WeeklyComparison = {
    thisWeekTotalMinor,
    lastWeekTotalMinor,
    percentChange,
    dailyBreakdown,
  };

  // 3. Monthly Cash Flow (Last 4 months)
  const sixMonthsAgo = new Date(year, month - 4, 1);
  const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

  const monthlyRows = await database.getAllAsync<MonthlyRow>(
    `SELECT
      type,
      substr(local_date, 1, 7) AS month_str,
      COALESCE(SUM(amount_minor), 0) AS amount_minor
    FROM transactions
    WHERE local_date >= ? AND local_date < ?
    GROUP BY type, month_str
    ORDER BY month_str ASC`,
    [sixMonthsAgoStr, nextMonthStart],
  );

  const monthMap = new Map<string, { income: number; expense: number }>();
  for (let m = 0; m < 4; m++) {
    const d = new Date(year, month - 4 + m, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(mStr, { income: 0, expense: 0 });
  }

  for (const r of monthlyRows) {
    const entry = monthMap.get(r.month_str);
    if (entry) {
      if (r.type === 'income') entry.income += r.amount_minor;
      if (r.type === 'expense') entry.expense += r.amount_minor;
    }
  }

  const monthlyCashFlow: MonthlyCashFlowItem[] = Array.from(
    monthMap.entries(),
  ).map(([mStr, val]) => {
    const [y, m] = mStr.split('-').map(Number);
    const date = new Date(y ?? 0, (m ?? 1) - 1, 1);
    const monthLabel = date.toLocaleDateString('id-ID', {
      month: 'short',
      year: '2-digit',
    });

    return {
      monthStart: `${mStr}-01`,
      monthLabel,
      incomeMinor: val.income,
      expenseMinor: val.expense,
      netMinor: val.income - val.expense,
    };
  });

  return {
    referenceDate: today,
    monthStart,
    totalExpenseMinor,
    totalIncomeMinor,
    totalTransactionsCount: totalExpenseTxCount,
    averageDailyExpenseMinor,
    topExpenseCategory,
    categoryBreakdown,
    weeklyComparison,
    monthlyCashFlow,
  };
}
