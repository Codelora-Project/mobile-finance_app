import React, { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import type { ManualReceiptSource } from '@/features/transactions/manual-receipt-picker';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ManualReceiptModalProps = {
  hasReceipt: boolean;
  onClose: () => void;
  onRemoveReceipt: () => void;
  onSelectSource: (source: ManualReceiptSource) => void;
  visible: boolean;
};

export const ManualReceiptModal = memo(function ManualReceiptModal({
  hasReceipt,
  onClose,
  onRemoveReceipt,
  onSelectSource,
  visible,
}: ManualReceiptModalProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();

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
            styles.actionSheetContent,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[styles.actionSheetTitle, { color: colors.textPrimary }]}
          >
            {language === 'id' ? 'Foto Bukti / Struk' : 'Attach Photo Proof'}
          </Text>
          <AppButton
            label={language === 'id' ? 'Ambil Foto (Kamera)' : 'Take photo'}
            onPress={() => onSelectSource('camera')}
            variant="secondary"
          />
          <AppButton
            label={
              language === 'id' ? 'Pilih dari Galeri' : 'Choose from gallery'
            }
            onPress={() => onSelectSource('gallery')}
            variant="secondary"
          />
          {hasReceipt ? (
            <AppButton
              label={language === 'id' ? 'Hapus Foto' : 'Remove Photo'}
              onPress={onRemoveReceipt}
              variant="destructive"
            />
          ) : null}
          <AppButton
            label={language === 'id' ? 'Batal' : 'Cancel'}
            onPress={onClose}
            variant="ghost"
          />
        </View>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  actionSheetContent: {
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 8,
    gap: spacing.sm,
    maxWidth: 400,
    padding: spacing.lg,
    width: '100%',
  },
  actionSheetTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
});
