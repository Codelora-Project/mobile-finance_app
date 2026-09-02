import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import type {
  BackupPayload,
  BackupStats,
} from '@/features/backup/backup-types';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type BackupRestoreModalProps = {
  onClose: () => void;
  onConfirmRestore: () => void;
  restoring: boolean;
  selectedBackup: {
    fileName: string;
    payload: BackupPayload;
    stats: BackupStats;
  } | null;
  t: TranslationSchema;
  visible: boolean;
};

export const BackupRestoreModal = memo(function BackupRestoreModal({
  onClose,
  onConfirmRestore,
  restoring,
  selectedBackup,
  t,
  visible,
}: BackupRestoreModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!restoring) onClose();
      }}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <Screen testID="backup-preview-modal">
        <View
          style={[
            styles.modalHeader,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <AppButton
            disabled={restoring}
            label={t.common.cancel}
            onPress={onClose}
            variant="ghost"
          />
          <Text
            accessibilityRole="header"
            style={[styles.modalTitle, { color: colors.textPrimary }]}
          >
            {t.backup.previewTitle}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedBackup ? (
            <>
              <View
                style={[
                  styles.previewFileCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.previewFileHeader}>
                  <MaterialCommunityIcons
                    color={colors.primary}
                    name="code-json"
                    size={24}
                  />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.previewFileName,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {selectedBackup.fileName}
                    </Text>
                    <Text
                      style={[
                        styles.previewFileDate,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.backup.exportedAt}:{' '}
                      {new Date(
                        selectedBackup.payload.exported_at,
                      ).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statRowDivider,
                    {
                      backgroundColor: colors.border,
                      marginVertical: spacing.md,
                    },
                  ]}
                />

                {/* Summary of Data in the Backup */}
                <View style={styles.modalStatsGrid}>
                  <View style={styles.modalStatItem}>
                    <Text
                      style={[styles.modalStatNum, { color: colors.primary }]}
                    >
                      {selectedBackup.stats.transactionsCount}
                    </Text>
                    <Text
                      style={[
                        styles.modalStatLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.backup.transactions}
                    </Text>
                  </View>

                  <View style={styles.modalStatItem}>
                    <Text
                      style={[styles.modalStatNum, { color: colors.accentSky }]}
                    >
                      {selectedBackup.stats.categoriesCount}
                    </Text>
                    <Text
                      style={[
                        styles.modalStatLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.backup.categories}
                    </Text>
                  </View>

                  <View style={styles.modalStatItem}>
                    <Text
                      style={[
                        styles.modalStatNum,
                        { color: colors.accentPurple },
                      ]}
                    >
                      {selectedBackup.stats.paymentMethodsCount}
                    </Text>
                    <Text
                      style={[
                        styles.modalStatLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.backup.paymentMethods}
                    </Text>
                  </View>

                  <View style={styles.modalStatItem}>
                    <Text
                      style={[styles.modalStatNum, { color: colors.positive }]}
                    >
                      {selectedBackup.stats.goalsCount}
                    </Text>
                    <Text
                      style={[
                        styles.modalStatLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.backup.goals}
                    </Text>
                  </View>

                  <View style={styles.modalStatItem}>
                    <Text
                      style={[
                        styles.modalStatNum,
                        { color: colors.accentOrange },
                      ]}
                    >
                      {selectedBackup.stats.budgetsCount}
                    </Text>
                    <Text
                      style={[
                        styles.modalStatLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.backup.budgets}
                    </Text>
                  </View>

                  <View style={styles.modalStatItem}>
                    <Text
                      style={[styles.modalStatNum, { color: colors.warning }]}
                    >
                      {selectedBackup.stats.claimsCount}
                    </Text>
                    <Text
                      style={[
                        styles.modalStatLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.backup.claims}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Overwrite Warning */}
              <View
                style={[
                  styles.dangerAlertBox,
                  {
                    backgroundColor: colors.expenseBackground,
                    borderColor: colors.destructive,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.destructive}
                  name="alert-circle"
                  size={22}
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text
                    style={[
                      styles.dangerAlertTitle,
                      { color: colors.destructive },
                    ]}
                  >
                    Peringatan Penggantian Data
                  </Text>
                  <Text
                    style={[
                      styles.dangerAlertDesc,
                      { color: colors.destructive },
                    ]}
                  >
                    Seluruh riwayat dan pengaturan lokal saat ini akan dihapus
                    dan digantikan secara total dengan data dari file ini.
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
                <AppButton
                  accessibilityLabel={t.backup.confirmRestoreBtn}
                  disabled={restoring}
                  label={
                    restoring
                      ? t.backup.restoringData
                      : t.backup.confirmRestoreBtn
                  }
                  loading={restoring}
                  onPress={onConfirmRestore}
                  variant="primary"
                />

                <AppButton
                  accessibilityLabel={t.common.cancel}
                  disabled={restoring}
                  label={t.common.cancel}
                  onPress={onClose}
                  variant="ghost"
                />
              </View>
            </>
          ) : null}
        </ScrollView>
      </Screen>
    </Modal>
  );
});

const styles = StyleSheet.create({
  dangerAlertBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  dangerAlertDesc: {
    ...typography.metadata,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  dangerAlertTitle: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 64,
  },
  modalContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalStatItem: {
    alignItems: 'center',
    gap: 2,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    width: '30%',
  },
  modalStatLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalStatNum: {
    ...typography.sectionTitle,
    fontSize: 18,
    fontWeight: '800',
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modalTitle: {
    ...typography.sectionTitle,
    flex: 1,
    textAlign: 'center',
  },
  previewFileCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  previewFileDate: {
    ...typography.metadata,
    fontSize: 11,
    marginTop: 2,
  },
  previewFileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  previewFileName: {
    ...typography.sectionTitle,
    fontSize: 14,
    fontWeight: '700',
  },
  statRowDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
