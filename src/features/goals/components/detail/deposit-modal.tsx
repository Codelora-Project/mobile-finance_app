import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
import { useCurrency } from '@/lib/currency/currency-context';
import { useLanguage } from '@/lib/i18n/language-context';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type GoalDetailModalProps = {
  amount: string;
  modalError: string | null;
  modalType: 'deposit' | 'withdraw' | null;
  note: string;
  onAmountChange: (text: string) => void;
  onClose: () => void;
  onNoteChange: (text: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  t: TranslationSchema;
};

export const GoalDetailModal = memo(function GoalDetailModal({
  amount,
  modalError,
  modalType,
  note,
  onAmountChange,
  onClose,
  onNoteChange,
  onSubmit,
  submitting,
  t,
}: GoalDetailModalProps) {
  const { colors, isDark } = useTheme();
  const { currencySymbol } = useCurrency();
  const { language } = useLanguage();

  if (!modalType) return null;

  const isDeposit = modalType === 'deposit';

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!submitting) onClose();
      }}
      transparent
      visible={Boolean(modalType)}
    >
      <Pressable
        onPress={() => {
          if (!submitting) onClose();
        }}
        style={styles.modalBackdrop}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View
              style={[
                styles.modalIconCircle,
                {
                  backgroundColor: isDeposit
                    ? colors.incomeBackground
                    : colors.expenseBackground,
                },
              ]}
            >
              <MaterialCommunityIcons
                color={isDeposit ? colors.positive : colors.destructive}
                name={isDeposit ? 'arrow-down-left' : 'arrow-up-right'}
                size={22}
              />
            </View>
            <Text
              accessibilityRole="header"
              style={[styles.modalTitle, { color: colors.textPrimary }]}
            >
              {isDeposit ? t.goals.deposit : t.goals.withdraw}
            </Text>
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {language === 'id' ? 'Nominal' : 'Amount'}
            </Text>
            <View
              style={[
                styles.amountInputRow,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.amountPrefix, { color: colors.textMuted }]}>
                {currencySymbol}
              </Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={onAmountChange}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={[styles.amountTextInput, { color: colors.textPrimary }]}
                value={amount}
              />
            </View>
          </View>

          {/* Note Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t.transactions.note}
            </Text>
            <TextInput
              onChangeText={onNoteChange}
              placeholder={
                isDeposit
                  ? language === 'id'
                    ? 'Contoh: Tabungan gaji bulanan'
                    : 'Example: Monthly salary savings'
                  : language === 'id'
                    ? 'Contoh: Beli kebutuhan'
                    : 'Example: Essential purchase'
              }
              placeholderTextColor={colors.textMuted}
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : '#F8FAFC',
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={note}
            />
          </View>

          {modalError ? (
            <Text
              accessibilityLiveRegion="assertive"
              style={[styles.modalErrorText, { color: colors.destructive }]}
            >
              {modalError}
            </Text>
          ) : null}

          {/* Buttons */}
          <View style={styles.modalActionsRow}>
            <View style={{ flex: 1 }}>
              <AppButton
                accessibilityLabel={t.common.cancel}
                disabled={submitting}
                label={t.common.cancel}
                onPress={onClose}
                variant="ghost"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                accessibilityLabel={
                  isDeposit ? t.goals.deposit : t.goals.withdraw
                }
                disabled={submitting}
                label={isDeposit ? t.goals.deposit : t.goals.withdraw}
                loading={submitting}
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
    paddingHorizontal: spacing.sm + 4,
  },
  amountPrefix: {
    ...typography.body,
    fontWeight: '700',
  },
  amountTextInput: {
    ...typography.body,
    flex: 1,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContainer: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 400,
    padding: spacing.lg,
    width: '100%',
  },
  modalErrorText: {
    ...typography.metadata,
    fontSize: 12,
    textAlign: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  modalIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  modalTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '700',
  },
  textInput: {
    ...typography.body,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
});
