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
import { Screen } from '@/components/ui/screen';
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
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

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
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={selected ? styles.chipTextSelected : styles.chipText}>
        {label}
      </Text>
    </Pressable>
  );
}

function BooleanChoices({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: BooleanChoice) => void;
  value: BooleanChoice;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" style={styles.choiceRow}>
        {(['all', 'yes', 'no'] as const).map((choice) => (
          <ChoiceChip
            key={choice}
            label={choice === 'all' ? 'All' : choice === 'yes' ? 'Yes' : 'No'}
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
      setDateError('Enter dates as YYYY-MM-DD.');
      return;
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setDateError('Start date must be on or before end date.');
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
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <Screen>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Filters
          </Text>
          <AppButton label="Close" onPress={onClose} variant="ghost" />
        </View>

        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : loadError ? (
          <View style={styles.state}>
            <Text accessibilityLiveRegion="assertive" style={styles.error}>
              {loadError}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.form}>
            <View>
              <Text style={styles.label}>Type</Text>
              <View accessibilityRole="radiogroup" style={styles.choiceRow}>
                {(['all', 'expense', 'income'] as const).map((type) => (
                  <ChoiceChip
                    key={type}
                    label={
                      type === 'all'
                        ? 'All'
                        : type === 'expense'
                          ? 'Expense'
                          : 'Income'
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

            <View>
              <Text style={styles.label}>Category</Text>
              <View style={styles.wrapChoices}>
                <ChoiceChip
                  label="All"
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

            <View>
              <Text style={styles.label}>Date Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <AppInput
                    autoCapitalize="none"
                    label="From"
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
                    label="To"
                    onChangeText={(dateTo) => {
                      setDraft((current) => ({ ...current, dateTo }));
                      setDateError(null);
                    }}
                    placeholder="YYYY-MM-DD"
                    value={draft.dateTo}
                  />
                </View>
              </View>
              {dateError ? <Text style={styles.error}>{dateError}</Text> : null}
            </View>

            <View>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.wrapChoices}>
                <ChoiceChip
                  label="All"
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

            <BooleanChoices
              label="Reimbursable"
              onChange={(isReimbursable) =>
                setDraft((current) => ({ ...current, isReimbursable }))
              }
              value={draft.isReimbursable}
            />
            <BooleanChoices
              label="Has Receipt"
              onChange={(hasReceipt) =>
                setDraft((current) => ({ ...current, hasReceipt }))
              }
              value={draft.hasReceipt}
            />

            <View style={styles.actions}>
              <AppButton
                label="Reset"
                onPress={() => {
                  setDraft(createDraft({}));
                  setDateError(null);
                }}
                variant="secondary"
              />
              <AppButton label="Apply Filters" onPress={apply} />
            </View>
          </ScrollView>
        )}
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  form: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  label: {
    color: colors.textPrimary,
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wrapChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: typography.secondary.fontSize,
  },
  chipTextSelected: {
    color: colors.surface,
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
  },
  error: {
    color: colors.destructive,
    fontSize: typography.secondary.fontSize,
    marginTop: spacing.xs,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
});
