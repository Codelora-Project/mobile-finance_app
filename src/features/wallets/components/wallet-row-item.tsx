import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Wallet } from '@/features/wallets/wallet-types';
import {
  getWalletBrandColor,
  getWalletIconName,
} from '@/features/wallets/wallet-icons';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type WalletRowItemProps = {
  currencyCode: string;
  hideBalance?: boolean;
  isLast?: boolean;
  language: 'id' | 'en';
  onArchive?: (wallet: Wallet) => void;
  onEdit?: (wallet: Wallet) => void;
  onPress?: (wallet: Wallet) => void;
  onReconcile?: (wallet: Wallet) => void;
  wallet: Wallet;
};

export const WalletRowItem = memo(function WalletRowItem({
  currencyCode,
  hideBalance = false,
  isLast = false,
  onPress,
  wallet,
}: WalletRowItemProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const brandColor = getWalletBrandColor(wallet);

  const formattedBalance = hideBalance
    ? '••••••'
    : formatMoney(wallet.currentBalanceMinor, currencyCode);

  function getAccountTypeLabel() {
    if (wallet.accountNumber) {
      return `•••• ${wallet.accountNumber.slice(-4)}`;
    }
    switch (wallet.accountType) {
      case 'bank':
        return t.wallets.typeBank;
      case 'cash':
        return t.wallets.typeCash;
      case 'ewallet':
        return t.wallets.typeEwallet;
      case 'investment':
        return t.wallets.typeInvestment;
      case 'credit_card':
        return t.wallets.typeCreditCard;
      default:
        return t.wallets.typeFinancial;
    }
  }

  return (
    <Pressable
      accessibilityLabel={`${wallet.name}, ${formattedBalance}`}
      accessibilityRole="button"
      onPress={() => onPress?.(wallet)}
      style={({ pressed }) => [
        styles.walletCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
        pressed ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.cardMainRow}>
        {/* Wallet Squircle Icon with Brand Accent */}
        <View
          style={[
            styles.walletIconBox,
            {
              backgroundColor: isDark ? `${brandColor}24` : `${brandColor}14`,
              borderColor: isDark ? `${brandColor}44` : `${brandColor}28`,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={brandColor}
            name={getWalletIconName(wallet)}
            size={24}
          />
        </View>

        {/* Name & Subtitle */}
        <View style={styles.walletMetaCol}>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={1}
              style={[styles.walletName, { color: colors.textPrimary }]}
            >
              {wallet.name}
            </Text>
            {wallet.isDefault ? (
              <View
                style={[
                  styles.badgePill,
                  {
                    backgroundColor: isDark
                      ? colors.primaryOverlay
                      : colors.primaryLight,
                    borderColor: isDark
                      ? colors.primaryOverlayStrong
                      : colors.primaryOverlay,
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {t.wallets.defaultBadge}
                </Text>
              </View>
            ) : !wallet.includeInCashflow ? (
              <View
                style={[
                  styles.badgePill,
                  {
                    backgroundColor: isDark
                      ? colors.raisedOverlay
                      : colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.badgeText, { color: colors.textSecondary }]}
                >
                  {t.wallets.trackedAssetBadge}
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            numberOfLines={1}
            style={[styles.walletSubtitle, { color: colors.textSecondary }]}
          >
            {getAccountTypeLabel()}
          </Text>
        </View>

        {/* Balance & Subtle Chevron */}
        <View style={styles.rightCol}>
          <Text style={[styles.walletBalance, { color: colors.textPrimary }]}>
            {formattedBalance}
          </Text>
          <MaterialCommunityIcons
            color={colors.textMuted}
            name="chevron-right"
            size={18}
          />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  badgePill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '800',
  },
  cardMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rightCol: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 4,
  },
  walletBalance: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  walletCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  walletIconBox: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  walletMetaCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  walletName: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
  },
  walletSubtitle: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '500',
  },
});
