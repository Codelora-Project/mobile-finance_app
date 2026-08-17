import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { Screen } from '@/components/ui/screen';
import { getCategoryMeta } from '@/features/categories/category-meta';
import { CategoryPicker } from '@/features/categories/category-picker';
import {
  listCategories,
  type Category,
} from '@/features/categories/category-repository';
import {
  listPaymentMethods,
  type PaymentMethod,
} from '@/features/payment-methods/payment-method-repository';
import { PaymentMethodPicker } from '@/features/payment-methods/payment-method-picker';
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
  updateTransaction,
  type SaveTransactionInput,
  type Transaction,
  type TransactionClaimMembership,
  type TransactionType,
} from '@/features/transactions/transaction-repository';
import {
  getTimezoneOffsetMinutes,
  parseLocalDateTimeInput,
  toLocalDateTimeInput,
} from '@/lib/dates';
import {
  DEFAULT_QUICK_SHORTCUTS,
  getQuickShortcuts,
} from '@/features/settings/settings-repository';
import { isCodedError, mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  formatMoney,
  formatMoneyInput,
  formatShortcutLabel,
  parseMoneyInput,
} from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type SelectedReference = Readonly<{ id: number; name: string }>;

type FormState = Readonly<{
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
}>;

type FormErrors = Partial<
  Record<'amount' | 'category' | 'dateTime' | 'note' | 'submit', string>
>;

type PickerState = 'category' | 'paymentMethod' | null;

type ManualTransactionScreenProps = {
  transactionId?: number;
};

function createDefaultForm(): FormState {
  const now = Date.now();
  const dateTime = toLocalDateTimeInput(now, getTimezoneOffsetMinutes(now));
  return {
    amount: '',
    category: null,
    counterparty: '',
    date: dateTime.date,
    isReimbursable: false,
    note: '',
    paymentMethod: null,
    receipt: null,
    time: dateTime.time,
    type: 'expense',
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

export function ManualTransactionScreen({
  transactionId,
}: ManualTransactionScreenProps) {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { colors, isDark } = useTheme();
  const isEditMode = typeof transactionId === 'number';

  const [form, setForm] = useState<FormState>(createDefaultForm);
  const [initialForm, setInitialForm] = useState<FormState>(createDefaultForm);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethod[]>(
    [],
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

  const isDirty = useMemo(
    () => serializeForm(form) !== serializeForm(initialForm),
    [form, initialForm],
  );

  // Load Categories, Payment Methods & Custom Shortcuts
  const loadEntities = useCallback(
    async (type: TransactionType) => {
      try {
        const [cats, pms, userShortcuts] = await Promise.all([
          listCategories(database, type),
          listPaymentMethods(database),
          getQuickShortcuts(database),
        ]);
        setCategoriesList(cats);
        setPaymentMethodsList(pms);
        setQuickShortcuts(userShortcuts);
      } catch (err) {
        if (__DEV__) console.warn('Could not load categories or methods', err);
      }
    },
    [database],
  );

  useEffect(() => {
    void loadEntities(form.type);
  }, [form.type, loadEntities]);

  // Load Existing Transaction for Edit
  const loadTransaction = useCallback(async () => {
    if (!transactionId) return;
    setLoading(true);
    try {
      const [tx, claim] = await Promise.all([
        getTransaction(database, transactionId),
        getTransactionClaimMembership(database, transactionId),
      ]);
      if (!tx) {
        setErrors({ submit: 'Transaction was not found.' });
        return;
      }
      const initial = formFromTransaction(tx);
      setForm(initial);
      setInitialForm(initial);
      setClaimMembership(claim);
      setShowDetailSection(true);
    } catch (loadError) {
      setErrors({ submit: getOperationMessage(loadError) });
    } finally {
      setLoading(false);
    }
  }, [database, transactionId]);

  useEffect(() => {
    if (isEditMode) {
      void loadTransaction();
    }
  }, [isEditMode, loadTransaction]);

  // Navigation Guard
  const handleExit = useCallback(() => {
    if (savingRef.current || deletingRef.current) return;
    if (isDirty) {
      Alert.alert('Discard changes?', 'Your unsaved changes will be lost.', [
        { style: 'cancel', text: 'Keep Editing' },
        {
          onPress: () => router.back(),
          style: 'destructive',
          text: 'Discard',
        },
      ]);
      return;
    }
    router.back();
  }, [isDirty, router]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleExit();
        return true;
      },
    );
    return () => subscription.remove();
  }, [handleExit]);

  // Quick Amount Shortcut Handlers
  const handleAddIncrement = useCallback((inc: number) => {
    setForm((curr) => {
      let currentVal = 0;
      try {
        currentVal = parseMoneyInput(curr.amount, 'IDR');
      } catch {
        currentVal = 0;
      }
      const nextVal = Math.min(currentVal + inc, 1_000_000_000);
      return { ...curr, amount: formatMoneyInput(nextVal, 'IDR') };
    });
    setErrors((curr) => ({ ...curr, amount: undefined }));
  }, []);

  const handleClearAmount = useCallback(() => {
    setForm((curr) => ({ ...curr, amount: '' }));
  }, []);

  // Category Selection Handler
  const handleSelectCategory = useCallback((cat: Category) => {
    setForm((curr) => ({
      ...curr,
      category: { id: cat.id, name: cat.name },
    }));
    setErrors((curr) => ({ ...curr, category: undefined }));
  }, []);

  // Payment Method Selection Handler
  const handleSelectPaymentMethod = useCallback((pm: PaymentMethod) => {
    setForm((curr) => ({
      ...curr,
      paymentMethod:
        curr.paymentMethod?.id === pm.id ? null : { id: pm.id, name: pm.name },
    }));
  }, []);

  // Direct Photo Attachment Actions
  const handleSelectReceiptSource = useCallback(
    async (source: ManualReceiptSource) => {
      setReceiptMenuVisible(false);
      try {
        const selection = await pickManualReceipt(source);
        if (!selection) return;

        setForm((curr) => ({
          ...curr,
          receipt: selection,
        }));
      } catch (receiptError) {
        setErrors((curr) => ({
          ...curr,
          submit: getOperationMessage(receiptError),
        }));
      }
    },
    [],
  );

  // Save Transaction
  const handleSave = useCallback(async () => {
    if (savingRef.current || deletingRef.current) return;
    const { errors: nextErrors, input } = buildSaveInput(form);
    setErrors(nextErrors);
    if (!input) return;

    savingRef.current = true;
    setSaving(true);
    try {
      if (isEditMode && transactionId) {
        await updateTransaction(database, transactionId, input);
        router.dismissTo({
          params: { feedback: 'Transaction updated.' },
          pathname: '/transactions',
        });
      } else {
        await createTransaction(database, input);
        router.dismissTo({
          params: { feedback: 'Transaction recorded.' },
          pathname: '/transactions',
        });
      }
    } catch (saveError) {
      savingRef.current = false;
      setSaving(false);
      setErrors((curr) => ({
        ...curr,
        submit: getOperationMessage(saveError),
      }));
    }
  }, [database, form, isEditMode, router, transactionId]);

  // Delete Transaction (for Edit Mode)
  const handleDelete = useCallback(() => {
    if (!transactionId || deletingRef.current || savingRef.current) return;
    Alert.alert(
      'Delete transaction?',
      'This transaction and attached receipts will be deleted permanently.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: async () => {
            deletingRef.current = true;
            setDeleting(true);
            try {
              await deleteTransaction(database, transactionId);
              router.dismissTo({
                params: { feedback: 'Transaction deleted.' },
                pathname: '/transactions',
              });
            } catch (delError) {
              deletingRef.current = false;
              setDeleting(false);
              setErrors((curr) => ({
                ...curr,
                submit: getOperationMessage(delError),
              }));
            }
          },
          style: 'destructive',
          text: 'Delete',
        },
      ],
    );
  }, [database, router, transactionId]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading transaction details…</Text>
        </View>
      </Screen>
    );
  }

  const isExpense = form.type === 'expense';
  const parsedAmountMinor = (() => {
    try {
      return parseMoneyInput(form.amount, 'IDR');
    } catch {
      return 0;
    }
  })();

  return (
    <View style={styles.backdropOverlay}>
      <Pressable onPress={handleExit} style={styles.backdropTouchArea} />

      <View style={styles.bottomSheetModal}>
        {/* Drag Indicator */}
        <View style={styles.dragHandle} />

        {/* Header: Type Toggle + Close */}
        <View style={styles.sheetHeader}>
          <View style={styles.typeSegment}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isExpense }}
              onPress={() => {
                setForm((c) => ({
                  ...c,
                  category: null,
                  receipt: null,
                  type: 'expense',
                }));
                setErrors({});
              }}
              style={[
                styles.typeButton,
                isExpense ? styles.typeButtonActiveExpense : null,
              ]}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  isExpense ? styles.typeButtonTextActive : null,
                ]}
              >
                💸 {language === 'id' ? 'Pengeluaran' : 'Expense'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: !isExpense }}
              onPress={() => {
                setForm((c) => ({
                  ...c,
                  category: null,
                  isReimbursable: false,
                  receipt: null,
                  type: 'income',
                }));
                setErrors({});
              }}
              style={[
                styles.typeButton,
                !isExpense ? styles.typeButtonActiveIncome : null,
              ]}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  !isExpense ? styles.typeButtonTextActive : null,
                ]}
              >
                💰 {language === 'id' ? 'Pemasukan' : 'Income'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityLabel="Close modal"
            accessibilityRole="button"
            hitSlop={12}
            onPress={handleExit}
            style={styles.closeIconButton}
          >
            <MaterialCommunityIcons color="#64748B" name="close" size={24} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Amount Display & Number Pad input */}
          <Pressable
            onPress={() => amountInputRef.current?.focus()}
            style={[
              styles.amountHeroContainer,
              errors.amount ? styles.amountHeroError : null,
            ]}
          >
            <Text style={styles.currencyPrefix}>Rp</Text>
            <TextInput
              accessibilityLabel="Amount *"
              autoFocus={!isEditMode}
              inputMode="decimal"
              keyboardType="number-pad"
              onChangeText={(text) => {
                setForm((c) => ({ ...c, amount: text }));
                setErrors((c) => ({ ...c, amount: undefined }));
              }}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              ref={amountInputRef}
              style={styles.amountHeroInput}
              value={form.amount}
            />
          </Pressable>
          {errors.amount ? (
            <Text style={styles.errorBanner}>{errors.amount}</Text>
          ) : null}

          {/* Quick Cash Shortcuts (Customizable) */}
          <View style={styles.quickShortcutsRow}>
            <ScrollView
              contentContainerStyle={styles.shortcutsList}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {quickShortcuts.map((amount) => {
                const label = formatShortcutLabel(amount);
                return (
                  <Pressable
                    accessibilityLabel={`Add ${label}`}
                    accessibilityRole="button"
                    key={amount}
                    onPress={() => handleAddIncrement(amount)}
                    style={({ pressed }) => [
                      styles.shortcutChip,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceSecondary
                          : '#EFF6FF',
                        borderColor: isDark ? colors.border : '#BFDBFE',
                      },
                      pressed && styles.shortcutChipPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.shortcutChipText,
                        { color: colors.primary },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityLabel="Reset amount"
                accessibilityRole="button"
                onPress={handleClearAmount}
                style={({ pressed }) => [
                  styles.shortcutChip,
                  styles.shortcutChipClear,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                    borderColor: colors.border,
                  },
                  pressed && styles.shortcutChipPressed,
                ]}
              >
                <Text
                  style={[
                    styles.shortcutChipClearText,
                    { color: colors.textSecondary },
                  ]}
                >
                  ⌫ Reset
                </Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* 1-Tap Category Grid */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>
                {language === 'id' ? 'PILIH KATEGORI' : 'SELECT CATEGORY'} *
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Category *"
                onPress={() => setPicker('category')}
                style={styles.moreCategoriesBtn}
              >
                <Text style={styles.moreCategoriesText}>
                  {language === 'id' ? '+ Kategori Lain' : '+ More'}
                </Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.categoryGrid}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {categoriesList.slice(0, 10).map((cat) => {
                const meta = getCategoryMeta(cat.name, form.type);
                const isSelected = form.category?.id === cat.id;
                return (
                  <Pressable
                    accessibilityLabel={cat.name}
                    accessibilityRole="button"
                    key={cat.id}
                    onPress={() => handleSelectCategory(cat)}
                    style={[
                      styles.categoryCard,
                      isSelected ? styles.categoryCardSelected : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.categoryIconBadge,
                        { backgroundColor: meta.backgroundColor },
                        isSelected ? styles.categoryIconBadgeSelected : null,
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={meta.color}
                        name={meta.icon}
                        size={26}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.categoryNameText,
                        isSelected ? styles.categoryNameTextSelected : null,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {errors.category ? (
              <Text style={styles.errorBanner}>{errors.category}</Text>
            ) : null}
          </View>

          {/* Quick Payment Method Chips */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>
              {language === 'id' ? 'METODE PEMBAYARAN' : 'PAYMENT METHOD'}
            </Text>
            <ScrollView
              contentContainerStyle={styles.paymentMethodsList}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {paymentMethodsList.map((pm) => {
                const isSelected = form.paymentMethod?.id === pm.id;
                return (
                  <Pressable
                    accessibilityLabel={pm.name}
                    accessibilityRole="button"
                    key={pm.id}
                    onPress={() => handleSelectPaymentMethod(pm)}
                    style={[
                      styles.paymentMethodChip,
                      isSelected ? styles.paymentMethodChipSelected : null,
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={isSelected ? '#FFFFFF' : '#475569'}
                      name={
                        pm.name.toLowerCase().includes('cash') ||
                        pm.name.toLowerCase().includes('tunai')
                          ? 'cash'
                          : pm.name.toLowerCase().includes('qris') ||
                              pm.name.toLowerCase().includes('gopay') ||
                              pm.name.toLowerCase().includes('ovo')
                            ? 'qrcode-scan'
                            : 'credit-card-outline'
                      }
                      size={16}
                    />
                    <Text
                      style={[
                        styles.paymentMethodChipText,
                        isSelected
                          ? styles.paymentMethodChipTextSelected
                          : null,
                      ]}
                    >
                      {pm.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Quick Compact Details & Toggle */}
          <View style={styles.sectionContainer}>
            <View style={styles.compactDetailRow}>
              <View style={styles.counterpartyInputWrap}>
                <MaterialCommunityIcons
                  color="#94A3B8"
                  name="store-outline"
                  size={20}
                />
                <TextInput
                  accessibilityLabel="Merchant"
                  onChangeText={(text) =>
                    setForm((c) => ({ ...c, counterparty: text }))
                  }
                  placeholder={
                    language === 'id'
                      ? 'Nama toko / catatan (opsional)'
                      : 'Merchant / note (optional)'
                  }
                  placeholderTextColor="#94A3B8"
                  style={styles.compactInput}
                  value={form.counterparty}
                />
              </View>

              {isExpense ? (
                <Pressable
                  accessibilityLabel="Add receipt"
                  accessibilityRole="button"
                  onPress={() => setReceiptMenuVisible(true)}
                  style={[
                    styles.receiptActionChip,
                    form.receipt ? styles.receiptActionChipActive : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={form.receipt ? colors.primary : '#64748B'}
                    name={form.receipt ? 'image-check' : 'camera-plus-outline'}
                    size={20}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.receiptActionChipText,
                      form.receipt ? styles.receiptActionChipTextActive : null,
                    ]}
                  >
                    {form.receipt
                      ? form.receipt.displayName
                      : language === 'id'
                        ? '+ Foto'
                        : '+ Photo'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {claimMembership ? (
              <Text style={styles.claimMembershipNotice}>
                {language === 'id'
                  ? `Terikat pada Klaim #${claimMembership.claimId} (${claimMembership.claimStatus})`
                  : `Included in Claim #${claimMembership.claimId} (${claimMembership.claimStatus})`}
              </Text>
            ) : null}

            {/* Expandable Advanced Options */}
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowDetailSection((prev) => !prev)}
              style={styles.advancedToggleBtn}
            >
              <Text style={styles.advancedToggleText}>
                {showDetailSection
                  ? language === 'id'
                    ? '▲ Sembunyikan Opsi Lanjutan'
                    : '▲ Hide Details'
                  : language === 'id'
                    ? '▼ Tanggal, Catatan & Klaim'
                    : '▼ Date, Note & Claim Details'}
              </Text>
            </Pressable>

            {showDetailSection ? (
              <View style={styles.advancedFieldsPanel}>
                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <AppInput
                      accessibilityLabel="Transaction date"
                      label={language === 'id' ? 'Tanggal' : 'Date'}
                      onChangeText={(date) => setForm((c) => ({ ...c, date }))}
                      placeholder="YYYY-MM-DD"
                      value={form.date}
                    />
                  </View>
                  <View style={styles.timeField}>
                    <AppInput
                      accessibilityLabel="Transaction time"
                      label={language === 'id' ? 'Waktu' : 'Time'}
                      onChangeText={(time) => setForm((c) => ({ ...c, time }))}
                      placeholder="HH:mm"
                      value={form.time}
                    />
                  </View>
                </View>

                {isExpense ? (
                  <View style={styles.reimbursableRow}>
                    <View>
                      <Text style={styles.reimbursableTitle}>
                        {language === 'id'
                          ? 'Dapat Diklaim (Reimburse)'
                          : 'Reimbursable Expense'}
                      </Text>
                      <Text style={styles.reimbursableSubtitle}>
                        {language === 'id'
                          ? 'Tandai untuk klaim kantor / dinas'
                          : 'Mark to claim reimbursement'}
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel="Reimbursable"
                      onValueChange={(isReimbursable) =>
                        setForm((c) => ({ ...c, isReimbursable }))
                      }
                      trackColor={{ false: '#CBD5E1', true: colors.primary }}
                      value={form.isReimbursable}
                    />
                  </View>
                ) : null}

                <AppInput
                  label={language === 'id' ? 'Catatan Lengkap' : 'Full Note'}
                  multiline
                  numberOfLines={2}
                  onChangeText={(note) => setForm((c) => ({ ...c, note }))}
                  placeholder="Optional"
                  value={form.note}
                />
              </View>
            ) : null}
          </View>

          {errors.submit ? (
            <Text style={styles.errorBanner}>{errors.submit}</Text>
          ) : null}

          {/* Big Action Save Button */}
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
                <Text style={styles.saveBigButtonText}>
                  {isEditMode
                    ? language === 'id'
                      ? `Update Transaksi • ${parsedAmountMinor > 0 ? formatMoney(parsedAmountMinor, 'IDR') : ''}`
                      : `Update Transaction • ${parsedAmountMinor > 0 ? formatMoney(parsedAmountMinor, 'IDR') : ''}`
                    : isExpense
                      ? language === 'id'
                        ? `✓ Simpan Pengeluaran • ${parsedAmountMinor > 0 ? formatMoney(parsedAmountMinor, 'IDR') : ''}`
                        : `✓ Save Expense • ${parsedAmountMinor > 0 ? formatMoney(parsedAmountMinor, 'IDR') : ''}`
                      : language === 'id'
                        ? `✓ Simpan Pemasukan • ${parsedAmountMinor > 0 ? formatMoney(parsedAmountMinor, 'IDR') : ''}`
                        : `✓ Save Income • ${parsedAmountMinor > 0 ? formatMoney(parsedAmountMinor, 'IDR') : ''}`}
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
      </View>

      {/* Category Picker Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setPicker(null)}
        visible={picker === 'category'}
      >
        <Screen>
          <View style={styles.modalScreenHeader}>
            <Text style={styles.actionSheetTitle}>
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
          <View style={styles.modalScreenHeader}>
            <Text style={styles.actionSheetTitle}>
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
      <Modal
        animationType="fade"
        onRequestClose={() => setReceiptMenuVisible(false)}
        transparent
        visible={receiptMenuVisible}
      >
        <Pressable
          onPress={() => setReceiptMenuVisible(false)}
          style={styles.modalOverlay}
        >
          <View style={styles.actionSheetContent}>
            <Text style={styles.actionSheetTitle}>
              {language === 'id' ? 'Foto Bukti / Struk' : 'Attach Photo Proof'}
            </Text>
            <AppButton
              label={language === 'id' ? 'Ambil Foto (Kamera)' : 'Take photo'}
              onPress={() => void handleSelectReceiptSource('camera')}
              variant="secondary"
            />
            <AppButton
              label={
                language === 'id' ? 'Pilih dari Galeri' : 'Choose from gallery'
              }
              onPress={() => void handleSelectReceiptSource('gallery')}
              variant="secondary"
            />
            {form.receipt ? (
              <AppButton
                label={language === 'id' ? 'Hapus Foto' : 'Remove Photo'}
                onPress={() => {
                  setForm((c) => ({ ...c, receipt: null }));
                  setReceiptMenuVisible(false);
                }}
                variant="destructive"
              />
            ) : null}
            <AppButton
              label={t.common.cancel}
              onPress={() => setReceiptMenuVisible(false)}
              variant="ghost"
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdropOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouchArea: {
    flex: 1,
  },
  bottomSheetModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { height: -4, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  dragHandle: {
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    height: 5,
    marginTop: spacing.sm,
    width: 44,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  typeSegment: {
    backgroundColor: '#F1F5F9',
    borderRadius: radius.pill,
    flexDirection: 'row',
    padding: 3,
  },
  typeButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  typeButtonActiveExpense: {
    backgroundColor: '#EF4444',
  },
  typeButtonActiveIncome: {
    backgroundColor: '#10B981',
  },
  typeButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  closeIconButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  scrollContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  amountHeroContainer: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  amountHeroError: {
    borderColor: colors.destructive,
  },
  currencyPrefix: {
    color: '#64748B',
    fontSize: 22,
    fontWeight: '800',
    marginRight: 6,
  },
  amountHeroInput: {
    color: '#0F172A',
    fontSize: 34,
    fontWeight: '900',
    minWidth: 100,
    textAlign: 'center',
  },
  quickShortcutsRow: {
    marginTop: -spacing.xs,
  },
  shortcutsList: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingVertical: 2,
  },
  shortcutChip: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  shortcutChipPressed: {
    opacity: 0.7,
  },
  shortcutChipText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  shortcutChipClear: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  shortcutChipClearText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionContainer: {
    gap: spacing.xs,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  moreCategoriesBtn: {
    paddingVertical: 2,
  },
  moreCategoriesText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: spacing.xs,
  },
  categoryCard: {
    alignItems: 'center',
    gap: 6,
    width: 68,
  },
  categoryCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  categoryIconBadge: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 20,
    borderWidth: 2,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  categoryIconBadgeSelected: {
    borderColor: colors.primary,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  categoryNameText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryNameTextSelected: {
    color: colors.primary,
    fontWeight: '800',
  },
  paymentMethodsList: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  paymentMethodChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  paymentMethodChipSelected: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  paymentMethodChipText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  paymentMethodChipTextSelected: {
    color: '#FFFFFF',
  },
  compactDetailRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  counterpartyInputWrap: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  compactInput: {
    color: '#0F172A',
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  receiptActionChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 4,
    maxWidth: 130,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  receiptActionChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
  },
  receiptActionChipText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  receiptActionChipTextActive: {
    color: colors.primary,
  },
  advancedToggleBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  advancedToggleText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  advancedFieldsPanel: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateField: {
    flex: 2,
  },
  timeField: {
    flex: 1,
  },
  reimbursableRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  reimbursableTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  reimbursableSubtitle: {
    color: '#64748B',
    fontSize: 12,
  },
  actionBtnContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  saveBigButton: {
    alignItems: 'center',
    borderRadius: 18,
    elevation: 4,
    height: 56,
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  saveBigButtonExpense: {
    backgroundColor: colors.primary,
  },
  saveBigButtonIncome: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  saveBigButtonDisabled: {
    opacity: 0.6,
  },
  saveBigButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  errorBanner: {
    color: colors.destructive,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  claimMembershipNotice: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: radius.md,
    borderWidth: 1,
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
    padding: spacing.sm,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  actionSheetContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    gap: spacing.sm,
    padding: spacing.lg,
    width: '100%',
  },
  actionSheetTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalScreenHeader: {
    alignItems: 'center',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
