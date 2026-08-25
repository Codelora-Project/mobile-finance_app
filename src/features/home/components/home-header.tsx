import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type HomeHeaderProps = {
  onPressSettings: () => void;
  settingsLabel: string;
  streakCount: number;
  streakDaysLabel: string;
  subtitle?: string;
  title: string;
};

export const HomeHeader = memo(function HomeHeader({
  onPressSettings,
  settingsLabel,
  streakCount,
  streakDaysLabel,
  subtitle,
  title,
}: HomeHeaderProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.cleanHeader,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <View style={styles.headerLeft}>
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.textPrimary }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.headerRightActions}>
        {streakCount > 0 ? (
          <View
            style={[
              styles.streakBadge,
              {
                backgroundColor: colors.warningBackground,
                borderColor: colors.warning,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.warning}
              name="fire"
              size={15}
            />
            <Text style={[styles.streakBadgeText, { color: colors.warning }]}>
              {streakCount} {streakDaysLabel}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityLabel={settingsLabel}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onPressSettings}
          style={({ pressed }) => [
            styles.settingsButton,
            {
              backgroundColor: isDark
                ? colors.surfaceSecondary
                : colors.surface,
              borderColor: colors.border,
            },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textPrimary}
            name="cog-outline"
            size={22}
          />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cleanHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerRightActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  headerTitle: {
    ...typography.pageTitle,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  settingsButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  streakBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  streakBadgeText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
});
