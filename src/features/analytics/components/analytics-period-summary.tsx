import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AnalyticsData } from '@/features/analytics/analytics-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney, formatSignedMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type AnalyticsPeriodSummaryProps = {
  analytics: AnalyticsData;
  currencyCode: string;
  t: TranslationSchema;
};

export const AnalyticsPeriodSummary = memo(function AnalyticsPeriodSummary({
  analytics,
  currencyCode,
  t,
}: AnalyticsPeriodSummaryProps) {
  const { colors, isDark } = useTheme();
  const netFlowMinor = analytics.totalIncomeMinor - analytics.totalExpenseMinor;
  const previousFlow = analytics.monthlyCashFlow.at(-2);
  const currentFlow = analytics.monthlyCashFlow.at(-1);
  const comparisonMinor = previousFlow
    ? (currentFlow?.netMinor ?? netFlowMinor) - previousFlow.netMinor
    : null;
  const comparisonLabel =
    comparisonMinor === null
      ? null
      : comparisonMinor === 0
        ? t.analytics.noChangeFromPreviousMonth
        : t.analytics.comparedToPreviousMonth.replace(
            '{amount}',
            formatSignedMoney(comparisonMinor, currencyCode),
          );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? '#27272A' : '#E2E8F0',
          shadowColor: colors.shadow,
        },
      ]}
    >
      {/* 1. Header Label */}
      <Text style={[styles.netLabel, { color: colors.textSecondary }]}>
        {t.analytics.netFlow}
      </Text>

      {/* 2. Hero Net Value (Highlighted with Positive/Destructive Color) */}
      <Text
        adjustsFontSizeToFit
        accessibilityLabel={`${t.analytics.netFlow}: ${formatSignedMoney(
          netFlowMinor,
          currencyCode,
        )}`}
        minimumFontScale={0.7}
        numberOfLines={1}
        style={[
          styles.netValue,
          {
            color: netFlowMinor >= 0 ? colors.positive : colors.destructive,
          },
        ]}
      >
        {formatSignedMoney(netFlowMinor, currencyCode)}
      </Text>

      {/* 3. Inline Comparison (Clean Minimalist Text) */}
      {comparisonLabel ? (
        <View style={styles.comparisonRow}>
          <MaterialCommunityIcons
            color={
              comparisonMinor !== null && comparisonMinor > 0
                ? colors.positive
                : comparisonMinor !== null && comparisonMinor < 0
                  ? colors.destructive
                  : colors.textMuted
            }
            name={
              comparisonMinor === 0
                ? 'minus'
                : comparisonMinor !== null && comparisonMinor > 0
                  ? 'trending-up'
                  : 'trending-down'
            }
            size={16}
          />
          <Text
            numberOfLines={2}
            style={[styles.comparisonText, { color: colors.textSecondary }]}
          >
            {comparisonLabel}
          </Text>
        </View>
      ) : null}

      {/* 4. Sleek Horizontal Divider */}
      <View
        style={[
          styles.divider,
          { backgroundColor: isDark ? '#27272A' : '#E2E8F0' },
        ]}
      />

      {/* 5. Bottom Split Metrics with Clean Monochromatic Values & Subtle Color Dots */}
      <View style={styles.metricsRow}>
        {/* Income Column */}
        <View style={styles.metricCol}>
          <View style={styles.metricLabelRow}>
            <View
              style={[styles.metricDot, { backgroundColor: colors.positive }]}
            />
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {t.analytics.totalIncome}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.metricValue, { color: colors.textPrimary }]}
          >
            {formatMoney(analytics.totalIncomeMinor, currencyCode)}
          </Text>
        </View>

        {/* Center Vertical Hairline Divider */}
        <View
          style={[
            styles.verticalDivider,
            { backgroundColor: isDark ? '#27272A' : '#E2E8F0' },
          ]}
        />

        {/* Expense Column */}
        <View style={styles.metricCol}>
          <View style={styles.metricLabelRow}>
            <View
              style={[styles.metricDot, { backgroundColor: colors.destructive }]}
            />
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {t.analytics.totalExpense}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.metricValue, { color: colors.textPrimary }]}
          >
            {formatMoney(analytics.totalExpenseMinor, currencyCode)}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    gap: 4,
    padding: spacing.md + 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  comparisonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  comparisonText: {
    ...typography.metadata,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm + 2,
  },
  metricCol: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  metricDot: {
    borderRadius: radius.pill,
    height: 7,
    width: 7,
  },
  metricLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  metricLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  metricValue: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  metricsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  netLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  netValue: {
    ...typography.displayAmount,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 40,
    marginTop: 2,
  },
  verticalDivider: {
    alignSelf: 'stretch',
    width: 1,
  },
});
