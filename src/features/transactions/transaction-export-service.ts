import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { TransactionListItem } from '@/features/transactions/transaction-repository';
import { toLocalDateTimeInput } from '@/lib/dates';
import { createCodedError } from '@/lib/errors';

function formatTimestampForFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportTransactionsToCsv(
  transactions: readonly TransactionListItem[],
  language: 'id' | 'en' = 'id',
): Promise<{ fileName: string; uri: string }> {
  const headers =
    language === 'id'
      ? [
          'ID',
          'Tanggal',
          'Waktu',
          'Tipe',
          'Kategori',
          'Deskripsi / Merchant',
          'Nominal',
          'Mata Uang',
          'Metode Pembayaran',
          'Tujuan Transfer',
          'Ada Struk',
          'Reimburse',
        ]
      : [
          'ID',
          'Date',
          'Time',
          'Type',
          'Category',
          'Description / Merchant',
          'Amount Minor',
          'Currency',
          'Payment Method',
          'Transfer Destination',
          'Has Receipt',
          'Reimbursable',
        ];

  const rows = transactions.map((t) => {
    let timeStr = '';
    try {
      if (t.occurredAt) {
        const { time } = toLocalDateTimeInput(
          t.occurredAt,
          t.timezoneOffsetMinutes ?? 0,
        );
        timeStr = time;
      }
    } catch {
      timeStr = '';
    }

    const typeLabel =
      language === 'id'
        ? t.type === 'expense'
          ? 'Pengeluaran'
          : t.type === 'income'
            ? 'Pemasukan'
            : 'Transfer'
        : t.type.toUpperCase();

    return [
      escapeCsvField(t.id),
      escapeCsvField(t.localDate),
      escapeCsvField(timeStr),
      escapeCsvField(typeLabel),
      escapeCsvField(t.categoryName),
      escapeCsvField(t.counterparty ?? ''),
      escapeCsvField(t.amountMinor),
      escapeCsvField(t.currencyCode),
      escapeCsvField(t.paymentMethodName ?? ''),
      escapeCsvField(t.transferToPaymentMethodName ?? ''),
      escapeCsvField(
        t.hasReceipt
          ? language === 'id'
            ? 'Ya'
            : 'Yes'
          : language === 'id'
            ? 'Tidak'
            : 'No',
      ),
      escapeCsvField(
        t.isReimbursable
          ? language === 'id'
            ? 'Ya'
            : 'Yes'
          : language === 'id'
            ? 'Tidak'
            : 'No',
      ),
    ].join(',');
  });

  // Include UTF-8 BOM (\uFEFF) for proper UTF-8 Excel rendering
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

  const directory = new Directory(Paths.cache, 'exports');
  directory.create({ idempotent: true, intermediates: true });

  const fileName = `transaksi_${formatTimestampForFilename()}.csv`;
  const file = new File(directory, fileName);
  if (file.exists) file.delete();

  await file.write(csvContent);

  return {
    fileName,
    uri: file.uri,
  };
}

export async function shareTransactionCsv(
  fileUri: string,
  dialogTitle = 'Ekspor Transaksi',
): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw createCodedError(
      'FILE_OPERATION_FAILED',
      'Fitur berbagi file tidak tersedia di perangkat ini.',
    );
  }

  await Sharing.shareAsync(fileUri, {
    dialogTitle,
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}
