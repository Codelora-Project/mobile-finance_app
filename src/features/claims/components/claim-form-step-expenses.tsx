import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import type { ClaimExpense } from '@/features/claims/claim-repository';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ClaimFormStepExpensesProps = {
  expenses: readonly ClaimExpense[];
  onNext: () => void;
  onToggleExpense: (expense: ClaimExpense) => void;
  selectedIds: readonly number[];
};

export const ClaimFormStepExpenses = memo(function ClaimFormStepExpenses({
  expenses,
  onNext,
  onToggleExpense,
  selectedIds,
}: ClaimFormStepExpensesProps) {
  const { t } = useLanguage();

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {t.claims.selectExpensesTitle}
      </Text>
      {expenses.length === 0 ? (
        <Text style={styles.stateText}>{t.claims.noEligibleExpenses}</Text>
      ) : (
        expenses.map((expense) => {
          const selected = selectedIds.includes(expense.id);
          return (
            <Pressable
              accessibilityLabel={`${expense.counterparty ?? expense.categoryName}, ${expense.currencyCode}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={expense.id}
              onPress={() => onToggleExpense(expense)}
              style={[
                styles.expenseRow,
                selected ? styles.expenseSelected : null,
              ]}
            >
              <View style={styles.expenseText}>
                <Text numberOfLines={2} style={styles.expenseTitle}>
                  {expense.counterparty ?? expense.categoryName}
                </Text>
                <Text style={styles.metadata}>
                  {expense.categoryName} · {expense.localDate}
                </Text>
                <Text style={styles.metadata}>
                  {expense.hasReceipt
                    ? t.claims.receiptAttached
                    : t.claims.receiptMissing}
                </Text>
              </View>
              <Text style={styles.expenseAmount}>
                {formatMoney(expense.amountMinor, expense.currencyCode)}
              </Text>
            </Pressable>
          );
        })
      )}
      <Text style={styles.selectionSummary}>
        {t.claims.selectedCount.replace('{count}', String(selectedIds.length))}
      </Text>
      <AppButton label={t.claims.review} onPress={onNext} />
    </View>
  );
});

const styles = StyleSheet.create({
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  expenseRow: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  expenseSelected: {
    borderColor: colors.primary,
  },
  expenseText: {
    flex: 1,
    marginRight: spacing.md,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  metadata: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  selectionSummary: {
    fontWeight: '600',
    textAlign: 'right',
  },
  stateText: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
