import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Wallet } from '@/features/wallets/wallet-types';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type WalletRowItemProps = {
  currencyCode: string;
  isLast?: boolean;
  language: 'id' | 'en';
  onArchive: (wallet: Wallet) => void;
  onEdit: (wallet: Wallet) => void;
  onReconcile: (wallet: Wallet) => void;
  wallet: Wallet;
};

export const WalletRowItem = memo(function WalletRowItem({
  currencyCode,
  isLast = false,
  language,
  onArchive,
  onEdit,
  onReconcile,
  wallet,
}: WalletRowItemProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.walletCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.cardMainRow}>
        {/* Wallet Icon */}
        <View
          style={[
            styles.walletIconBox,
            {
              backgroundColor: isDark
                ? `${wallet.color || colors.primary}22`
                : `${wallet.color || colors.primary}15`,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={wallet.color || colors.primary}
            name={
              (wallet.iconKey || 'wallet') as React.ComponentProps<
                typeof MaterialCommunityIcons
              >['name']
            }
            size={22}
          />
        </View>

        {/* Name & Type */}
        <View style={styles.walletMetaCol}>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={1}
              style={[styles.walletName, { color: colors.textPrimary }]}
            >
              {wallet.name}
            </Text>
            {!wallet.includeInCashflow ? (
              <View
                style={[
                  styles.badgePill,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : '#F1F5F9',
                  },
                ]}
              >
                <Text
                  style={[styles.badgeText, { color: colors.textSecondary }]}
                >
                  {language === 'id' ? 'Aset Tracking' : 'Tracked Asset'}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.walletBalance, { color: colors.textPrimary }]}>
            {formatMoney(wallet.currentBalanceMinor, currencyCode)}
          </Text>
        </View>
      </View>

      {/* Action Buttons Row */}
      <View
        style={[
          styles.actionButtonsRow,
          {
            borderTopColor: isDark
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(0, 0, 0, 0.05)',
          },
        ]}
      >
        <Pressable
          accessibilityLabel={
            language === 'id'
              ? `Rekonsiliasi saldo ${wallet.name}`
              : `Reconcile balance ${wallet.name}`
          }
          accessibilityRole="button"
          onPress={() => onReconcile(wallet)}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons
            color={colors.primary}
            name="tune-vertical"
            size={16}
          />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>
            {language === 'id' ? 'Sesuaikan Saldo' : 'Reconcile'}
          </Text>
        </Pressable>

        <View style={styles.actionDivider} />

        <Pressable
          accessibilityLabel={language === 'id' ? 'Ubah' : 'Edit'}
          accessibilityRole="button"
          onPress={() => onEdit(wallet)}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons
            color={colors.textSecondary}
            name="pencil-outline"
            size={16}
          />
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>
            {language === 'id' ? 'Ubah' : 'Edit'}
          </Text>
        </Pressable>

        <View style={styles.actionDivider} />

        <Pressable
          accessibilityLabel={language === 'id' ? 'Arsipkan' : 'Archive'}
          accessibilityRole="button"
          onPress={() => onArchive(wallet)}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons
            color={colors.destructive}
            name="archive-outline"
            size={16}
          />
          <Text style={[styles.actionBtnText, { color: colors.destructive }]}>
            {language === 'id' ? 'Arsipkan' : 'Archive'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  actionBtn: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 9,
  },
  actionBtnText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonsRow: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionDivider: {
    width: 1,
  },
  badgePill: {
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '600',
  },
  cardMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
    padding: spacing.md,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  walletBalance: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  walletCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  walletIconBox: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  walletMetaCol: {
    flex: 1,
  },
  walletName: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '700',
  },
});
