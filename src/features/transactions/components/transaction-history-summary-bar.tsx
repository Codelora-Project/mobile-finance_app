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
            backgroundColor: colors.surface,
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
              backgroundColor: isDark
                ? 'rgba(34, 197, 94, 0.18)'
                : '#DCFCE7',
              borderRadius: radius.md,
            },
            pressed ? { opacity: 0.75 } : null,
          ]}
        >
          <View style={styles.statLabelRow}>
            <MaterialCommunityIcons
              color={colors.positive}
              name="arrow-down-left"
              size={15}
            />
            <Text
              numberOfLines={1}
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              {incomeLabel}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.statAmountText, { color: colors.positive }]}
          >
            +{formatMoney(totalIncomeMinor, currencyCode)}
          </Text>
        </Pressable>

        <View
          style={[
            styles.verticalDivider,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
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
              backgroundColor: isDark
                ? 'rgba(239, 68, 68, 0.18)'
                : '#FEE2E2',
              borderRadius: radius.md,
            },
            pressed ? { opacity: 0.75 } : null,
          ]}
        >
          <View style={styles.statLabelRow}>
            <MaterialCommunityIcons
              color={colors.destructive}
              name="arrow-up-right"
              size={15}
            />
            <Text
              numberOfLines={1}
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              {expenseLabel}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.statAmountText, { color: colors.destructive }]}
          >
            -{formatMoney(totalExpenseMinor, currencyCode)}
          </Text>
        </Pressable>

        <View
          style={[
            styles.verticalDivider,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        />

        {/* 3. Net Cashflow Stat */}
        <View style={styles.statCol}>
          <View style={styles.statLabelRow}>
            <MaterialCommunityIcons
              color={isNetPositive ? colors.positive : colors.destructive}
              name="scale-balance"
              size={15}
            />
            <Text
              numberOfLines={1}
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              {netLabel}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
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
    ...typography.body,
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  statCol: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs + 3,
    paddingVertical: 5,
  },
  statLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  statLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  summaryBarRoot: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs + 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 10,
  },
  verticalDivider: {
    alignSelf: 'center',
    height: 30,
    marginHorizontal: 2,
    width: 1,
  },
});
