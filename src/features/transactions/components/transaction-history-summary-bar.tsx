import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionHistorySummaryBarProps = {
  currencyCode: string;
  expenseLabel: string;
  incomeLabel: string;
  totalExpenseMinor: number;
  totalIncomeMinor: number;
};

export const TransactionHistorySummaryBar = memo(
  function TransactionHistorySummaryBar({
    currencyCode,
    expenseLabel,
    incomeLabel,
    totalExpenseMinor,
    totalIncomeMinor,
  }: TransactionHistorySummaryBarProps) {
    const { colors, isDark } = useTheme();

    return (
      <View
        style={[
          styles.summaryBarRoot,
          {
            backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
            borderColor: colors.border,
          },
        ]}
      >
        {/* Income Stat */}
        <View style={styles.statCol}>
          <View style={styles.statLabelRow}>
            <MaterialCommunityIcons
              color="#10B981"
              name="arrow-down-left"
              size={14}
            />
            <Text
              numberOfLines={1}
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              {incomeLabel}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.incomeAmountText}>
            +{formatMoney(totalIncomeMinor, currencyCode)}
          </Text>
        </View>

        <View
          style={[styles.verticalDivider, { backgroundColor: colors.border }]}
        />

        {/* Expense Stat */}
        <View style={styles.statCol}>
          <View style={styles.statLabelRow}>
            <MaterialCommunityIcons
              color="#EF4444"
              name="arrow-up-right"
              size={14}
            />
            <Text
              numberOfLines={1}
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              {expenseLabel}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.expenseAmountText}>
            -{formatMoney(totalExpenseMinor, currencyCode)}
          </Text>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  expenseAmountText: {
    ...typography.metadata,
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  incomeAmountText: {
    ...typography.metadata,
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800',
  },
  statCol: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  statLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  summaryBarRoot: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
  },
  verticalDivider: {
    height: '100%',
    marginHorizontal: spacing.sm,
    width: 1,
  },
});
