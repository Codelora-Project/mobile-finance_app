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
  const { colors } = useTheme();
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
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.netLabel, { color: colors.textSecondary }]}>
        {t.analytics.netFlow}
      </Text>
      <Text
        adjustsFontSizeToFit
        accessibilityLabel={`${t.analytics.netFlow}: ${formatSignedMoney(
          netFlowMinor,
          currencyCode,
        )}`}
        minimumFontScale={0.75}
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

      {comparisonLabel ? (
        <View style={styles.comparisonRow}>
          <MaterialCommunityIcons
            color={
              comparisonMinor !== null && comparisonMinor >= 0
                ? colors.positive
                : colors.destructive
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

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
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
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.metricValue, { color: colors.textPrimary }]}
          >
            {formatMoney(analytics.totalIncomeMinor, currencyCode)}
          </Text>
        </View>

        <View
          style={[styles.metricDivider, { backgroundColor: colors.border }]}
        />

        <View style={styles.metric}>
          <View style={styles.metricLabelRow}>
            <View
              style={[
                styles.metricDot,
                { backgroundColor: colors.destructive },
              ]}
            />
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {t.analytics.totalExpense}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
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
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  comparisonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  comparisonText: {
    ...typography.metadata,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  metric: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  metricDivider: {
    alignSelf: 'stretch',
    width: 1,
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
    gap: spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricValue: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '800',
  },
  netLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  netValue: {
    ...typography.displayAmount,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 2,
  },
});
