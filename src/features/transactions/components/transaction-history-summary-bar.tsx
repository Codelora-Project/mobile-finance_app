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
    netLabel = 'Saldo',
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
        {/* 1. Expense Stat (Keluar) */}
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
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2',
              borderRadius: radius.md,
            },
            pressed ? { opacity: 0.75 } : null,
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.destructive}
              name="arrow-up"
              size={15}
            />
          </View>
          <View style={styles.textWrap}>
            <Text
              numberOfLines={1}
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              {expenseLabel}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              numberOfLines={1}
              style={[styles.statAmountText, { color: colors.destructive }]}
            >
              -{formatMoney(totalExpenseMinor, currencyCode)}
            </Text>
          </View>
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

        {/* 2. Income Stat (Masuk) */}
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
              backgroundColor: isDark ? 'rgba(34, 197, 94, 0.16)' : '#DCFCE7',
              borderRadius: radius.md,
            },
            pressed ? { opacity: 0.75 } : null,
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.positive}
              name="arrow-down"
              size={15}
            />
          </View>
          <View style={styles.textWrap}>
            <Text
              numberOfLines={1}
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              {incomeLabel}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              numberOfLines={1}
              style={[styles.statAmountText, { color: colors.positive }]}
            >
              +{formatMoney(totalIncomeMinor, currencyCode)}
            </Text>
          </View>
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

        {/* 3. Saldo / Arus Kas Stat */}
        <View style={styles.statCol}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDark
                  ? isNetPositive
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)'
                  : isNetPositive
                    ? '#DCFCE7'
                    : '#FEE2E2',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={isNetPositive ? colors.positive : colors.destructive}
              name={isNetPositive ? 'trending-up' : 'trending-down'}
              size={15}
            />
          </View>
          <View style={styles.textWrap}>
            <Text
              numberOfLines={1}
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              {netLabel}
            </Text>
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
      </View>
    );
  },
);

const styles = StyleSheet.create({
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  statAmountText: {
    ...typography.body,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  statLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  summaryBarRoot: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
  },
  textWrap: {
    flex: 1,
    gap: 1,
    justifyContent: 'center',
  },
  verticalDivider: {
    alignSelf: 'center',
    height: 28,
    marginHorizontal: 1,
    width: 1,
  },
});
