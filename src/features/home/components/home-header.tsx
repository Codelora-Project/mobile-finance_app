import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type HomeHeaderProps = {
  appTitle: string;
  greeting: string;
  onPressSettings: () => void;
  settingsLabel: string;
  streakCount: number;
  streakDaysLabel: string;
};

export const HomeHeader = memo(function HomeHeader({
  appTitle,
  greeting,
  onPressSettings,
  settingsLabel,
  streakCount,
  streakDaysLabel,
}: HomeHeaderProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.cleanHeader,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerLeft}>
        <Text style={[styles.headerGreeting, { color: colors.textSecondary }]}>
          {greeting}
        </Text>
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.textPrimary }]}
        >
          {appTitle}
        </Text>
      </View>

      <View style={styles.headerRightActions}>
        {streakCount > 0 ? (
          <View
            style={[
              styles.streakBadge,
              {
                backgroundColor: isDark ? '#78350F' : '#FEF3C7',
                borderColor: isDark ? '#92400E' : '#FDE68A',
              },
            ]}
          >
            <MaterialCommunityIcons color="#F59E0B" name="fire" size={15} />
            <Text
              style={[
                styles.streakBadgeText,
                { color: isDark ? '#FDE68A' : '#B45309' },
              ]}
            >
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
              backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
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
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  headerGreeting: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  headerLeft: {
    flex: 1,
    gap: 1,
  },
  headerRightActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  headerTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  settingsButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
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
