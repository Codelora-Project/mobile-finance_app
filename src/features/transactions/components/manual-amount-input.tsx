import React, { memo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { QuickShortcutsBar } from '@/features/transactions/components/quick-shortcuts-bar';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ManualAmountInputProps = {
  amount: string;
  amountInputRef?: React.RefObject<TextInput | null>;
  currencySymbol?: string;
  error?: string;
  onAddIncrement: (amount: number) => void;
  onChangeAmount: (text: string) => void;
  onPressCard?: () => void;
  onResetAmount: () => void;
  quickShortcuts: readonly number[];
};

export const ManualAmountInput = memo(function ManualAmountInput({
  amount,
  amountInputRef,
  currencySymbol = 'Rp',
  error,
  onAddIncrement,
  onChangeAmount,
  onPressCard,
  onResetAmount,
  quickShortcuts,
}: ManualAmountInputProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPressCard}
        style={[
          styles.amountHeroCard,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.destructive : colors.border,
            shadowColor: colors.textPrimary,
          },
        ]}
      >
        <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>
          {currencySymbol}
        </Text>
        <TextInput
          accessibilityLabel="Amount *"
          autoFocus={false}
          inputMode="numeric"
          keyboardType="numeric"
          onChangeText={onChangeAmount}
          placeholder="0"
          placeholderTextColor="#94A3B8"
          ref={amountInputRef}
          style={[styles.amountHeroInput, { color: colors.textPrimary }]}
          value={amount}
        />
      </Pressable>

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      {/* Quick Cash Shortcuts */}
      <QuickShortcutsBar
        currencySymbol={currencySymbol}
        onAddIncrement={onAddIncrement}
        onReset={onResetAmount}
        quickShortcuts={quickShortcuts}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  amountHeroCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    elevation: 2,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  amountHeroInput: {
    ...typography.displayAmount,
    flex: 1,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
    minHeight: 48,
    padding: 0,
  },
  container: {
    gap: spacing.xs,
  },
  currencyPrefix: {
    ...typography.displayAmount,
    fontSize: 22,
    fontWeight: '800',
  },
  errorBanner: {
    ...typography.metadata,
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    paddingHorizontal: spacing.xs,
  },
});
