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
                    ? isDark
                      ? '#14532D'
                      : '#DCFCE7'
                    : isDark
                    ? '#7F1D1D'
                    : '#FEE2E2',
                },
              ]}
            >
              <MaterialCommunityIcons
                color={isDeposit ? '#16A34A' : '#DC2626'}
                name={isDeposit ? 'arrow-down-left' : 'arrow-up-right'}
                size={22}
              />
            </View>
            <Text
              accessibilityRole="header"
              style={[styles.modalTitle, { color: colors.textPrimary }]}
            >
              {isDeposit ? 'Setor Tabungan' : 'Tarik Tabungan'}
            </Text>
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: colors.textSecondary }]}
            >
              Nominal
            </Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={onAmountChange}
              placeholder="0"
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
              value={amount}
            />
          </View>

          {/* Note Input */}
          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: colors.textSecondary }]}
            >
              {t.transactions.note || 'Catatan'}
            </Text>
            <TextInput
              onChangeText={onNoteChange}
              placeholder={
                isDeposit
                  ? 'Contoh: Tabungan gaji bulanan'
                  : 'Contoh: Beli kebutuhan'
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
                label={
                  isDeposit
                    ? t.goals.deposit || 'Setor'
                    : t.goals.withdraw || 'Tarik'
                }
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
