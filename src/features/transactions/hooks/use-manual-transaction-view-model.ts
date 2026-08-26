import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, type TextInput } from 'react-native';

import { isTransactionType } from '@/domain/transaction';
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
  getFormDirtySignature,
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
import { getTransactionErrorMessage } from '@/features/transactions/transaction-error-messages';
import { useTransactionMutations } from '@/features/transactions/transaction-mutation-context';
import { useCurrency } from '@/lib/currency/currency-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoneyInput, parseMoneyInput } from '@/lib/money';

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
  const navigation = useNavigation();
  const { language, t } = useLanguage();
  const { currencyCode, currencySymbol } = useCurrency();
  const transactionMutations = useTransactionMutations();

  const params = useLocalSearchParams<{
    categoryId?: string;
    categoryName?: string;
    id?: string;
    type?: TransactionType;
  }>();

  const routeTransactionId = params.id ? Number(params.id) : null;
  const transactionId =
    Number.isSafeInteger(propTransactionId) && (propTransactionId ?? 0) > 0
      ? propTransactionId!
      : Number.isSafeInteger(routeTransactionId) && (routeTransactionId ?? 0) > 0
        ? routeTransactionId
        : null;
  const isEditMode = transactionId !== null;

  const initialCategoryParam = useMemo(() => {
    const categoryId = Number(params.categoryId);
    if (
      Number.isSafeInteger(categoryId) &&
      categoryId > 0 &&
      params.categoryName
    ) {
      return {
        id: categoryId,
        name: params.categoryName,
      };
    }
    return null;
  }, [params.categoryId, params.categoryName]);

  const initialFormRef = useRef<FormState | null>(null);
  if (!initialFormRef.current) {
    initialFormRef.current = createDefaultForm(
      initialCategoryParam,
      isTransactionType(params.type) ? params.type : undefined,
    );
  }
  const [form, setForm] = useState<FormState>(initialFormRef.current);
  const baselineFormRef = useRef<FormState>(initialFormRef.current);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethod[]>(
    [],
  );
  const [walletsList, setWalletsList] = useState<Wallet[]>([]);
  const [referenceStatus, setReferenceStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [referenceLoadAttempt, setReferenceLoadAttempt] = useState(0);

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
  const paymentMethodTouchedRef = useRef(false);
  const amountInputRef = useRef<TextInput | null>(null);
  const slideAnim = useRef(new Animated.Value(450)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [exitTarget, setExitTarget] = useState<'origin' | 'transactions' | null>(
    null,
  );

  const isDirty = useMemo(
    () =>
      getFormDirtySignature(form) !==
      getFormDirtySignature(baselineFormRef.current),
    [form],
  );

  usePreventRemove(
    exitTarget === null && (isDirty || saving || deleting),
    ({ data }) => {
      if (saving || deleting) return;
      Alert.alert(t.transactions.discardTitle, t.transactions.discardDesc, [
        {
          style: 'cancel',
          text: t.transactions.continueEditing,
        },
        {
          onPress: () => navigation.dispatch(data.action),
          style: 'destructive',
          text: t.transactions.discardChanges,
        },
      ]);
    },
  );

  useEffect(() => {
    if (!exitTarget) return;
    if (exitTarget === 'transactions') {
      router.dismissTo('/transactions');
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/transactions');
    }
  }, [exitTarget, router]);

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
      setReferenceStatus('loading');
      try {
        const [cats, pms, wallets, shortcuts] = await Promise.all([
          listCategories(database),
          listPaymentMethods(database),
          getWallets(database),
          getQuickShortcuts(database),
        ]);
        if (!active) return;
        setCategoriesList(cats);
        setPaymentMethodsList(pms);
        setWalletsList(wallets);
        if (shortcuts && shortcuts.length > 0) {
          setQuickShortcuts(shortcuts);
        }
        if (!isEditMode) {
          const defaultMethod = pms.find((p) => p.isDefault) ?? pms[0];
          setForm((current) => {
            const targetCategoryType =
              current.type === 'income' ? 'income' : 'expense';
            const matchingCategory = current.category
              ? cats.find(
                  (category) =>
                    category.id === current.category?.id &&
                    category.type === targetCategoryType,
                )
              : null;
            const paymentMethod =
              !paymentMethodTouchedRef.current && !current.paymentMethod
                ? defaultMethod
                  ? { id: defaultMethod.id, name: defaultMethod.name }
                  : null
                : current.paymentMethod;
            const next = {
              ...current,
              category: matchingCategory
                ? { id: matchingCategory.id, name: matchingCategory.name }
                : null,
              paymentMethod,
            };
            baselineFormRef.current = {
              ...baselineFormRef.current,
              category: matchingCategory
                ? { id: matchingCategory.id, name: matchingCategory.name }
                : null,
              paymentMethod:
                !paymentMethodTouchedRef.current &&
                !baselineFormRef.current.paymentMethod
                  ? paymentMethod
                  : baselineFormRef.current.paymentMethod,
            };
            return next;
          });
        }
        setReferenceStatus('ready');
      } catch (err) {
        if (__DEV__) console.warn('Could not load categories/methods', err);
        if (active) setReferenceStatus('error');
      }
    }
    void loadData();
    return () => {
      active = false;
    };
  }, [database, isEditMode, referenceLoadAttempt]);

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
          const loadedForm = formFromTransaction(tx);
          baselineFormRef.current = loadedForm;
          setForm(loadedForm);
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
    paymentMethodTouchedRef.current = true;
    setForm((current) => ({
      ...current,
      paymentMethod:
        current.paymentMethod?.id === pm.id
          ? null
          : { id: pm.id, name: pm.name },
    }));
  }, []);

  const handleSelectTransferSource = useCallback((wallet: Wallet | null) => {
    paymentMethodTouchedRef.current = true;
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

  const handleAddIncrement = useCallback(
    (amountToAdd: number) => {
      setForm((current) => {
        try {
          const currentMinor = current.amount.trim()
            ? parseMoneyInput(current.amount, currencyCode)
            : 0;
          const incrementMinor = parseMoneyInput(
            String(amountToAdd),
            currencyCode,
          );
          const nextMinor = currentMinor + incrementMinor;
          if (!Number.isSafeInteger(nextMinor)) return current;
          return {
            ...current,
            amount: formatMoneyInput(nextMinor, currencyCode),
          };
        } catch {
          return current;
        }
      });
      setErrors((c) => ({ ...c, amount: undefined }));
    },
    [currencyCode],
  );

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
          receipt: getTransactionErrorMessage(error, t),
        }));
      }
    },
    [t],
  );

  const handleClose = useCallback(() => {
    if (savingRef.current || deletingRef.current) return;
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/transactions');
    }
  }, [router]);

  const retryReferenceData = useCallback(() => {
    setErrors((current) => ({ ...current, submit: undefined }));
    setReferenceLoadAttempt((current) => current + 1);
  }, []);

  const persistTransaction = useCallback(
    async (input: SaveTransactionInput) => {
      if (savingRef.current || deletingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      setErrors({});

      try {
        if (isEditMode) {
          await updateTransaction(database, transactionId!, input);
          transactionMutations.notifyUpdated();
          setExitTarget('origin');
        } else {
          const result = await createTransaction(database, input);
          transactionMutations.notifyCreated(result.id);
          setExitTarget('origin');
        }
      } catch (error) {
        setErrors({ submit: getTransactionErrorMessage(error, t) });
        savingRef.current = false;
        setSaving(false);
      }
    },
    [database, isEditMode, t, transactionId, transactionMutations],
  );

  const handleSave = useCallback(async () => {
    if (savingRef.current || deletingRef.current) return;
    if (referenceStatus !== 'ready') {
      setErrors({ submit: t.transactions.referenceLoadFailed });
      return;
    }
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
  }, [
    currencyCode,
    displayedCategories,
    form,
    language,
    persistTransaction,
    referenceStatus,
    t.transactions.referenceLoadFailed,
  ]);

  const handleCancelTransferReview = useCallback(() => {
    setPendingTransferInput(null);
  }, []);

  const handleConfirmTransfer = useCallback(async () => {
    if (savingRef.current || deletingRef.current || !pendingTransferInput)
      return;
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
      transactionMutations.notifyDeleted(snapshot);
      setExitTarget('transactions');
    } catch (error) {
      setErrors({ submit: getTransactionErrorMessage(error, t) });
      deletingRef.current = false;
      setDeleting(false);
    }
  }, [database, t, transactionId, transactionMutations]);

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
      retryReferenceData,
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
      isDirty,
      isExpense,
      language,
      loading,
      parsedAmountMinor,
      paymentMethodsList,
      pendingTransferInput,
      picker,
      quickShortcuts,
      referenceStatus,
      receiptMenuVisible,
      saving,
      screenTitle,
      showDetailSection,
      t,
      walletsList,
    },
  };
}
