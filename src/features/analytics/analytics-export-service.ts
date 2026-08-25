import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { AnalyticsData } from '@/features/analytics/analytics-repository';
import { createCodedError } from '@/lib/errors';

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[,"\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function row(values: readonly (string | number | null | undefined)[]) {
  return values.map(escapeCsvField).join(',');
}

export async function exportAnalyticsReportToCsv(
  analytics: AnalyticsData,
  currencyCode: string,
  language: 'id' | 'en',
): Promise<{ fileName: string; uri: string }> {
  const netFlowMinor = analytics.totalIncomeMinor - analytics.totalExpenseMinor;
  const labels =
    language === 'id'
      ? {
          amount: 'Nominal (unit minor)',
          categories: 'Rincian Kategori',
          category: 'Kategori',
          expense: 'Pengeluaran',
          income: 'Pemasukan',
          metric: 'Metrik',
          monthly: 'Arus Kas Bulanan',
          net: 'Arus Bersih',
          overview: 'Ringkasan',
          percentage: 'Persentase',
          period: 'Periode',
          transactions: 'Jumlah Transaksi',
          value: 'Nilai',
        }
      : {
          amount: 'Amount (minor units)',
          categories: 'Category Breakdown',
          category: 'Category',
          expense: 'Expenses',
          income: 'Income',
          metric: 'Metric',
          monthly: 'Monthly Cash Flow',
          net: 'Net Flow',
          overview: 'Overview',
          percentage: 'Percentage',
          period: 'Period',
          transactions: 'Transaction Count',
          value: 'Value',
        };

  const lines = [
    row([labels.overview]),
    row([labels.metric, labels.value, 'Currency']),
    row([labels.period, analytics.monthStart.slice(0, 7), currencyCode]),
    row([labels.income, analytics.totalIncomeMinor, currencyCode]),
    row([labels.expense, analytics.totalExpenseMinor, currencyCode]),
    row([labels.net, netFlowMinor, currencyCode]),
    row([labels.transactions, analytics.totalTransactionsCount, '']),
    '',
    row([labels.categories]),
    row([
      labels.category,
      labels.amount,
      labels.percentage,
      labels.transactions,
    ]),
    ...analytics.categoryBreakdown.map((category) =>
      row([
        category.categoryName,
        category.amountMinor,
        `${category.percentage}%`,
        category.transactionCount,
      ]),
    ),
    '',
    row([labels.monthly]),
    row([labels.period, labels.income, labels.expense, labels.net]),
    ...analytics.monthlyCashFlow.map((month) =>
      row([
        month.monthStart.slice(0, 7),
        month.incomeMinor,
        month.expenseMinor,
        month.netMinor,
      ]),
    ),
  ];

  const directory = new Directory(Paths.cache, 'exports');
  directory.create({ idempotent: true, intermediates: true });
  const fileName = `financial_report_${analytics.monthStart.slice(0, 7)}.csv`;
  const file = new File(directory, fileName);
  if (file.exists) file.delete();
  await file.write(`\uFEFF${lines.join('\r\n')}`);

  return { fileName, uri: file.uri };
}

export async function shareAnalyticsReportCsv(
  uri: string,
  dialogTitle: string,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw createCodedError(
      'FILE_OPERATION_FAILED',
      'File sharing is not available on this device.',
    );
  }

  await Sharing.shareAsync(uri, {
    dialogTitle,
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}
