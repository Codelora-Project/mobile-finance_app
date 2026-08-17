import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AnalyticsData } from '@/features/analytics/analytics-repository';
import { DonutBreakdownChart } from '@/features/analytics/components/donut-breakdown-chart';
import { WeeklyBarChart } from '@/features/analytics/components/weekly-bar-chart';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type AnalyticsOverviewTabProps = {
  analytics: AnalyticsData;
  currencyCode: string;
  t: TranslationSchema;
};

export const AnalyticsOverviewTab = memo(function AnalyticsOverviewTab({
  analytics,
  currencyCode,
  t,
}: AnalyticsOverviewTabProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.tabContent}>
      {/* Quick Metrics Strip */}
      <View style={styles.metricsStrip}>
        {/* Card 1: Total Expense */}
        <View
          style={[
            styles.metricCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            {t.analytics.totalExpense}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.metricValue, { color: colors.textPrimary }]}
          >
            {formatMoney(analytics.totalExpenseMinor, currencyCode)}
          </Text>
        </View>

        {/* Card 2: Daily Average */}
        <View
          style={[
            styles.metricCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            {t.analytics.dailyAverage}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.metricValue, { color: colors.primary }]}
          >
            {formatMoney(analytics.averageDailyExpenseMinor, currencyCode)}
          </Text>
        </View>
      </View>

      {/* Donut / Segmented Breakdown Chart */}
      {analytics.totalExpenseMinor > 0 ? (
        <DonutBreakdownChart
          currencyCode={currencyCode}
          items={analytics.categoryBreakdown}
          totalExpenseMinor={analytics.totalExpenseMinor}
        />
      ) : (
        <View
          style={[
            styles.emptyStateCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textSecondary}
            name="chart-arc"
            size={44}
          />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {t.analytics.noDataYet}
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            {t.analytics.noDataDesc}
          </Text>
        </View>
      )}

      {/* Weekly Comparison Bar Chart */}
      <WeeklyBarChart
        currencyCode={currencyCode}
        weeklyData={analytics.weeklyComparison}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  emptyDesc: {
    ...typography.metadata,
    maxWidth: 240,
    textAlign: 'center',
  },
  emptyStateCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: '700',
  },
  metricCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  metricLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metricValue: {
    ...typography.displayAmount,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  metricsStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tabContent: {
    gap: spacing.md,
  },
});
