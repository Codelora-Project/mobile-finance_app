import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, type TextInput } from 'react-native';

import { getWallets, type Wallet } from '@/features/wallets';
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
  type ManualReceiptSource,
} from '@/features/transactions/manual-receipt-picker';
import {
  buildSaveInput,
  createDefaultForm,
  formFromTransaction,
  INITIAL_CATEGORIES,
  INITIAL_PAYMENT_METHODS,
  type FormErrors,
  type FormState,
} from '@/features/transactions/manual-transaction-form';
import {
  createTransaction,
  deleteTransactionForUndo,
  getTransaction,
  getTransactionClaimMembership,
  type SaveTransactionInput,
  type Transaction,
  type TransactionClaimMembership,
  type TransactionType,
  updateTransaction,
} from '@/features/transactions/transaction-repository';
import { useCurrency } from '@/lib/currency/currency-context';
import { isCodedError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { parseMoneyInput } from '@/lib/money';

export type {
  FormErrors,
  FormState,
  SelectedReference,
} from '@/features/transactions/manual-transaction-form';

export type PickerState =
  | 'category'
  | 'paymentMethod'
  | 'transferSource'
  | 'transferDestination'
  | 'transferFeeCategory'
  | null;

function getOperationMessage(error: unknown) {
  if (isCodedError(error)) {
    return error.message;
  }
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
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
  const [categoriesList, setCategoriesList] =
    useState<Category[]>(INITIAL_CATEGORIES);
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethod[]>(
    INITIAL_PAYMENT_METHODS,
  );
  const [walletsList, setWalletsList] = useState<Wallet[]>([]);

  const displayedCategories = useMemo(() => {
    const targetType = form.type === 'income' ? 'income' : 'expense';
    return categoriesList.filter((cat) => cat.type === targetType);
  }, [categoriesList, form.type]);
  const [quickShortcuts, setQuickShortcuts] = useState<number[]>([
    ...DEFAULT_QUICK_SHORTCUTS,
  ]);
  const [claimMembership, setClaimMembership] =
    useState<TransactionClaimMembership | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [picker, setPicker] = useState<PickerState>(null);
  const [receiptMenuVisible, setReceiptMenuVisible] = useState(false);
  const [showDetailSection, setShowDetailSection] = useState(false);
  const [pendingTransferInput, setPendingTransferInput] =
    useState<SaveTransactionInput | null>(null);

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
        const [cats, pms, wallets, shortcuts] = await Promise.all([
          listCategories(database),
          listPaymentMethods(database),
          getWallets(database),
          getQuickShortcuts(database),
        ]);
        if (active) {
          setCategoriesList(cats);
          setPaymentMethodsList(pms);
          setWalletsList(wallets);
          if (shortcuts && shortcuts.length > 0) {
            setQuickShortcuts(shortcuts);
          }
          if (!isEditMode) {
            setForm((current) => {
              if (!current.paymentMethod && pms.length > 0) {
                const defaultMethod = pms.find((p) => p.isDefault) ?? pms[0];
                return {
                  ...current,
                  paymentMethod: {
                    id: defaultMethod.id,
                    name: defaultMethod.name,
                  },
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
          setEditingTransaction(tx);
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

  const persistTransaction = useCallback(
    async (input: SaveTransactionInput) => {
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
    },
    [database, isEditMode, language, router, transactionId],
  );

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
    if (input.type === 'transfer') {
      setErrors({});
      setPendingTransferInput(input);
      return;
    }
    await persistTransaction(input);
  }, [currencyCode, displayedCategories, form, language, persistTransaction]);

  const handleCancelTransferReview = useCallback(() => {
    setPendingTransferInput(null);
  }, []);

  const handleConfirmTransfer = useCallback(async () => {
    if (!pendingTransferInput) return;
    const input = pendingTransferInput;
    setPendingTransferInput(null);
    await persistTransaction(input);
  }, [pendingTransferInput, persistTransaction]);

  const handleDelete = useCallback(async () => {
    if (savingRef.current || deletingRef.current || !transactionId) return;
    deletingRef.current = true;
    setDeleting(true);

    try {
      const snapshot = await deleteTransactionForUndo(database, transactionId);
      router.dismissTo({
        params: {
          feedback:
            language === 'id'
              ? 'Transaksi telah dihapus'
              : 'Transaction deleted',
          undoPayload: JSON.stringify(snapshot),
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
      handleCancelTransferReview,
      handleClose,
      handleConfirmTransfer,
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
      editingTransaction,
      errors,
      form,
      isEditMode,
      isExpense,
      language,
      loading,
      parsedAmountMinor,
      paymentMethodsList,
      pendingTransferInput,
      picker,
      quickShortcuts,
      receiptMenuVisible,
      saving,
      screenTitle,
      showDetailSection,
      t,
      walletsList,
    },
  };
}
