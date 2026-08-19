import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionHistorySummaryBarProps = {
  activeTypeFilter?: 'expense' | 'income' | 'transfer';
  currencyCode: string;
  expenseLabel: string;
  incomeLabel: string;
  netLabel?: string;
  onSelectTypeFilter?: (type?: 'expense' | 'income') => void;
  totalExpenseMinor: number;
  totalIncomeMinor: number;
};

export const TransactionHistorySummaryBar = memo(
  function TransactionHistorySummaryBar({
    activeTypeFilter,
    currencyCode,
    expenseLabel,
    incomeLabel,
    netLabel = 'Arus Kas',
    onSelectTypeFilter,
    totalExpenseMinor,
    totalIncomeMinor,
  }: TransactionHistorySummaryBarProps) {
    const { colors, isDark } = useTheme();

    const netMinor = totalIncomeMinor - totalExpenseMinor;
    const isNetPositive = netMinor >= 0;

    return (
      <View
        style={[
          styles.summaryBarRoot,
          {
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
            borderColor: colors.border,
          },
        ]}
      >
        {/* 1. Income Stat */}
        <Pressable
          accessibilityLabel={`${incomeLabel}: +${formatMoney(totalIncomeMinor, currencyCode)}`}
          accessibilityRole="button"
          onPress={() =>
            onSelectTypeFilter?.(
              activeTypeFilter === 'income' ? undefined : 'income',
            )
          }
          style={({ pressed }) => [
            styles.statCol,
            activeTypeFilter === 'income' && {
              backgroundColor: isDark ? '#14532D' : '#DCFCE7',
              borderRadius: radius.sm,
            },
            pressed ? { opacity: 0.7 } : null,
          ]}
        >
          <View style={styles.statLabelRow}>
            <MaterialCommunityIcons
              color={colors.positive}
              name="arrow-down-left"
              size={13}
            />
            <Text
              numberOfLines={1}
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              {incomeLabel}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[styles.statAmountText, { color: colors.positive }]}
          >
            +{formatMoney(totalIncomeMinor, currencyCode)}
          </Text>
        </Pressable>

        <View
          style={[styles.verticalDivider, { backgroundColor: colors.border }]}
        />

        {/* 2. Expense Stat */}
        <Pressable
          accessibilityLabel={`${expenseLabel}: -${formatMoney(totalExpenseMinor, currencyCode)}`}
          accessibilityRole="button"
          onPress={() =>
            onSelectTypeFilter?.(
              activeTypeFilter === 'expense' ? undefined : 'expense',
            )
          }
          style={({ pressed }) => [
            styles.statCol,
            activeTypeFilter === 'expense' && {
              backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
              borderRadius: radius.sm,
            },
            pressed ? { opacity: 0.7 } : null,
          ]}
        >
          <View style={styles.statLabelRow}>
            <MaterialCommunityIcons
              color={colors.destructive}
              name="arrow-up-right"
              size={13}
            />
            <Text
              numberOfLines={1}
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              {expenseLabel}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[styles.statAmountText, { color: colors.destructive }]}
          >
            -{formatMoney(totalExpenseMinor, currencyCode)}
          </Text>
        </Pressable>

        <View
          style={[styles.verticalDivider, { backgroundColor: colors.border }]}
        />

        {/* 3. Net Cashflow Stat */}
        <View style={styles.statCol}>
          <View style={styles.statLabelRow}>
            <MaterialCommunityIcons
              color={isNetPositive ? colors.positive : colors.destructive}
              name="scale-balance"
              size={13}
            />
            <Text
              numberOfLines={1}
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              {netLabel}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.statAmountText,
              {
                color: isNetPositive ? colors.positive : colors.destructive,
              },
            ]}
          >
            {isNetPositive ? '+' : '−'}
            {formatMoney(Math.abs(netMinor), currencyCode)}
          </Text>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  statAmountText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  statCol: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  statLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '500',
  },
  statLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  summaryBarRoot: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  verticalDivider: {
    height: '100%',
    marginHorizontal: spacing.xs,
    width: 1,
  },
});
