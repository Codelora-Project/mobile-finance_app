import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type HistoryPeriod = 'daily' | 'weekly' | 'monthly';

export type TransactionPeriodSegmentedControlProps = {
  activePeriod: HistoryPeriod;
  embedded?: boolean;
  language: 'id' | 'en';
  onChangePeriod: (period: HistoryPeriod) => void;
};

export const TransactionPeriodSegmentedControl = memo(
  function TransactionPeriodSegmentedControl({
    activePeriod,
    embedded = false,
    language,
    onChangePeriod,
  }: TransactionPeriodSegmentedControlProps) {
    const { colors, isDark } = useTheme();

    const options: { label: string; value: HistoryPeriod }[] = [
      {
        label: language === 'id' ? 'Harian' : 'Daily',
        value: 'daily',
      },
      {
        label: language === 'id' ? 'Mingguan' : 'Weekly',
        value: 'weekly',
      },
      {
        label: language === 'id' ? 'Bulanan' : 'Monthly',
        value: 'monthly',
      },
    ];

    return (
      <View
        style={[
          styles.container,
          embedded ? styles.embeddedContainer : null,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(0, 0, 0, 0.05)',
          },
        ]}
      >
        {options.map((opt) => {
          const isActive = activePeriod === opt.value;
          return (
            <Pressable
              accessibilityLabel={opt.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={opt.value}
              onPress={() => onChangePeriod(opt.value)}
              style={[
                styles.tabItem,
                isActive && [
                  styles.activeTabItem,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#FFFFFF',
                    shadowColor: '#000000',
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? colors.textPrimary : colors.textSecondary,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  activeTabItem: {
    elevation: 2,
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  container: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    marginTop: spacing.xs,
    maxWidth: contentMaxWidth - spacing.md * 2,
    padding: 3,
    width: '92%',
  },
  embeddedContainer: {
    marginTop: 0,
    maxWidth: '100%',
    width: '100%',
  },
  tabItem: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 7,
  },
  tabText: {
    ...typography.metadata,
    fontSize: 13,
  },
});
