import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getGoalIconName } from '@/features/goals/goal-icons';
import type { SavingsGoal } from '@/features/goals/goals-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type GoalDetailHeroCardProps = {
  currencyCode: string;
  goal: SavingsGoal;
  language: 'id' | 'en';
  t: TranslationSchema;
};

export const GoalDetailHeroCard = memo(function GoalDetailHeroCard({
  currencyCode,
  goal,
  language,
  t,
}: GoalDetailHeroCardProps) {
  const { colors, isDark } = useTheme();

  const progress =
    goal.targetAmountMinor > 0
      ? Math.min(100, (goal.currentAmountMinor / goal.targetAmountMinor) * 100)
      : 0;

  const isCompleted = goal.currentAmountMinor >= goal.targetAmountMinor;
  const remainingMinor = Math.max(
    0,
    goal.targetAmountMinor - goal.currentAmountMinor,
  );

  const iconName = getGoalIconName(goal.iconKey, 'bullseye-arrow');

  const goalColor = goal.colorKey || colors.primary;

  return (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Icon & Title Row */}
      <View style={styles.heroHeaderRow}>
        <View
          style={[
            styles.goalIconCircle,
            {
              backgroundColor: isDark ? `${goalColor}22` : `${goalColor}15`,
            },
          ]}
        >
          <MaterialCommunityIcons color={goalColor} name={iconName} size={28} />
        </View>

        <View style={styles.heroTitleCol}>
          <Text
            numberOfLines={1}
            style={[styles.goalName, { color: colors.textPrimary }]}
          >
            {goal.name}
          </Text>
          {goal.targetDate ? (
            <Text style={[styles.goalDate, { color: colors.textSecondary }]}>
              {t.goals.target}:{' '}
              {new Date(goal.targetDate).toLocaleDateString(
                language === 'id' ? 'id-ID' : 'en-US',
                {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                },
              )}
            </Text>
          ) : null}
        </View>

        {isCompleted ? (
          <View
            style={[
              styles.completedBadge,
              { backgroundColor: colors.incomeBackground },
            ]}
          >
            <MaterialCommunityIcons
              color="#16A34A"
              name="check-circle"
              size={14}
            />
            <Text style={[styles.completedBadgeText, { color: '#16A34A' }]}>
              {t.goals.achieved}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Main Amounts Display */}
      <View style={styles.amountDisplayRow}>
        <View style={styles.amountCol}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
            {t.goals.collected}
          </Text>
          <Text style={[styles.currentAmount, { color: goalColor }]}>
            {formatMoney(goal.currentAmountMinor, currencyCode)}
          </Text>
        </View>

        <View style={[styles.amountCol, { alignItems: 'flex-end' }]}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
            {t.goals.target}
          </Text>
          <Text style={[styles.targetAmount, { color: colors.textPrimary }]}>
            {formatMoney(goal.targetAmountMinor, currencyCode)}
          </Text>
        </View>
      </View>

      {/* Progress Bar & Percentage */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBarTrack,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
            },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: goalColor,
                width: `${progress}%`,
              },
            ]}
          />
        </View>

        <View style={styles.progressStatsRow}>
          <Text style={[styles.progressPercent, { color: colors.textPrimary }]}>
            {progress.toFixed(1)}%
          </Text>
          {!isCompleted ? (
            <Text
              style={[styles.remainingText, { color: colors.textSecondary }]}
            >
              {t.goals.remainingPrefix}
              {formatMoney(remainingMinor, currencyCode)}
            </Text>
          ) : (
            <Text style={[styles.remainingText, { color: '#16A34A' }]}>
              {t.goals.congratsCompleted}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  amountCol: {
    gap: 2,
  },
  amountDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  amountLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '500',
  },
  completedBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  completedBadgeText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  currentAmount: {
    ...typography.pageTitle,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  goalDate: {
    ...typography.metadata,
    fontSize: 12,
    marginTop: 2,
  },
  goalIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  goalName: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  heroHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  heroTitleCol: {
    flex: 1,
  },
  progressBarFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  progressBarTrack: {
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  progressContainer: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  progressPercent: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  remainingText: {
    ...typography.metadata,
    fontSize: 12,
  },
  targetAmount: {
    ...typography.sectionTitle,
    fontSize: 18,
    fontWeight: '700',
  },
});
