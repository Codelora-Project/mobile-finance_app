import { defaultCategories, defaultPaymentMethods } from '@/db/seeds';
import type { Category } from '@/features/categories/category-repository';
import type { PaymentMethod } from '@/features/payment-methods/payment-method-repository';
import type { ManualReceiptSelection } from '@/features/transactions/manual-receipt-picker';
import type {
  SaveTransactionInput,
  Transaction,
  TransactionType,
} from '@/features/transactions/transaction-repository';
import {
  getTimezoneOffsetMinutes,
  parseLocalDateTimeInput,
  toLocalDateTimeInput,
} from '@/lib/dates';
import { formatMoneyInput, parseMoneyInput } from '@/lib/money';

export type SelectedReference = Readonly<{ id: number; name: string }>;

export type FormErrors = Partial<
  Record<
    | 'amount'
    | 'category'
    | 'dateTime'
    | 'note'
    | 'paymentMethod'
    | 'transferToPaymentMethod'
    | 'transferFeeAmount'
    | 'receipt'
    | 'submit',
    string
  >
>;

export type FormState = {
  amount: string;
  category: SelectedReference | null;
  counterparty: string;
  date: string;
  isReimbursable: boolean;
  note: string;
  paymentMethod: SelectedReference | null;
  transferToPaymentMethod: SelectedReference | null;
  hasTransferFee: boolean;
  transferFeeAmount: string;
  transferFeeCategory: Category | null;
  transferFeeNote: string;
  receipt: ManualReceiptSelection | null;
  time: string;
  type: TransactionType;
};

export const INITIAL_CATEGORIES: Category[] = defaultCategories.map(
  (category, index) => ({
    createdAt: 0,
    iconKey: null,
    id: index + 1,
    isDefault: true,
    isFallback: !!category.isFallback,
    name: category.name,
    sortOrder: index,
    systemKey: category.systemKey,
    type: category.type,
    updatedAt: 0,
  }),
);

export const INITIAL_PAYMENT_METHODS: PaymentMethod[] =
  defaultPaymentMethods.map((paymentMethod, index) => ({
    createdAt: 0,
    id: index + 1,
    isDefault: true,
    isFallback: false,
    name: paymentMethod.name,
    sortOrder: index,
    systemKey: paymentMethod.systemKey,
    updatedAt: 0,
  }));

export function createDefaultForm(
  initialCategory?: SelectedReference | null,
  initialType?: TransactionType,
  initialPaymentMethod?: SelectedReference | null,
): FormState {
  const now = Date.now();
  const dateTime = toLocalDateTimeInput(now, getTimezoneOffsetMinutes(now));
  const defaultMethod = INITIAL_PAYMENT_METHODS[0];
  return {
    amount: '',
    category: initialCategory ?? null,
    counterparty: '',
    date: dateTime.date,
    hasTransferFee: false,
    isReimbursable: false,
    note: '',
    paymentMethod:
      initialPaymentMethod ??
      (defaultMethod
        ? { id: defaultMethod.id, name: defaultMethod.name }
        : null),
    receipt: null,
    time: dateTime.time,
    transferFeeAmount: '',
    transferFeeCategory: null,
    transferFeeNote: '',
    transferToPaymentMethod: null,
    type: initialType ?? 'expense',
  };
}

function getReceiptDisplayName(storageKey: string) {
  const fileName = storageKey.split(/[\\/]/).at(-1)?.split(/[?#]/, 1)[0];
  return fileName?.trim() || 'Receipt image';
}

export function formFromTransaction(transaction: Transaction): FormState {
  const dateTime = toLocalDateTimeInput(
    transaction.occurredAt,
    transaction.timezoneOffsetMinutes,
  );
  const hasFee = (transaction.transferFeeMinor ?? 0) > 0;

  return {
    amount: formatMoneyInput(transaction.amountMinor, transaction.currencyCode),
    category: {
      id: transaction.categoryId,
      name: transaction.categoryName,
    },
    counterparty: transaction.counterparty ?? '',
    date: dateTime.date,
    hasTransferFee: hasFee,
    isReimbursable: transaction.isReimbursable,
    note: transaction.note ?? '',
    paymentMethod:
      transaction.paymentMethodId !== null &&
      transaction.paymentMethodName !== null
        ? {
            id: transaction.paymentMethodId,
            name: transaction.paymentMethodName,
          }
        : null,
    receipt: transaction.receipt
      ? {
          displayName: getReceiptDisplayName(transaction.receipt.storageKey),
          mimeType: transaction.receipt.mimeType,
          sourceImageUri: transaction.receipt.storageKey,
        }
      : null,
    time: dateTime.time,
    transferFeeAmount: hasFee
      ? formatMoneyInput(transaction.transferFeeMinor, transaction.currencyCode)
      : '',
    transferFeeCategory: null,
    transferFeeNote: transaction.transferFeeNote ?? '',
    transferToPaymentMethod:
      transaction.transferToPaymentMethodId !== null &&
      transaction.transferToPaymentMethodName !== null
        ? {
            id: transaction.transferToPaymentMethodId,
            name: transaction.transferToPaymentMethodName,
          }
        : null,
    type: transaction.type,
  };
}

export function buildSaveInput(
  form: FormState,
  currencyCode = 'IDR',
  fallbackCategoryId = 1,
  language: 'id' | 'en' = 'id',
) {
  const errors: FormErrors = {};
  let amountMinor: number | null = null;
  let dateTime: ReturnType<typeof parseLocalDateTimeInput> | null = null;

  try {
    amountMinor = parseMoneyInput(form.amount, currencyCode);
  } catch {
    errors.amount =
      language === 'id' ? 'Masukkan nominal transaksi.' : 'Enter an amount.';
  }

  if (form.type !== 'transfer') {
    if (!form.category) {
      errors.category =
        language === 'id'
          ? form.type === 'income'
            ? 'Pilih kategori pemasukan.'
            : 'Pilih kategori pengeluaran.'
          : 'Choose a category.';
    }
  } else {
    if (!form.paymentMethod) {
      errors.paymentMethod =
        language === 'id' ? 'Pilih dompet asal.' : 'Choose a source wallet.';
    }
    if (!form.transferToPaymentMethod) {
      errors.transferToPaymentMethod =
        language === 'id'
          ? 'Pilih dompet tujuan.'
          : 'Choose a destination wallet.';
    }
    if (
      form.paymentMethod &&
      form.transferToPaymentMethod &&
      form.paymentMethod.id === form.transferToPaymentMethod.id
    ) {
      errors.transferToPaymentMethod =
        language === 'id'
          ? 'Dompet asal dan tujuan tidak boleh sama.'
          : 'Source and destination wallet cannot be the same.';
    }
  }

  let feeMinor = 0;
  if (form.type === 'transfer' && form.hasTransferFee) {
    if (!form.transferFeeAmount.trim()) {
      errors.transferFeeAmount =
        language === 'id'
          ? 'Masukkan nominal biaya transfer.'
          : 'Enter a transfer fee amount.';
    } else {
      try {
        feeMinor = parseMoneyInput(form.transferFeeAmount, currencyCode);
      } catch {
        errors.transferFeeAmount =
          language === 'id'
            ? 'Nominal biaya transfer tidak valid.'
            : 'Invalid transfer fee amount.';
      }
    }
  }

  try {
    dateTime = parseLocalDateTimeInput(form.date, form.time);
    if (dateTime.occurredAt > Date.now()) {
      errors.dateTime =
        language === 'id'
          ? 'Tanggal transaksi tidak boleh di masa depan.'
          : 'Transaction date cannot be in the future.';
    }
  } catch {
    errors.dateTime =
      language === 'id'
        ? 'Format tanggal atau waktu tidak valid.'
        : 'Enter a valid transaction date and time.';
  }
  if (Array.from(form.note.normalize('NFC').trim()).length > 500) {
    errors.note =
      language === 'id'
        ? 'Catatan maksimal 500 karakter.'
        : 'Note must be 500 characters or fewer.';
  }

  if (
    Object.keys(errors).length > 0 ||
    amountMinor === null ||
    dateTime === null
  ) {
    return { errors, input: null };
  }

  const input: SaveTransactionInput = {
    amountMinor,
    categoryId: form.category?.id ?? fallbackCategoryId,
    counterparty: form.counterparty,
    currencyCode,
    isReimbursable: form.type === 'expense' && form.isReimbursable,
    localDate: dateTime.localDate,
    note: form.note,
    occurredAt: dateTime.occurredAt,
    paymentMethodId: form.paymentMethod?.id ?? null,
    receipt:
      form.type === 'expense' && form.receipt
        ? {
            mimeType: form.receipt.mimeType,
            sourceImageUri: form.receipt.sourceImageUri,
          }
        : null,
    timezoneOffsetMinutes: dateTime.timezoneOffsetMinutes,
    transferFeeCategoryId:
      form.type === 'transfer' && form.hasTransferFee
        ? (form.transferFeeCategory?.id ?? null)
        : null,
    transferFeeMinor:
      form.type === 'transfer' && form.hasTransferFee ? feeMinor : 0,
    transferFeeNote:
      form.type === 'transfer' && form.hasTransferFee
        ? form.transferFeeNote
        : null,
    transferToPaymentMethodId:
      form.type === 'transfer'
        ? (form.transferToPaymentMethod?.id ?? null)
        : null,
    type: form.type,
  };
  return { errors, input };
}
