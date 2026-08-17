import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type AnalyticsTabMode = 'budgets' | 'overview' | 'trends';

export type AnalyticsTabPillsProps = {
  activeTab: AnalyticsTabMode;
  budgetsLabel: string;
  onSelectTab: (tab: AnalyticsTabMode) => void;
  overviewLabel: string;
  trendsLabel: string;
};

export const AnalyticsTabPills = memo(function AnalyticsTabPills({
  activeTab,
  budgetsLabel,
  onSelectTab,
  overviewLabel,
  trendsLabel,
}: AnalyticsTabPillsProps) {
  const { colors, isDark } = useTheme();

  const tabs: { key: AnalyticsTabMode; label: string }[] = [
    { key: 'overview', label: overviewLabel },
    { key: 'budgets', label: budgetsLabel },
    { key: 'trends', label: trendsLabel },
  ];

  return (
    <View style={styles.tabsContainer}>
      {tabs.map((tab) => {
        const isSelected = activeTab === tab.key;
        return (
          <Pressable
            accessibilityRole="button"
            key={tab.key}
            onPress={() => onSelectTab(tab.key)}
            style={({ pressed }) => [
              styles.tabPill,
              {
                backgroundColor: isSelected
                  ? colors.primary
                  : isDark
                    ? colors.surfaceSecondary
                    : '#F1F5F9',
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              numberOfLines={1}
              style={[
                styles.tabPillText,
                {
                  color: isSelected ? '#FFFFFF' : colors.textSecondary,
                  fontWeight: isSelected ? '800' : '600',
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  tabPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xs + 3,
  },
  tabPillText: {
    ...typography.metadata,
    fontSize: 13,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
