import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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

  // Find max value across all months for proportional chart scaling
  const maxFlowOverall = Math.max(
    ...monthlyCashFlow.map((m) => Math.max(m.incomeMinor, m.expenseMinor)),
    1,
  );

  const currentMonthFlow =
    monthlyCashFlow.length > 0
      ? monthlyCashFlow[monthlyCashFlow.length - 1]
      : null;

  const savingsRate =
    currentMonthFlow && currentMonthFlow.incomeMinor > 0
      ? Math.round(
          (Math.max(0, currentMonthFlow.netMinor) /
            currentMonthFlow.incomeMinor) *
            100,
        )
      : 0;

  const activeMonths = monthlyCashFlow.filter(
    (m) => m.incomeMinor > 0 || m.expenseMinor > 0,
  );
  const inactiveMonths = monthlyCashFlow.filter(
    (m) => m.incomeMinor === 0 && m.expenseMinor === 0,
  );

  return (
    <View style={styles.tabContent}>
      {/* 1. Top KPI Summary Card */}
      {currentMonthFlow ? (
        <View
          style={[
            styles.kpiCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.kpiHeader}>
            <View style={styles.kpiTitleWrap}>
              <Text
                numberOfLines={1}
                style={[styles.kpiSubtitle, { color: colors.textSecondary }]}
              >
                ARUS KAS BERSIH ({currentMonthFlow.monthLabel})
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.kpiAmount,
                  {
                    color:
                      currentMonthFlow.netMinor >= 0
                        ? colors.positive
                        : colors.destructive,
                  },
                ]}
              >
                {formatSignedMoney(currentMonthFlow.netMinor, currencyCode)}
              </Text>
            </View>

            {currentMonthFlow.incomeMinor > 0 ? (
              <View
                style={[
                  styles.savingsBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#EFF6FF',
                  },
                ]}
              >
                <Text
                  style={[styles.savingsBadgeLabel, { color: colors.primary }]}
                >
                  Tabungan: {savingsRate}%
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={[styles.kpiDivider, { backgroundColor: colors.border }]}
          />

          <View style={styles.kpiDetailsRow}>
            <View style={styles.kpiDetailCol}>
              <View style={styles.kpiIndicatorRow}>
                <View
                  style={[
                    styles.indicatorDot,
                    { backgroundColor: colors.positive },
                  ]}
                />
                <Text
                  style={[
                    styles.kpiDetailLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.analytics.incomePrefix}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={[styles.kpiDetailValue, { color: colors.textPrimary }]}
              >
                {formatMoney(currentMonthFlow.incomeMinor, currencyCode)}
              </Text>
            </View>

            <View style={styles.kpiDetailCol}>
              <View style={styles.kpiIndicatorRow}>
                <View
                  style={[
                    styles.indicatorDot,
                    { backgroundColor: colors.destructive },
                  ]}
                />
                <Text
                  style={[
                    styles.kpiDetailLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.analytics.expensePrefix}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={[styles.kpiDetailValue, { color: colors.textPrimary }]}
              >
                {formatMoney(currentMonthFlow.expenseMinor, currencyCode)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* 2. Visual Monthly Comparison Vertical Bar Chart */}
      <View
        style={[
          styles.chartCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
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

        {/* Vertical Bars Chart Container */}
        <View style={styles.chartBarsContainer}>
          {monthlyCashFlow.map((flow) => {
            const hasData = flow.incomeMinor > 0 || flow.expenseMinor > 0;
            const incomeHeightPercent = hasData
              ? Math.max(
                  6,
                  Math.round((flow.incomeMinor / maxFlowOverall) * 100),
                )
              : 4;
            const expenseHeightPercent = hasData
              ? Math.max(
                  6,
                  Math.round((flow.expenseMinor / maxFlowOverall) * 100),
                )
              : 4;

            return (
              <View key={flow.monthStart} style={styles.chartColumn}>
                {/* Bar pairs */}
                <View style={styles.barsTrackWrapper}>
                  <View style={styles.barPair}>
                    {/* Income vertical bar */}
                    <View style={styles.singleBarSlot}>
                      <View
                        style={[
                          styles.verticalBarFill,
                          {
                            backgroundColor: hasData
                              ? colors.positive
                              : isDark
                                ? colors.surfaceSecondary
                                : '#E2E8F0',
                            height: `${incomeHeightPercent}%`,
                          },
                        ]}
                      />
                    </View>

                    {/* Expense vertical bar */}
                    <View style={styles.singleBarSlot}>
                      <View
                        style={[
                          styles.verticalBarFill,
                          {
                            backgroundColor: hasData
                              ? colors.destructive
                              : isDark
                                ? colors.surfaceSecondary
                                : '#E2E8F0',
                            height: `${expenseHeightPercent}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {/* X-axis Month Label */}
                <Text
                  numberOfLines={1}
                  style={[
                    styles.chartMonthLabel,
                    {
                      color: hasData
                        ? colors.textPrimary
                        : colors.textSecondary,
                      fontWeight: hasData ? '700' : '500',
                    },
                  ]}
                >
                  {flow.monthLabel}
                </Text>

                {/* Net Badge */}
                <Text
                  numberOfLines={1}
                  style={[
                    styles.chartNetLabel,
                    {
                      color: hasData
                        ? flow.netMinor >= 0
                          ? colors.positive
                          : colors.destructive
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {hasData
                    ? formatSignedMoney(flow.netMinor, currencyCode)
                    : formatMoney(0, currencyCode)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 3. Section: Detailed Breakdown per Month */}
      <View style={styles.sectionWrap}>
        <Text
          style={[styles.sectionHeaderTitle, { color: colors.textSecondary }]}
        >
          RINCIAN BULANAN
        </Text>

        {/* Active Month Detailed Cards */}
        {activeMonths.map((flow) => {
          const maxMonthAmount = Math.max(
            flow.incomeMinor,
            flow.expenseMinor,
            1,
          );
          const incRatio = Math.max(
            6,
            Math.round((flow.incomeMinor / maxMonthAmount) * 100),
          );
          const expRatio = Math.max(
            6,
            Math.round((flow.expenseMinor / maxMonthAmount) * 100),
          );

          return (
            <View
              key={flow.monthStart}
              style={[
                styles.detailedMonthCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.detailedHeaderRow}>
                <View style={styles.detailedMonthNameWrap}>
                  <MaterialCommunityIcons
                    color={colors.primary}
                    name="calendar-month-outline"
                    size={18}
                  />
                  <Text
                    style={[
                      styles.detailedMonthTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {flow.monthLabel}
                  </Text>
                </View>

                <View
                  style={[
                    styles.netBadgePill,
                    {
                      backgroundColor:
                        flow.netMinor >= 0
                          ? isDark
                            ? '#064E3B'
                            : '#DCFCE7'
                          : isDark
                            ? '#3A171B'
                            : '#FEE2E2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.netBadgeText,
                      {
                        color:
                          flow.netMinor >= 0
                            ? isDark
                              ? '#34D399'
                              : '#16A34A'
                            : isDark
                              ? '#FCA5A5'
                              : '#DC2626',
                      },
                    ]}
                  >
                    {formatSignedMoney(flow.netMinor, currencyCode)}{' '}
                    {flow.netMinor >= 0 ? '(Surplus)' : '(Defisit)'}
                  </Text>
                </View>
              </View>

              {/* Progress Bars Breakdown */}
              <View style={styles.breakdownRowsWrap}>
                {/* Income Row */}
                <View style={styles.breakdownRow}>
                  <Text
                    style={[
                      styles.breakdownLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.analytics.incomePrefix}
                  </Text>
                  <View
                    style={[
                      styles.horizontalTrack,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceSecondary
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.horizontalFill,
                        {
                          backgroundColor: colors.positive,
                          width: `${incRatio}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.breakdownAmount,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {formatMoney(flow.incomeMinor, currencyCode)}
                  </Text>
                </View>

                {/* Expense Row */}
                <View style={styles.breakdownRow}>
                  <Text
                    style={[
                      styles.breakdownLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.analytics.expensePrefix}
                  </Text>
                  <View
                    style={[
                      styles.horizontalTrack,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceSecondary
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.horizontalFill,
                        {
                          backgroundColor: colors.destructive,
                          width: `${expRatio}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.breakdownAmount,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {formatMoney(flow.expenseMinor, currencyCode)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Compact Inactive Months Group (if any) */}
        {inactiveMonths.length > 0 ? (
          <View
            style={[
              styles.inactiveMonthsCard,
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                borderColor: colors.border,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="information-outline"
              size={16}
            />
            <Text
              style={[
                styles.inactiveMonthsText,
                { color: colors.textSecondary },
              ]}
            >
              {inactiveMonths.map((m) => m.monthLabel).join(', ')}: Belum ada
              catatan transaksi.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  barPair: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  barsTrackWrapper: {
    height: 100,
    justifyContent: 'flex-end',
    marginBottom: 6,
    width: '100%',
  },
  breakdownAmount: {
    ...typography.metadata,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'right',
  },
  breakdownLabel: {
    ...typography.metadata,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 54,
  },
  breakdownRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  breakdownRowsWrap: {
    gap: 6,
    marginTop: spacing.xs,
  },
  chartBarsContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  chartCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
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
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  chartMonthLabel: {
    ...typography.metadata,
    fontSize: 11,
    textAlign: 'center',
  },
  chartNetLabel: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  detailedHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  detailedMonthCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  detailedMonthNameWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minWidth: 0,
  },
  detailedMonthTitle: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '800',
  },
  horizontalFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  horizontalTrack: {
    borderRadius: radius.pill,
    flex: 1,
    height: 7,
    overflow: 'hidden',
  },
  inactiveMonthsCard: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inactiveMonthsText: {
    ...typography.metadata,
    flex: 1,
    fontSize: 12,
  },
  indicatorDot: {
    borderRadius: radius.pill,
    height: 6,
    width: 6,
  },
  kpiAmount: {
    ...typography.displayAmount,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  kpiDetailCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  kpiDetailLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  kpiDetailValue: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '800',
  },
  kpiDetailsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  kpiDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  kpiHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kpiIndicatorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  kpiSubtitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  kpiTitleWrap: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  legendDot: {
    borderRadius: radius.pill,
    height: 6,
    width: 6,
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
  netBadgePill: {
    borderRadius: radius.pill,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  netBadgeText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
  },
  savingsBadge: {
    borderRadius: radius.pill,
    flexShrink: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  savingsBadgeLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeaderTitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
  },
  singleBarSlot: {
    height: '100%',
    justifyContent: 'flex-end',
    width: 10,
  },
  tabContent: {
    gap: spacing.md + 2,
  },
  sectionWrap: {
    gap: spacing.sm,
  },
  verticalBarFill: {
    borderRadius: radius.pill,
    width: '100%',
  },
});
