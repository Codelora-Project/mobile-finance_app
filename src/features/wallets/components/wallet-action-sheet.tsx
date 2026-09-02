import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

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

export type WalletActionSheetProps = {
  currencyCode: string;
  language: 'id' | 'en';
  onArchive: (wallet: Wallet) => void;
  onClose: () => void;
  onEdit: (wallet: Wallet) => void;
  onReconcile: (wallet: Wallet) => void;
  onTransfer?: (wallet: Wallet) => void;
  visible: boolean;
  wallet: Wallet | null;
};

export const WalletActionSheet = memo(function WalletActionSheet({
  currencyCode,
  onArchive,
  onClose,
  onEdit,
  onReconcile,
  onTransfer,
  visible,
  wallet,
}: WalletActionSheetProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  if (!wallet) return null;

  const brandColor = getWalletBrandColor(wallet);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: isDark ? '#27272A' : '#E2E8F0',
            },
          ]}
        >
          {/* Header Card */}
          <View style={styles.headerRow}>
            <View
              style={[
                styles.walletIconBox,
                {
                  backgroundColor: isDark
                    ? `${brandColor}24`
                    : `${brandColor}14`,
                  borderColor: isDark ? `${brandColor}44` : `${brandColor}28`,
                },
              ]}
            >
              <MaterialCommunityIcons
                color={brandColor}
                name={getWalletIconName(wallet)}
                size={26}
              />
            </View>

            <View style={styles.walletMeta}>
              <Text
                numberOfLines={1}
                style={[styles.walletTitle, { color: colors.textPrimary }]}
              >
                {wallet.name}
              </Text>
              <Text
                style={[styles.walletBalance, { color: colors.textPrimary }]}
              >
                {formatMoney(wallet.currentBalanceMinor, currencyCode)}
              </Text>
            </View>

            <Pressable
              accessibilityLabel={t.common.close}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="close"
                size={18}
              />
            </Pressable>
          </View>

          {/* Divider */}
          <View
            style={[
              styles.divider,
              { backgroundColor: isDark ? '#27272A' : '#F1F5F9' },
            ]}
          />

          {/* Action List */}
          <View style={styles.actionsList}>
            {/* 1. Reconcile Balance */}
            <Pressable
              accessibilityLabel={t.wallets.reconcileAccessibility.replace(
                '{name}',
                wallet.name,
              )}
              accessibilityRole="button"
              onPress={() => onReconcile(wallet)}
              style={({ pressed }) => [
                styles.actionRow,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <View
                style={[
                  styles.actionIconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(59, 130, 246, 0.16)'
                      : colors.primaryLight,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="tune-vertical"
                  size={18}
                />
              </View>
              <View style={styles.actionTextCol}>
                <Text
                  style={[styles.actionTitle, { color: colors.textPrimary }]}
                >
                  {t.wallets.reconcileTitle}
                </Text>
                <Text
                  style={[styles.actionDesc, { color: colors.textSecondary }]}
                >
                  {t.wallets.reconcileSubtitle}
                </Text>
              </View>
              <MaterialCommunityIcons
                color={colors.textMuted}
                name="chevron-right"
                size={20}
              />
            </Pressable>

            {/* 2. Quick Transfer */}
            {onTransfer ? (
              <Pressable
                accessibilityLabel={t.wallets.transferFromAccessibility.replace(
                  '{name}',
                  wallet.name,
                )}
                accessibilityRole="button"
                onPress={() => onTransfer(wallet)}
                style={({ pressed }) => [
                  styles.actionRow,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F8FAFC',
                  },
                  pressed ? styles.pressed : null,
                ]}
              >
                <View
                  style={[
                    styles.actionIconBox,
                    {
                      backgroundColor: isDark
                        ? 'rgba(74, 222, 128, 0.16)'
                        : '#DCFCE7',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.positive}
                    name="swap-horizontal"
                    size={18}
                  />
                </View>
                <View style={styles.actionTextCol}>
                  <Text
                    style={[styles.actionTitle, { color: colors.textPrimary }]}
                  >
                    {t.wallets.transferToOther}
                  </Text>
                  <Text
                    style={[styles.actionDesc, { color: colors.textSecondary }]}
                  >
                    {t.wallets.transferToOtherDescription}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  color={colors.textMuted}
                  name="chevron-right"
                  size={20}
                />
              </Pressable>
            ) : null}

            {/* 3. Edit Wallet */}
            <Pressable
              accessibilityLabel={t.common.edit}
              accessibilityRole="button"
              onPress={() => onEdit(wallet)}
              style={({ pressed }) => [
                styles.actionRow,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <View
                style={[
                  styles.actionIconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : '#F1F5F9',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textPrimary}
                  name="pencil-outline"
                  size={18}
                />
              </View>
              <View style={styles.actionTextCol}>
                <Text
                  style={[styles.actionTitle, { color: colors.textPrimary }]}
                >
                  {t.wallets.editInformation}
                </Text>
                <Text
                  style={[styles.actionDesc, { color: colors.textSecondary }]}
                >
                  {t.wallets.editInformationDescription}
                </Text>
              </View>
              <MaterialCommunityIcons
                color={colors.textMuted}
                name="chevron-right"
                size={20}
              />
            </Pressable>

            {/* 4. Archive Wallet */}
            <Pressable
              accessibilityLabel={t.wallets.archiveAction}
              accessibilityRole="button"
              onPress={() => onArchive(wallet)}
              style={({ pressed }) => [
                styles.actionRow,
                {
                  backgroundColor: isDark
                    ? 'rgba(251, 113, 133, 0.06)'
                    : '#FEF2F2',
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <View
                style={[
                  styles.actionIconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(251, 113, 133, 0.16)'
                      : '#FEE2E2',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.destructive}
                  name="archive-outline"
                  size={18}
                />
              </View>
              <View style={styles.actionTextCol}>
                <Text
                  style={[styles.actionTitle, { color: colors.destructive }]}
                >
                  {t.wallets.archiveWallet}
                </Text>
                <Text
                  style={[styles.actionDesc, { color: colors.textSecondary }]}
                >
                  {t.wallets.archiveDescription}
                </Text>
              </View>
              <MaterialCommunityIcons
                color={colors.textMuted}
                name="chevron-right"
                size={20}
              />
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  actionDesc: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  actionIconBox: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  actionRow: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    padding: spacing.md,
  },
  actionTextCol: {
    flex: 1,
    gap: 1,
  },
  actionTitle: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  actionsList: {
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  closeBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  divider: {
    height: 1,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  sheetContainer: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    paddingBottom: spacing.xl,
  },
  walletBalance: {
    ...typography.sectionTitle,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  walletIconBox: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  walletMeta: {
    flex: 1,
    gap: 2,
  },
  walletTitle: {
    ...typography.metadata,
    fontSize: 13,
    fontWeight: '600',
  },
});
