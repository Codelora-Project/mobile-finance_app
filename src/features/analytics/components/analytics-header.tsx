import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type AnalyticsHeaderProps = {
  backLabel: string;
  onBack?: () => void;
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
      {onBack ? (
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
      ) : null}

      <Text
        accessibilityRole="header"
        style={[
          styles.headerTitle,
          !onBack ? styles.tabHeaderTitle : null,
          { color: colors.textPrimary },
        ]}
      >
        {title}
      </Text>

      {onBack ? <View style={styles.headerSpacer} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  backButton: {
    padding: spacing.xs,
  },
  header: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    maxWidth: contentMaxWidth,
    paddingHorizontal: spacing.md,
    width: '100%',
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
  tabHeaderTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'left',
  },
});
