import React, { memo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { getRecommendedShortcuts } from '@/features/settings/settings-repository';
import type { SavingsGoal } from '@/features/goals/goals-repository';
import { useCurrency } from '@/lib/currency/currency-context';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney, formatShortcutLabel } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { fixedSemanticColors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type DepositGoalModalProps = {
  depositAmount: string;
  depositError?: string | null;
  depositGoal: SavingsGoal | null;
  depositNote: string;
  onChangeAmount: (val: string) => void;
  onChangeNote: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  t: TranslationSchema;
};

export const DepositGoalModal = memo(function DepositGoalModal({
  depositAmount,
  depositError,
  depositGoal,
  depositNote,
  onChangeAmount,
  onChangeNote,
  onClose,
  onSubmit,
  saving,
  t,
}: DepositGoalModalProps) {
  const { colors, isDark } = useTheme();
  const { currencyCode, currencySymbol } = useCurrency();
  const shortcutAmounts = getRecommendedShortcuts(currencyCode).slice(-4);

  if (!depositGoal) return null;

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!saving) onClose();
      }}
      transparent
      visible={depositGoal !== null}
    >
      <Pressable
        onPress={() => {
          if (!saving) onClose();
        }}
        style={styles.depositModalOverlay}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.depositModalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[styles.depositModalTitle, { color: colors.textPrimary }]}
          >
            {t.goals.saveFor} {depositGoal.name}
          </Text>
          <Text
            style={[
              styles.depositModalSubtitle,
              { color: colors.textSecondary },
            ]}
          >
            {t.goals.target}:{' '}
            {formatMoney(depositGoal.targetAmountMinor, currencyCode)} ·{' '}
            {t.goals.saved}:{' '}
            {formatMoney(depositGoal.currentAmountMinor, currencyCode)}
          </Text>

          {depositError ? (
            <Text
              style={[styles.depositErrorText, { color: colors.destructive }]}
            >
              {depositError}
            </Text>
          ) : null}

          {/* Quick Shortcut Pills */}
          <View style={styles.depositShortcutsRow}>
            {shortcutAmounts.map((amt) => (
              <Pressable
                key={amt}
                onPress={() => onChangeAmount(String(amt))}
                style={[
                  styles.depositChip,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : colors.primaryLight,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.depositChipText, { color: colors.primary }]}
                >
                  {formatShortcutLabel(amt, currencySymbol)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View
            style={[
              styles.amountInputRow,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.amountPrefix, { color: colors.textSecondary }]}
            >
              {currencySymbol}
            </Text>
            <TextInput
              autoFocus
              keyboardType="decimal-pad"
              onChangeText={onChangeAmount}
              placeholder="100000"
              placeholderTextColor={colors.textSecondary}
              style={[styles.amountTextInput, { color: colors.textPrimary }]}
              value={depositAmount}
            />
          </View>

          <TextInput
            onChangeText={onChangeNote}
            placeholder={t.goals.depositNotePlaceholder}
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.noteInput,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            value={depositNote}
          />

          <View style={styles.depositActionsRow}>
            <View style={{ flex: 1 }}>
              <AppButton
                disabled={saving}
                label={t.common.cancel}
                onPress={onClose}
                variant="secondary"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                disabled={saving || !depositAmount}
                label={saving ? t.goals.saving : t.goals.deposit}
                loading={saving}
                onPress={onSubmit}
                variant="primary"
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  amountInputRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  amountPrefix: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
  },
  amountTextInput: {
    ...typography.displayAmount,
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    paddingVertical: spacing.sm,
  },
  depositActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  depositChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  depositChipText: {
    ...typography.metadata,
    fontWeight: '700',
  },
  depositErrorText: {
    ...typography.metadata,
    fontWeight: '600',
  },
  depositModalCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 8,
    gap: spacing.sm,
    maxWidth: 380,
    padding: spacing.lg,
    width: '100%',
  },
  depositModalOverlay: {
    alignItems: 'center',
    backgroundColor: fixedSemanticColors.modalBackdrop,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  depositModalSubtitle: {
    ...typography.metadata,
    fontSize: 12,
    marginTop: -4,
  },
  depositModalTitle: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '800',
  },
  depositShortcutsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: 2,
  },
  noteInput: {
    ...typography.body,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 13,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
