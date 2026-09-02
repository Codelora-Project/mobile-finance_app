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
import { translations } from '@/lib/i18n/translations';
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
  return {
    amount: '',
    category: initialCategory ?? null,
    counterparty: '',
    date: dateTime.date,
    hasTransferFee: false,
    isReimbursable: false,
    note: '',
    paymentMethod: initialPaymentMethod ?? null,
    receipt: null,
    time: dateTime.time,
    transferFeeAmount: '',
    transferFeeCategory: null,
    transferFeeNote: '',
    transferToPaymentMethod: null,
    type: initialType ?? 'expense',
  };
}

export function getFormDirtySignature(form: FormState) {
  return JSON.stringify({
    amount: form.amount,
    categoryId: form.category?.id ?? null,
    counterparty: form.counterparty,
    date: form.date,
    hasTransferFee: form.hasTransferFee,
    isReimbursable: form.isReimbursable,
    note: form.note,
    paymentMethodId: form.paymentMethod?.id ?? null,
    receiptMimeType: form.receipt?.mimeType ?? null,
    receiptSource: form.receipt?.sourceImageUri ?? null,
    time: form.time,
    transferFeeAmount: form.transferFeeAmount,
    transferFeeCategoryId: form.transferFeeCategory?.id ?? null,
    transferFeeNote: form.transferFeeNote,
    transferToPaymentMethodId: form.transferToPaymentMethod?.id ?? null,
    type: form.type,
  });
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
  const t = translations[language];
  const errors: FormErrors = {};
  let amountMinor: number | null = null;
  let dateTime: ReturnType<typeof parseLocalDateTimeInput> | null = null;

  try {
    amountMinor = parseMoneyInput(form.amount, currencyCode);
  } catch {
    errors.amount = t.transactions.enterAmountError;
  }

  if (form.type !== 'transfer') {
    if (!form.category) {
      errors.category =
        form.type === 'income'
          ? t.transactions.chooseIncomeCategoryError
          : form.type === 'expense'
            ? t.transactions.chooseExpenseCategoryError
            : t.transactions.chooseCategoryError;
    }
  } else {
    if (!form.paymentMethod) {
      errors.paymentMethod = t.transactions.chooseSourceWalletError;
    }
    if (!form.transferToPaymentMethod) {
      errors.transferToPaymentMethod =
        t.transactions.chooseDestinationWalletError;
    }
    if (
      form.paymentMethod &&
      form.transferToPaymentMethod &&
      form.paymentMethod.id === form.transferToPaymentMethod.id
    ) {
      errors.transferToPaymentMethod = t.transactions.sameWalletError;
    }
  }

  let feeMinor = 0;
  if (form.type === 'transfer' && form.hasTransferFee) {
    if (!form.transferFeeAmount.trim()) {
      errors.transferFeeAmount = t.transactions.enterTransferFeeError;
    } else {
      try {
        feeMinor = parseMoneyInput(form.transferFeeAmount, currencyCode);
      } catch {
        errors.transferFeeAmount = t.transactions.invalidTransferFeeError;
      }
    }
  }

  try {
    dateTime = parseLocalDateTimeInput(form.date, form.time);
    if (dateTime.occurredAt > Date.now()) {
      errors.dateTime = t.transactions.futureDateError;
    }
  } catch {
    errors.dateTime = t.transactions.invalidDateTimeError;
  }
  if (Array.from(form.note.normalize('NFC').trim()).length > 500) {
    errors.note = t.transactions.noteTooLongError;
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
