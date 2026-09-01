import * as Sharing from 'expo-sharing';
import { Alert, Share } from 'react-native';

import { useReceiptStorage } from '@/features/receipts/receipt-storage-context';
import type { Transaction } from '@/features/transactions/transaction-repository';
import { getTimezoneOffsetMinutes, toLocalDateTimeInput } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

export function useTransactionShare({
  language,
  transaction,
}: {
  language: 'id' | 'en';
  transaction: Transaction | null;
}) {
  const receiptStorage = useReceiptStorage();

  async function shareTextSlip() {
    if (!transaction) return;
    let dateStr = transaction.localDate || '';
    let timeStr = '';
    try {
      const offset = Number.isInteger(transaction.timezoneOffsetMinutes)
        ? (transaction.timezoneOffsetMinutes as number)
        : getTimezoneOffsetMinutes(transaction.occurredAt || Date.now());
      const dt = toLocalDateTimeInput(
        transaction.occurredAt || Date.now(),
        offset,
      );
      dateStr = dt.date;
      timeStr = dt.time;
    } catch {
      // Fallback
    }

    const isExpense = transaction.type === 'expense';
    const isTransfer = transaction.type === 'transfer';
    const typeLabel = isTransfer
      ? 'TRANSFER'
      : isExpense
        ? language === 'id'
          ? 'PENGELUARAN'
          : 'EXPENSE'
        : language === 'id'
          ? 'PEMASUKAN'
          : 'INCOME';

    const amountFormatted = formatMoney(
      transaction.amountMinor,
      transaction.currencyCode,
    );
    const sign = isTransfer ? '' : isExpense ? '−' : '+';

    let detailLines = '';
    if (isTransfer) {
      detailLines = `Dari: ${transaction.paymentMethodName || '-'}\nKe: ${
        transaction.transferToPaymentMethodName || '-'
      }`;
      if (transaction.transferFeeMinor > 0) {
        detailLines += `\nBiaya Admin: ${formatMoney(
          transaction.transferFeeMinor,
          transaction.currencyCode,
        )}`;
      }
    } else {
      detailLines = `Kategori: ${transaction.categoryName}\n${
        isExpense ? 'Toko/Merchant' : 'Sumber'
      }: ${transaction.counterparty || '-'}\nMetode: ${
        transaction.paymentMethodName || '-'
      }`;
    }

    const noteLine = transaction.note ? `\nCatatan: ${transaction.note}` : '';
    const timeDisplay = timeStr ? ` ${timeStr}` : '';

    const message =
      `🧾 *BUKTI TRANSAKSI*\n` +
      `─────────────────────────\n` +
      `No. Ref : #${transaction.id}\n` +
      `Waktu   : ${dateStr}${timeDisplay}\n` +
      `Tipe    : ${typeLabel}\n` +
      `Nominal : ${sign}${amountFormatted}\n` +
      `─────────────────────────\n` +
      `${detailLines}${noteLine}\n` +
      `─────────────────────────\n` +
      `Dicatat via KeuanganKu`;

    await Share.share(
      {
        message,
        title: language === 'id' ? 'Bukti Transaksi' : 'Transaction Receipt',
      },
      {
        dialogTitle:
          language === 'id'
            ? 'Bagikan Bukti Transaksi'
            : 'Share Transaction Receipt',
      },
    );
  }

  async function handleShareSlip() {
    if (!transaction) return;

    try {
      let hasImage = false;
      let imageUri = '';
      try {
        if (
          transaction.receipt &&
          receiptStorage.exists(transaction.receipt.storageKey)
        ) {
          hasImage = true;
          imageUri = receiptStorage.getUri(transaction.receipt.storageKey);
        }
      } catch {
        hasImage = false;
      }

      if (hasImage && imageUri) {
        try {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(imageUri, {
              dialogTitle:
                language === 'id'
                  ? 'Bagikan Foto Struk'
                  : 'Share Receipt Image',
              mimeType: transaction.receipt?.mimeType || 'image/jpeg',
            });
            return;
          }
        } catch {
          // Fallback to text share if native file sharing is cancelled/fails
        }
      }

      await shareTextSlip();
    } catch (shareErr) {
      if (__DEV__) {
        console.warn('Share failed:', shareErr);
      }
      Alert.alert(
        language === 'id' ? 'Gagal Membagikan' : 'Share Failed',
        language === 'id'
          ? 'Tidak dapat membuka menu berbagi pada perangkat ini.'
          : 'Could not open share menu on this device.',
      );
    }
  }

  return {
    handleShareSlip,
    shareTextSlip,
  };
}
