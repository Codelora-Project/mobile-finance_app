import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { QuickShortcutsBar } from '@/features/transactions/components/quick-shortcuts-bar';
import { useLanguage } from '@/lib/i18n/language-context';
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
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPressCard}
        style={[
          styles.amountHeroCard,
          {
            backgroundColor: colors.surface,
            borderColor: error
              ? colors.destructive
              : isDark
                ? colors.surfaceSecondary
                : colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <Text style={[styles.currencyPrefix, { color: colors.primary }]}>
          {currencySymbol}
        </Text>
        <TextInput
          accessibilityLabel={t.transactions.amountRequired}
          autoFocus={false}
          inputMode="numeric"
          keyboardType="numeric"
          onChangeText={onChangeAmount}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          ref={amountInputRef}
          style={[styles.amountHeroInput, { color: colors.textPrimary }]}
          value={amount}
        />

        {amount ? (
          <Pressable
            accessibilityLabel={t.transactions.clearAmount}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onResetAmount}
            style={({ pressed }) => [
              styles.clearAmountBtn,
              pressed ? styles.btnPressed : null,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="close-circle"
              size={20}
            />
          </Pressable>
        ) : null}
      </Pressable>

      {error ? (
        <View style={styles.errorRow}>
          <MaterialCommunityIcons
            color={colors.destructive}
            name="alert-circle-outline"
            size={14}
          />
          <Text style={[styles.errorBanner, { color: colors.destructive }]}>
            {error}
          </Text>
        </View>
      ) : null}

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
    borderRadius: radius.xl,
    borderWidth: 1.5,
    elevation: 2,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
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
  btnPressed: {
    opacity: 0.7,
  },
  clearAmountBtn: {
    padding: 2,
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
    fontSize: 12,
    fontWeight: '600',
  },
  errorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
    paddingHorizontal: spacing.xs,
  },
});
