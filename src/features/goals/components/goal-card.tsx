import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SavingsGoal } from '@/features/goals/goals-repository';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

type GoalCardProps = {
  goal: SavingsGoal;
  onPress: () => void;
  onDepositPress?: () => void;
};

export const GOAL_ICONS: Record<string, string> = {
  target: 'target',
  piggy: 'piggy-bank',
  laptop: 'laptop',
  travel: 'airplane',
  car: 'car',
  home: 'home-heart',
  shopping: 'shopping',
  gift: 'gift',
  gadget: 'cellphone',
  emergency: 'shield-star',
};

export function GoalCard({ goal, onPress, onDepositPress }: GoalCardProps) {
  const { colors, isDark } = useTheme();
  const iconName = GOAL_ICONS[goal.iconKey] || 'target';

  return (
    <Pressable
      accessibilityLabel={`${goal.name}, ${goal.isCompleted ? 'Selesai' : `${goal.progressPercent}%`}, ${formatMoney(goal.currentAmountMinor, 'IDR')} dari ${formatMoney(goal.targetAmountMinor, 'IDR')}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: goal.isCompleted
            ? isDark
              ? '#065F46'
              : '#A7F3D0'
            : colors.border,
        },
        pressed ? styles.pressed : null,
      ]}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.leftTitleRow}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDark
                  ? `${goal.colorKey}33`
                  : `${goal.colorKey}20`,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={goal.colorKey}
              name={iconName as any}
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
              Target: {formatMoney(goal.targetAmountMinor, 'IDR')}
            </Text>
          </View>
        </View>

        {goal.isCompleted ? (
          <View
            style={[
              styles.completedBadge,
              { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.positive}
              name="check-decagram"
              size={16}
            />
            <Text style={[styles.completedText, { color: colors.positive }]}>
              Tercapai 🎉
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.percentBadge,
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#EFF6FF',
              },
            ]}
          >
            <Text style={[styles.percentText, { color: colors.primary }]}>
              {goal.progressPercent}%
            </Text>
          </View>
        )}
      </View>

      {/* Progress Track */}
      <View
        style={[
          styles.progressTrack,
          {
            backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
          },
        ]}
      >
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: goal.isCompleted
                ? colors.positive
                : goal.colorKey,
              width: `${Math.min(100, Math.max(0, goal.progressPercent))}%`,
            },
          ]}
        />
      </View>

      {/* Footer Info & Quick Deposit */}
      <View style={styles.footerRow}>
        <View>
          <Text style={[styles.savedLabel, { color: colors.textSecondary }]}>
            Terkumpul:
          </Text>
          <Text
            style={[
              styles.savedAmount,
              {
                color: goal.isCompleted ? colors.positive : colors.textPrimary,
              },
            ]}
          >
            {formatMoney(goal.currentAmountMinor, 'IDR')}
          </Text>
        </View>

        {!goal.isCompleted && onDepositPress ? (
          <Pressable
            accessibilityLabel={`Nabung untuk ${goal.name}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              onDepositPress();
            }}
            style={[
              styles.quickDepositBtn,
              { backgroundColor: colors.primary },
            ]}
          >
            <MaterialCommunityIcons color="#FFFFFF" name="plus" size={16} />
            <Text style={styles.quickDepositText}>Nabung</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
    gap: spacing.sm + 2,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  completedBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '800',
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '800',
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
    paddingRight: spacing.xs,
  },
  percentBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '800',
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
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  quickDepositBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  quickDepositText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  savedAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  savedLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  targetAmountText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  titleContainer: {
    flex: 1,
  },
});
