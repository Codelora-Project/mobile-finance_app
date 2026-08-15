import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Image,
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
import { useReceiptFlow } from '@/features/receipts/receipt-flow-context';
import { PaymentMethodPicker } from '@/features/payment-methods/payment-method-picker';
import type { PaymentMethod } from '@/features/payment-methods/payment-method-repository';
import { createTransaction } from '@/features/transactions/transaction-repository';
import {
  getTimezoneOffsetMinutes,
  parseLocalDateTimeInput,
  toLocalDateTimeInput,
} from '@/lib/dates';
import { isCodedError, mapError } from '@/lib/errors';
import { formatMoneyInput, parseMoneyInput } from '@/lib/money';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type Reference = Readonly<{ id: number; name: string }>;
type Picker = 'category' | 'payment' | null;

export function ReceiptReviewScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { clearImage, image, ocr } = useReceiptFlow();
  const nowRef = useRef(Date.now());
  const currentDateTime = toLocalDateTimeInput(
    nowRef.current,
    getTimezoneOffsetMinutes(nowRef.current),
  );
  const [amount, setAmount] = useState(
    ocr.parsed?.totalMinor
      ? formatMoneyInput(ocr.parsed.totalMinor, 'IDR')
      : '',
  );
  const [merchant, setMerchant] = useState(ocr.parsed?.merchant ?? '');
  const [date, setDate] = useState(
    ocr.parsed?.localDate ?? currentDateTime.date,
  );
  const [time, setTime] = useState(currentDateTime.time);
  const [category, setCategory] = useState<Reference | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<Reference | null>(null);
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [note, setNote] = useState('');
  const [picker, setPicker] = useState<Picker>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const exit = useCallback(() => {
    if (savingRef.current) return;
    Alert.alert(
      'Discard receipt?',
      'Your reviewed receipt will not be saved.',
      [
        { style: 'cancel', text: 'Keep Reviewing' },
        {
          onPress: () => {
            clearImage();
            router.dismissTo('/transactions');
          },
          style: 'destructive',
          text: 'Discard',
        },
      ],
    );
  }, [clearImage, router]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        exit();
        return true;
      },
    );
    return () => subscription.remove();
  }, [exit]);

  if (!image) {
    return (
      <Screen style={styles.centered}>
        <Text accessibilityRole="header" style={styles.title}>
          Receipt unavailable
        </Text>
        <Text style={styles.helper}>
          Choose a receipt image before reviewing it.
        </Text>
        <AppButton
          label="Back"
          onPress={() => router.dismissTo('/transactions')}
        />
      </Screen>
    );
  }

  async function save() {
    if (savingRef.current || !image) return;
    const nextErrors: Record<string, string> = {};
    let amountMinor: number | null = null;
    let dateTime: ReturnType<typeof parseLocalDateTimeInput> | null = null;
    try {
      amountMinor = parseMoneyInput(amount, 'IDR');
    } catch {
      nextErrors.amount = 'Enter the receipt total.';
    }
    if (!category) nextErrors.category = 'Choose a category.';
    try {
      dateTime = parseLocalDateTimeInput(date, time);
      if (dateTime.occurredAt > Date.now()) {
        nextErrors.dateTime = 'Transaction date cannot be in the future.';
      }
    } catch {
      nextErrors.dateTime = 'Enter a valid transaction date and time.';
    }
    if (Array.from(note.normalize('NFC').trim()).length > 500) {
      nextErrors.note = 'Note must be 500 characters or fewer.';
    }
    setErrors(nextErrors);
    if (
      Object.keys(nextErrors).length ||
      amountMinor === null ||
      !category ||
      !dateTime
    )
      return;

    savingRef.current = true;
    setSaving(true);
    try {
      await createTransaction(database, {
        amountMinor,
        categoryId: category.id,
        counterparty: merchant,
        currencyCode: 'IDR',
        isReimbursable,
        localDate: dateTime.localDate,
        note,
        occurredAt: dateTime.occurredAt,
        paymentMethodId: paymentMethod?.id ?? null,
        receipt: {
          mimeType: image.mimeType,
          ocrRawText: ocr.rawText,
          ocrStatus:
            ocr.status === 'processed' || ocr.status === 'partial'
              ? ocr.status
              : 'failed',
          sourceImageUri: image.sourceImageUri,
          subtotalMinor: ocr.parsed?.subtotalMinor ?? null,
          taxMinor: ocr.parsed?.taxMinor ?? null,
        },
        timezoneOffsetMinutes: dateTime.timezoneOffsetMinutes,
        type: 'expense',
      });
      clearImage();
      router.dismissTo({
        pathname: '/transactions',
        params: { feedback: 'Expense saved.' },
      });
    } catch (error) {
      if (__DEV__ && !isCodedError(error))
        console.error('Receipt review could not be saved.', error);
      setErrors((current) => ({
        ...current,
        submit: isCodedError(error)
          ? error.message
          : mapError(error, 'DATABASE_WRITE_FAILED').message,
      }));
      savingRef.current = false;
      setSaving(false);
    }
  }

  const partial = ocr.status === 'partial';
  const failed = ocr.status === 'failed' || ocr.status === 'timeout';
  return (
    <Screen>
      <View style={styles.header}>
        <AppButton label="Back" onPress={exit} variant="ghost" />
        <Text accessibilityRole="header" style={styles.title}>
          Review Receipt
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.form}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <Image
          accessibilityLabel="Receipt thumbnail"
          resizeMode="contain"
          source={{ uri: image.sourceImageUri }}
          style={styles.thumbnail}
        />
        {partial || failed ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {partial
                ? 'Some receipt details couldn’t be detected. Please review the fields below.'
                : 'Enter the expense details manually. The receipt remains attached.'}
            </Text>
          </View>
        ) : null}
        {ocr.parsed?.localDate === null ? (
          <Text style={styles.warning}>
            Receipt date wasn’t detected. Please check it.
          </Text>
        ) : null}

        <AppInput
          error={errors.amount}
          inputMode="decimal"
          label="Total *"
          onChangeText={setAmount}
          placeholder="0"
          value={amount}
        />
        <AppInput
          autoCapitalize="words"
          label="Merchant"
          onChangeText={setMerchant}
          placeholder="Optional"
          value={merchant}
        />
        <View>
          <Text style={styles.fieldLabel}>Date & Time *</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <AppInput
                accessibilityLabel="Receipt date"
                label="Date"
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                value={date}
              />
            </View>
            <View style={styles.timeField}>
              <AppInput
                accessibilityLabel="Receipt time"
                label="Time"
                onChangeText={setTime}
                placeholder="HH:mm"
                value={time}
              />
            </View>
          </View>
          {errors.dateTime ? (
            <Text style={styles.error}>{errors.dateTime}</Text>
          ) : null}
        </View>
        <SelectionField
          error={errors.category}
          label="Category *"
          onPress={() => setPicker('category')}
          value={category?.name ?? ''}
        />
        <SelectionField
          label="Payment Method"
          onPress={() => setPicker('payment')}
          value={paymentMethod?.name ?? ''}
        />
        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>Reimbursable</Text>
          <Switch
            accessibilityLabel="Reimbursable"
            onValueChange={setIsReimbursable}
            trackColor={{ false: colors.border, true: colors.primary }}
            value={isReimbursable}
          />
        </View>
        <AppInput
          error={errors.note}
          label="Note"
          multiline
          numberOfLines={4}
          onChangeText={setNote}
          placeholder="Optional"
          value={note}
        />
        {errors.submit ? (
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            {errors.submit}
          </Text>
        ) : null}
        <AppButton
          label="Save Expense"
          loading={saving}
          onPress={() => void save()}
          testID="save-receipt-expense"
        />
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setPicker(null)}
        visible={picker !== null}
      >
        <Screen>
          <View style={styles.modalHeader}>
            <Text accessibilityRole="header" style={styles.title}>
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
                onSelect={(selected: Category) => {
                  setCategory({ id: selected.id, name: selected.name });
                  setErrors((value) => ({ ...value, category: undefined }));
                  setPicker(null);
                }}
                selectedId={category?.id}
                type="expense"
              />
            ) : null}
            {picker === 'payment' ? (
              <PaymentMethodPicker
                allowNone
                onSelect={(selected: PaymentMethod | null) => {
                  setPaymentMethod(
                    selected ? { id: selected.id, name: selected.name } : null,
                  );
                  setPicker(null);
                }}
                selectedId={paymentMethod?.id}
              />
            ) : null}
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
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
        style={styles.selection}
      >
        <Text style={value ? styles.value : styles.helper}>
          {value || `Choose ${label.toLowerCase()}`}
        </Text>
        <Text style={styles.value}>›</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dateField: { flex: 2 },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  error: {
    color: colors.destructive,
    fontSize: typography.secondary.fontSize,
    marginTop: spacing.xs,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  form: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerSpacer: { width: 72 },
  helper: {
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
  },
  modalContent: { flex: 1, padding: spacing.lg },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    padding: spacing.md,
  },
  notice: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeText: { color: colors.textPrimary, fontSize: typography.body.fontSize },
  selection: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  thumbnail: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    height: 220,
    width: '100%',
  },
  timeField: { flex: 1 },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    textAlign: 'center',
  },
  value: { color: colors.textPrimary, fontSize: typography.body.fontSize },
  warning: {
    color: colors.warning ?? colors.textSecondary,
    fontSize: typography.secondary.fontSize,
  },
});
