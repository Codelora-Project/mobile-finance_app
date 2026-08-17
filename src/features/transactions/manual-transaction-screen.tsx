import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { defaultCategories, defaultPaymentMethods } from '@/db/seeds';
import { CategoryPicker } from '@/features/categories/category-picker';
import {
  listCategories,
  type Category,
} from '@/features/categories/category-repository';
import { PaymentMethodPicker } from '@/features/payment-methods/payment-method-picker';
import {
  listPaymentMethods,
  type PaymentMethod,
} from '@/features/payment-methods/payment-method-repository';
import { ManualAmountInput } from '@/features/transactions/components/manual-amount-input';
import { ManualCategoryGrid } from '@/features/transactions/components/manual-category-grid';
import { ManualDetailsSection } from '@/features/transactions/components/manual-details-section';
import { ManualPaymentMethodsStrip } from '@/features/transactions/components/manual-payment-methods-strip';
import { ManualReceiptModal } from '@/features/transactions/components/manual-receipt-modal';
import { ManualTransactionHeader } from '@/features/transactions/components/manual-transaction-header';
import { ManualTypeToggle } from '@/features/transactions/components/manual-type-toggle';
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
import {
  DEFAULT_QUICK_SHORTCUTS,
  getQuickShortcuts,
} from '@/features/settings/settings-repository';
import {
  getTimezoneOffsetMinutes,
  parseLocalDateTimeInput,
  toLocalDateTimeInput,
} from '@/lib/dates';
import { isCodedError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  formatMoney,
  formatMoneyInput,
  parseMoneyInput,
} from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type SelectedReference = Readonly<{
  id: number;
  name: string;
}>;

type FormErrors = Partial<
  Record<
    | 'amount'
    | 'category'
    | 'dateTime'
    | 'note'
    | 'paymentMethod'
    | 'receipt'
    | 'submit',
    string
  >
>;

type FormState = {
  amount: string;
  category: SelectedReference | null;
  counterparty: string;
  date: string;
  isReimbursable: boolean;
  note: string;
  paymentMethod: SelectedReference | null;
  receipt: ManualReceiptSelection | null;
  time: string;
  type: TransactionType;
};

type PickerState = 'category' | 'paymentMethod' | null;

function createDefaultForm(
  initialCategory?: SelectedReference | null,
  initialType?: TransactionType,
): FormState {
  const now = Date.now();
  const dateTime = toLocalDateTimeInput(now, getTimezoneOffsetMinutes(now));
  return {
    amount: '',
    category: initialCategory ?? null,
    counterparty: '',
    date: dateTime.date,
    isReimbursable: false,
    note: '',
    paymentMethod: null,
    receipt: null,
    time: dateTime.time,
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
  return {
    amount: formatMoneyInput(transaction.amountMinor, transaction.currencyCode),
    category: {
      id: transaction.categoryId,
      name: transaction.categoryName,
    },
    counterparty: transaction.counterparty ?? '',
    date: dateTime.date,
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
    type: transaction.type,
  };
}

function serializeForm(form: FormState) {
  return JSON.stringify({
    ...form,
    category: form.category?.id ?? null,
    paymentMethod: form.paymentMethod?.id ?? null,
    receipt: form.receipt
      ? [form.receipt.sourceImageUri, form.receipt.mimeType]
      : null,
  });
}

function getOperationMessage(error: unknown) {
  if (isCodedError(error)) {
    return error.message;
  }
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
}

function buildSaveInput(form: FormState) {
  const errors: FormErrors = {};
  let amountMinor: number | null = null;
  let dateTime: ReturnType<typeof parseLocalDateTimeInput> | null = null;

  try {
    amountMinor = parseMoneyInput(form.amount, 'IDR');
  } catch {
    errors.amount = 'Enter an amount.';
  }
  if (!form.category) {
    errors.category = 'Choose a category.';
  }
  try {
    dateTime = parseLocalDateTimeInput(form.date, form.time);
    if (dateTime.occurredAt > Date.now()) {
      errors.dateTime = 'Transaction date cannot be in the future.';
    }
  } catch {
    errors.dateTime = 'Enter a valid transaction date and time.';
  }
  if (Array.from(form.note.normalize('NFC').trim()).length > 500) {
    errors.note = 'Note must be 500 characters or fewer.';
  }

  if (
    Object.keys(errors).length > 0 ||
    amountMinor === null ||
    !form.category ||
    dateTime === null
  ) {
    return { errors, input: null };
  }

  const input: SaveTransactionInput = {
    amountMinor,
    categoryId: form.category.id,
    counterparty: form.counterparty,
    currencyCode: 'IDR',
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
    type: form.type,
  };
  return { errors, input };
}

const INITIAL_EXPENSE_CATEGORIES: Category[] = defaultCategories
  .filter((c) => c.type === 'expense')
  .map((c, index) => ({
    createdAt: 0,
    iconKey: null,
    id: index + 1,
    isDefault: true,
    isFallback: !!c.isFallback,
    name: c.name,
    sortOrder: index,
    systemKey: c.systemKey,
    type: 'expense' as const,
    updatedAt: 0,
  }));

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

export type ManualTransactionScreenProps = {
  transactionId?: number;
};

export function ManualTransactionScreen({
  transactionId: propTransactionId,
}: ManualTransactionScreenProps = {}) {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { colors, isDark } = useTheme();

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
    INITIAL_EXPENSE_CATEGORIES,
  );
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethod[]>(
    INITIAL_PAYMENT_METHODS,
  );
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
  const [showDetailSection, setShowDetailSection] = useState(isEditMode);

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
        }
      } catch (err) {
        if (__DEV__) console.warn('Could not load categories/methods', err);
      }
    }
    void loadData();
    return () => {
      active = false;
    };
  }, [database]);

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
    const { errors: validationErrors, input } = buildSaveInput(form);
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
  }, [database, form, isEditMode, language, router, transactionId]);

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
      return parseMoneyInput(form.amount, 'IDR');
    } catch {
      return 0;
    }
  }, [form.amount]);

  const screenTitle = isEditMode
    ? language === 'id'
      ? 'Edit Transaksi'
      : 'Edit Transaction'
    : language === 'id'
      ? 'Catat Transaksi'
      : 'Record Transaction';

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* 1. TOP NAVIGATION HEADER */}
        <ManualTransactionHeader
          deleting={deleting}
          isEditMode={isEditMode}
          onClose={handleClose}
          onDelete={isEditMode ? handleDelete : undefined}
          title={screenTitle}
        />

        {/* 2. FORM BODY */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type Toggle: Expense / Income */}
          <ManualTypeToggle
            onChangeType={(type) => {
              setForm((c) => ({
                ...c,
                category: null,
                isReimbursable: false,
                receipt: null,
                type,
              }));
              setErrors({});
            }}
            selectedType={form.type}
            t={t}
          />

          {/* Amount Hero Input */}
          <ManualAmountInput
            amount={form.amount}
            amountInputRef={amountInputRef}
            error={errors.amount}
            onAddIncrement={handleAddIncrement}
            onChangeAmount={(amount) => {
              setForm((c) => ({ ...c, amount }));
              setErrors((c) => ({ ...c, amount: undefined }));
            }}
            onPressCard={() => amountInputRef.current?.focus()}
            onResetAmount={handleClearAmount}
            quickShortcuts={quickShortcuts}
          />

          {/* 1-Tap Category Grid */}
          <ManualCategoryGrid
            categories={categoriesList}
            error={errors.category}
            onOpenMoreCategories={() => setPicker('category')}
            onSelectCategory={handleSelectCategory}
            selectedCategoryId={form.category?.id}
            transactionType={form.type}
          />

          {/* Quick Payment Methods Strip */}
          <ManualPaymentMethodsStrip
            onSelectPaymentMethod={handleSelectPaymentMethod}
            paymentMethods={paymentMethodsList}
            selectedPaymentMethodId={form.paymentMethod?.id}
          />

          {/* Compact Merchant, Receipt & Expandable Advanced Options */}
          <ManualDetailsSection
            claimMembership={claimMembership}
            counterparty={form.counterparty}
            date={form.date}
            isExpense={isExpense}
            isReimbursable={form.isReimbursable}
            note={form.note}
            onChangeCounterparty={(counterparty) =>
              setForm((c) => ({ ...c, counterparty }))
            }
            onChangeDate={(date) => setForm((c) => ({ ...c, date }))}
            onChangeNote={(note) => setForm((c) => ({ ...c, note }))}
            onChangeReimbursable={(isReimbursable) =>
              setForm((c) => ({ ...c, isReimbursable }))
            }
            onChangeTime={(time) => setForm((c) => ({ ...c, time }))}
            onOpenReceiptMenu={() => setReceiptMenuVisible(true)}
            onToggleShowDetails={() => setShowDetailSection((prev) => !prev)}
            receipt={form.receipt}
            showDetailSection={showDetailSection}
            time={form.time}
          />

          {errors.submit ? (
            <Text style={styles.errorBanner}>{errors.submit}</Text>
          ) : null}

          {/* Big Save Button */}
          <View style={styles.actionBtnContainer}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void handleSave()}
              style={[
                styles.saveBigButton,
                isExpense
                  ? styles.saveBigButtonExpense
                  : styles.saveBigButtonIncome,
                saving ? styles.saveBigButtonDisabled : null,
              ]}
              testID="save-transaction"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  numberOfLines={1}
                  style={styles.saveBigButtonText}
                >
                  {isEditMode
                    ? language === 'id'
                      ? 'Update Transaksi' +
                        (parsedAmountMinor > 0
                          ? ' (' +
                            formatMoney(parsedAmountMinor, 'IDR') +
                            ')'
                          : '')
                      : 'Update Transaction' +
                        (parsedAmountMinor > 0
                          ? ' (' +
                            formatMoney(parsedAmountMinor, 'IDR') +
                            ')'
                          : '')
                    : isExpense
                      ? language === 'id'
                        ? '✓ Simpan Pengeluaran' +
                          (parsedAmountMinor > 0
                            ? ' (' +
                              formatMoney(parsedAmountMinor, 'IDR') +
                              ')'
                            : '')
                        : '✓ Save Expense' +
                          (parsedAmountMinor > 0
                            ? ' (' +
                              formatMoney(parsedAmountMinor, 'IDR') +
                              ')'
                            : '')
                      : language === 'id'
                        ? '✓ Simpan Pemasukan' +
                          (parsedAmountMinor > 0
                            ? ' (' +
                              formatMoney(parsedAmountMinor, 'IDR') +
                              ')'
                            : '')
                        : '✓ Save Income' +
                          (parsedAmountMinor > 0
                            ? ' (' +
                              formatMoney(parsedAmountMinor, 'IDR') +
                              ')'
                            : '')}
                </Text>
              )}
            </Pressable>

            {isEditMode ? (
              <AppButton
                disabled={deleting || saving}
                label={t.common.delete}
                loading={deleting}
                onPress={handleDelete}
                variant="destructive"
              />
            ) : null}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Category Picker Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setPicker(null)}
        visible={picker === 'category'}
      >
        <Screen>
          <View
            style={[
              styles.modalScreenHeader,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.actionSheetTitle,
                { color: colors.textPrimary },
              ]}
            >
              {language === 'id' ? 'Pilih Kategori' : 'Select Category'}
            </Text>
            <Pressable
              accessibilityLabel="Close category picker"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => setPicker(null)}
              style={styles.closeIconButton}
            >
              <MaterialCommunityIcons color="#64748B" name="close" size={24} />
            </Pressable>
          </View>
          <CategoryPicker
            onSelect={(selectedCategory) => {
              handleSelectCategory(selectedCategory);
              setPicker(null);
            }}
            selectedId={form.category?.id}
            type={form.type}
          />
        </Screen>
      </Modal>

      {/* Payment Method Picker Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setPicker(null)}
        visible={picker === 'paymentMethod'}
      >
        <Screen>
          <View
            style={[
              styles.modalScreenHeader,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.actionSheetTitle,
                { color: colors.textPrimary },
              ]}
            >
              {language === 'id'
                ? 'Metode Pembayaran'
                : 'Select Payment Method'}
            </Text>
            <Pressable
              accessibilityLabel="Close payment picker"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => setPicker(null)}
              style={styles.closeIconButton}
            >
              <MaterialCommunityIcons color="#64748B" name="close" size={24} />
            </Pressable>
          </View>
          <PaymentMethodPicker
            onSelect={(selectedPaymentMethod) => {
              if (selectedPaymentMethod) {
                handleSelectPaymentMethod(selectedPaymentMethod);
              }
              setPicker(null);
            }}
            selectedId={form.paymentMethod?.id}
          />
        </Screen>
      </Modal>

      {/* Receipt Action Sheet Modal */}
      <ManualReceiptModal
        hasReceipt={Boolean(form.receipt)}
        onClose={() => setReceiptMenuVisible(false)}
        onRemoveReceipt={() => {
          setForm((c) => ({ ...c, receipt: null }));
          setReceiptMenuVisible(false);
        }}
        onSelectSource={(source) => void handleSelectReceiptSource(source)}
        visible={receiptMenuVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionBtnContainer: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  actionSheetTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  closeIconButton: {
    padding: spacing.xs,
  },
  container: {
    flex: 1,
  },
  errorBanner: {
    ...typography.metadata,
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  modalScreenHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  saveBigButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 54,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  saveBigButtonDisabled: {
    opacity: 0.6,
  },
  saveBigButtonExpense: {
    backgroundColor: '#EF4444',
    elevation: 3,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveBigButtonIncome: {
    backgroundColor: '#10B981',
    elevation: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveBigButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl + 24,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
});
