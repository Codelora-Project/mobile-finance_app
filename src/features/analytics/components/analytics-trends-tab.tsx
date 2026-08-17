import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { MonthlyCashFlowItem } from '@/features/analytics/analytics-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney, formatSignedMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type AnalyticsTrendsTabProps = {
  currencyCode: string;
  monthlyCashFlow: readonly MonthlyCashFlowItem[];
  t: TranslationSchema;
};

export const AnalyticsTrendsTab = memo(function AnalyticsTrendsTab({
  currencyCode,
  monthlyCashFlow,
  t,
}: AnalyticsTrendsTabProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.tabContent}>
      <View
        style={[
          styles.cashFlowCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          accessibilityRole="header"
          style={[styles.sectionTitle, { color: colors.textPrimary }]}
        >
          {t.analytics.cashFlowTrend}
        </Text>
        <Text
          style={[
            styles.sectionSubtitle,
            { color: colors.textSecondary },
          ]}
        >
          {t.analytics.cashFlowSubtitle}
        </Text>

        <View style={styles.cashFlowList}>
          {monthlyCashFlow.map((flow) => {
            const maxFlow = Math.max(
              flow.incomeMinor,
              flow.expenseMinor,
              1,
            );
            const incomeWidth = Math.max(
              4,
              Math.round((flow.incomeMinor / maxFlow) * 100),
            );
            const expenseWidth = Math.max(
              4,
              Math.round((flow.expenseMinor / maxFlow) * 100),
            );

            return (
              <View key={flow.monthStart} style={styles.cashFlowMonthRow}>
                <View style={styles.monthHeaderRow}>
                  <Text
                    style={[
                      styles.monthNameText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {flow.monthLabel}
                  </Text>
                  <Text
                    style={[
                      styles.monthNetText,
                      {
                        color:
                          flow.netMinor >= 0
                            ? colors.positive
                            : colors.destructive,
                      },
                    ]}
                  >
                    {formatSignedMoney(flow.netMinor, currencyCode)}
                  </Text>
                </View>

                {/* Dual Comparison Bars */}
                <View style={styles.dualBarsWrap}>
                  {/* Income bar */}
                  <View style={styles.barItemRow}>
                    <Text
                      style={[
                        styles.barTypeLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.analytics.incomePrefix}
                    </Text>
                    <View
                      style={[
                        styles.barTrack,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceSecondary
                            : '#F1F5F9',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.barFill,
                          {
                            backgroundColor: colors.positive,
                            width: `${incomeWidth}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barAmountText}>
                      {formatMoney(flow.incomeMinor, currencyCode)}
                    </Text>
                  </View>

                  {/* Expense bar */}
                  <View style={styles.barItemRow}>
                    <Text
                      style={[
                        styles.barTypeLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.analytics.expensePrefix}
                    </Text>
                    <View
                      style={[
                        styles.barTrack,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceSecondary
                            : '#F1F5F9',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.barFill,
                          {
                            backgroundColor: colors.destructive,
                            width: `${expenseWidth}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barAmountText}>
                      {formatMoney(flow.expenseMinor, currencyCode)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  barAmountText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'right',
  },
  barFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  barItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  barTrack: {
    borderRadius: radius.pill,
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  barTypeLabel: {
    ...typography.metadata,
    fontSize: 11,
    width: 24,
  },
  cashFlowCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cashFlowList: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  cashFlowMonthRow: {
    gap: spacing.xs,
  },
  dualBarsWrap: {
    gap: 4,
  },
  monthHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthNameText: {
    ...typography.body,
    fontWeight: '700',
  },
  monthNetText: {
    ...typography.metadata,
    fontWeight: '800',
  },
  sectionSubtitle: {
    ...typography.metadata,
    fontSize: 12,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  tabContent: {
    gap: spacing.md,
  },
});
