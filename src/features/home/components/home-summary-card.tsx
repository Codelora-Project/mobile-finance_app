import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  HomePeriod,
  HomeSummary,
} from '@/features/home/home-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type HomeSummaryCardProps = {
  onPeriodChange: (period: HomePeriod) => void;
  period: HomePeriod;
  summary: HomeSummary;
  t: TranslationSchema;
};

export const HomeSummaryCard = memo(function HomeSummaryCard({
  onPeriodChange,
  period,
  summary,
  t,
}: HomeSummaryCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.textPrimary,
        },
      ]}
    >
      {/* Hero: Total Expenses + Card-Level Period Toggle */}
      <View style={styles.summaryTopRow}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.summaryCardSubtitle,
              { color: colors.textSecondary },
            ]}
          >
            {t.home.expensesThisMonth}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.summaryNetValue, { color: colors.textPrimary }]}
          >
            {formatMoney(summary.expenseMinor, summary.currencyCode)}
          </Text>
          <Text
            style={[
              styles.summaryPeriodLabel,
              { color: colors.textSecondary },
            ]}
          >
            {summary.periodLabel}
          </Text>
        </View>

        {/* Compact Period Switcher [Harian | Bulanan] */}
        <View
          style={[
            styles.cardPeriodToggle,
            {
              backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
              borderColor: colors.border,
            },
          ]}
        >
          {(
            [
              { key: 'daily', label: t.home.periodDaily },
              { key: 'monthly', label: t.home.periodMonthly },
            ] as const
          ).map((tab) => {
            const isSelected = period === tab.key;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                key={tab.key}
                onPress={() => onPeriodChange(tab.key)}
                style={[
                  styles.cardPeriodBtn,
                  isSelected
                    ? [
                        styles.cardPeriodBtnActive,
                        {
                          backgroundColor: colors.primary,
                        },
                      ]
                    : null,
                ]}
              >
                <Text
                  style={[
                    styles.cardPeriodBtnText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        style={[styles.summaryDivider, { backgroundColor: colors.border }]}
      />

      {/* Income & Total Net 2-Column Split */}
      <View style={styles.summaryColsRow}>
        {/* Income */}
        <View style={styles.summaryColItem}>
          <View style={styles.summaryColHeader}>
            <View
              style={[
                styles.iconCircleIncome,
                {
                  backgroundColor: isDark ? '#14532D' : '#DCFCE7',
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.positive}
                name="arrow-up"
                size={14}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.summaryColLabel,
                { color: colors.textSecondary },
              ]}
            >
              {t.home.income}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.summaryIncomeValue, { color: colors.positive }]}
          >
            {formatMoney(summary.incomeMinor, summary.currencyCode)}
          </Text>
        </View>

        <View
          style={[
            styles.summaryVerticalDivider,
            { backgroundColor: colors.border },
          ]}
        />

        {/* Total Balance / Sisa Saldo */}
        <View style={styles.summaryColItem}>
          <View style={styles.summaryColHeader}>
            <View
              style={[
                styles.iconCircleExpense,
                {
                  backgroundColor: isDark
                    ? summary.netMinor >= 0
                      ? '#1E3A8A'
                      : '#7F1D1D'
                    : summary.netMinor >= 0
                      ? '#EFF6FF'
                      : '#FEE2E2',
                },
              ]}
            >
              <MaterialCommunityIcons
                color={
                  summary.netMinor >= 0 ? colors.primary : colors.destructive
                }
                name="scale-balance"
                size={14}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.summaryColLabel,
                { color: colors.textSecondary },
              ]}
            >
              {t.home.totalBalance}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[
              styles.summaryExpenseValue,
              {
                color:
                  summary.netMinor >= 0
                    ? colors.textPrimary
                    : colors.destructive,
              },
            ]}
          >
            {summary.netMinor >= 0
              ? formatMoney(summary.netMinor, summary.currencyCode)
              : `−${formatMoney(
                  Math.abs(summary.netMinor),
                  summary.currencyCode,
                )}`}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cardPeriodBtn: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  cardPeriodBtnActive: {
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  cardPeriodBtnText: {
    ...typography.metadata,
    fontSize: 11,
  },
  cardPeriodToggle: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 2,
    padding: 3,
  },
  iconCircleExpense: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  iconCircleIncome: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.md,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  summaryCardSubtitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryColHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  summaryColItem: {
    flex: 1,
    gap: 4,
  },
  summaryColLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  summaryColsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryDivider: {
    height: 1,
    width: '100%',
  },
  summaryExpenseValue: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
  },
  summaryIncomeValue: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
  },
  summaryNetValue: {
    ...typography.displayAmount,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  summaryPeriodLabel: {
    ...typography.metadata,
    fontSize: 11,
    marginTop: 2,
  },
  summaryTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryVerticalDivider: {
    height: 36,
    marginHorizontal: spacing.sm,
    width: 1,
  },
});
