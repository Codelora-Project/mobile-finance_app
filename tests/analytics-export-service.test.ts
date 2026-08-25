import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  exportAnalyticsReportToCsv,
  shareAnalyticsReportCsv,
} from '@/features/analytics/analytics-export-service';
import type { AnalyticsData } from '@/features/analytics/analytics-repository';

const mockWrites = new Map<string, string>();
const mockIsAvailableAsync = jest.fn<() => Promise<boolean>>();
const mockShareAsync = jest.fn<(...args: unknown[]) => Promise<void>>();

jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

jest.mock('expo-file-system', () => {
  class MockDirectory {
    uri: string;

    constructor(parent: { uri: string }, name: string) {
      this.uri = `${parent.uri}${name}/`;
    }

    create() {}
  }

  class MockFile {
    uri: string;

    constructor(parent: { uri: string }, name: string) {
      this.uri = `${parent.uri}${name}`;
    }

    get exists() {
      return mockWrites.has(this.uri);
    }

    delete() {
      mockWrites.delete(this.uri);
    }

    async write(content: string) {
      mockWrites.set(this.uri, content);
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { cache: { uri: 'file:///cache/' } },
  };
});

const analytics: AnalyticsData = {
  averageDailyExpenseMinor: 100_000,
  categoryBreakdown: [
    {
      amountMinor: 600_000,
      categoryId: 1,
      categoryName: 'Food, Drink',
      percentage: 60,
      transactionCount: 4,
    },
  ],
  monthStart: '2026-08-01',
  monthlyCashFlow: [
    {
      expenseMinor: 600_000,
      incomeMinor: 2_000_000,
      monthLabel: 'Agu 26',
      monthStart: '2026-08-01',
      netMinor: 1_400_000,
    },
  ],
  referenceDate: '2026-08-25',
  topExpenseCategory: null,
  totalExpenseMinor: 600_000,
  totalIncomeMinor: 2_000_000,
  totalTransactionsCount: 4,
  weeklyComparison: {
    dailyBreakdown: [],
    lastWeekTotalMinor: 0,
    percentChange: 0,
    thisWeekTotalMinor: 0,
  },
};

describe('analytics export service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWrites.clear();
    mockIsAvailableAsync.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue();
  });

  it('creates a localized CSV snapshot for the selected period', async () => {
    const result = await exportAnalyticsReportToCsv(analytics, 'IDR', 'id');

    expect(result).toEqual({
      fileName: 'financial_report_2026-08.csv',
      uri: 'file:///cache/exports/financial_report_2026-08.csv',
    });
    const content = mockWrites.get(result.uri);
    expect(content).toContain('\uFEFFRingkasan');
    expect(content).toContain('Arus Bersih,1400000,IDR');
    expect(content).toContain('"Food, Drink",600000,60%,4');
  });

  it('shares the CSV using the platform share sheet', async () => {
    await shareAnalyticsReportCsv(
      'file:///cache/exports/report.csv',
      'Ekspor Laporan Finansial',
    );

    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///cache/exports/report.csv',
      expect.objectContaining({ mimeType: 'text/csv' }),
    );
  });

  it('fails clearly when file sharing is unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(
      shareAnalyticsReportCsv('file:///cache/exports/report.csv', 'Export'),
    ).rejects.toMatchObject({ code: 'FILE_OPERATION_FAILED' });
  });
});
