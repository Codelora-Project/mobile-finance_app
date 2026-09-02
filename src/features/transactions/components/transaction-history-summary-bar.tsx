import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionHistorySummaryBarProps = {
  activeTypeFilter?: 'expense' | 'income' | 'transfer';
  currencyCode: string;
  expenseLabel: string;
  incomeLabel: string;
  netLabel: string;
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
    netLabel,
    onSelectTypeFilter,
    totalExpenseMinor,
    totalIncomeMinor,
  }: TransactionHistorySummaryBarProps) {
    const { colors, isDark } = useTheme();

    const netMinor = totalIncomeMinor - totalExpenseMinor;
    const isNetPositive = netMinor >= 0;

    return (
      <View style={styles.outerContainer}>
        <View
          style={[
            styles.summaryBarRoot,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
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
                backgroundColor: isDark
                  ? colors.destructiveOverlay
                  : colors.expenseBackground,
                borderRadius: radius.md,
              },
              pressed ? { opacity: 0.75 } : null,
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDark
                    ? colors.destructiveOverlay
                    : colors.expenseBackground,
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.destructive}
                name="arrow-up"
                size={14}
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
                minimumFontScale={0.85}
                numberOfLines={1}
                style={[styles.statAmountText, { color: colors.destructive }]}
              >
                -{formatMoney(totalExpenseMinor, currencyCode)}
              </Text>
            </View>
          </Pressable>

          <View
            style={[styles.verticalDivider, { backgroundColor: colors.border }]}
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
                backgroundColor: isDark
                  ? colors.positiveOverlay
                  : colors.incomeBackground,
                borderRadius: radius.md,
              },
              pressed ? { opacity: 0.75 } : null,
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDark
                    ? colors.positiveOverlay
                    : colors.incomeBackground,
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.positive}
                name="arrow-down"
                size={14}
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
                minimumFontScale={0.85}
                numberOfLines={1}
                style={[styles.statAmountText, { color: colors.positive }]}
              >
                +{formatMoney(totalIncomeMinor, currencyCode)}
              </Text>
            </View>
          </Pressable>

          <View
            style={[styles.verticalDivider, { backgroundColor: colors.border }]}
          />

          {/* 3. Net Flow Stat */}
          <View style={styles.statCol}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDark
                    ? isNetPositive
                      ? colors.positiveOverlay
                      : colors.destructiveOverlay
                    : isNetPositive
                      ? colors.incomeBackground
                      : colors.expenseBackground,
                },
              ]}
            >
              <MaterialCommunityIcons
                color={isNetPositive ? colors.positive : colors.destructive}
                name={isNetPositive ? 'trending-up' : 'trending-down'}
                size={14}
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
                minimumFontScale={0.85}
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
      </View>
    );
  },
);

const styles = StyleSheet.create({
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  outerContainer: {
    alignSelf: 'center',
    maxWidth: contentMaxWidth,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  statAmountText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginTop: 1,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: spacing.xs + 2,
  },
  statLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  summaryBarRoot: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.sm + 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    width: '100%',
  },
  textWrap: {
    flex: 1,
    gap: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  verticalDivider: {
    alignSelf: 'center',
    height: 28,
    marginHorizontal: 1,
    width: 1,
  },
});
