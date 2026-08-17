import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import {
  exportBackupToJsonFile,
  exportTransactionsCsvFile,
  fetchBackupStats,
  pickBackupFile,
  restoreBackupData,
  shareFile,
} from '@/features/backup/backup-service';
import type {
  BackupPayload,
  BackupStats,
} from '@/features/backup/backup-types';
import { isCodedError, mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function BackupScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [currentStats, setCurrentStats] = useState<BackupStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [creatingBackup, setCreatingBackup] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Restore Modal State
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<{
    fileName: string;
    payload: BackupPayload;
    stats: BackupStats;
    uri: string;
  } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const stats = await fetchBackupStats(database);
      setCurrentStats(stats);
    } catch (err) {
      if (__DEV__) console.warn('Failed to load backup stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [database]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // Handle Export Backup (JSON)
  const handleCreateBackup = useCallback(async () => {
    if (creatingBackup) return;
    try {
      setCreatingBackup(true);
      const backupFile = await exportBackupToJsonFile(database);
      await shareFile(
        backupFile.uri,
        'Bagikan Cadangan Data (JSON)',
        'application/json',
        'public.json',
      );
    } catch (err) {
      if (__DEV__) console.warn('Backup error:', err);
      const msg = isCodedError(err)
        ? err.message
        : mapError(err, 'FILE_OPERATION_FAILED').message;
      Alert.alert('Gagal Membuat Cadangan', msg);
    } finally {
      setCreatingBackup(false);
    }
  }, [creatingBackup, database]);

  // Handle Export CSV
  const handleExportCsv = useCallback(async () => {
    if (exportingCsv) return;
    try {
      setExportingCsv(true);
      const csvFile = await exportTransactionsCsvFile(database);
      if (csvFile.count === 0) {
        Alert.alert('Informasi', t.backup.noTransactions);
        return;
      }
      await shareFile(
        csvFile.uri,
        'Bagikan Laporan Transaksi (CSV)',
        'text/csv',
        'public.comma-separated-values-text',
      );
    } catch (err) {
      if (__DEV__) console.warn('CSV export error:', err);
      const msg = isCodedError(err)
        ? err.message
        : mapError(err, 'FILE_OPERATION_FAILED').message;
      Alert.alert('Gagal Mengekspor CSV', msg);
    } finally {
      setExportingCsv(false);
    }
  }, [database, exportingCsv, t.backup.noTransactions]);

  // Handle Pick Backup File for Restore
  const handleSelectBackupFile = useCallback(async () => {
    try {
      const picked = await pickBackupFile();
      if (!picked) return; // User cancelled
      setSelectedBackup(picked);
      setPreviewModalVisible(true);
    } catch (err) {
      if (__DEV__) console.warn('Pick backup error:', err);
      const msg = isCodedError(err)
        ? err.message
        : mapError(err, 'VALIDATION_FAILED').message;
      Alert.alert('File Tidak Valid', msg);
    }
  }, []);

  // Confirm Restore
  const handleConfirmRestore = useCallback(async () => {
    if (!selectedBackup || restoring) return;
    try {
      setRestoring(true);
      await restoreBackupData(database, selectedBackup.payload);
      setPreviewModalVisible(false);
      setSelectedBackup(null);
      await loadStats();

      Alert.alert(
        t.backup.restoreSuccessTitle,
        t.backup.restoreSuccessDesc,
        [
          {
            text: t.common.save,
            onPress: () => {
              router.replace('/');
            },
          },
        ],
      );
    } catch (err) {
      if (__DEV__) console.warn('Restore error:', err);
      const msg = isCodedError(err)
        ? err.message
        : mapError(err, 'DATABASE_WRITE_FAILED').message;
      Alert.alert('Gagal Memulihkan Data', msg);
    } finally {
      setRestoring(false);
    }
  }, [database, loadStats, restoring, router, selectedBackup, t.backup.restoreSuccessDesc, t.backup.restoreSuccessTitle, t.common.save]);

  return (
    <Screen testID="backup-screen">
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <AppButton
          accessibilityLabel={t.common.back}
          label={t.common.back}
          onPress={() => router.back()}
          variant="ghost"
        />
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[styles.headerTitle, { color: colors.textPrimary }]}
        >
          {t.backup.title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 🛡️ Hero Trust Banner: 100% Offline & Private */}
        <View
          style={[
            styles.vaultHeroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.vaultBadgeRow}>
            <View
              style={[
                styles.vaultIconCircle,
                { backgroundColor: isDark ? '#14532D' : '#DCFCE7' },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.positive}
                name="shield-check"
                size={24}
              />
            </View>
            <View style={styles.vaultTextContainer}>
              <Text
                style={[styles.vaultTitle, { color: colors.textPrimary }]}
              >
                {t.backup.vaultBadge}
              </Text>
              <Text
                style={[styles.vaultDesc, { color: colors.textSecondary }]}
              >
                {t.backup.vaultDesc}
              </Text>
            </View>
          </View>
        </View>

        {/* 📊 Data Summary Grid */}
        <View style={styles.sectionGroup}>
          <Text
            style={[styles.sectionHeaderLabel, { color: colors.textSecondary }]}
          >
            {t.backup.statsTitle}
          </Text>

          <View
            style={[
              styles.statsGridCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {loadingStats ? (
              <ActivityIndicator
                color={colors.primary}
                size="small"
                style={{ paddingVertical: spacing.lg }}
              />
            ) : (
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>
                    {currentStats?.transactionsCount ?? 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t.backup.transactions}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#0284C7' }]}>
                    {currentStats?.categoriesCount ?? 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t.backup.categories}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#7C3AED' }]}>
                    {currentStats?.paymentMethodsCount ?? 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t.backup.paymentMethods}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statRowDivider,
                    { backgroundColor: colors.border },
                  ]}
                />

                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#16A34A' }]}>
                    {currentStats?.goalsCount ?? 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t.backup.goals}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#EA580C' }]}>
                    {currentStats?.budgetsCount ?? 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t.backup.budgets}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#D97706' }]}>
                    {currentStats?.claimsCount ?? 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    {t.backup.claims}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* 💾 SECTION 1: CADANGKAN DATA (JSON) */}
        <View style={styles.sectionGroup}>
          <Text
            style={[styles.sectionHeaderLabel, { color: colors.textSecondary }]}
          >
            {t.backup.backupSection}
          </Text>

          <View
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.cardIconBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#EFF6FF',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="database-export-outline"
                  size={22}
                />
              </View>
              <View style={styles.cardHeaderTexts}>
                <Text
                  style={[styles.cardTitle, { color: colors.textPrimary }]}
                >
                  {t.backup.backupSection}
                </Text>
                <Text
                  style={[styles.cardDesc, { color: colors.textSecondary }]}
                >
                  {t.backup.backupDesc}
                </Text>
              </View>
            </View>

            <View style={styles.cardActionArea}>
              <AppButton
                accessibilityLabel={t.backup.createBackupBtn}
                disabled={creatingBackup}
                label={
                  creatingBackup
                    ? t.backup.creatingBackup
                    : t.backup.createBackupBtn
                }
                loading={creatingBackup}
                onPress={() => void handleCreateBackup()}
                variant="primary"
              />
            </View>
          </View>
        </View>

        {/* 🔄 SECTION 2: PULIHKAN DATA (JSON) */}
        <View style={styles.sectionGroup}>
          <Text
            style={[styles.sectionHeaderLabel, { color: colors.textSecondary }]}
          >
            {t.backup.restoreSection}
          </Text>

          <View
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.cardIconBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#FEF3C7',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color="#D97706"
                  name="backup-restore"
                  size={22}
                />
              </View>
              <View style={styles.cardHeaderTexts}>
                <Text
                  style={[styles.cardTitle, { color: colors.textPrimary }]}
                >
                  {t.backup.restoreSection}
                </Text>
                <Text
                  style={[styles.cardDesc, { color: colors.textSecondary }]}
                >
                  {t.backup.restoreDesc}
                </Text>
              </View>
            </View>

            {/* Warning Pill */}
            <View
              style={[
                styles.warningBox,
                {
                  backgroundColor: isDark ? '#451A03' : '#FFFBEB',
                  borderColor: isDark ? '#78350F' : '#FDE68A',
                },
              ]}
            >
              <MaterialCommunityIcons
                color="#D97706"
                name="alert-outline"
                size={18}
                style={{ marginTop: 2 }}
              />
              <Text
                style={[
                  styles.warningText,
                  { color: isDark ? '#FDE68A' : '#92400E' },
                ]}
              >
                {t.backup.restoreWarning}
              </Text>
            </View>

            <View style={styles.cardActionArea}>
              <AppButton
                accessibilityLabel={t.backup.selectBackupBtn}
                label={t.backup.selectBackupBtn}
                onPress={() => void handleSelectBackupFile()}
                variant="secondary"
              />
            </View>
          </View>
        </View>

        {/* 📑 SECTION 3: EKSPOR CSV (EXCEL) */}
        <View style={styles.sectionGroup}>
          <Text
            style={[styles.sectionHeaderLabel, { color: colors.textSecondary }]}
          >
            {t.backup.csvSection}
          </Text>

          <View
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.cardIconBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#DCFCE7',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color="#16A34A"
                  name="file-excel-outline"
                  size={22}
                />
              </View>
              <View style={styles.cardHeaderTexts}>
                <Text
                  style={[styles.cardTitle, { color: colors.textPrimary }]}
                >
                  {t.backup.csvSection}
                </Text>
                <Text
                  style={[styles.cardDesc, { color: colors.textSecondary }]}
                >
                  {t.backup.csvDesc}
                </Text>
              </View>
            </View>

            <View style={styles.cardActionArea}>
              <AppButton
                accessibilityLabel={t.backup.exportCsvBtn}
                disabled={exportingCsv}
                label={
                  exportingCsv ? t.backup.exportingCsv : t.backup.exportCsvBtn
                }
                loading={exportingCsv}
                onPress={() => void handleExportCsv()}
                variant="secondary"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 📋 PREVIEW & RESTORE MODAL */}
      <Modal
        animationType="slide"
        onRequestClose={() => {
          if (!restoring) setPreviewModalVisible(false);
        }}
        presentationStyle="pageSheet"
        visible={previewModalVisible}
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
              onPress={() => setPreviewModalVisible(false)}
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
                        style={[
                          styles.modalStatNum,
                          { color: colors.primary },
                        ]}
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
                        style={[styles.modalStatNum, { color: '#0284C7' }]}
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
                        style={[styles.modalStatNum, { color: '#7C3AED' }]}
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
                        style={[styles.modalStatNum, { color: '#16A34A' }]}
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
                        style={[styles.modalStatNum, { color: '#EA580C' }]}
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
                        style={[styles.modalStatNum, { color: '#D97706' }]}
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
                      backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
                      borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color="#EF4444"
                    name="alert-circle"
                    size={22}
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text
                      style={[
                        styles.dangerAlertTitle,
                        { color: isDark ? '#FCA5A5' : '#991B1B' },
                      ]}
                    >
                      Peringatan Penggantian Data
                    </Text>
                    <Text
                      style={[
                        styles.dangerAlertDesc,
                        { color: isDark ? '#FECACA' : '#B91C1C' },
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
                    onPress={() => void handleConfirmRestore()}
                    variant="primary"
                  />

                  <AppButton
                    accessibilityLabel={t.common.cancel}
                    disabled={restoring}
                    label={t.common.cancel}
                    onPress={() => setPreviewModalVisible(false)}
                    variant="ghost"
                  />
                </View>
              </>
            ) : null}
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    ...typography.sectionTitle,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 64,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  vaultHeroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  vaultBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  vaultIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  vaultTextContainer: {
    flex: 1,
  },
  vaultTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 2,
  },
  vaultDesc: {
    ...typography.secondary,
    lineHeight: 18,
  },
  sectionGroup: {
    gap: spacing.xs,
  },
  sectionHeaderLabel: {
    ...typography.metadata,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
  statsGridCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    width: '30%',
  },
  statNumber: {
    ...typography.pageTitle,
    fontSize: 22,
    lineHeight: 28,
  },
  statLabel: {
    ...typography.metadata,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
  },
  statRowDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
    width: '100%',
  },
  actionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardIconBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cardHeaderTexts: {
    flex: 1,
  },
  cardTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 2,
  },
  cardDesc: {
    ...typography.secondary,
    lineHeight: 18,
  },
  cardActionArea: {
    marginTop: spacing.xs,
  },
  warningBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  warningText: {
    ...typography.metadata,
    flex: 1,
    lineHeight: 16,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalTitle: {
    ...typography.sectionTitle,
  },
  modalContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  previewFileCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  previewFileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  previewFileName: {
    ...typography.body,
    fontWeight: '700',
  },
  previewFileDate: {
    ...typography.metadata,
    marginTop: 2,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  modalStatItem: {
    alignItems: 'center',
    width: '30%',
  },
  modalStatNum: {
    ...typography.pageTitle,
    fontSize: 20,
    lineHeight: 26,
  },
  modalStatLabel: {
    ...typography.metadata,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  dangerAlertBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  dangerAlertTitle: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: 2,
  },
  dangerAlertDesc: {
    ...typography.metadata,
    lineHeight: 17,
  },
});
