import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AnalyticsData } from '@/features/analytics/analytics-repository';
import { AnalyticsInsightsCard } from '@/features/analytics/components/analytics-insights-card';
import { DonutBreakdownChart } from '@/features/analytics/components/donut-breakdown-chart';
import { WeeklyBarChart } from '@/features/analytics/components/weekly-bar-chart';
import type { CategoryBudget } from '@/features/budgets/budget-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type AnalyticsOverviewTabProps = {
  analytics: AnalyticsData;
  budgets: readonly CategoryBudget[];
  currencyCode: string;
  t: TranslationSchema;
};

export const AnalyticsOverviewTab = memo(function AnalyticsOverviewTab({
  analytics,
  budgets,
  currencyCode,
  t,
}: AnalyticsOverviewTabProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.tabContent}>
      <AnalyticsInsightsCard analytics={analytics} budgets={budgets} t={t} />

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
  tabContent: {
    gap: spacing.md,
  },
});
