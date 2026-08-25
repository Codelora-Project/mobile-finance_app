import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import {
  listCategories,
  type Category,
} from '@/features/categories/category-repository';
import {
  listPaymentMethods,
  type PaymentMethod,
} from '@/features/payment-methods/payment-method-repository';
import type {
  TransactionFilters,
  TransactionType,
} from '@/features/transactions/transaction-repository';
import { isLocalDate } from '@/lib/dates';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

type BooleanChoice = 'all' | 'yes' | 'no';

type DraftFilters = {
  type: TransactionType | 'all';
  categoryId?: number;
  dateFrom: string;
  dateTo: string;
  paymentMethodId?: number;
  isReimbursable: BooleanChoice;
  hasReceipt: BooleanChoice;
};

type TransactionFilterModalProps = {
  filters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
  visible: boolean;
};

function booleanChoice(value: boolean | undefined): BooleanChoice {
  return value === undefined ? 'all' : value ? 'yes' : 'no';
}

function createDraft(filters: TransactionFilters): DraftFilters {
  return {
    categoryId: filters.categoryId,
    dateFrom: filters.dateFrom ?? '',
    dateTo: filters.dateTo ?? '',
    hasReceipt: booleanChoice(filters.hasReceipt),
    isReimbursable: booleanChoice(filters.isReimbursable),
    paymentMethodId: filters.paymentMethodId,
    type: filters.type ?? 'all',
  };
}

function toBooleanFilter(choice: BooleanChoice) {
  return choice === 'all' ? undefined : choice === 'yes';
}

function ChoiceChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? colors.primary
            : isDark
              ? colors.surfaceSecondary
              : '#F1F5F9',
          borderColor: selected ? colors.primary : colors.border,
        },
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? '#FFFFFF' : colors.textPrimary,
            fontWeight: selected ? '700' : '600',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function BooleanChoices({
  label,
  onChange,
  value,
  yesLabel = 'Yes',
  noLabel = 'No',
  allLabel = 'All',
}: {
  label: string;
  onChange: (value: BooleanChoice) => void;
  value: BooleanChoice;
  yesLabel?: string;
  noLabel?: string;
  allLabel?: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.filterSection}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <View accessibilityRole="radiogroup" style={styles.choiceRow}>
        {(['all', 'yes', 'no'] as const).map((choice) => (
          <ChoiceChip
            key={choice}
            label={
              choice === 'all'
                ? allLabel
                : choice === 'yes'
                  ? yesLabel
                  : noLabel
            }
            onPress={() => onChange(choice)}
            selected={value === choice}
          />
        ))}
      </View>
    </View>
  );
}

export function TransactionFilterModal({
  filters,
  onApply,
  onClose,
  visible,
}: TransactionFilterModalProps) {
  const database = useSQLiteContext();
  const { language, t } = useLanguage();
  const { colors, isDark } = useTheme();

  const [draft, setDraft] = useState(() => createDraft(filters));
  const [categories, setCategories] = useState<readonly Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<
    readonly PaymentMethod[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([listCategories(database), listPaymentMethods(database)])
      .then(([nextCategories, nextPaymentMethods]) => {
        if (active) {
          setCategories(nextCategories);
          setPaymentMethods(nextPaymentMethods);
        }
      })
      .catch((error: unknown) => {
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
  }, [database]);

  const visibleCategories = categories.filter(
    (category) => draft.type === 'all' || category.type === draft.type,
  );

  function apply() {
    const dateFrom = draft.dateFrom.trim();
    const dateTo = draft.dateTo.trim();
    if (
      (dateFrom && !isLocalDate(dateFrom)) ||
      (dateTo && !isLocalDate(dateTo))
    ) {
      setDateError(
        language === 'id'
          ? 'Format tanggal harus YYYY-MM-DD.'
          : 'Enter dates as YYYY-MM-DD.',
      );
      return;
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setDateError(
        language === 'id'
          ? 'Tanggal awal tidak boleh lebih besar dari tanggal akhir.'
          : 'Start date must be on or before end date.',
      );
      return;
    }

    onApply({
      ...(draft.type === 'all' ? {} : { type: draft.type }),
      ...(draft.categoryId === undefined
        ? {}
        : { categoryId: draft.categoryId }),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(draft.paymentMethodId === undefined
        ? {}
        : { paymentMethodId: draft.paymentMethodId }),
      ...(toBooleanFilter(draft.isReimbursable) === undefined
        ? {}
        : { isReimbursable: toBooleanFilter(draft.isReimbursable) }),
      ...(toBooleanFilter(draft.hasReceipt) === undefined
        ? {}
        : { hasReceipt: toBooleanFilter(draft.hasReceipt) }),
    });
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.textPrimary,
            },
          ]}
        >
          {/* Drag Handle */}
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: isDark ? '#52525B' : '#CBD5E1' },
            ]}
          />

          {/* Modal Header */}
          <View style={styles.header}>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.textPrimary }]}
            >
              {t.transactions.filters}
            </Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="close"
                size={22}
              />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : loadError ? (
            <View style={styles.state}>
              <Text
                accessibilityLiveRegion="assertive"
                style={[styles.error, { color: colors.destructive }]}
              >
                {loadError}
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Type Filter */}
              <View style={styles.filterSection}>
                <Text
                  style={[styles.sectionLabel, { color: colors.textSecondary }]}
                >
                  {language === 'id' ? 'TIPE TRANSAKSI' : 'TRANSACTION TYPE'}
                </Text>
                <View accessibilityRole="radiogroup" style={styles.choiceRow}>
                  {(['all', 'expense', 'income'] as const).map((type) => (
                    <ChoiceChip
                      key={type}
                      label={
                        type === 'all'
                          ? t.transactions.all
                          : type === 'expense'
                            ? `💸 ${t.transactions.expense}`
                            : `💰 ${t.transactions.income}`
                      }
                      onPress={() => {
                        const selectedCategory = categories.find(
                          (category) => category.id === draft.categoryId,
                        );
                        setDraft((current) => ({
                          ...current,
                          categoryId:
                            type !== 'all' && selectedCategory?.type !== type
                              ? undefined
                              : current.categoryId,
                          type,
                        }));
                      }}
                      selected={draft.type === type}
                    />
                  ))}
                </View>
              </View>

              {/* Category Filter */}
              <View style={styles.filterSection}>
                <Text
                  style={[styles.sectionLabel, { color: colors.textSecondary }]}
                >
                  {t.transactions.category.toUpperCase()}
                </Text>
                <View style={styles.wrapChoices}>
                  <ChoiceChip
                    label={t.transactions.all}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        categoryId: undefined,
                      }))
                    }
                    selected={draft.categoryId === undefined}
                  />
                  {visibleCategories.map((category) => (
                    <ChoiceChip
                      key={category.id}
                      label={category.name}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          categoryId: category.id,
                        }))
                      }
                      selected={draft.categoryId === category.id}
                    />
                  ))}
                </View>
              </View>

              {/* Date Range Filter */}
              <View style={styles.filterSection}>
                <Text
                  style={[styles.sectionLabel, { color: colors.textSecondary }]}
                >
                  {language === 'id' ? 'RENTANG TANGGAL' : 'DATE RANGE'}
                </Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <AppInput
                      autoCapitalize="none"
                      label={language === 'id' ? 'Dari Tanggal' : 'From Date'}
                      onChangeText={(dateFrom) => {
                        setDraft((current) => ({ ...current, dateFrom }));
                        setDateError(null);
                      }}
                      placeholder="YYYY-MM-DD"
                      value={draft.dateFrom}
                    />
                  </View>
                  <View style={styles.dateField}>
                    <AppInput
                      autoCapitalize="none"
                      label={language === 'id' ? 'Sampai Tanggal' : 'To Date'}
                      onChangeText={(dateTo) => {
                        setDraft((current) => ({ ...current, dateTo }));
                        setDateError(null);
                      }}
                      placeholder="YYYY-MM-DD"
                      value={draft.dateTo}
                    />
                  </View>
                </View>
                {dateError ? (
                  <Text style={[styles.error, { color: colors.destructive }]}>
                    {dateError}
                  </Text>
                ) : null}
              </View>

              {/* Payment Method Filter */}
              <View style={styles.filterSection}>
                <Text
                  style={[styles.sectionLabel, { color: colors.textSecondary }]}
                >
                  {t.transactions.paymentMethod.toUpperCase()}
                </Text>
                <View style={styles.wrapChoices}>
                  <ChoiceChip
                    label={t.transactions.all}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        paymentMethodId: undefined,
                      }))
                    }
                    selected={draft.paymentMethodId === undefined}
                  />
                  {paymentMethods.map((paymentMethod) => (
                    <ChoiceChip
                      key={paymentMethod.id}
                      label={paymentMethod.name}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          paymentMethodId: paymentMethod.id,
                        }))
                      }
                      selected={draft.paymentMethodId === paymentMethod.id}
                    />
                  ))}
                </View>
              </View>

              {/* Reimbursable & Receipt Filters */}
              <BooleanChoices
                allLabel={t.transactions.all}
                label={t.transactions.reimbursementStatus.toUpperCase()}
                noLabel={language === 'id' ? 'Bukan Klaim' : 'Not Reimbursable'}
                onChange={(isReimbursable) =>
                  setDraft((current) => ({ ...current, isReimbursable }))
                }
                value={draft.isReimbursable}
                yesLabel={language === 'id' ? 'Klaim Kantor' : 'Reimbursable'}
              />

              <BooleanChoices
                allLabel={t.transactions.all}
                label={t.transactions.receipt.toUpperCase()}
                noLabel={language === 'id' ? 'Tanpa Struk' : 'No Receipt'}
                onChange={(hasReceipt) =>
                  setDraft((current) => ({ ...current, hasReceipt }))
                }
                value={draft.hasReceipt}
                yesLabel={language === 'id' ? 'Ada Struk' : 'With Receipt'}
              />

              {/* Actions */}
              <View style={styles.actions}>
                <AppButton
                  label={t.transactions.resetFilter}
                  onPress={() => {
                    setDraft(createDraft({}));
                    setDateError(null);
                  }}
                  variant="secondary"
                />
                <AppButton
                  label={
                    language === 'id' ? 'Terapkan Filter' : 'Apply Filters'
                  }
                  onPress={apply}
                  variant="primary"
                />
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  chipText: {
    fontSize: 13,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dragHandle: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    height: 4,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    width: 44,
  },
  error: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  filterSection: {
    gap: 6,
  },
  form: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xs,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  pressed: {
    opacity: 0.8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    elevation: 8,
    maxHeight: '88%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    shadowOffset: { height: -4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  wrapChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
