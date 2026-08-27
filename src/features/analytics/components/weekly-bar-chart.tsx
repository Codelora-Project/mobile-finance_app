import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { WeeklyComparison } from '@/features/analytics/analytics-repository';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type WeeklyBarChartProps = {
  weeklyData: WeeklyComparison;
  currencyCode: string;
};

export function WeeklyBarChart({
  weeklyData,
  currencyCode,
}: WeeklyBarChartProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const maxAmount = Math.max(
    ...weeklyData.dailyBreakdown.flatMap((d) => [
      d.thisWeekMinor,
      d.lastWeekMinor,
    ]),
    1,
  );

  const isFrugal = weeklyData.percentChange <= 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? '#27272A' : '#E2E8F0',
          shadowColor: colors.shadow,
        },
      ]}
    >
      {/* 1. Header with Trend Badge */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitles}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons
              color={colors.primary}
              name="chart-bar"
              size={18}
            />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t.analytics.weeklyComparison}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t.analytics.last7DaysVsPrevious}
          </Text>
        </View>

        <View
          style={[
            styles.trendBadge,
            {
              backgroundColor: isFrugal
                ? isDark
                  ? 'rgba(74, 222, 128, 0.14)'
                  : '#DCFCE7'
                : isDark
                  ? 'rgba(251, 113, 133, 0.14)'
                  : '#FEE2E2',
            },
          ]}
        >
          <MaterialCommunityIcons
            color={isFrugal ? colors.positive : colors.destructive}
            name={isFrugal ? 'trending-down' : 'trending-up'}
            size={15}
          />
          <Text
            style={[
              styles.trendBadgeText,
              { color: isFrugal ? colors.positive : colors.destructive },
            ]}
          >
            {weeklyData.percentChange > 0
              ? `+${weeklyData.percentChange}%`
              : `${weeklyData.percentChange}%`}
          </Text>
        </View>
      </View>

      {/* 2. Legend & Summary Values */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.primary }]}
          />
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
            {t.analytics.thisWeek}:{' '}
            <Text style={[styles.legendValue, { color: colors.textPrimary }]}>
              {formatMoney(weeklyData.thisWeekTotalMinor, currencyCode)}
            </Text>
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: isDark ? '#52525B' : '#CBD5E1' },
            ]}
          />
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
            {t.analytics.lastWeek}:{' '}
            <Text style={[styles.legendValue, { color: colors.textPrimary }]}>
              {formatMoney(weeklyData.lastWeekTotalMinor, currencyCode)}
            </Text>
          </Text>
        </View>
      </View>

      {/* 3. 7-Day Dual Column Chart */}
      <View style={styles.chartArea}>
        {weeklyData.dailyBreakdown.map((day) => {
          const thisWeekHeightPercent = Math.max(
            5,
            Math.round((day.thisWeekMinor / maxAmount) * 100),
          );
          const lastWeekHeightPercent = Math.max(
            5,
            Math.round((day.lastWeekMinor / maxAmount) * 100),
          );

          return (
            <View key={day.dayIndex} style={styles.columnContainer}>
              <View style={styles.barsTrack}>
                {/* Last Week Bar */}
                <View
                  style={[
                    styles.barPill,
                    {
                      backgroundColor: isDark ? '#3F3F46' : '#CBD5E1',
                      height: `${lastWeekHeightPercent}%`,
                    },
                  ]}
                />

                {/* This Week Bar */}
                <View
                  style={[
                    styles.barPill,
                    {
                      backgroundColor: colors.primary,
                      height: `${thisWeekHeightPercent}%`,
                    },
                  ]}
                />
              </View>

              <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
                {t.analytics.dayNames[day.dayOfWeek] ?? ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barPill: {
    borderRadius: radius.pill,
    width: 9,
  },
  barsTrack: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    height: 120,
    justifyContent: 'center',
    width: '100%',
  },
  chartArea: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    height: 150,
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  columnContainer: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  container: {
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    padding: spacing.md + 2,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  dayLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitles: {
    flex: 1,
    gap: 2,
  },
  legendDot: {
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendLabel: {
    ...typography.metadata,
    fontSize: 12,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendValue: {
    fontWeight: '800',
  },
  subtitle: {
    ...typography.metadata,
    fontSize: 12,
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  trendBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trendBadgeText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
  },
});
