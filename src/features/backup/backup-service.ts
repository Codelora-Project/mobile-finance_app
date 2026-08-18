import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  BackupAppSetting,
  BackupCategory,
  BackupCategoryBudget,
  BackupClaim,
  BackupClaimItem,
  BackupGoalTransaction,
  BackupPayload,
  BackupPaymentMethod,
  BackupReceipt,
  BackupSavingsGoal,
  BackupStats,
  BackupTransaction,
} from '@/features/backup/backup-types';
import { createCodedError } from '@/lib/errors';

const BACKUP_DIRECTORY = 'backups';
const EXPORT_DIRECTORY = 'exports';

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

export async function fetchBackupStats(
  database: SQLiteDatabase,
): Promise<BackupStats> {
  const [
    txRes,
    catRes,
    pmRes,
    goalRes,
    claimRes,
    budgetRes,
  ] = await Promise.all([
    database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions;',
    ),
    database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories;',
    ),
    database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM payment_methods;',
    ),
    database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM savings_goals;',
    ),
    database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM claims;',
    ),
    database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM category_budgets;',
    ),
  ]);

  return {
    transactionsCount: txRes?.count ?? 0,
    categoriesCount: catRes?.count ?? 0,
    paymentMethodsCount: pmRes?.count ?? 0,
    goalsCount: goalRes?.count ?? 0,
    claimsCount: claimRes?.count ?? 0,
    budgetsCount: budgetRes?.count ?? 0,
  };
}

export async function createBackupPayload(
  database: SQLiteDatabase,
): Promise<BackupPayload> {
  const [
    categories,
    payment_methods,
    transactions,
    receipts,
    claims,
    claim_items,
    app_settings,
    savings_goals,
    goal_transactions,
    category_budgets,
  ] = await Promise.all([
    database.getAllAsync<BackupCategory>(
      'SELECT * FROM categories ORDER BY sort_order ASC, id ASC;',
    ),
    database.getAllAsync<BackupPaymentMethod>(
      'SELECT * FROM payment_methods ORDER BY sort_order ASC, id ASC;',
    ),
    database.getAllAsync<BackupTransaction>(
      'SELECT * FROM transactions ORDER BY id ASC;',
    ),
    database.getAllAsync<BackupReceipt>(
      'SELECT * FROM receipts ORDER BY id ASC;',
    ),
    database.getAllAsync<BackupClaim>('SELECT * FROM claims ORDER BY id ASC;'),
    database.getAllAsync<BackupClaimItem>(
      'SELECT * FROM claim_items ORDER BY id ASC;',
    ),
    database.getAllAsync<BackupAppSetting>(
      'SELECT * FROM app_settings ORDER BY key ASC;',
    ),
    database.getAllAsync<BackupSavingsGoal>(
      'SELECT * FROM savings_goals ORDER BY id ASC;',
    ),
    database.getAllAsync<BackupGoalTransaction>(
      'SELECT * FROM goal_transactions ORDER BY id ASC;',
    ),
    database.getAllAsync<BackupCategoryBudget>(
      'SELECT * FROM category_budgets ORDER BY id ASC;',
    ),
  ]);

  const payload: BackupPayload = {
    app_identifier: 'personal_finance_app',
    version: 1,
    exported_at: new Date().toISOString(),
    app_version: Constants.expoConfig?.version ?? '1.0.0',
    summary: {
      transactions_count: transactions.length,
      categories_count: categories.length,
      payment_methods_count: payment_methods.length,
      goals_count: savings_goals.length,
      claims_count: claims.length,
      budgets_count: category_budgets.length,
    },
    data: {
      categories,
      payment_methods,
      transactions,
      receipts,
      claims,
      claim_items,
      app_settings,
      savings_goals,
      goal_transactions,
      category_budgets,
    },
  };

  return payload;
}

export async function exportBackupToJsonFile(
  database: SQLiteDatabase,
): Promise<{ fileName: string; sizeBytes: number; summary: BackupPayload['summary']; uri: string }> {
  const payload = await createBackupPayload(database);
  const jsonContent = JSON.stringify(payload, null, 2);

  const directory = new Directory(Paths.cache, BACKUP_DIRECTORY);
  directory.create({ idempotent: true, intermediates: true });

  const fileName = `backup_finance_${formatTimestampForFilename()}.json`;
  const file = new File(directory, fileName);
  if (file.exists) file.delete();

  await file.write(jsonContent);

  return {
    uri: file.uri,
    fileName,
    sizeBytes: jsonContent.length,
    summary: payload.summary,
  };
}

export async function shareFile(
  fileUri: string,
  dialogTitle: string,
  mimeType: string,
  uti: string,
): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw createCodedError(
      'FILE_OPERATION_FAILED',
      'Fitur berbagi tidak tersedia di perangkat ini.',
    );
  }

  await Sharing.shareAsync(fileUri, {
    dialogTitle,
    mimeType,
    UTI: uti,
  });
}

export async function pickBackupFile(): Promise<{
  fileName: string;
  payload: BackupPayload;
  stats: BackupStats;
  uri: string;
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const file = new File(asset.uri);
  if (!file.exists) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'File backup tidak ditemukan atau tidak dapat dibaca.',
    );
  }

  let textContent = '';
  try {
    textContent = await file.text();
  } catch (readErr) {
    if (__DEV__) console.warn('Failed to read backup file:', readErr);
    throw createCodedError(
      'VALIDATION_FAILED',
      'Gagal membaca isi file backup. Pastikan file berformat teks JSON.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textContent);
  } catch {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Format file tidak valid (Bukan JSON yang valid).',
    );
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as Record<string, unknown>).app_identifier !==
      'personal_finance_app'
  ) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'File ini bukan file cadangan resmi dari aplikasi Personal Finance.',
    );
  }

  const payload = parsed as BackupPayload;
  if (!payload.data || typeof payload.data !== 'object') {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Struktur data dalam file backup rusak atau tidak lengkap.',
    );
  }

  const stats: BackupStats = {
    transactionsCount: payload.data.transactions?.length ?? 0,
    categoriesCount: payload.data.categories?.length ?? 0,
    paymentMethodsCount: payload.data.payment_methods?.length ?? 0,
    goalsCount: payload.data.savings_goals?.length ?? 0,
    claimsCount: payload.data.claims?.length ?? 0,
    budgetsCount: payload.data.category_budgets?.length ?? 0,
  };

  return {
    uri: asset.uri,
    fileName: asset.name,
    payload,
    stats,
  };
}

export async function restoreBackupData(
  database: SQLiteDatabase,
  payload: BackupPayload,
): Promise<{ stats: BackupStats }> {
  const { data } = payload;

  await database.withTransactionAsync(async () => {
    // 1. Delete all existing data in safe foreign key order
    await database.execAsync(`
      DELETE FROM claim_items;
      DELETE FROM receipts;
      DELETE FROM claims;
      DELETE FROM goal_transactions;
      DELETE FROM category_budgets;
      DELETE FROM transactions;
      DELETE FROM savings_goals;
      DELETE FROM payment_methods;
      DELETE FROM categories;
      DELETE FROM app_settings;
    `);

    // 2. Insert categories
    if (data.categories?.length) {
      for (const c of data.categories) {
        await database.runAsync(
          `INSERT INTO categories (id, name, type, icon_key, system_key, is_default, is_fallback, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            c.id,
            c.name,
            c.type,
            c.icon_key,
            c.system_key,
            c.is_default,
            c.is_fallback,
            c.sort_order,
            c.created_at,
            c.updated_at,
          ],
        );
      }
    }

    // 3. Insert payment methods
    if (data.payment_methods?.length) {
      for (const pm of data.payment_methods) {
        await database.runAsync(
          `INSERT INTO payment_methods (id, name, system_key, is_default, is_fallback, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            pm.id,
            pm.name,
            pm.system_key,
            pm.is_default,
            pm.is_fallback,
            pm.sort_order,
            pm.created_at,
            pm.updated_at,
          ],
        );
      }
    }

    // 4. Insert app settings
    if (data.app_settings?.length) {
      for (const s of data.app_settings) {
        await database.runAsync(
          `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
          [s.key, s.value, s.updated_at],
        );
      }
    }

    // 5. Insert transactions
    if (data.transactions?.length) {
      for (const t of data.transactions) {
        await database.runAsync(
          `INSERT INTO transactions (id, type, amount_minor, currency_code, category_id, payment_method_id, counterparty, note, occurred_at, timezone_offset_minutes, local_date, is_reimbursable, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            t.id,
            t.type,
            t.amount_minor,
            t.currency_code,
            t.category_id,
            t.payment_method_id,
            t.counterparty,
            t.note,
            t.occurred_at,
            t.timezone_offset_minutes,
            t.local_date,
            t.is_reimbursable,
            t.created_at,
            t.updated_at,
          ],
        );
      }
    }

    // 6. Insert receipts
    if (data.receipts?.length) {
      for (const r of data.receipts) {
        await database.runAsync(
          `INSERT INTO receipts (id, transaction_id, storage_key, mime_type, ocr_status, ocr_raw_text, subtotal_minor, tax_minor, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            r.id,
            r.transaction_id,
            r.storage_key,
            r.mime_type,
            r.ocr_status,
            r.ocr_raw_text,
            r.subtotal_minor,
            r.tax_minor,
            r.created_at,
            r.updated_at,
          ],
        );
      }
    }

    // 7. Insert claims
    if (data.claims?.length) {
      for (const cl of data.claims) {
        await database.runAsync(
          `INSERT INTO claims (id, title, description, status, period_mode, period_start, period_end, submitted_at, reimbursed_at, rejected_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            cl.id,
            cl.title,
            cl.description,
            cl.status,
            cl.period_mode,
            cl.period_start,
            cl.period_end,
            cl.submitted_at,
            cl.reimbursed_at,
            cl.rejected_at,
            cl.created_at,
            cl.updated_at,
          ],
        );
      }
    }

    // 8. Insert claim items
    if (data.claim_items?.length) {
      for (const ci of data.claim_items) {
        await database.runAsync(
          `INSERT INTO claim_items (id, claim_id, transaction_id, created_at)
           VALUES (?, ?, ?, ?);`,
          [ci.id, ci.claim_id, ci.transaction_id, ci.created_at],
        );
      }
    }

    // 9. Insert savings goals
    if (data.savings_goals?.length) {
      for (const g of data.savings_goals) {
        await database.runAsync(
          `INSERT INTO savings_goals (id, name, target_amount_minor, current_amount_minor, icon_key, color_key, target_date, is_completed, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            g.id,
            g.name,
            g.target_amount_minor,
            g.current_amount_minor,
            g.icon_key,
            g.color_key,
            g.target_date,
            g.is_completed,
            g.created_at,
            g.updated_at,
          ],
        );
      }
    }

    // 10. Insert goal transactions
    if (data.goal_transactions?.length) {
      for (const gt of data.goal_transactions) {
        await database.runAsync(
          `INSERT INTO goal_transactions (id, goal_id, type, amount_minor, note, occurred_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            gt.id,
            gt.goal_id,
            gt.type,
            gt.amount_minor,
            gt.note,
            gt.occurred_at,
            gt.created_at,
          ],
        );
      }
    }

    // 11. Insert category budgets
    if (data.category_budgets?.length) {
      for (const cb of data.category_budgets) {
        await database.runAsync(
          `INSERT INTO category_budgets (id, category_id, monthly_limit_minor, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?);`,
          [
            cb.id,
            cb.category_id,
            cb.monthly_limit_minor,
            cb.created_at,
            cb.updated_at,
          ],
        );
      }
    }
  });

  return {
    stats: {
      transactionsCount: data.transactions?.length ?? 0,
      categoriesCount: data.categories?.length ?? 0,
      paymentMethodsCount: data.payment_methods?.length ?? 0,
      goalsCount: data.savings_goals?.length ?? 0,
      claimsCount: data.claims?.length ?? 0,
      budgetsCount: data.category_budgets?.length ?? 0,
    },
  };
}

function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) {
    return '""';
  }
  const str = String(field);
  // If field contains quotes, commas, or newlines, wrap with quotes and escape internal quotes
  if (
    str.includes('"') ||
    str.includes(',') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
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

export async function exportTransactionsCsvFile(
  database: SQLiteDatabase,
  options: ExportCsvOptions = {},
): Promise<{ count: number; fileName: string; uri: string }> {
  const language = options.language ?? 'id';
  let dateFrom = options.dateFrom;
  let dateTo = options.dateTo;
  let filenamePrefix = 'laporan_transaksi';

  if (options.scope === 'this_month') {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();
    dateFrom = `${yyyy}-${mm}-01`;
    dateTo = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
    filenamePrefix = `laporan_transaksi_${yyyy}_${mm}`;
  }

  const queryParams: unknown[] = [];
  let whereClause = '';
  if (dateFrom && dateTo) {
    whereClause = 'WHERE t.local_date >= ? AND t.local_date <= ?';
    queryParams.push(dateFrom, dateTo);
  }

  const rows = await database.getAllAsync<CsvTransactionRow>(
    `SELECT 
       t.id,
       t.type,
       t.amount_minor,
       t.currency_code,
       c.name AS category_name,
       pm.name AS payment_method_name,
       t.counterparty,
       t.note,
       t.local_date,
       t.occurred_at,
       t.is_reimbursable,
       cl.title AS claim_title,
       cl.status AS claim_status
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
     LEFT JOIN claim_items ci ON ci.transaction_id = t.id
     LEFT JOIN claims cl ON ci.claim_id = cl.id
     ${whereClause}
     ORDER BY t.local_date DESC, t.id DESC;`,
    ...queryParams as any,
  );

  const isEn = language === 'en';
  const headers = isEn
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

  for (const r of rows) {
    const typeLabel = isEn
      ? r.type === 'expense'
        ? 'Expense'
        : 'Income'
      : r.type === 'expense'
        ? 'Pengeluaran'
        : 'Pemasukan';
    const amountVal = r.amount_minor;
    const reimbursableLabel = isEn
      ? r.is_reimbursable
        ? 'Yes'
        : 'No'
      : r.is_reimbursable
        ? 'Ya'
        : 'Tidak';

    const line = [
      r.id,
      r.local_date,
      typeLabel,
      r.category_name ?? '-',
      r.payment_method_name ?? '-',
      amountVal,
      r.currency_code,
      r.counterparty ?? '',
      r.note ?? '',
      reimbursableLabel,
      r.claim_title ?? '',
      r.claim_status ?? '',
    ];

    csvLines.push(line.map(escapeCsvField).join(','));
  }

  // Prepend UTF-8 BOM so Excel opens it with proper UTF-8 character rendering
  const csvContent = '\uFEFF' + csvLines.join('\r\n');

  const directory = new Directory(Paths.cache, EXPORT_DIRECTORY);
  directory.create({ idempotent: true, intermediates: true });

  const fileName =
    options.scope === 'this_month'
      ? `${filenamePrefix}.csv`
      : `${filenamePrefix}_${formatTimestampForFilename()}.csv`;
  const file = new File(directory, fileName);
  if (file.exists) file.delete();

  await file.write(csvContent);

  return {
    count: rows.length,
    fileName,
    uri: file.uri,
  };
}
