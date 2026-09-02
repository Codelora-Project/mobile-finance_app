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
import { fixedSemanticColors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type AddShortcutModalProps = {
  currencyCode?: string;
  currencySymbol?: string;
  error?: string | null;
  input: string;
  onChangeInput: (val: string) => void;
  onClose: () => void;
  onSave: () => void;
  t: TranslationSchema;
  visible: boolean;
};

export const AddShortcutModal = memo(function AddShortcutModal({
  currencyCode = 'IDR',
  currencySymbol = 'Rp',
  error,
  input,
  onChangeInput,
  onClose,
  onSave,
  t,
  visible,
}: AddShortcutModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {t.settings.addShortcut}
          </Text>
          <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
            {t.settings.enterShortcutAmount}
          </Text>

          <View
            style={[
              styles.modalInputWrap,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.modalInputPrefix, { color: colors.textSecondary }]}
            >
              {currencySymbol}
            </Text>
            <TextInput
              autoFocus
              keyboardType="decimal-pad"
              onChangeText={onChangeInput}
              placeholder={currencyCode === 'IDR' ? '15000' : '15'}
              placeholderTextColor={colors.textSecondary}
              style={[styles.modalInput, { color: colors.textPrimary }]}
              value={input}
            />
          </View>

          {error ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
          ) : null}

          <View style={styles.modalActionsRow}>
            <View style={{ flex: 1 }}>
              <AppButton
                label={t.settings.cancel}
                onPress={onClose}
                variant="secondary"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                label={t.common.save}
                onPress={onSave}
                variant="primary"
              />
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  errorText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 8,
    gap: spacing.sm,
    maxWidth: 360,
    padding: spacing.lg,
    width: '100%',
  },
  modalInput: {
    ...typography.displayAmount,
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    paddingVertical: spacing.sm,
  },
  modalInputPrefix: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
  },
  modalInputWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: fixedSemanticColors.modalBackdrop,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalTitle: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryText: {
    ...typography.metadata,
    fontSize: 12,
  },
});
