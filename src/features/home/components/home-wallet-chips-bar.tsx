import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Wallet } from '@/features/wallets';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { fixedSemanticColors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type HomeWalletChipsBarProps = {
  language: Language;
  onAddWalletPress?: () => void;
  onSelectWallet: (walletId: number | null) => void;
  selectedWalletId: number | null;
  wallets: readonly Wallet[];
};

export const HomeWalletChipsBar = memo(function HomeWalletChipsBar({
  language,
  onAddWalletPress,
  onSelectWallet,
  selectedWalletId,
  wallets,
}: HomeWalletChipsBarProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  if (wallets.length === 0) return null;

  const isAllSelected = selectedWalletId === null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {/* 'Semua' (All) Chip */}
        <Pressable
          accessibilityLabel={t.home.allWallets}
          accessibilityRole="tab"
          accessibilityState={{ selected: isAllSelected }}
          onPress={() => onSelectWallet(null)}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: isAllSelected
                ? colors.primaryLight
                : isDark
                  ? colors.surface
                  : colors.onPrimary,
              borderColor: isAllSelected ? colors.primary : colors.border,
            },
            pressed ? { opacity: 0.75 } : null,
          ]}
        >
          <Text
            style={[
              styles.chipText,
              {
                color: isAllSelected ? colors.primary : colors.textSecondary,
                fontWeight: isAllSelected ? '800' : '600',
              },
            ]}
          >
            {t.home.allWallets}
          </Text>
        </Pressable>

        {/* Individual Wallet Chips */}
        {wallets.map((wallet) => {
          const isSelected = selectedWalletId === wallet.id;
          const walletColor = wallet.color || colors.primary;

          return (
            <Pressable
              accessibilityLabel={wallet.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              key={wallet.id}
              onPress={() => onSelectWallet(isSelected ? null : wallet.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? `${walletColor}25`
                      : `${walletColor}12`
                    : isDark
                      ? colors.surface
                      : colors.onPrimary,
                  borderColor: isSelected ? walletColor : colors.border,
                },
                pressed ? { opacity: 0.75 } : null,
              ]}
            >
              <View style={[styles.dot, { backgroundColor: walletColor }]} />
              <Text
                numberOfLines={1}
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? walletColor : colors.textPrimary,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {wallet.name}
              </Text>
            </Pressable>
          );
        })}

        {/* + Add Wallet Chip */}
        {onAddWalletPress ? (
          <Pressable
            accessibilityLabel={t.home.manageWallets}
            accessibilityRole="button"
            onPress={onAddWalletPress}
            style={({ pressed }) => [
              styles.chip,
              styles.addChip,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
              pressed ? { opacity: 0.75 } : null,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="plus"
              size={15}
            />
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  addChip: {
    borderStyle: 'dashed',
    paddingHorizontal: spacing.sm,
  },
  chip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    elevation: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    shadowColor: fixedSemanticColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  chipText: {
    ...typography.metadata,
    fontSize: 12,
  },
  container: {
    marginHorizontal: -spacing.md,
    marginTop: -spacing.xs,
  },
  dot: {
    borderRadius: radius.pill,
    height: 7,
    width: 7,
  },
  scrollContent: {
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
