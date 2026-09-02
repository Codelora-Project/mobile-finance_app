import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  Transaction,
  TransactionClaimMembership,
} from '@/features/transactions/transaction-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type DetailActionBarProps = {
  claimMembership: TransactionClaimMembership | null;
  language: 'id' | 'en';
  onShareSlip: () => void;
  t: TranslationSchema;
  transaction: Transaction;
};

export const DetailActionBar = memo(function DetailActionBar({
  claimMembership,
  onShareSlip,
  t,
  transaction,
}: DetailActionBarProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const isLockedByClaim =
    claimMembership && claimMembership.claimStatus !== 'draft';

  const shareLabel = transaction.receipt
    ? t.transactions.shareReceipt
    : t.transactions.shareSlip;

  return (
    <View style={styles.container}>
      {/* Locked Notice when part of submitted claim */}
      {isLockedByClaim ? (
        <View
          style={[
            styles.lockedBanner,
            {
              backgroundColor: colors.warningBackground,
              borderColor: colors.warning,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={colors.warning}
            name="lock-outline"
            size={18}
          />
          <Text style={[styles.lockedBannerText, { color: colors.warning }]}>
            {t.transactions.lockedByClaimDetail
              .replace('{title}', claimMembership.claimTitle)
              .replace('{status}', claimMembership.claimStatus)}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.actionFooter,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        {/* Edit Button (hidden if locked) */}
        {!isLockedByClaim ? (
          <Pressable
            accessibilityLabel={t.transactions.editTransactionAccessibility}
            accessibilityRole="button"
            onPress={() => router.push(`/transactions/${transaction.id}/edit`)}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : '#F1F5F9',
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name="pencil-outline"
              size={18}
            />
            <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>
              {t.common.edit}
            </Text>
          </Pressable>
        ) : null}

        {/* Share Slip Button */}
        <Pressable
          accessibilityLabel={shareLabel}
          accessibilityRole="button"
          onPress={onShareSlip}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.shareBtn,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color="#FFFFFF"
            name="share-variant-outline"
            size={18}
          />
          <Text style={[styles.actionBtnText, styles.shareBtnText]}>
            {shareLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

export { DetailActionBar as TransactionDetailActionBar };

const styles = StyleSheet.create({
  actionBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionBtnText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  actionFooter: {
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  container: {
    gap: spacing.sm,
  },
  lockedBanner: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.sm + 2,
  },
  lockedBannerText: {
    ...typography.metadata,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  shareBtn: {
    borderColor: 'transparent',
  },
  shareBtnText: {
    color: '#FFFFFF',
  },
});
