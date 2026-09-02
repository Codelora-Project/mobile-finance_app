import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SavingsGoal } from '@/features/goals/goals-repository';
import { getGoalIconName } from '@/features/goals/goal-icons';
import { useCurrency } from '@/lib/currency/currency-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { fixedSemanticColors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

type GoalCardProps = {
  goal: SavingsGoal;
  onPress: () => void;
  onDepositPress?: () => void;
  /** When true, hides the "remaining" column (e.g. in the home screen widget) */
  compact?: boolean;
};

export function GoalCard({
  goal,
  onPress,
  onDepositPress,
  compact = false,
}: GoalCardProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { currencyCode } = useCurrency();
  const iconName = getGoalIconName(goal.iconKey);

  const clampedPercent = Math.min(100, Math.max(0, goal.progressPercent));
  const remainingMinor = Math.max(
    0,
    goal.targetAmountMinor - goal.currentAmountMinor,
  );

  // Translucent tint from the goal's chosen accent color
  const accentBg = isDark ? `${goal.colorKey}22` : `${goal.colorKey}18`;
  const completedBorderColor = colors.positiveBorder;
  // Shorten "Nabung / Setor" ? "Nabung" for the button label
  const depositLabel = t.goals.deposit.split('/')[0]?.trim() ?? t.goals.deposit;

  return (
    <Pressable
      accessibilityLabel={`${goal.name}, ${goal.isCompleted ? t.goals.completed : `${clampedPercent}%`}, ${formatMoney(goal.currentAmountMinor, currencyCode)} ${t.goals.saved.toLowerCase()}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: goal.isCompleted ? completedBorderColor : colors.border,
          shadowColor: colors.textPrimary,
        },
        pressed && styles.pressed,
      ]}
    >
      {/* -- Header Row ----------------------------------- */}
      <View style={styles.headerRow}>
        <View style={styles.leftTitleRow}>
          <View style={[styles.iconCircle, { backgroundColor: accentBg }]}>
            <MaterialCommunityIcons
              color={goal.colorKey}
              name={iconName}
              size={22}
            />
          </View>
          <View style={styles.titleContainer}>
            <Text
              numberOfLines={1}
              style={[styles.goalName, { color: colors.textPrimary }]}
            >
              {goal.name}
            </Text>
            <Text
              style={[styles.targetAmountText, { color: colors.textSecondary }]}
            >
              {t.goals.target}:{' '}
              {formatMoney(goal.targetAmountMinor, currencyCode)}
            </Text>
          </View>
        </View>

        {goal.isCompleted ? (
          <View
            style={[
              styles.completedBadge,
              { backgroundColor: colors.incomeBackground },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.positive}
              name="check-decagram"
              size={14}
            />
            <Text style={[styles.completedText, { color: colors.positive }]}>
              {t.goals.completed}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.percentBadge,
              {
                backgroundColor: colors.primaryLight,
              },
            ]}
          >
            <Text style={[styles.percentText, { color: colors.primary }]}>
              {clampedPercent}%
            </Text>
          </View>
        )}
      </View>

      {/* -- Progress Bar --------------------------------- */}
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: colors.surfaceSecondary },
        ]}
      >
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: goal.isCompleted
                ? colors.positive
                : goal.colorKey,
              width: `${clampedPercent}%`,
            },
          ]}
        />
      </View>

      {/* -- Footer --------------------------------------- */}
      <View style={styles.footerRow}>
        {/* Saved */}
        <View style={styles.footerBlock}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
            {t.goals.saved}
          </Text>
          <Text
            style={[
              styles.footerAmount,
              {
                color: goal.isCompleted ? colors.positive : colors.textPrimary,
              },
            ]}
          >
            {formatMoney(goal.currentAmountMinor, currencyCode)}
          </Text>
        </View>

        {/* Remaining – hidden in compact/completed mode */}
        {!compact && !goal.isCompleted && (
          <>
            <View
              style={[styles.footerDivider, { backgroundColor: colors.border }]}
            />
            <View style={[styles.footerBlock, styles.footerBlockRight]}>
              <Text
                style={[styles.footerLabel, { color: colors.textSecondary }]}
              >
                {t.goals.remaining}
              </Text>
              <Text
                style={[styles.footerAmount, { color: colors.textSecondary }]}
              >
                {formatMoney(remainingMinor, currencyCode)}
              </Text>
            </View>
          </>
        )}

        {/* Quick Deposit */}
        {!goal.isCompleted && onDepositPress ? (
          <Pressable
            accessibilityLabel={`${t.goals.deposit} ${goal.name}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              onDepositPress();
            }}
            style={({ pressed }) => [
              styles.quickDepositBtn,
              { backgroundColor: goal.colorKey },
              pressed && { opacity: 0.85 },
            ]}
          >
            <MaterialCommunityIcons
              color={fixedSemanticColors.contentOnStrong}
              name="plus"
              size={14}
            />
            <Text style={styles.quickDepositText}>{depositLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg + 4,
    borderWidth: 1.5,
    elevation: 3,
    gap: spacing.sm + 2,
    padding: spacing.md,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  completedBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footerAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  footerBlock: {
    flex: 1,
  },
  footerBlockRight: {
    alignItems: 'flex-end',
  },
  footerDivider: {
    borderRadius: 1,
    height: 28,
    marginHorizontal: spacing.sm,
    width: 1,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 2,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  leftTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    paddingRight: spacing.sm,
  },
  percentBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  pressed: {
    opacity: 0.8,
  },
  progressBar: {
    borderRadius: radius.pill,
    height: '100%',
  },
  progressTrack: {
    borderRadius: radius.pill,
    height: 10,
    overflow: 'hidden',
    width: '100%',
  },
  quickDepositBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  quickDepositText: {
    color: fixedSemanticColors.contentOnStrong,
    fontSize: 12,
    fontWeight: '800',
  },
  targetAmountText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  titleContainer: {
    flex: 1,
  },
});
