import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import {
  Alert,
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
import {
  BackupCsvCard,
  BackupJsonCard,
  BackupRestoreCard,
  BackupRestoreModal,
  BackupStatsCard,
  BackupVaultBanner,
} from '@/features/backup/components';
import { isCodedError, mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function BackupScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { colors } = useTheme();
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

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, [loadStats]),
  );

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
            onPress: () => {
              router.replace('/');
            },
            text: t.common.save,
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
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
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
        <BackupVaultBanner t={t} />

        {/* 📊 Data Summary Grid */}
        <BackupStatsCard
          currentStats={currentStats}
          loadingStats={loadingStats}
          t={t}
        />

        {/* 💾 SECTION 1: CADANGKAN DATA (JSON) */}
        <BackupJsonCard
          creatingBackup={creatingBackup}
          onCreateBackup={() => void handleCreateBackup()}
          t={t}
        />

        {/* 🔄 SECTION 2: PULIHKAN DATA (JSON) */}
        <BackupRestoreCard
          onSelectBackupFile={() => void handleSelectBackupFile()}
          restoring={restoring}
          t={t}
        />

        {/* 📑 SECTION 3: EKSPOR CSV (EXCEL) */}
        <BackupCsvCard
          exportingCsv={exportingCsv}
          onExportCsv={() => void handleExportCsv()}
          t={t}
        />
      </ScrollView>

      {/* 📋 PREVIEW & RESTORE MODAL */}
      <BackupRestoreModal
        onClose={() => setPreviewModalVisible(false)}
        onConfirmRestore={() => void handleConfirmRestore()}
        restoring={restoring}
        selectedBackup={selectedBackup}
        t={t}
        visible={previewModalVisible}
      />
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
  headerSpacer: {
    width: 64,
  },
  headerTitle: {
    ...typography.sectionTitle,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
