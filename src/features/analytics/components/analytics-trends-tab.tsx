import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo, useMemo } from 'react';
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
  language: 'id' | 'en';
  monthlyCashFlow: readonly MonthlyCashFlowItem[];
  t: TranslationSchema;
};

function formatMonthLabel(monthStart: string, language: 'id' | 'en') {
  const [year, month] = monthStart.split('-').map(Number);
  return new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', {
    month: 'short',
    timeZone: 'UTC',
    year: '2-digit',
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, 1)));
}

export const AnalyticsTrendsTab = memo(function AnalyticsTrendsTab({
  currencyCode,
  language,
  monthlyCashFlow,
  t,
}: AnalyticsTrendsTabProps) {
  const { colors, isDark } = useTheme();
  const activeMonths = useMemo(
    () =>
      monthlyCashFlow.filter(
        (month) => month.incomeMinor > 0 || month.expenseMinor > 0,
      ),
    [monthlyCashFlow],
  );

  if (activeMonths.length < 2) {
    return (
      <View
        style={[
          styles.emptyCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.emptyIcon,
            {
              backgroundColor: isDark
                ? colors.surfaceSecondary
                : colors.primaryLight,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={colors.primary}
            name="chart-timeline-variant"
            size={28}
          />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          {t.analytics.notEnoughTrendTitle}
        </Text>
        <Text
          style={[styles.emptyDescription, { color: colors.textSecondary }]}
        >
          {t.analytics.notEnoughTrendDesc}
        </Text>
      </View>
    );
  }

  const maxFlowOverall = Math.max(
    ...monthlyCashFlow.map((month) =>
      Math.max(month.incomeMinor, month.expenseMinor),
    ),
    1,
  );

  return (
    <View style={styles.tabContent}>
      <View
        style={[
          styles.chartCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.chartHeader}>
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: colors.textPrimary }]}
          >
            {t.analytics.cashFlowTrend}
          </Text>
          <View style={styles.legendWrap}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.positive }]}
              />
              <Text
                style={[styles.legendText, { color: colors.textSecondary }]}
              >
                {t.analytics.incomePrefix}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors.destructive },
                ]}
              />
              <Text
                style={[styles.legendText, { color: colors.textSecondary }]}
              >
                {t.analytics.expensePrefix}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.chartBarsContainer}>
          {monthlyCashFlow.map((flow) => {
            const hasData = flow.incomeMinor > 0 || flow.expenseMinor > 0;
            const incomeHeight = hasData
              ? Math.max(
                  6,
                  Math.round((flow.incomeMinor / maxFlowOverall) * 100),
                )
              : 3;
            const expenseHeight = hasData
              ? Math.max(
                  6,
                  Math.round((flow.expenseMinor / maxFlowOverall) * 100),
                )
              : 3;
            const inactiveColor = colors.borderStrong;

            return (
              <View key={flow.monthStart} style={styles.chartColumn}>
                <View style={styles.barsTrack}>
                  <View style={styles.barPair}>
                    <View style={styles.singleBarSlot}>
                      <View
                        style={[
                          styles.verticalBar,
                          {
                            backgroundColor: hasData
                              ? colors.positive
                              : inactiveColor,
                            height: `${incomeHeight}%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.singleBarSlot}>
                      <View
                        style={[
                          styles.verticalBar,
                          {
                            backgroundColor: hasData
                              ? colors.destructive
                              : inactiveColor,
                            height: `${expenseHeight}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.chartMonth,
                    {
                      color: hasData
                        ? colors.textPrimary
                        : colors.textSecondary,
                      fontWeight: hasData ? '700' : '500',
                    },
                  ]}
                >
                  {formatMonthLabel(flow.monthStart, language)}
                </Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  numberOfLines={1}
                  style={[
                    styles.chartNet,
                    {
                      color: hasData
                        ? flow.netMinor >= 0
                          ? colors.positive
                          : colors.destructive
                        : colors.textMuted,
                    },
                  ]}
                >
                  {hasData
                    ? formatSignedMoney(flow.netMinor, currencyCode)
                    : '—'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.detailsSection}>
        <Text style={[styles.detailsTitle, { color: colors.textSecondary }]}>
          {t.analytics.monthlyDetails}
        </Text>
        <View
          style={[
            styles.detailsCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {[...activeMonths].reverse().map((flow, index) => (
            <View
              key={flow.monthStart}
              style={[
                styles.detailRow,
                index < activeMonths.length - 1 && {
                  borderBottomColor: colors.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={styles.detailMonthWrap}>
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="calendar-month-outline"
                  size={18}
                />
                <View style={styles.detailMonthText}>
                  <Text
                    style={[styles.detailMonth, { color: colors.textPrimary }]}
                  >
                    {formatMonthLabel(flow.monthStart, language)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.detailAmounts,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.analytics.incomePrefix}{' '}
                    {formatMoney(flow.incomeMinor, currencyCode)} ·{' '}
                    {t.analytics.expensePrefix}{' '}
                    {formatMoney(flow.expenseMinor, currencyCode)}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.netPill,
                  {
                    backgroundColor:
                      flow.netMinor >= 0
                        ? colors.incomeBackground
                        : colors.expenseBackground,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.netPillText,
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
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  barPair: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 5,
    height: '100%',
    justifyContent: 'center',
  },
  barsTrack: {
    height: 128,
    justifyContent: 'flex-end',
    width: '100%',
  },
  chartBarsContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  chartCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  chartHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  chartMonth: {
    ...typography.metadata,
    fontSize: 11,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  chartNet: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  detailAmounts: {
    ...typography.metadata,
    fontSize: 11,
  },
  detailMonth: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  detailMonthText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  detailMonthWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailsSection: {
    gap: spacing.xs,
  },
  detailsTitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  emptyDescription: {
    ...typography.secondary,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 300,
    textAlign: 'center',
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 54,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 54,
  },
  emptyTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  legendDot: {
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  legendText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  legendWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  netPill: {
    borderRadius: radius.pill,
    flexShrink: 0,
    maxWidth: 128,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  netPillText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '800',
  },
  singleBarSlot: {
    height: '100%',
    justifyContent: 'flex-end',
    width: 10,
  },
  tabContent: {
    gap: spacing.md,
  },
  verticalBar: {
    borderRadius: radius.pill,
    minHeight: 4,
    width: '100%',
  },
});
