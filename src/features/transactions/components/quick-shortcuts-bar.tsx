import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatShortcutLabel } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type QuickShortcutsBarProps = {
  onAddIncrement: (amount: number) => void;
  onReset: () => void;
  quickShortcuts: readonly number[];
};

export const QuickShortcutsBar = memo(function QuickShortcutsBar({
  onAddIncrement,
  onReset,
  quickShortcuts,
}: QuickShortcutsBarProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.quickShortcutsRow}>
      <ScrollView
        contentContainerStyle={styles.shortcutsList}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {quickShortcuts.map((amount) => {
          const label = formatShortcutLabel(amount);
          return (
            <Pressable
              accessibilityLabel={`Add ${label}`}
              accessibilityRole="button"
              key={amount}
              onPress={() => onAddIncrement(amount)}
              style={({ pressed }) => [
                styles.shortcutChip,
                {
                  backgroundColor: isDark
                    ? colors.surfaceSecondary
                    : '#EFF6FF',
                  borderColor: isDark ? colors.border : '#BFDBFE',
                },
                pressed && styles.shortcutChipPressed,
              ]}
            >
              <Text
                style={[styles.shortcutChipText, { color: colors.primary }]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityLabel="Reset amount"
          accessibilityRole="button"
          onPress={onReset}
          style={({ pressed }) => [
            styles.shortcutChip,
            styles.shortcutChipClear,
            {
              backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
              borderColor: colors.border,
            },
            pressed && styles.shortcutChipPressed,
          ]}
        >
          <Text
            style={[
              styles.shortcutChipClearText,
              { color: colors.textSecondary },
            ]}
          >
            ⌫ Reset
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  quickShortcutsRow: {
    marginHorizontal: -spacing.md,
    marginTop: spacing.sm,
  },
  shortcutsList: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
  },
  shortcutChip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  shortcutChipPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  shortcutChipText: {
    ...typography.metadata,
    fontWeight: '700',
  },
  shortcutChipClear: {
    paddingHorizontal: spacing.sm,
  },
  shortcutChipClearText: {
    ...typography.metadata,
    fontWeight: '600',
  },
});
