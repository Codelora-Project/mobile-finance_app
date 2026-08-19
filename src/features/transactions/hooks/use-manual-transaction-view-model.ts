import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, type TextInput } from 'react-native';

import { defaultCategories, defaultPaymentMethods } from '@/db/seeds';
import type { Wallet } from '@/features/accounts/account-types';
import {
  listCategories,
  type Category,
} from '@/features/categories/category-repository';
import {
  listPaymentMethods,
  type PaymentMethod,
} from '@/features/payment-methods/payment-method-repository';
import {
  DEFAULT_QUICK_SHORTCUTS,
  getQuickShortcuts,
} from '@/features/settings/settings-repository';
import {
  pickManualReceipt,
  type ManualReceiptSelection,
  type ManualReceiptSource,
} from '@/features/transactions/manual-receipt-picker';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  getTransactionClaimMembership,
  type SaveTransactionInput,
  type Transaction,
  type TransactionClaimMembership,
  type TransactionType,
  updateTransaction,
} from '@/features/transactions/transaction-repository';
import { useCurrency } from '@/lib/currency/currency-context';
import {
  getTimezoneOffsetMinutes,
  parseLocalDateTimeInput,
  toLocalDateTimeInput,
} from '@/lib/dates';
import { isCodedError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoneyInput, parseMoneyInput } from '@/lib/money';

export type SelectedReference = Readonly<{
  id: number;
  name: string;
}>;

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

export type PickerState =
  | 'category'
  | 'paymentMethod'
  | 'transferSource'
  | 'transferDestination'
  | 'transferFeeCategory'
  | null;

const INITIAL_CATEGORIES: Category[] = defaultCategories.map(
  (c, index) => ({
    createdAt: 0,
    iconKey: null,
    id: index + 1,
    isDefault: true,
    isFallback: !!c.isFallback,
    name: c.name,
    sortOrder: index,
    systemKey: c.systemKey,
    type: c.type,
    updatedAt: 0,
  }),
);

const INITIAL_PAYMENT_METHODS: PaymentMethod[] = defaultPaymentMethods.map(
  (pm, index) => ({
    createdAt: 0,
    id: index + 1,
    isDefault: true,
    isFallback: false,
    name: pm.name,
    sortOrder: index,
    systemKey: pm.systemKey,
    updatedAt: 0,
  }),
);

function createDefaultForm(
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
      (defaultMethod ? { id: defaultMethod.id, name: defaultMethod.name } : null),
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

function formFromTransaction(transaction: Transaction): FormState {
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
      ? String(transaction.transferFeeMinor)
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

function getOperationMessage(error: unknown) {
  if (isCodedError(error)) {
    return error.message;
  }
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
}

function buildSaveInput(
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
        ? form.transferFeeCategory?.id ?? null
        : null,
    transferFeeMinor:
      form.type === 'transfer' && form.hasTransferFee ? feeMinor : 0,
    transferFeeNote:
      form.type === 'transfer' && form.hasTransferFee
        ? form.transferFeeNote
        : null,
    transferToPaymentMethodId:
      form.type === 'transfer'
        ? form.transferToPaymentMethod?.id ?? null
        : null,
    type: form.type,
  };
  return { errors, input };
}

export type ManualTransactionScreenProps = {
  transactionId?: number;
};

export type UseManualTransactionViewModelOptions = {
  propTransactionId?: number;
};

export function useManualTransactionViewModel({
  propTransactionId,
}: UseManualTransactionViewModelOptions = {}) {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { currencyCode, currencySymbol } = useCurrency();

  const params = useLocalSearchParams<{
    categoryId?: string;
    categoryName?: string;
    id?: string;
    type?: TransactionType;
  }>();

  const transactionId =
    propTransactionId && propTransactionId > 0
      ? propTransactionId
      : params.id
        ? Number(params.id)
        : null;
  const isEditMode = transactionId !== null;

  const initialCategoryParam = useMemo(() => {
    if (params.categoryId && params.categoryName) {
      return {
        id: Number(params.categoryId),
        name: params.categoryName,
      };
    }
    return null;
  }, [params.categoryId, params.categoryName]);

  const [form, setForm] = useState<FormState>(() =>
    createDefaultForm(initialCategoryParam, params.type),
  );
  const [categoriesList, setCategoriesList] = useState<Category[]>(
    INITIAL_CATEGORIES,
  );
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethod[]>(
    INITIAL_PAYMENT_METHODS,
  );

  const displayedCategories = useMemo(() => {
    const targetType = form.type === 'income' ? 'income' : 'expense';
    return categoriesList.filter((cat) => cat.type === targetType);
  }, [categoriesList, form.type]);
  const [quickShortcuts, setQuickShortcuts] = useState<number[]>([
    ...DEFAULT_QUICK_SHORTCUTS,
  ]);
  const [claimMembership, setClaimMembership] =
    useState<TransactionClaimMembership | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [picker, setPicker] = useState<PickerState>(null);
  const [receiptMenuVisible, setReceiptMenuVisible] = useState(false);
  const [showDetailSection, setShowDetailSection] = useState(false);

  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const amountInputRef = useRef<TextInput | null>(null);
  const slideAnim = useRef(new Animated.Value(450)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        duration: 200,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [cats, pms, shortcuts] = await Promise.all([
          listCategories(database),
          listPaymentMethods(database),
          getQuickShortcuts(database),
        ]);
        if (active) {
          setCategoriesList(cats);
          setPaymentMethodsList(pms);
          if (shortcuts && shortcuts.length > 0) {
            setQuickShortcuts(shortcuts);
          }
          if (!isEditMode) {
            setForm((current) => {
              if (!current.paymentMethod && pms.length > 0) {
                const defaultMethod = pms.find((p) => p.isDefault) ?? pms[0];
                return {
                  ...current,
                  paymentMethod: { id: defaultMethod.id, name: defaultMethod.name },
                };
              }
              return current;
            });
          }
        }
      } catch (err) {
        if (__DEV__) console.warn('Could not load categories/methods', err);
      }
    }
    void loadData();
    return () => {
      active = false;
    };
  }, [database, isEditMode]);

  useEffect(() => {
    if (!isEditMode) return;
    let active = true;
    async function loadTransaction() {
      try {
        const [tx, claim] = await Promise.all([
          getTransaction(database, transactionId!),
          getTransactionClaimMembership(database, transactionId!),
        ]);
        if (active && tx) {
          setForm(formFromTransaction(tx));
          setClaimMembership(claim);
        }
      } catch (err) {
        if (__DEV__) console.warn('Could not load transaction', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadTransaction();
    return () => {
      active = false;
    };
  }, [database, isEditMode, transactionId]);

  const handleSelectCategory = useCallback((selectedCategory: Category) => {
    setForm((current) => ({
      ...current,
      category: {
        id: selectedCategory.id,
        name: selectedCategory.name,
      },
    }));
    setErrors((c) => ({ ...c, category: undefined }));
  }, []);

  const handleSelectPaymentMethod = useCallback((pm: PaymentMethod) => {
    setForm((current) => ({
      ...current,
      paymentMethod:
        current.paymentMethod?.id === pm.id
          ? null
          : { id: pm.id, name: pm.name },
    }));
  }, []);

  const handleSelectTransferSource = useCallback((wallet: Wallet | null) => {
    setForm((current) => ({
      ...current,
      paymentMethod: wallet ? { id: wallet.id, name: wallet.name } : null,
    }));
    setErrors((c) => ({ ...c, paymentMethod: undefined }));
    setPicker(null);
  }, []);

  const handleSelectTransferDestination = useCallback(
    (wallet: Wallet | null) => {
      setForm((current) => ({
        ...current,
        transferToPaymentMethod: wallet
          ? { id: wallet.id, name: wallet.name }
          : null,
      }));
      setErrors((c) => ({ ...c, transferToPaymentMethod: undefined }));
      setPicker(null);
    },
    [],
  );

  const handleSwapWallets = useCallback(() => {
    setForm((current) => ({
      ...current,
      paymentMethod: current.transferToPaymentMethod,
      transferToPaymentMethod: current.paymentMethod,
    }));
    setErrors((c) => ({
      ...c,
      paymentMethod: undefined,
      transferToPaymentMethod: undefined,
    }));
  }, []);

  const handleToggleTransferFee = useCallback((enabled: boolean) => {
    setForm((current) => ({
      ...current,
      hasTransferFee: enabled,
    }));
    setErrors((c) => ({ ...c, transferFeeAmount: undefined }));
  }, []);

  const handleAddIncrement = useCallback((amountToAdd: number) => {
    setForm((current) => {
      const currentVal = Number(current.amount.replace(/[^0-9]/g, '')) || 0;
      const nextVal = currentVal + amountToAdd;
      return {
        ...current,
        amount: String(nextVal),
      };
    });
    setErrors((c) => ({ ...c, amount: undefined }));
  }, []);

  const handleClearAmount = useCallback(() => {
    setForm((current) => ({ ...current, amount: '' }));
  }, []);

  const handleRemoveReceipt = useCallback(() => {
    setForm((c) => ({ ...c, receipt: null }));
    setReceiptMenuVisible(false);
  }, []);

  const handleSelectReceiptSource = useCallback(
    async (source: ManualReceiptSource) => {
      setReceiptMenuVisible(false);
      try {
        const receipt = await pickManualReceipt(source);
        if (receipt) {
          setForm((c) => ({ ...c, receipt }));
        }
      } catch (error) {
        setErrors((c) => ({
          ...c,
          receipt: getOperationMessage(error),
        }));
      }
    },
    [],
  );

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleSave = useCallback(async () => {
    if (savingRef.current || deletingRef.current) return;
    const fallbackCategory = displayedCategories[0]?.id ?? 1;
    const { errors: validationErrors, input } = buildSaveInput(
      form,
      currencyCode,
      fallbackCategory,
      language,
    );
    if (!input) {
      setErrors(validationErrors);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setErrors({});

    try {
      if (isEditMode) {
        await updateTransaction(database, transactionId!, input);
        router.dismissTo({
          params: {
            feedback:
              language === 'id'
                ? 'Transaksi berhasil diperbarui'
                : 'Transaction updated successfully',
          },
          pathname: '/transactions',
        });
      } else {
        const result = await createTransaction(database, input);
        router.dismissTo({
          params: {
            feedback:
              language === 'id'
                ? 'Transaksi berhasil dicatat'
                : 'Transaction recorded successfully',
            undoCreatedId: String(result.id),
          },
          pathname: '/',
        });
      }
    } catch (error) {
      setErrors({ submit: getOperationMessage(error) });
      savingRef.current = false;
      setSaving(false);
    }
  }, [displayedCategories, currencyCode, database, form, isEditMode, language, router, transactionId]);

  const handleDelete = useCallback(async () => {
    if (savingRef.current || deletingRef.current || !transactionId) return;
    deletingRef.current = true;
    setDeleting(true);

    try {
      await deleteTransaction(database, transactionId);
      router.dismissTo({
        params: {
          feedback:
            language === 'id'
              ? 'Transaksi telah dihapus'
              : 'Transaction deleted',
        },
        pathname: '/transactions',
      });
    } catch (error) {
      setErrors({ submit: getOperationMessage(error) });
      deletingRef.current = false;
      setDeleting(false);
    }
  }, [database, language, router, transactionId]);

  const isExpense = form.type === 'expense';
  const parsedAmountMinor = useMemo(() => {
    try {
      return parseMoneyInput(form.amount, currencyCode);
    } catch {
      return 0;
    }
  }, [currencyCode, form.amount]);

  const screenTitle = isEditMode
    ? language === 'id'
      ? 'Edit Transaksi'
      : 'Edit Transaction'
    : language === 'id'
      ? 'Catat Transaksi'
      : 'Record Transaction';

  return {
    actions: {
      handleAddIncrement,
      handleClearAmount,
      handleClose,
      handleDelete,
      handleRemoveReceipt,
      handleSave,
      handleSelectCategory,
      handleSelectPaymentMethod,
      handleSelectReceiptSource,
      handleSelectTransferDestination,
      handleSelectTransferSource,
      handleSwapWallets,
      handleToggleTransferFee,
      setErrors,
      setForm,
      setPicker,
      setReceiptMenuVisible,
      setShowDetailSection,
    },
    refs: {
      amountInputRef,
      fadeAnim,
      slideAnim,
    },
    state: {
      categoriesList: displayedCategories,
      claimMembership,
      currencyCode,
      currencySymbol,
      deleting,
      errors,
      form,
      isEditMode,
      isExpense,
      language,
      loading,
      parsedAmountMinor,
      paymentMethodsList,
      picker,
      quickShortcuts,
      receiptMenuVisible,
      saving,
      screenTitle,
      showDetailSection,
      t,
    },
  };
}
