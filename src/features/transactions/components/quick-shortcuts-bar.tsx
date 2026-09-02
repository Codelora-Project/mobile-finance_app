import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatShortcutLabel } from '@/lib/money';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type QuickShortcutsBarProps = {
  currencySymbol?: string;
  onAddIncrement: (amount: number) => void;
  onReset: () => void;
  quickShortcuts: readonly number[];
};

export const QuickShortcutsBar = memo(function QuickShortcutsBar({
  currencySymbol,
  onAddIncrement,
  onReset,
  quickShortcuts,
}: QuickShortcutsBarProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.quickShortcutsRow}>
      <ScrollView
        contentContainerStyle={styles.shortcutsList}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {quickShortcuts.map((amount) => {
          const label = formatShortcutLabel(amount, currencySymbol);
          return (
            <Pressable
              accessibilityLabel={`${t.common.add} ${label}`}
              accessibilityRole="button"
              key={amount}
              onPress={() => onAddIncrement(amount)}
              style={({ pressed }) => [
                styles.shortcutChip,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
                pressed && styles.shortcutChipPressed,
              ]}
            >
              <Text
                style={[styles.shortcutChipText, { color: colors.textPrimary }]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityLabel={t.transactions.resetAmount}
          accessibilityRole="button"
          onPress={onReset}
          style={({ pressed }) => [
            styles.shortcutChip,
            styles.shortcutChipClear,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.borderStrong,
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
            ⌫ {t.transactions.reset}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  quickShortcutsRow: {
    marginHorizontal: -spacing.md,
    marginTop: spacing.xs + 2,
  },
  shortcutChip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  shortcutChipClear: {
    paddingHorizontal: spacing.sm + 2,
  },
  shortcutChipClearText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  shortcutChipPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  shortcutChipText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  shortcutsList: {
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
  },
});
