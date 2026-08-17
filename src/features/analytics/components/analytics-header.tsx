import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type AnalyticsHeaderProps = {
  backLabel: string;
  onBack: () => void;
  title: string;
};

export const AnalyticsHeader = memo(function AnalyticsHeader({
  backLabel,
  onBack,
  title,
}: AnalyticsHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={backLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
        style={styles.backButton}
      >
        <MaterialCommunityIcons
          color={colors.textPrimary}
          name="chevron-left"
          size={28}
        />
      </Pressable>

      <Text
        accessibilityRole="header"
        style={[styles.headerTitle, { color: colors.textPrimary }]}
      >
        {title}
      </Text>

      <View style={styles.headerSpacer} />
    </View>
  );
});

const styles = StyleSheet.create({
  backButton: {
    padding: spacing.xs,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    ...typography.pageTitle,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
