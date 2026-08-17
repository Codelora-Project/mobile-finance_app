import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Language, TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type GoalsHeaderProps = {
  language: Language;
  onOpenCreateGoal: () => void;
  streakCount: number;
  t: TranslationSchema;
};

export const GoalsHeader = memo(function GoalsHeader({
  language,
  onOpenCreateGoal,
  streakCount,
  t,
}: GoalsHeaderProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerTitleCol}>
        <View style={styles.titleRow}>
          <Text
            accessibilityRole="header"
            style={[styles.pageTitle, { color: colors.textPrimary }]}
          >
            {t.goals.title}
          </Text>
          {streakCount > 0 ? (
            <View
              style={[
                styles.streakBadge,
                {
                  backgroundColor: isDark ? '#78350F' : '#FEF3C7',
                  borderColor: isDark ? '#B45309' : '#FDE68A',
                },
              ]}
            >
              <MaterialCommunityIcons color="#F59E0B" name="fire" size={16} />
              <Text style={styles.streakCountText}>
                {streakCount} {language === 'id' ? 'Hari' : 'Days'}
              </Text>
              <Text
                style={[
                  styles.streakLabelText,
                  { color: colors.textSecondary },
                ]}
              >
                {t.habits.streakDays}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t.goals.subtitle}
        </Text>
      </View>

      <Pressable
        accessibilityLabel={t.goals.newGoal}
        accessibilityRole="button"
        onPress={onOpenCreateGoal}
        style={({ pressed }) => [
          styles.createBtn,
          { backgroundColor: colors.primary },
          pressed && styles.pressed,
        ]}
      >
        <MaterialCommunityIcons color="#FFFFFF" name="plus" size={18} />
        <Text style={styles.createBtnText}>{t.goals.newGoal}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  createBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 3,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  createBtnText: {
    ...typography.metadata,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  headerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
  },
  pageTitle: {
    ...typography.pageTitle,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  streakBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.xs + 3,
    paddingVertical: 2,
  },
  streakCountText: {
    ...typography.metadata,
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
  },
  streakLabelText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.metadata,
    fontSize: 12,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
