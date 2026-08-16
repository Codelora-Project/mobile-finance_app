import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import type { WeeklyComparison } from '@/features/analytics/analytics-repository';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

type WeeklyBarChartProps = {
  weeklyData: WeeklyComparison;
  currencyCode: string;
};

export function WeeklyBarChart({
  weeklyData,
  currencyCode,
}: WeeklyBarChartProps) {
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
          borderColor: colors.border,
          shadowColor: colors.textPrimary,
        },
      ]}
    >
      {/* Header with Trend Badge */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitles}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Perbandingan Mingguan
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            7 Hari Terakhir vs 7 Hari Sebelumnya
          </Text>
        </View>

        <View
          style={[
            styles.trendBadge,
            {
              backgroundColor: isFrugal
                ? isDark
                  ? '#14532D'
                  : '#DCFCE7'
                : isDark
                  ? '#7F1D1D'
                  : '#FEE2E2',
            },
          ]}
        >
          <MaterialCommunityIcons
            color={isFrugal ? colors.positive : colors.destructive}
            name={isFrugal ? 'trending-down' : 'trending-up'}
            size={16}
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

      {/* Legend & Summary Values */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.primary }]}
          />
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
            Minggu Ini:{' '}
            <Text style={[styles.legendValue, { color: colors.textPrimary }]}>
              {formatMoney(weeklyData.thisWeekTotalMinor, currencyCode)}
            </Text>
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: isDark ? '#64748B' : '#94A3B8' },
            ]}
          />
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
            Minggu Lalu:{' '}
            <Text style={[styles.legendValue, { color: colors.textPrimary }]}>
              {formatMoney(weeklyData.lastWeekTotalMinor, currencyCode)}
            </Text>
          </Text>
        </View>
      </View>

      {/* 7-Day Dual Column Chart */}
      <View style={styles.chartArea}>
        {weeklyData.dailyBreakdown.map((day) => {
          const thisWeekHeightPercent = Math.max(
            4,
            Math.round((day.thisWeekMinor / maxAmount) * 100),
          );
          const lastWeekHeightPercent = Math.max(
            4,
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
                      backgroundColor: isDark ? '#475569' : '#CBD5E1',
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
                {day.dayName}
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
    width: 8,
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
    borderRadius: 24,
    borderWidth: 1.5,
    elevation: 2,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 12,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendValue: {
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
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
    fontSize: 11,
    fontWeight: '800',
  },
});
