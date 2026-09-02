import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Transaction } from '@/features/transactions/transaction-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type DetailReceiptCardProps = {
  language?: 'id' | 'en';
  t: TranslationSchema;
  transaction: Transaction;
};

export const DetailReceiptCard = memo(function DetailReceiptCard({
  t,
  transaction,
}: DetailReceiptCardProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  if (!transaction.receipt) return null;

  return (
    <View
      style={[
        styles.receiptCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.receiptHeaderRow}>
        <View
          style={[
            styles.receiptIconCircle,
            {
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
            },
          ]}
        >
          <MaterialCommunityIcons
            color={colors.primary}
            name="receipt-text-outline"
            size={22}
          />
        </View>
        <View style={styles.receiptMetaCol}>
          <Text style={[styles.receiptTitle, { color: colors.textPrimary }]}>
            {t.receipts.proofTitle}
          </Text>
          <Text
            style={[styles.receiptSubtitle, { color: colors.textSecondary }]}
          >
            {transaction.receipt.mimeType.toUpperCase()} •{' '}
            {t.receipts.storedSafely}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityLabel={t.receipts.viewImage}
        accessibilityRole="button"
        onPress={() => router.push(`/transactions/${transaction.id}/receipt`)}
        style={({ pressed }) => [
          styles.viewReceiptButton,
          {
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
            borderColor: colors.primary,
          },
          pressed && styles.pressed,
        ]}
      >
        <MaterialCommunityIcons
          color={colors.primary}
          name="eye-outline"
          size={18}
        />
        <Text style={[styles.viewReceiptText, { color: colors.primary }]}>
          {t.receipts.viewImage}
        </Text>
      </Pressable>
    </View>
  );
});

export { DetailReceiptCard as TransactionDetailReceiptCard };

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  receiptCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm + 2,
    padding: spacing.md,
  },
  receiptHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  receiptIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  receiptMetaCol: {
    flex: 1,
    gap: 2,
  },
  receiptSubtitle: {
    ...typography.metadata,
    fontSize: 11,
  },
  receiptTitle: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  viewReceiptButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  viewReceiptText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
});
