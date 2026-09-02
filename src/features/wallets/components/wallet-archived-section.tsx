import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Wallet } from '@/features/wallets/wallet-types';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type WalletArchivedSectionProps = {
  archivedWallets: readonly Wallet[];
  currencyCode: string;
  language: 'id' | 'en';
  onUnarchive: (wallet: Wallet) => void;
};

export const WalletArchivedSection = memo(function WalletArchivedSection({
  archivedWallets,
  currencyCode,
  onUnarchive,
}: WalletArchivedSectionProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  if (archivedWallets.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t.wallets.archivedCount.replace(
          '{count}',
          String(archivedWallets.length),
        )}
      </Text>

      <View
        style={[
          styles.archivedCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {archivedWallets.map((wallet, index) => (
          <View
            key={wallet.id}
            style={[
              styles.archivedRow,
              index < archivedWallets.length - 1
                ? [
                    styles.rowBorder,
                    {
                      borderBottomColor: colors.pressedOverlay,
                    },
                  ]
                : null,
            ]}
          >
            <View style={styles.archivedMetaCol}>
              <Text
                style={[styles.archivedName, { color: colors.textPrimary }]}
              >
                {wallet.name}
              </Text>
              <Text
                style={[
                  styles.archivedBalance,
                  { color: colors.textSecondary },
                ]}
              >
                {formatMoney(wallet.currentBalanceMinor, currencyCode)}
              </Text>
            </View>

            <Pressable
              accessibilityLabel={t.wallets.unarchiveWallet}
              accessibilityRole="button"
              onPress={() => onUnarchive(wallet)}
              style={({ pressed }) => [
                styles.unarchiveBtn,
                {
                  backgroundColor: isDark
                    ? colors.primaryOverlay
                    : colors.primaryLight,
                },
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name="restore"
                size={15}
              />
              <Text
                style={[styles.unarchiveBtnText, { color: colors.primary }]}
              >
                {t.wallets.unarchiveWallet}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  archivedBalance: {
    ...typography.metadata,
    fontSize: 12,
    marginTop: 2,
  },
  archivedCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  archivedMetaCol: {
    flex: 1,
  },
  archivedName: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
  },
  archivedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  container: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  rowBorder: {
    borderBottomWidth: 1,
  },
  sectionTitle: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xs,
    textTransform: 'uppercase',
  },
  unarchiveBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  unarchiveBtnText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
});
