import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type GoalsHeaderProps = {
  backLabel: string;
  onBack: () => void;
  onOpenCreateGoal: () => void;
  t: TranslationSchema;
};

export const GoalsHeader = memo(function GoalsHeader({
  backLabel,
  onBack,
  onOpenCreateGoal,
  t,
}: GoalsHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityLabel={backLabel}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textPrimary}
            name="chevron-left"
            size={28}
          />
        </Pressable>

        <View style={styles.titleRow}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[styles.pageTitle, { color: colors.textPrimary }]}
          >
            {t.goals.title}
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
          <MaterialCommunityIcons
            color={colors.onPrimary}
            name="plus"
            size={18}
          />
          <Text style={[styles.createBtnText, { color: colors.onPrimary }]}>
            {t.goals.newGoal}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t.goals.subtitle}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginLeft: -spacing.xs,
    width: 40,
  },
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
    fontSize: 12,
    fontWeight: '800',
  },
  headerContainer: {
    alignSelf: 'center',
    gap: spacing.xs,
    maxWidth: contentMaxWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '100%',
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
  subtitle: {
    ...typography.metadata,
    fontSize: 12,
  },
  titleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minWidth: 0,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
