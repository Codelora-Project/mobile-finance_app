import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Wallet, WalletSummary } from '@/features/accounts/account-types';
import type { Language } from '@/lib/i18n/translations';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
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
  language,
  onAddWalletPress,
  onSelectWallet,
  selectedWalletId,
  walletSummary,
}: HomeWalletCarouselProps) {
  const { colors, isDark } = useTheme();

  const isAllSelected = selectedWalletId === null;
  const totalNetWorth = walletSummary?.totalNetWorthMinor ?? 0;
  const operationalCash = walletSummary?.operationalCashMinor ?? 0;
  const trackingAssets = walletSummary?.trackingAssetsMinor ?? 0;
  const wallets = walletSummary?.wallets ?? [];

  return (
    <View style={styles.container}>
      {/* Header Section with Title & Active Filter Badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <MaterialCommunityIcons
            color={colors.primary}
            name="wallet-outline"
            size={18}
          />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {language === 'id' ? 'Dompet & Saldo' : 'Wallets & Balance'}
          </Text>
        </View>

        {selectedWalletId !== null ? (
          <Pressable
            accessibilityLabel="Reset filter dompet ke Semua"
            accessibilityRole="button"
            onPress={() => onSelectWallet(null)}
            style={({ pressed }) => [
              styles.resetFilterBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(37, 99, 235, 0.2)'
                  : '#EFF6FF',
                borderColor: colors.primary,
              },
              pressed ? { opacity: 0.75 } : null,
            ]}
          >
            <Text style={[styles.resetFilterText, { color: colors.primary }]}>
              {language === 'id' ? 'Tampilkan Semua' : 'Show All'}
            </Text>
            <MaterialCommunityIcons
              color={colors.primary}
              name="close-circle-outline"
              size={14}
            />
          </Pressable>
        ) : onAddWalletPress ? (
          <Pressable
            accessibilityLabel={
              language === 'id' ? 'Kelola Dompet' : 'Manage Wallets'
            }
            accessibilityRole="button"
            onPress={onAddWalletPress}
            style={styles.manageHeaderBtn}
          >
            <Text style={[styles.manageHeaderText, { color: colors.primary }]}>
              {language === 'id' ? 'Kelola' : 'Manage'}
            </Text>
            <MaterialCommunityIcons
              color={colors.primary}
              name="chevron-right"
              size={16}
            />
          </Pressable>
        ) : (
          <Text style={[styles.walletsCount, { color: colors.textMuted }]}>
            {wallets.length}{' '}
            {language === 'id' ? 'Akun Aktif' : 'Active Accounts'}
          </Text>
        )}
      </View>

      {/* Horizontal Carousel */}
      <ScrollView
        contentContainerStyle={styles.scrollList}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {/* 1. All Wallets / Net Worth Card */}
        <Pressable
          accessibilityLabel="Semua Dompet, Total Kekayaan"
          accessibilityRole="button"
          onPress={() => onSelectWallet(null)}
          style={({ pressed }) => [
            styles.card,
            styles.netWorthCard,
            {
              backgroundColor: isAllSelected
                ? isDark
                  ? '#1E293B'
                  : '#1E3A8A'
                : isDark
                ? colors.surface
                : '#F8FAFC',
              borderColor: isAllSelected ? colors.primary : colors.border,
            },
            isAllSelected ? styles.cardActiveGlow : null,
            pressed ? { opacity: 0.85 } : null,
          ]}
        >
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isAllSelected
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(37, 99, 235, 0.15)',
                },
              ]}
            >
              <MaterialCommunityIcons
                color={isAllSelected ? '#FFFFFF' : colors.primary}
                name="bank"
                size={20}
              />
            </View>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: isAllSelected
                    ? 'rgba(255, 255, 255, 0.25)'
                    : isDark
                    ? '#334155'
                    : '#E2E8F0',
                },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: isAllSelected ? '#FFFFFF' : colors.textMuted },
                ]}
              >
                {language === 'id' ? 'Semua Akun' : 'All Accounts'}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text
              style={[
                styles.cardLabel,
                {
                  color: isAllSelected
                    ? 'rgba(255, 255, 255, 0.8)'
                    : colors.textMuted,
                },
              ]}
            >
              {language === 'id' ? 'Total Kekayaan' : 'Total Net Worth'}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              numberOfLines={1}
              style={[
                styles.cardBalance,
                { color: isAllSelected ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              {formatMoney(totalNetWorth, currencyCode)}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <Text
              numberOfLines={1}
              style={[
                styles.breakdownText,
                {
                  color: isAllSelected
                    ? 'rgba(255, 255, 255, 0.7)'
                    : colors.textSecondary,
                },
              ]}
            >
              {language === 'id'
                ? `Kas: ${formatMoney(operationalCash, currencyCode)}`
                : `Cash: ${formatMoney(operationalCash, currencyCode)}`}
              {trackingAssets > 0
                ? ` · ${language === 'id' ? 'Aset' : 'Assets'}: ${formatMoney(trackingAssets, currencyCode)}`
                : ''}
            </Text>
          </View>
        </Pressable>

        {/* 2. Individual Wallet Cards */}
        {wallets.map((wallet) => {
          const isSelected = selectedWalletId === wallet.id;
          const walletColor = wallet.color || colors.primary;

          return (
            <Pressable
              accessibilityLabel={`${wallet.name}, Saldo ${formatMoney(wallet.currentBalanceMinor, currencyCode)}`}
              accessibilityRole="button"
              key={wallet.id}
              onPress={() => onSelectWallet(wallet.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? 'rgba(37, 99, 235, 0.18)'
                      : '#EFF6FF'
                    : colors.surface,
                  borderColor: isSelected ? walletColor : colors.border,
                },
                isSelected ? styles.cardActiveGlow : null,
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <View style={styles.cardTopRow}>
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: isDark
                        ? `${walletColor}25`
                        : `${walletColor}15`,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={walletColor}
                    name={
                      (wallet.iconKey as any) ||
                      (wallet.accountType === 'bank'
                        ? 'bank'
                        : wallet.accountType === 'ewallet'
                        ? 'cellphone'
                        : wallet.accountType === 'investment'
                        ? 'trending-up'
                        : 'wallet')
                    }
                    size={20}
                  />
                </View>

                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor: wallet.includeInCashflow
                        ? isDark
                          ? 'rgba(16, 185, 129, 0.2)'
                          : '#DCFCE7'
                        : isDark
                        ? '#334155'
                        : '#E2E8F0',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      {
                        color: wallet.includeInCashflow
                          ? '#10B981'
                          : colors.textMuted,
                      },
                    ]}
                  >
                    {wallet.includeInCashflow
                      ? language === 'id'
                        ? 'Kas'
                        : 'Cashflow'
                      : language === 'id'
                      ? 'Aset'
                      : 'Asset'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text
                  numberOfLines={1}
                  style={[styles.walletCardName, { color: colors.textPrimary }]}
                >
                  {wallet.name}
                </Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  numberOfLines={1}
                  style={[styles.cardBalance, { color: colors.textPrimary }]}
                >
                  {formatMoney(wallet.currentBalanceMinor, currencyCode)}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text
                  numberOfLines={1}
                  style={[styles.accountTypeLabel, { color: colors.textMuted }]}
                >
                  {wallet.accountNumber
                    ? `•••• ${wallet.accountNumber.slice(-4)}`
                    : wallet.accountType.toUpperCase()}
                </Text>
                {isSelected ? (
                  <View
                    style={[
                      styles.activeIndicator,
                      { backgroundColor: walletColor },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color="#FFFFFF"
                      name="check"
                      size={12}
                    />
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}

        {/* Add Account Card */}
        {onAddWalletPress ? (
          <Pressable
            accessibilityLabel={
              language === 'id' ? 'Tambah Akun / Dompet Baru' : 'Add New Wallet'
            }
            accessibilityRole="button"
            onPress={onAddWalletPress}
            style={({ pressed }) => [
              styles.card,
              styles.addCard,
              {
                backgroundColor: isDark
                  ? colors.surfaceSecondary
                  : '#F8FAFC',
                borderColor: colors.border,
              },
              pressed ? { opacity: 0.75 } : null,
            ]}
          >
            <View
              style={[
                styles.addIconCircle,
                { backgroundColor: isDark ? colors.surface : '#EFF6FF' },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name="plus"
                size={22}
              />
            </View>
            <Text
              style={[styles.addCardText, { color: colors.textPrimary }]}
            >
              {language === 'id' ? 'Tambah Akun' : 'Add Account'}
            </Text>
            <Text
              style={[styles.addCardSubtext, { color: colors.textMuted }]}
            >
              {language === 'id'
                ? 'Bank, E-Wallet, dll'
                : 'Bank, E-Wallet, etc'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  accountTypeLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  activeIndicator: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  addCard: {
    alignItems: 'center',
    borderStyle: 'dashed',
    justifyContent: 'center',
    width: 140,
  },
  addCardSubtext: {
    ...typography.metadata,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  addCardText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  addIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  breakdownText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '500',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    elevation: 2,
    height: 138,
    justifyContent: 'space-between',
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    width: 190,
  },
  cardActiveGlow: {
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  cardBody: {
    justifyContent: 'center',
    marginVertical: 4,
  },
  cardBalance: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  container: {
    marginBottom: spacing.xs,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  manageHeaderBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    paddingVertical: 2,
  },
  manageHeaderText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  netWorthCard: {
    width: 210,
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
    gap: spacing.sm,
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
  titleWithIcon: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  typeBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '700',
  },
  walletCardName: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  walletsCount: {
    ...typography.metadata,
    fontSize: 12,
  },
});
