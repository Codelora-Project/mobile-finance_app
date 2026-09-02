import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  ClaimStatus,
  ClaimSummary,
} from '@/features/claims/claim-repository';
import { formatMoney } from '@/lib/money';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { spacing } from '@/theme/spacing';

export type ClaimListRowItemProps = {
  claim: ClaimSummary;
  onPress: (id: number) => void;
};

export const ClaimListRowItem = memo(function ClaimListRowItem({
  claim,
  onPress,
}: ClaimListRowItemProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const status = {
    draft: t.claims.statusDraft,
    rejected: t.claims.statusRejected,
    reimbursed: t.claims.statusReimbursed,
    submitted: t.claims.statusSubmitted,
  } satisfies Record<ClaimStatus, string>;
  const statusText = status[claim.status];

  return (
    <Pressable
      accessibilityLabel={`${claim.title}, ${statusText}`}
      accessibilityRole="button"
      onPress={() => onPress(claim.id)}
      style={({ pressed }) => [
        styles.claimRow,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.rowText}>
        <Text
          numberOfLines={1}
          style={[styles.rowTitle, { color: colors.textPrimary }]}
        >
          {claim.title}
        </Text>
        <Text style={[styles.rowMetadata, { color: colors.textSecondary }]}>
          {statusText} ·{' '}
          {t.claims.itemCount.replace('{count}', String(claim.itemCount))}
        </Text>
      </View>
      <Text style={[styles.amount, { color: colors.textPrimary }]}>
        {formatMoney(claim.totalMinor, claim.currencyCode ?? 'IDR')}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  claimRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
  rowMetadata: {
    fontSize: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
    marginRight: spacing.md,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
});
