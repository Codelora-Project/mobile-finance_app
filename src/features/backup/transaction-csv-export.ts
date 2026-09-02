import { File } from 'expo-file-system';
import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import { formatTimestampForFilename } from '@/features/backup/backup-utils';
import { resetManagedCacheDirectory } from '@/lib/storage/managed-cache';

const EXPORT_DIRECTORY = 'exports';

function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) return '""';
  const value = String(field);
  return `"${value.replace(/"/g, '""')}"`;
}

type CsvTransactionRow = {
  amount_minor: number;
  category_name: string | null;
  claim_status: string | null;
  claim_title: string | null;
  counterparty: string | null;
  currency_code: string;
  id: number;
  is_reimbursable: number;
  local_date: string;
  note: string | null;
  occurred_at: number;
  payment_method_name: string | null;
  type: string;
};

export type ExportCsvOptions = {
  dateFrom?: string;
  dateTo?: string;
  language?: 'id' | 'en';
  scope?: 'this_month' | 'all';
};

function resolveCsvPeriod(options: ExportCsvOptions) {
  if (options.scope !== 'this_month') {
    return {
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      filenamePrefix: 'laporan_transaksi',
    };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    dateFrom: `${year}-${month}-01`,
    dateTo: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
    filenamePrefix: `laporan_transaksi_${year}_${month}`,
  };
}

function transactionTypeLabel(type: string, isEnglish: boolean) {
  if (type === 'expense') return isEnglish ? 'Expense' : 'Pengeluaran';
  if (type === 'income') return isEnglish ? 'Income' : 'Pemasukan';
  return 'Transfer';
}

export async function exportTransactionsCsvFile(
  database: SQLiteDatabase,
  options: ExportCsvOptions = {},
): Promise<{ count: number; fileName: string; uri: string }> {
  const { dateFrom, dateTo, filenamePrefix } = resolveCsvPeriod(options);
  const queryParams: SQLiteBindValue[] = [];
  let whereClause = '';
  if (dateFrom && dateTo) {
    whereClause = 'WHERE t.local_date >= ? AND t.local_date <= ?';
    queryParams.push(dateFrom, dateTo);
  }

  const rows = await database.getAllAsync<CsvTransactionRow>(
    `SELECT
       t.id, t.type, t.amount_minor, t.currency_code,
       c.name AS category_name, pm.name AS payment_method_name,
       t.counterparty, t.note, t.local_date, t.occurred_at,
       t.is_reimbursable, cl.title AS claim_title, cl.status AS claim_status
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
     LEFT JOIN claim_items ci ON ci.transaction_id = t.id
     LEFT JOIN claims cl ON ci.claim_id = cl.id
     ${whereClause}
     ORDER BY t.local_date DESC, t.id DESC;`,
    ...queryParams,
  );

  const isEnglish = options.language === 'en';
  const headers = isEnglish
    ? [
        'ID',
        'Date',
        'Type',
        'Category',
        'Payment Method',
        'Amount',
        'Currency',
        'Merchant / Payee',
        'Note',
        'Reimbursable',
        'Claim Title',
        'Claim Status',
      ]
    : [
        'ID',
        'Tanggal',
        'Tipe',
        'Kategori',
        'Metode Pembayaran',
        'Nominal',
        'Mata Uang',
        'Merchant / Pihak Terkait',
        'Catatan',
        'Dapat Diklaim',
        'Judul Klaim',
        'Status Klaim',
      ];

  const csvLines = [headers.map(escapeCsvField).join(',')];
  for (const row of rows) {
    csvLines.push(
      [
        row.id,
        row.local_date,
        transactionTypeLabel(row.type, isEnglish),
        row.category_name ?? '-',
        row.payment_method_name ?? '-',
        row.amount_minor,
        row.currency_code,
        row.counterparty ?? '',
        row.note ?? '',
        isEnglish
          ? row.is_reimbursable
            ? 'Yes'
            : 'No'
          : row.is_reimbursable
            ? 'Ya'
            : 'Tidak',
        row.claim_title ?? '',
        row.claim_status ?? '',
      ]
        .map(escapeCsvField)
        .join(','),
    );
  }

  const fileName =
    options.scope === 'this_month'
      ? `${filenamePrefix}.csv`
      : `${filenamePrefix}_${formatTimestampForFilename()}.csv`;
  if (rows.length === 0) return { count: 0, fileName, uri: '' };

  const directory = resetManagedCacheDirectory(EXPORT_DIRECTORY);
  const file = new File(directory, fileName);
  if (file.exists) file.delete();
  await file.write(`\uFEFF${csvLines.join('\r\n')}`);

  return { count: rows.length, fileName, uri: file.uri };
}
