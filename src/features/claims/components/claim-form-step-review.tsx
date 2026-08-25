import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import type {
  ClaimExpense,
  ClaimPeriodMode,
} from '@/features/claims/claim-repository';
import { formatMoney } from '@/lib/money';
import { normalizeText } from '@/lib/strings';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ClaimFormStepReviewProps = {
  attachedCount: number;
  onSave: () => void;
  periodEnd: string;
  periodMode: ClaimPeriodMode;
  periodStart: string;
  saving: boolean;
  selectedCurrency: string | null;
  selectedExpenses: readonly ClaimExpense[];
  title: string;
  totalMinor: number | null;
};

export const ClaimFormStepReview = memo(function ClaimFormStepReview({
  attachedCount,
  onSave,
  periodEnd,
  periodMode,
  periodStart,
  saving,
  selectedCurrency,
  selectedExpenses,
  title,
  totalMinor,
}: ClaimFormStepReviewProps) {
  const missingCount = selectedExpenses.length - attachedCount;

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Claim Review
      </Text>
      <Text style={styles.reviewTitle}>{normalizeText(title)}</Text>
      <Text style={styles.metadata}>
        {periodMode === 'auto'
          ? `${selectedExpenses.map((expense) => expense.localDate).sort()[0]} – ${selectedExpenses
              .map((expense) => expense.localDate)
              .sort()
              .at(-1)}`
          : `${periodStart.trim()} – ${periodEnd.trim()}`}
      </Text>
      {selectedExpenses.map((expense) => (
        <View key={expense.id} style={styles.reviewRow}>
          <Text numberOfLines={2} style={styles.expenseTitle}>
            {expense.counterparty ?? expense.categoryName}
          </Text>
          <Text style={styles.expenseAmount}>
            {formatMoney(expense.amountMinor, expense.currencyCode)}
          </Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>
          {totalMinor === null || !selectedCurrency
            ? 'Total unavailable'
            : formatMoney(totalMinor, selectedCurrency)}
        </Text>
      </View>
      <Text style={styles.receiptSummary}>
        {attachedCount} receipt attached · {missingCount} missing
      </Text>
      <AppButton
        disabled={saving}
        label="Save Draft"
        loading={saving}
        onPress={onSave}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  metadata: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  receiptSummary: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
});
