import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo, useMemo } from 'react';
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
  language: 'id' | 'en';
  t: TranslationSchema;
};

export const AnalyticsPeriodSummary = memo(function AnalyticsPeriodSummary({
  analytics,
  currencyCode,
  language,
  t,
}: AnalyticsPeriodSummaryProps) {
  const { colors, isDark } = useTheme();
  const netFlowMinor = analytics.totalIncomeMinor - analytics.totalExpenseMinor;
  const periodLabel = useMemo(() => {
    const [year, month] = analytics.monthStart.split('-').map(Number);
    return new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', {
      month: 'long',
      timeZone: 'UTC',
      year: 'numeric',
    }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, 1)));
  }, [analytics.monthStart, language]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.periodRow}>
        <View
          style={[
            styles.periodIcon,
            {
              backgroundColor: isDark
                ? colors.surfaceSecondary
                : colors.primaryLight,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={colors.primary}
            name="calendar-month-outline"
            size={19}
          />
        </View>
        <View style={styles.periodText}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
            {language === 'id' ? 'PERIODE LAPORAN' : 'REPORTING PERIOD'}
          </Text>
          <Text style={[styles.periodLabel, { color: colors.textPrimary }]}>
            {periodLabel}
          </Text>
        </View>
      </View>

      <View style={styles.netBlock}>
        <Text style={[styles.netLabel, { color: colors.textSecondary }]}>
          {language === 'id' ? 'Arus Bersih' : 'Net Flow'}
        </Text>
        <Text
          adjustsFontSizeToFit
          accessibilityLabel={`${language === 'id' ? 'Arus Bersih' : 'Net Flow'}: ${formatSignedMoney(netFlowMinor, currencyCode)}`}
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
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            {t.analytics.totalIncome}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.metricValue, { color: colors.positive }]}
          >
            {formatMoney(analytics.totalIncomeMinor, currencyCode)}
          </Text>
        </View>
        <View
          style={[styles.metricDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            {t.analytics.totalExpense}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.metricValue, { color: colors.destructive }]}
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
    gap: spacing.sm,
    padding: spacing.md,
  },
  divider: {
    height: 1,
  },
  eyebrow: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  metric: {
    flex: 1,
    gap: 2,
  },
  metricDivider: {
    alignSelf: 'stretch',
    width: 1,
  },
  metricLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
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
  netBlock: {
    gap: 1,
    paddingTop: spacing.xs,
  },
  netLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  netValue: {
    ...typography.displayAmount,
    fontSize: 28,
    fontWeight: '900',
  },
  periodIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  periodLabel: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  periodRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  periodText: {
    flex: 1,
    gap: 1,
  },
});
