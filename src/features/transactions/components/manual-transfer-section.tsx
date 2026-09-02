import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Category } from '@/features/categories/category-repository';
import type { SelectedReference } from '@/features/transactions/hooks/use-manual-transaction-view-model';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ManualTransferSectionProps = {
  currencySymbol: string;
  destinationWallet: SelectedReference | null;
  errorDestination?: string;
  errorFeeAmount?: string;
  errorSource?: string;
  hasTransferFee: boolean;
  onOpenDestinationPicker: () => void;
  onOpenFeeCategoryPicker: () => void;
  onOpenSourcePicker: () => void;
  onSetQuickFee: (amount: string) => void;
  onSwapWallets: () => void;
  onToggleTransferFee: (enabled: boolean) => void;
  sourceWallet: SelectedReference | null;
  t: TranslationSchema;
  transferFeeAmount: string;
  transferFeeCategory: Category | null;
  transferFeeNote: string;
  onChangeFeeAmount: (text: string) => void;
  onChangeFeeNote: (text: string) => void;
};

export const ManualTransferSection = memo(function ManualTransferSection({
  currencySymbol,
  destinationWallet,
  errorDestination,
  errorFeeAmount,
  errorSource,
  hasTransferFee,
  onOpenDestinationPicker,
  onOpenFeeCategoryPicker,
  onOpenSourcePicker,
  onSetQuickFee,
  onSwapWallets,
  onToggleTransferFee,
  sourceWallet,
  t,
  transferFeeAmount,
  transferFeeCategory,
  transferFeeNote,
  onChangeFeeAmount,
  onChangeFeeNote,
}: ManualTransferSectionProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      {/* 1. SOURCE & DESTINATION WALLETS CONTAINER */}
      <View
        style={[
          styles.walletsCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Source Wallet (Dari) */}
        <View style={styles.walletField}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            {t.transactions.transferFrom}
          </Text>
          <Pressable
            accessibilityLabel={t.transactions.transferFrom}
            accessibilityRole="button"
            onPress={onOpenSourcePicker}
            style={({ pressed }) => [
              styles.walletPickerBtn,
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                borderColor: errorSource ? colors.destructive : colors.border,
              },
              pressed ? { opacity: 0.75 } : null,
            ]}
          >
            <View
              style={[
                styles.walletIconBadge,
                {
                  backgroundColor: sourceWallet
                    ? 'rgba(37, 99, 235, 0.15)'
                    : isDark
                      ? colors.surfaceSecondary
                      : '#E2E8F0',
                },
              ]}
            >
              <MaterialCommunityIcons
                color={sourceWallet ? colors.primary : colors.textMuted}
                name="wallet-outline"
                size={20}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.walletPickerText,
                { color: sourceWallet ? colors.textPrimary : colors.textMuted },
              ]}
            >
              {sourceWallet?.name || t.transactions.selectSourceWallet}
            </Text>
            <MaterialCommunityIcons
              color={colors.textMuted}
              name="chevron-down"
              size={20}
            />
          </Pressable>
          {errorSource ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {errorSource}
            </Text>
          ) : null}
        </View>

        {/* Swap / Flow Indicator */}
        <View style={styles.flowConnector}>
          <View style={[styles.flowLine, { backgroundColor: colors.border }]} />
          <Pressable
            accessibilityLabel={t.transactions.swapWallets}
            accessibilityRole="button"
            onPress={onSwapWallets}
            style={({ pressed }) => [
              styles.swapButton,
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#EFF6FF',
                borderColor: colors.primary,
              },
              pressed ? { transform: [{ scale: 0.92 }] } : null,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.primary}
              name="swap-vertical"
              size={20}
            />
          </Pressable>
          <View style={[styles.flowLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Destination Wallet (Ke) */}
        <View style={styles.walletField}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            {t.transactions.transferTo}
          </Text>
          <Pressable
            accessibilityLabel={t.transactions.transferTo}
            accessibilityRole="button"
            onPress={onOpenDestinationPicker}
            style={({ pressed }) => [
              styles.walletPickerBtn,
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                borderColor: errorDestination
                  ? colors.destructive
                  : colors.border,
              },
              pressed ? { opacity: 0.75 } : null,
            ]}
          >
            <View
              style={[
                styles.walletIconBadge,
                {
                  backgroundColor: destinationWallet
                    ? 'rgba(16, 185, 129, 0.15)'
                    : isDark
                      ? colors.surfaceSecondary
                      : '#E2E8F0',
                },
              ]}
            >
              <MaterialCommunityIcons
                color={destinationWallet ? '#10B981' : colors.textMuted}
                name="bank-transfer-in"
                size={20}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.walletPickerText,
                {
                  color: destinationWallet
                    ? colors.textPrimary
                    : colors.textMuted,
                },
              ]}
            >
              {destinationWallet?.name ||
                t.transactions.selectDestinationWallet}
            </Text>
            <MaterialCommunityIcons
              color={colors.textMuted}
              name="chevron-down"
              size={20}
            />
          </Pressable>
          {errorDestination ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {errorDestination}
            </Text>
          ) : null}
        </View>
      </View>

      {/* 2. OPTIONAL TRANSFER FEE TOGGLE CARD */}
      <View
        style={[
          styles.feeToggleCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.feeToggleHeader}>
          <View
            style={[
              styles.feeIconBadge,
              {
                backgroundColor: hasTransferFee
                  ? 'rgba(239, 68, 68, 0.15)'
                  : isDark
                    ? colors.surfaceSecondary
                    : '#E2E8F0',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={hasTransferFee ? colors.destructive : colors.textMuted}
              name="tag-outline"
              size={20}
            />
          </View>
          <View style={styles.feeToggleTitles}>
            <Text
              style={[styles.feeToggleTitle, { color: colors.textPrimary }]}
            >
              {t.transactions.transferFeeToggle}
            </Text>
            <Text
              style={[styles.feeToggleSubtitle, { color: colors.textMuted }]}
            >
              {t.transactions.transferFeeSubtitle}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t.transactions.transferFeeToggle}
            onValueChange={onToggleTransferFee}
            thumbColor={hasTransferFee ? '#FFFFFF' : '#F1F5F9'}
            trackColor={{ false: '#CBD5E1', true: colors.primary }}
            value={hasTransferFee}
          />
        </View>

        {/* Expanded Fee Details when Toggle is ON */}
        {hasTransferFee ? (
          <View
            style={[
              styles.feeDetailsContainer,
              {
                borderTopColor: colors.border,
                backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
              },
            ]}
          >
            {/* Fee Amount Input */}
            <Text style={[styles.feeInputLabel, { color: colors.textMuted }]}>
              {t.transactions.transferFeeAmountPlaceholder}
            </Text>
            <View
              style={[
                styles.feeInputRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: errorFeeAmount
                    ? colors.destructive
                    : colors.border,
                },
              ]}
            >
              <Text
                style={[styles.feeCurrencyPrefix, { color: colors.textMuted }]}
              >
                {currencySymbol}
              </Text>
              <TextInput
                accessibilityLabel={t.transactions.transferFeeAmountPlaceholder}
                keyboardType="numeric"
                onChangeText={onChangeFeeAmount}
                placeholder="2500"
                placeholderTextColor={colors.textMuted}
                style={[styles.feeTextInput, { color: colors.textPrimary }]}
                value={transferFeeAmount}
              />
            </View>
            {errorFeeAmount ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {errorFeeAmount}
              </Text>
            ) : null}

            {/* Quick Fee Shortcuts */}
            <View style={styles.quickFeeChipsRow}>
              {['1000', '2500', '6500'].map((fee) => (
                <Pressable
                  key={fee}
                  onPress={() => onSetQuickFee(fee)}
                  style={({ pressed }) => [
                    styles.feeChip,
                    {
                      backgroundColor:
                        transferFeeAmount === fee
                          ? colors.primary
                          : colors.surface,
                      borderColor:
                        transferFeeAmount === fee
                          ? colors.primary
                          : colors.border,
                    },
                    pressed ? { opacity: 0.7 } : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.feeChipText,
                      {
                        color:
                          transferFeeAmount === fee
                            ? '#FFFFFF'
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    + {currencySymbol} {Number(fee).toLocaleString()}
                    {fee === '2500'
                      ? ' (BI-FAST)'
                      : fee === '6500'
                        ? ' (Online)'
                        : ''}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Fee Category Selector */}
            <View style={styles.feeCategorySection}>
              <Text style={[styles.feeInputLabel, { color: colors.textMuted }]}>
                {t.transactions.transferFeeCategoryLabel}
              </Text>
              <Pressable
                accessibilityLabel={t.transactions.transferFeeCategoryLabel}
                accessibilityRole="button"
                onPress={onOpenFeeCategoryPicker}
                style={({ pressed }) => [
                  styles.feeCategoryBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  pressed ? { opacity: 0.75 } : null,
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="tag-outline"
                  size={18}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.feeCategoryText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {transferFeeCategory?.name ||
                    t.transactions.transferFeeCategory}
                </Text>
                <MaterialCommunityIcons
                  color={colors.textMuted}
                  name="chevron-right"
                  size={18}
                />
              </Pressable>
            </View>

            {/* Fee Note Input */}
            <View style={styles.feeNoteSection}>
              <TextInput
                accessibilityLabel={t.transactions.transferFeeNotePlaceholder}
                onChangeText={onChangeFeeNote}
                placeholder={t.transactions.transferFeeNotePlaceholder}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.feeNoteInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={transferFeeNote}
              />
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.metadata,
    fontSize: 12,
    marginTop: 4,
  },
  feeCategoryBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  feeCategorySection: {
    marginTop: spacing.sm,
  },
  feeCategoryText: {
    ...typography.secondary,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  feeChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
  },
  feeChipText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  feeCurrencyPrefix: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
  },
  feeDetailsContainer: {
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    borderTopWidth: 1,
    padding: spacing.md,
  },
  feeIconBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  feeInputLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  feeInputRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  feeNoteInput: {
    ...typography.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 13,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feeNoteSection: {
    marginTop: spacing.sm,
  },
  feeTextInput: {
    ...typography.body,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: spacing.xs,
  },
  feeToggleCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  feeToggleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  feeToggleSubtitle: {
    ...typography.metadata,
    fontSize: 12,
    marginTop: 2,
  },
  feeToggleTitle: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
  },
  feeToggleTitles: {
    flex: 1,
  },
  fieldLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  flowConnector: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  flowLine: {
    flex: 1,
    height: 1,
  },
  quickFeeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  swapButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  walletField: {
    flex: 1,
  },
  walletIconBadge: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  walletPickerBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  walletPickerText: {
    ...typography.secondary,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  walletsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
});
