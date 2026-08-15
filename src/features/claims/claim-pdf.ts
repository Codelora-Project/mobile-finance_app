import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getClaim } from '@/features/claims/claim-repository';
import { readReceiptBase64 } from '@/features/receipts/receipt-storage';
import { getTimezoneOffsetMinutes, toLocalDate } from '@/lib/dates';
import { createCodedError, isCodedError } from '@/lib/errors';
import { escapeHtml } from '@/lib/html';
import { formatMoney } from '@/lib/money';

export type ClaimPdfExpense = Readonly<{
  amount: string;
  category: string;
  date: string;
  description: string;
  note: string | null;
  receiptDataUri: string | null;
  receiptState: 'attached' | 'missing' | 'unavailable';
}>;

export type ClaimPdfModel = Readonly<{
  claimId: number;
  currencyCode: string;
  description: string | null;
  expenses: readonly ClaimPdfExpense[];
  fileName: string;
  generatedDate: string;
  period: string;
  title: string;
  total: string;
}>;

export type GeneratedClaimPdf = Readonly<{
  fileName: string;
  numberOfPages: number;
  uri: string;
}>;

const EXPORT_DIRECTORY = 'exports';

export function removeCachedClaimPdfs() {
  const directory = new Directory(Paths.cache, EXPORT_DIRECTORY);
  if (directory.exists) {
    directory.delete();
  }
}

export function slugClaimTitle(title: string) {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return slug || 'claim';
}

export function getClaimPdfFileName(title: string, generatedDate: string) {
  return `expense-claim-${slugClaimTitle(title)}-${generatedDate}.pdf`;
}

export async function buildClaimPdfModel(
  database: SQLiteDatabase,
  claimId: number,
  generatedAt = Date.now(),
): Promise<ClaimPdfModel> {
  const claim = await getClaim(database, claimId);
  if (!claim) {
    throw createCodedError('VALIDATION_FAILED', 'Claim not found.');
  }
  if (!claim.currencyCode || claim.expenses.length === 0) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Add at least one expense before exporting this claim.',
    );
  }
  if (!claim.periodStart || !claim.periodEnd) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Set a valid claim period before exporting.',
    );
  }

  const expenses: ClaimPdfExpense[] = [];
  for (const expense of claim.expenses) {
    let receiptDataUri: string | null = null;
    let receiptState: ClaimPdfExpense['receiptState'] = 'missing';
    if (expense.receipt) {
      const base64 = await readReceiptBase64(expense.receipt.storageKey);
      if (base64) {
        receiptDataUri = `data:${expense.receipt.mimeType};base64,${base64}`;
        receiptState = 'attached';
      } else {
        receiptState = 'unavailable';
      }
    }
    expenses.push({
      amount: formatMoney(expense.amountMinor, expense.currencyCode),
      category: expense.categoryName,
      date: expense.localDate,
      description: expense.counterparty?.trim() || expense.categoryName,
      note: expense.note,
      receiptDataUri,
      receiptState,
    });
  }

  const generatedDate = toLocalDate(
    generatedAt,
    getTimezoneOffsetMinutes(generatedAt),
  );
  return {
    claimId: claim.id,
    currencyCode: claim.currencyCode,
    description: claim.description,
    expenses,
    fileName: getClaimPdfFileName(claim.title, generatedDate),
    generatedDate,
    period: `${claim.periodStart} – ${claim.periodEnd}`,
    title: claim.title,
    total: formatMoney(claim.totalMinor, claim.currencyCode),
  };
}

function renderExpenseRows(model: ClaimPdfModel) {
  return model.expenses
    .map(
      (expense) => `
        <tr>
          <td>${escapeHtml(expense.date)}</td>
          <td>
            <strong>${escapeHtml(expense.description)}</strong>
            ${expense.note ? `<div class="note">${escapeHtml(expense.note)}</div>` : ''}
          </td>
          <td>${escapeHtml(expense.category)}</td>
          <td class="amount">${escapeHtml(expense.amount)}</td>
        </tr>`,
    )
    .join('');
}

function renderReceiptAttachments(model: ClaimPdfModel) {
  return model.expenses
    .map((expense, index) => {
      const heading = `Receipt ${index + 1}: ${expense.description}`;
      if (expense.receiptState === 'missing') {
        return `<section class="receipt"><h3>${escapeHtml(heading)}</h3><p>Receipt not attached</p></section>`;
      }
      if (expense.receiptState === 'unavailable' || !expense.receiptDataUri) {
        return `<section class="receipt"><h3>${escapeHtml(heading)}</h3><p>Receipt image unavailable</p></section>`;
      }
      return `<section class="receipt"><h3>${escapeHtml(heading)}</h3><img src="${expense.receiptDataUri}" alt="${escapeHtml(heading)}" /></section>`;
    })
    .join('');
}

export function renderClaimPdfHtml(model: ClaimPdfModel) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { margin: 28px; }
      * { box-sizing: border-box; }
      body { color: #17202a; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.45; }
      h1 { font-size: 24px; margin: 0 0 4px; }
      h2 { border-bottom: 1px solid #d8dee4; font-size: 17px; margin: 28px 0 12px; padding-bottom: 6px; }
      h3 { font-size: 13px; margin: 0 0 8px; overflow-wrap: anywhere; }
      .eyebrow { color: #52606d; font-size: 11px; font-weight: bold; letter-spacing: 1px; }
      .metadata { color: #52606d; margin: 2px 0; }
      .description { margin: 12px 0; white-space: pre-wrap; }
      table { border-collapse: collapse; margin-top: 12px; table-layout: fixed; width: 100%; }
      th, td { border-bottom: 1px solid #d8dee4; padding: 8px 6px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
      th { background: #f4f6f8; }
      th:nth-child(1) { width: 17%; }
      th:nth-child(2) { width: 39%; }
      th:nth-child(3) { width: 24%; }
      th:nth-child(4) { width: 20%; }
      .amount { text-align: right; white-space: nowrap; }
      .note { color: #52606d; margin-top: 3px; white-space: pre-wrap; }
      .total { font-size: 18px; font-weight: bold; margin-top: 14px; text-align: right; }
      .receipt { break-inside: avoid; margin-bottom: 24px; }
      .receipt img { border: 1px solid #d8dee4; display: block; height: auto; max-height: 680px; max-width: 100%; object-fit: contain; }
    </style>
  </head>
  <body>
    <div class="eyebrow">EXPENSE CLAIM</div>
    <h1>${escapeHtml(model.title)}</h1>
    <p class="metadata">Period: ${escapeHtml(model.period)}</p>
    <p class="metadata">Generated: ${escapeHtml(model.generatedDate)}</p>
    ${model.description ? `<p class="description">${escapeHtml(model.description)}</p>` : ''}
    <h2>Expenses</h2>
    <table>
      <thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="amount">Amount</th></tr></thead>
      <tbody>${renderExpenseRows(model)}</tbody>
    </table>
    <div class="total">Total: ${escapeHtml(model.total)} ${escapeHtml(model.currencyCode)}</div>
    <h2>Receipt Attachments</h2>
    ${renderReceiptAttachments(model)}
  </body>
</html>`;
}

export async function generateClaimPdf(
  database: SQLiteDatabase,
  claimId: number,
  generatedAt = Date.now(),
): Promise<GeneratedClaimPdf> {
  let printFile: File | null = null;
  let destination: File | null = null;
  try {
    const model = await buildClaimPdfModel(database, claimId, generatedAt);
    const html = renderClaimPdfHtml(model);
    const result = await Print.printToFileAsync({ html });
    printFile = new File(result.uri);
    if (!printFile.exists) {
      throw new Error('Expo Print did not create a local PDF file.');
    }
    const directory = new Directory(Paths.cache, EXPORT_DIRECTORY);
    directory.create({ idempotent: true, intermediates: true });
    destination = new File(directory, model.fileName);
    if (destination.exists) destination.delete();
    await printFile.move(destination);
    if (!destination.exists) {
      throw new Error('Generated PDF could not be moved to export cache.');
    }
    return {
      fileName: model.fileName,
      numberOfPages: result.numberOfPages,
      uri: destination.uri,
    };
  } catch (error) {
    if (destination?.exists) destination.delete();
    if (printFile?.exists) printFile.delete();
    if (__DEV__) console.warn('Claim PDF generation failed.', error);
    throw createCodedError(
      'PDF_GENERATION_FAILED',
      "We couldn't create this PDF. Check the claim and try again.",
    );
  }
}

export async function shareClaimPdf(
  database: SQLiteDatabase,
  claimId: number,
  generatedAt = Date.now(),
) {
  const generated = await generateClaimPdf(database, claimId, generatedAt);
  try {
    if (!(await Sharing.isAvailableAsync())) {
      throw createCodedError(
        'FILE_OPERATION_FAILED',
        'Sharing is not available on this device.',
      );
    }
    await Sharing.shareAsync(generated.uri, {
      dialogTitle: 'Share expense claim PDF',
      mimeType: 'application/pdf',
      UTI: '.pdf',
    });
  } catch (error) {
    if (isCodedError(error)) throw error;
    throw createCodedError(
      'FILE_OPERATION_FAILED',
      "We couldn't open the share sheet. Try again.",
    );
  }
  return generated;
}
