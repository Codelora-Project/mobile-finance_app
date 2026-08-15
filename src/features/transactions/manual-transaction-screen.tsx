import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { Screen } from '@/components/ui/screen';
import { CategoryPicker } from '@/features/categories/category-picker';
import type { Category } from '@/features/categories/category-repository';
import {
  pickManualReceipt,
  type ManualReceiptSelection,
} from '@/features/transactions/manual-receipt-picker';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  updateTransaction,
  type SaveTransactionInput,
  type Transaction,
  type TransactionType,
} from '@/features/transactions/transaction-repository';
import { PaymentMethodPicker } from '@/features/payment-methods/payment-method-picker';
import type { PaymentMethod } from '@/features/payment-methods/payment-method-repository';
import {
  getTimezoneOffsetMinutes,
  parseLocalDateTimeInput,
  toLocalDateTimeInput,
} from '@/lib/dates';
import { isCodedError, mapError } from '@/lib/errors';
import { parseMoneyInput } from '@/lib/money';
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
    amount: String(transaction.amountMinor),
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
  return mapError(error, 'DATABASE_WRITE_FAILED').message;
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

function SelectionField({
  error,
  label,
  onPress,
  value,
}: {
  error?: string;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.selectionField,
          error ? styles.selectionFieldError : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={value ? styles.selectionValue : styles.placeholder}>
          {value || `Choose ${label.toLowerCase()}`}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function ManualTransactionScreen({
  transactionId,
}: ManualTransactionScreenProps) {
  const database = useSQLiteContext();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(createDefaultForm);
  const initialSnapshot = useRef(serializeForm(form));
  const savingRef = useRef(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [picker, setPicker] = useState<PickerState>(null);
  const [loading, setLoading] = useState(transactionId !== undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectingReceipt, setSelectingReceipt] = useState(false);

  const isEditing = transactionId !== undefined;
  const isDirty = serializeForm(form) !== initialSnapshot.current;

  const loadTransaction = useCallback(async () => {
    if (transactionId === undefined) {
      return;
    }
    try {
      const transaction = await getTransaction(database, transactionId);
      if (!transaction) {
        setLoadError('Transaction not found.');
        return;
      }
      const nextForm = formFromTransaction(transaction);
      setForm(nextForm);
      initialSnapshot.current = serializeForm(nextForm);
      setLoadError(null);
    } catch (error) {
      if (__DEV__) {
        console.error('Manual transaction could not be loaded.', error);
      }
      setLoadError(mapError(error, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setLoading(false);
    }
  }, [database, transactionId]);

  useEffect(() => {
    if (transactionId === undefined) {
      return;
    }
    let active = true;
    getTransaction(database, transactionId)
      .then((transaction) => {
        if (!active) {
          return;
        }
        if (!transaction) {
          setLoadError('Transaction not found.');
          return;
        }
        const nextForm = formFromTransaction(transaction);
        setForm(nextForm);
        initialSnapshot.current = serializeForm(nextForm);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (__DEV__) {
          console.error('Manual transaction could not be loaded.', error);
        }
        if (active) {
          setLoadError(mapError(error, 'DATABASE_WRITE_FAILED').message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [database, transactionId]);

  const exitScreen = useCallback(() => {
    router.back();
  }, [router]);

  const requestExit = useCallback(() => {
    if (savingRef.current || deleting) {
      return;
    }
    if (!isDirty) {
      exitScreen();
      return;
    }
    Alert.alert('Discard changes?', 'Your unsaved changes will be lost.', [
      { style: 'cancel', text: 'Keep Editing' },
      { onPress: exitScreen, style: 'destructive', text: 'Discard' },
    ]);
  }, [deleting, exitScreen, isDirty]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        requestExit();
        return true;
      },
    );
    return () => subscription.remove();
  }, [requestExit]);

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => ({ ...current, submit: undefined }));
  }

  function applyType(type: TransactionType) {
    if (type === form.type) {
      return;
    }
    updateForm({
      category: null,
      isReimbursable: type === 'expense' ? form.isReimbursable : false,
      receipt: type === 'expense' ? form.receipt : null,
      type,
    });
    setErrors((current) => ({ ...current, category: undefined }));
  }

  function selectType(type: TransactionType) {
    if (type === 'income' && (form.receipt !== null || form.isReimbursable)) {
      Alert.alert(
        'Switch to income?',
        'The receipt and reimbursable selection will be removed.',
        [
          { style: 'cancel', text: 'Cancel' },
          { onPress: () => applyType(type), text: 'Switch' },
        ],
      );
      return;
    }
    applyType(type);
  }

  async function selectReceipt() {
    setSelectingReceipt(true);
    try {
      const receipt = await pickManualReceipt();
      if (receipt) {
        updateForm({ receipt });
      }
    } catch (error) {
      if (__DEV__ && !isCodedError(error)) {
        console.error('Manual receipt selection failed.', error);
      }
      setErrors((current) => ({
        ...current,
        submit: getOperationMessage(error),
      }));
    } finally {
      setSelectingReceipt(false);
    }
  }

  function removeReceipt() {
    Alert.alert('Remove receipt?', 'The receipt will be detached.', [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => updateForm({ receipt: null }),
        style: 'destructive',
        text: 'Remove',
      },
    ]);
  }

  async function save() {
    if (savingRef.current) {
      return;
    }
    const result = buildSaveInput(form);
    setErrors(result.errors);
    if (!result.input) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const saved = isEditing
        ? await updateTransaction(database, transactionId, result.input)
        : await createTransaction(database, result.input);
      initialSnapshot.current = serializeForm(form);
      router.dismissTo({
        params: {
          feedback: `${saved.type === 'expense' ? 'Expense' : 'Income'} saved.`,
          savedTransactionId: String(saved.id),
        },
        pathname: '/',
      });
    } catch (error) {
      if (__DEV__ && !isCodedError(error)) {
        console.error('Manual transaction could not be saved.', error);
      }
      setErrors((current) => ({
        ...current,
        submit: getOperationMessage(error),
      }));
      savingRef.current = false;
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (transactionId === undefined) {
      return;
    }
    Alert.alert('Delete transaction?', 'This action cannot be undone.', [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => {
          setDeleting(true);
          deleteTransaction(database, transactionId)
            .then(() => {
              initialSnapshot.current = serializeForm(form);
              router.dismissTo({
                params: { feedback: 'Transaction deleted.' },
                pathname: '/',
              });
            })
            .catch((error: unknown) => {
              if (__DEV__ && !isCodedError(error)) {
                console.error('Manual transaction delete failed.', error);
              }
              setErrors((current) => ({
                ...current,
                submit: getOperationMessage(error),
              }));
              setDeleting(false);
            });
        },
        style: 'destructive',
        text: 'Delete',
      },
    ]);
  }

  if (loading) {
    return (
      <Screen style={styles.stateScreen}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Loading transaction…</Text>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen style={styles.stateScreen}>
        <Text accessibilityRole="header" style={styles.title}>
          Transaction unavailable
        </Text>
        <Text accessibilityLiveRegion="assertive" style={styles.stateText}>
          {loadError}
        </Text>
        <View style={styles.stateActions}>
          {transactionId !== undefined ? (
            <AppButton
              label="Try again"
              onPress={() => void loadTransaction()}
            />
          ) : null}
          <AppButton label="Back" onPress={exitScreen} variant="secondary" />
        </View>
      </Screen>
    );
  }

  const noteLength = Array.from(form.note.normalize('NFC').trim()).length;

  return (
    <Screen>
      <View style={styles.header}>
        <AppButton label="Back" onPress={requestExit} variant="ghost" />
        <Text accessibilityRole="header" style={styles.title}>
          {isEditing ? 'Edit Transaction' : 'Manual Transaction'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <View accessibilityRole="tablist" style={styles.segment}>
          {(['expense', 'income'] as const).map((type) => {
            const selected = form.type === type;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={type}
                onPress={() => selectType(type)}
                style={({ pressed }) => [
                  styles.segmentButton,
                  selected ? styles.segmentSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={
                    selected ? styles.segmentSelectedText : styles.segmentText
                  }
                >
                  {type === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <AppInput
          autoFocus={!isEditing}
          error={errors.amount}
          inputMode="decimal"
          label="Amount *"
          onChangeText={(amount) => updateForm({ amount })}
          placeholder="0"
          value={form.amount}
        />

        <SelectionField
          error={errors.category}
          label="Category *"
          onPress={() => setPicker('category')}
          value={form.category?.name ?? ''}
        />

        <View>
          <Text style={styles.fieldLabel}>Date & Time *</Text>
          <View style={styles.dateTimeRow}>
            <View style={styles.dateField}>
              <AppInput
                accessibilityLabel="Transaction date"
                autoCapitalize="none"
                error={null}
                label="Date"
                onChangeText={(date) => updateForm({ date })}
                placeholder="YYYY-MM-DD"
                value={form.date}
              />
            </View>
            <View style={styles.timeField}>
              <AppInput
                accessibilityLabel="Transaction time"
                autoCapitalize="none"
                error={null}
                label="Time"
                onChangeText={(time) => updateForm({ time })}
                placeholder="HH:mm"
                value={form.time}
              />
            </View>
          </View>
          {errors.dateTime ? (
            <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
              {errors.dateTime}
            </Text>
          ) : null}
        </View>

        <AppInput
          autoCapitalize="words"
          label={form.type === 'expense' ? 'Merchant' : 'Source'}
          onChangeText={(counterparty) => updateForm({ counterparty })}
          placeholder="Optional"
          value={form.counterparty}
        />

        <SelectionField
          label="Payment Method"
          onPress={() => setPicker('paymentMethod')}
          value={form.paymentMethod?.name ?? ''}
        />

        {form.type === 'expense' ? (
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.fieldLabel}>Reimbursable</Text>
              <Text style={styles.helper}>
                Include this expense in a claim.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Reimbursable"
              onValueChange={(isReimbursable) => updateForm({ isReimbursable })}
              trackColor={{ false: colors.border, true: colors.primary }}
              value={form.isReimbursable}
            />
          </View>
        ) : null}

        <View>
          <AppInput
            error={errors.note}
            label="Note"
            multiline
            numberOfLines={4}
            onChangeText={(note) => updateForm({ note })}
            placeholder="Optional"
            style={styles.noteInput}
            textAlignVertical="top"
            value={form.note}
          />
          <Text style={styles.characterCount}>{noteLength}/500</Text>
        </View>

        {form.type === 'expense' ? (
          <View>
            <Text style={styles.fieldLabel}>Receipt</Text>
            {form.receipt ? (
              <View style={styles.receiptCard}>
                <View style={styles.receiptText}>
                  <Text numberOfLines={1} style={styles.selectionValue}>
                    {form.receipt.displayName}
                  </Text>
                  <Text style={styles.helper}>OCR not processed</Text>
                </View>
                <AppButton
                  label="Remove"
                  onPress={removeReceipt}
                  variant="destructive"
                />
              </View>
            ) : (
              <AppButton
                label="Attach receipt"
                loading={selectingReceipt}
                onPress={() => void selectReceipt()}
                variant="secondary"
              />
            )}
          </View>
        ) : null}

        {errors.submit ? (
          <Text accessibilityLiveRegion="assertive" style={styles.submitError}>
            {errors.submit}
          </Text>
        ) : null}

        <View style={styles.formActions}>
          <AppButton
            disabled={deleting}
            label={`Save ${form.type === 'expense' ? 'Expense' : 'Income'}`}
            loading={saving}
            onPress={() => void save()}
            testID="save-transaction"
          />
          {isEditing ? (
            <AppButton
              disabled={saving}
              label="Delete transaction"
              loading={deleting}
              onPress={confirmDelete}
              variant="destructive"
            />
          ) : null}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setPicker(null)}
        visible={picker !== null}
      >
        <Screen>
          <View style={styles.modalHeader}>
            <Text accessibilityRole="header" style={styles.modalTitle}>
              {picker === 'category' ? 'Choose Category' : 'Payment Method'}
            </Text>
            <AppButton
              label="Close"
              onPress={() => setPicker(null)}
              variant="ghost"
            />
          </View>
          <View style={styles.modalContent}>
            {picker === 'category' ? (
              <CategoryPicker
                onSelect={(category: Category) => {
                  updateForm({
                    category: { id: category.id, name: category.name },
                  });
                  setErrors((current) => ({
                    ...current,
                    category: undefined,
                  }));
                  setPicker(null);
                }}
                selectedId={form.category?.id}
                type={form.type}
              />
            ) : null}
            {picker === 'paymentMethod' ? (
              <PaymentMethodPicker
                allowNone
                onSelect={(paymentMethod: PaymentMethod | null) => {
                  updateForm({
                    paymentMethod: paymentMethod
                      ? { id: paymentMethod.id, name: paymentMethod.name }
                      : null,
                  });
                  setPicker(null);
                }}
                selectedId={form.paymentMethod?.id}
              />
            ) : null}
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerSpacer: {
    width: 72,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    lineHeight: typography.sectionTitle.lineHeight,
    textAlign: 'center',
  },
  form: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  segment: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  segmentSelectedText: {
    color: colors.primary,
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
    lineHeight: typography.secondary.lineHeight,
    marginBottom: spacing.xs,
  },
  selectionField: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  selectionFieldError: {
    borderColor: colors.destructive,
  },
  selectionValue: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  placeholder: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: 28,
  },
  fieldError: {
    color: colors.destructive,
    fontSize: typography.secondary.fontSize,
    lineHeight: typography.secondary.lineHeight,
    marginTop: spacing.xs,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateField: {
    flex: 1.4,
  },
  timeField: {
    flex: 1,
  },
  switchRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchText: {
    flex: 1,
  },
  helper: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
    lineHeight: typography.metadata.lineHeight,
  },
  noteInput: {
    minHeight: 112,
  },
  characterCount: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  receiptCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 64,
    padding: spacing.sm,
  },
  receiptText: {
    flex: 1,
  },
  submitError: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    color: colors.destructive,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    padding: spacing.md,
  },
  formActions: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  modalTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    lineHeight: typography.sectionTitle.lineHeight,
  },
  modalContent: {
    flex: 1,
  },
  stateScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  stateActions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
});
