import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
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
  const { colors } = useTheme();

  const tabs: { key: AnalyticsTabMode; label: string }[] = [
    { key: 'overview', label: overviewLabel },
    { key: 'trends', label: trendsLabel },
    { key: 'budgets', label: budgetsLabel },
  ];

  return (
    <View style={styles.tabsOuter}>
      <View
        style={[
          styles.tabsContainer,
          { backgroundColor: colors.surfaceSecondary },
        ]}
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              key={tab.key}
              onPress={() => onSelectTab(tab.key)}
              style={({ pressed }) => [
                styles.tabPill,
                {
                  backgroundColor: isSelected ? colors.primary : 'transparent',
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
                    color: isSelected ? colors.onPrimary : colors.textSecondary,
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
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    width: '100%',
  },
  tabsOuter: {
    alignSelf: 'center',
    maxWidth: contentMaxWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    width: '100%',
  },
});
