import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Wallet, WalletSummary } from '@/features/wallets';
import { getWalletIconName } from '@/features/wallets/wallet-icons';
import type { Language } from '@/lib/i18n/translations';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { fixedSemanticColors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type HomeWalletCarouselProps = {
  currencyCode: string;
  language: Language;
  onAddWalletPress?: () => void;
  onSelectWallet: (walletId: number | null) => void;
  selectedWalletId: number | null;
  walletSummary: WalletSummary | null;
};

export const HomeWalletCarousel = memo(function HomeWalletCarousel({
  currencyCode,
  onAddWalletPress,
  onSelectWallet,
  selectedWalletId,
  walletSummary,
}: HomeWalletCarouselProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  const isAllSelected = selectedWalletId === null;
  const totalNetWorth = walletSummary?.totalNetWorthMinor ?? 0;
  const wallets = walletSummary?.wallets ?? [];

  function renderBalance(amountMinor: number) {
    if (isBalanceHidden) {
      return '••••••';
    }
    return formatMoney(amountMinor, currencyCode);
  }

  return (
    <View style={styles.container}>
      {/* Header Section with Title, Privacy Eye Toggle & Manage Button */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <MaterialCommunityIcons
            color={colors.primary}
            name="wallet-outline"
            size={18}
          />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t.home.walletsAndBalance}
          </Text>

          {/* Privacy Eye Toggle */}
          <Pressable
            accessibilityLabel={
              isBalanceHidden ? t.home.showBalance : t.home.hideBalance
            }
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setIsBalanceHidden((prev) => !prev)}
            style={({ pressed }) => [
              styles.eyeButton,
              pressed ? { opacity: 0.6 } : null,
            ]}
          >
            <MaterialCommunityIcons
              color={isBalanceHidden ? colors.primary : colors.textMuted}
              name={isBalanceHidden ? 'eye-off-outline' : 'eye-outline'}
              size={17}
            />
          </Pressable>
        </View>

        {/* Right Header Action: Reset Filter or Manage Link */}
        {selectedWalletId !== null ? (
          <Pressable
            accessibilityLabel={t.home.resetWalletFilter}
            accessibilityRole="button"
            onPress={() => onSelectWallet(null)}
            style={({ pressed }) => [
              styles.resetFilterBtn,
              {
                backgroundColor: isDark
                  ? colors.primaryOverlay
                  : colors.primaryLight,
                borderColor: colors.primary,
              },
              pressed ? { opacity: 0.75 } : null,
            ]}
          >
            <Text style={[styles.resetFilterText, { color: colors.primary }]}>
              {t.home.showAll}
            </Text>
            <MaterialCommunityIcons
              color={colors.primary}
              name="close-circle-outline"
              size={13}
            />
          </Pressable>
        ) : onAddWalletPress ? (
          <Pressable
            accessibilityLabel={t.home.manageWallets}
            accessibilityRole="button"
            onPress={onAddWalletPress}
            style={styles.manageHeaderBtn}
          >
            <Text style={[styles.manageHeaderText, { color: colors.primary }]}>
              {t.home.manage}
            </Text>
            <MaterialCommunityIcons
              color={colors.primary}
              name="chevron-right"
              size={15}
            />
          </Pressable>
        ) : (
          <Text style={[styles.walletsCount, { color: colors.textMuted }]}>
            {wallets.length} {t.home.activeAccounts}
          </Text>
        )}
      </View>

      {/* Horizontal Carousel (Compact Mini-Pills) */}
      <ScrollView
        contentContainerStyle={styles.scrollList}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {/* 1. All Wallets / Net Worth Mini Card */}
        <Pressable
          accessibilityLabel={`Semua Dompet, Total Kekayaan ${renderBalance(totalNetWorth)}`}
          accessibilityRole="button"
          onPress={() => onSelectWallet(null)}
          style={({ pressed }) => [
            styles.miniCard,
            {
              backgroundColor: isAllSelected
                ? colors.primaryLight
                : isDark
                  ? colors.surface
                  : colors.onPrimary,
              borderColor: isAllSelected ? colors.primary : colors.border,
            },
            isAllSelected ? styles.cardActiveGlow : null,
            pressed ? { opacity: 0.85 } : null,
          ]}
        >
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: isAllSelected
                  ? colors.primaryBorder
                  : isDark
                    ? colors.primaryOverlay
                    : colors.primaryLight,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.primary}
              name="wallet"
              size={19}
            />
          </View>

          <View style={styles.miniCardTextWrap}>
            <View style={styles.nameRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.miniCardName,
                  {
                    color: isAllSelected
                      ? colors.primary
                      : colors.textSecondary,
                  },
                ]}
              >
                {t.home.allAccounts}
              </Text>
              {isAllSelected ? (
                <View
                  style={[
                    styles.activeDot,
                    { backgroundColor: colors.primary },
                  ]}
                />
              ) : null}
            </View>

            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              numberOfLines={1}
              style={[styles.miniCardBalance, { color: colors.textPrimary }]}
            >
              {renderBalance(totalNetWorth)}
            </Text>
          </View>
        </Pressable>

        {/* 2. Individual Wallet Mini Cards */}
        {wallets.map((wallet: Wallet) => {
          const isSelected = selectedWalletId === wallet.id;
          const walletColor = wallet.color || colors.primary;

          return (
            <Pressable
              accessibilityLabel={`${wallet.name}, Saldo ${renderBalance(wallet.currentBalanceMinor)}`}
              accessibilityRole="button"
              key={wallet.id}
              onPress={() => onSelectWallet(wallet.id)}
              style={({ pressed }) => [
                styles.miniCard,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? `${walletColor}22`
                      : `${walletColor}10`
                    : isDark
                      ? colors.surface
                      : colors.onPrimary,
                  borderColor: isSelected ? walletColor : colors.border,
                },
                isSelected ? styles.cardActiveGlow : null,
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isDark
                      ? `${walletColor}30`
                      : `${walletColor}18`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={walletColor}
                  name={getWalletIconName(wallet)}
                  size={19}
                />
              </View>

              <View style={styles.miniCardTextWrap}>
                <View style={styles.nameRow}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.miniCardName,
                      {
                        color: isSelected ? walletColor : colors.textSecondary,
                      },
                    ]}
                  >
                    {wallet.name}
                  </Text>
                  {isSelected ? (
                    <View
                      style={[
                        styles.activeDot,
                        { backgroundColor: walletColor },
                      ]}
                    />
                  ) : null}
                </View>

                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  numberOfLines={1}
                  style={[
                    styles.miniCardBalance,
                    { color: colors.textPrimary },
                  ]}
                >
                  {renderBalance(wallet.currentBalanceMinor)}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {/* 3. Add Account Mini Card */}
        {onAddWalletPress ? (
          <Pressable
            accessibilityLabel={t.home.addWalletAccessibility}
            accessibilityRole="button"
            onPress={onAddWalletPress}
            style={({ pressed }) => [
              styles.miniCard,
              styles.addMiniCard,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
              pressed ? { opacity: 0.75 } : null,
            ]}
          >
            <View
              style={[
                styles.addIconBadge,
                {
                  backgroundColor: isDark
                    ? colors.surface
                    : colors.primaryLight,
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name="plus"
                size={18}
              />
            </View>
            <Text style={[styles.addCardText, { color: colors.textSecondary }]}>
              {t.home.addShort}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  activeDot: {
    borderRadius: radius.pill,
    height: 6,
    width: 6,
  },
  addCardText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  addIconBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  addMiniCard: {
    borderStyle: 'dashed',
    justifyContent: 'center',
    minWidth: 105,
    paddingHorizontal: spacing.sm,
  },
  cardActiveGlow: {
    elevation: 3,
    shadowColor: fixedSemanticColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  container: {
    marginBottom: spacing.xs,
  },
  eyeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  manageHeaderBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 1,
    paddingVertical: 2,
  },
  manageHeaderText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  miniCard: {
    alignItems: 'center',
    borderRadius: radius.md + 2,
    borderWidth: 1.2,
    elevation: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 64,
    minWidth: 155,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    shadowColor: fixedSemanticColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  miniCardBalance: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.1,
    marginTop: 2,
  },
  miniCardName: {
    ...typography.metadata,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  miniCardTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  resetFilterBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  resetFilterText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  scrollList: {
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
  },
  sectionTitle: {
    ...typography.metadata,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  titleGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  walletsCount: {
    ...typography.metadata,
    fontSize: 12,
  },
});
