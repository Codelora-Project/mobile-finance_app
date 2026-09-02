import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { GoalsSummary } from '@/features/goals/goals-repository';
import { useCurrency } from '@/lib/currency/currency-context';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type GoalsSummaryCardProps = {
  summary: GoalsSummary;
  t: TranslationSchema;
};

export const GoalsSummaryCard = memo(function GoalsSummaryCard({
  summary,
  t,
}: GoalsSummaryCardProps) {
  const { colors } = useTheme();
  const { currencyCode } = useCurrency();

  const progressPercent =
    summary.totalTargetMinor > 0
      ? Math.min(
          100,
          Math.round(
            (summary.totalSavedMinor / summary.totalTargetMinor) * 100,
          ),
        )
      : 0;

  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.summaryTopRow}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons
            color={colors.primary}
            name="piggy-bank-outline"
            size={24}
          />
        </View>
        <View style={styles.summaryTitleCol}>
          <Text
            style={[styles.summaryCardLabel, { color: colors.textSecondary }]}
          >
            {t.goals.totalSavingsCollected}
          </Text>
          <Text style={[styles.savedAmountHero, { color: colors.textPrimary }]}>
            {formatMoney(summary.totalSavedMinor, currencyCode)}
          </Text>
        </View>
        <View
          style={[
            styles.percentPill,
            {
              backgroundColor: colors.incomeBackground,
            },
          ]}
        >
          <Text style={[styles.percentPillText, { color: colors.positive }]}>
            {progressPercent}%
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View
        style={[
          styles.progressBarTrack,
          {
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
      >
        <View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: colors.primary,
              width: `${progressPercent}%`,
            },
          ]}
        />
      </View>

      {/* Footer Info Row */}
      <View style={styles.summaryFooterRow}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {t.goals.target}:{' '}
          <Text style={[styles.footerHighlight, { color: colors.textPrimary }]}>
            {formatMoney(summary.totalTargetMinor, currencyCode)}
          </Text>
        </Text>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {summary.activeCount} {t.goals.active}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  footerHighlight: {
    fontWeight: '700',
  },
  footerText: {
    ...typography.metadata,
    fontSize: 11,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  percentPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  percentPillText: {
    ...typography.metadata,
    fontWeight: '800',
  },
  progressBarFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  progressBarTrack: {
    borderRadius: radius.pill,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  savedAmountHero: {
    ...typography.displayAmount,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.sm,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  summaryCardLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  summaryFooterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryTitleCol: {
    flex: 1,
    gap: 1,
  },
  summaryTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
