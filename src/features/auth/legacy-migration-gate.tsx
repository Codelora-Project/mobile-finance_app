import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import {
  exportBackupToJsonFile,
  shareFile,
} from '@/features/backup/backup-service';
import { useLegacyData } from '@/features/auth/legacy-data-context';
import { useReceiptStorage } from '@/features/receipts/receipt-storage-context';
import { darkColors, lightColors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';

function isIndonesianLocale() {
  try {
    return Intl.DateTimeFormat()
      .resolvedOptions()
      .locale.toLowerCase()
      .startsWith('id');
  } catch {
    return true;
  }
}

export function LegacyMigrationGate({ children }: PropsWithChildren) {
  const { archive, claim, error, refresh, status, summary } = useLegacyData();
  const database = useSQLiteContext();
  const receiptStorage = useReceiptStorage();
  const [preparingBackup, setPreparingBackup] = useState(false);
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const isId = isIndonesianLocale();
  const busy = preparingBackup || status === 'checking' || status === 'working';

  const copy = useMemo(
    () =>
      isId
        ? {
            archive: 'Arsipkan untuk nanti',
            claim: 'Hubungkan data',
            description:
              'Kami menemukan data dari versi aplikasi sebelumnya. Pilih akun Google ini sebagai pemiliknya, atau simpan arsip agar bisa dihubungkan nanti.',
            retry: 'Coba lagi',
            backupError:
              'Backup akun aktif harus berhasil sebelum data diganti.',
            backupPrompt:
              'Aplikasi akan membuat backup JSON akun aktif dan membuka menu berbagi sebelum data lama dihubungkan.',
            backupTitle: 'Simpan backup terlebih dahulu',
            createBackup: 'Buat backup',
            finalPrompt:
              'Data lama akan mengganti seluruh data akun aktif, bukan menggabungkannya. Lanjutkan?',
            finalTitle: 'Konfirmasi penggantian data',
            replace: 'Ganti data',
            cancel: 'Batal',
            title: 'Data perangkat lama ditemukan',
            warning:
              'Sumber lama baru akan dihapus setelah seluruh data dan struk berhasil dipulihkan serta diverifikasi.',
          }
        : {
            archive: 'Archive for later',
            claim: 'Connect data',
            description:
              'We found data from an earlier app version. Assign it to this Google account, or keep the archive to connect later.',
            retry: 'Try again',
            backupError:
              'The active-account backup must succeed before data is replaced.',
            backupPrompt:
              'The app will create an active-account JSON backup and open the share sheet before connecting legacy data.',
            backupTitle: 'Save a backup first',
            createBackup: 'Create backup',
            finalPrompt:
              'Legacy data will replace all active-account data; it will not be merged. Continue?',
            finalTitle: 'Confirm data replacement',
            replace: 'Replace data',
            cancel: 'Cancel',
            title: 'Legacy device data found',
            warning:
              'The legacy source is removed only after all records and receipts are restored and verified.',
          },
    [isId],
  );

  const executeClaim = useCallback(async () => {
    try {
      await claim();
    } catch {
      // LegacyDataProvider exposes the failure in its error state.
    }
  }, [claim]);

  const prepareClaim = useCallback(async () => {
    setPreparingBackup(true);
    try {
      const backup = await exportBackupToJsonFile(database, receiptStorage);
      await shareFile(
        backup.uri,
        isId
          ? 'Simpan backup sebelum mengganti data'
          : 'Save backup before replacing data',
        'application/json',
        'public.json',
      );
    } catch (backupError) {
      Alert.alert(
        copy.backupTitle,
        backupError instanceof Error ? backupError.message : copy.backupError,
      );
      return;
    } finally {
      setPreparingBackup(false);
    }

    Alert.alert(copy.finalTitle, copy.finalPrompt, [
      { style: 'cancel', text: copy.cancel },
      {
        onPress: () => void executeClaim(),
        style: 'destructive',
        text: copy.replace,
      },
    ]);
  }, [copy, database, executeClaim, isId, receiptStorage]);

  const requestClaim = useCallback(() => {
    Alert.alert(copy.backupTitle, copy.backupPrompt, [
      { style: 'cancel', text: copy.cancel },
      { onPress: () => void prepareClaim(), text: copy.createBackup },
    ]);
  }, [copy, prepareClaim]);

  const handleArchive = useCallback(() => {
    void archive().catch(() => undefined);
  }, [archive]);

  if (status === 'none' || status === 'archived') return children;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.icon, { backgroundColor: colors.primaryLight }]}>
          <MaterialCommunityIcons
            color={colors.primary}
            name="database-import-outline"
            size={36}
          />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {copy.title}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {copy.description}
        </Text>

        {summary ? (
          <View
            style={[
              styles.summary,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metric, { color: colors.textPrimary }]}>
              {summary.transactionsCount} {isId ? 'transaksi' : 'transactions'}
            </Text>
            <Text style={[styles.metric, { color: colors.textPrimary }]}>
              {summary.goalsCount} {isId ? 'target' : 'goals'}
            </Text>
            <Text style={[styles.metric, { color: colors.textPrimary }]}>
              {summary.receiptFilesCount} {isId ? 'struk' : 'receipts'}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.warning, { color: colors.warning }]}>
          {copy.warning}
        </Text>
        {error ? (
          <Text
            accessibilityLiveRegion="assertive"
            style={[styles.error, { color: colors.destructive }]}
          >
            {error}
          </Text>
        ) : null}

        {busy ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={requestClaim}
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[styles.primaryLabel, { color: colors.onPrimary }]}>
                {copy.claim}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={handleArchive}
              style={[styles.secondaryButton, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.secondaryLabel, { color: colors.textPrimary }]}
              >
                {copy.archive}
              </Text>
            </Pressable>
            {status === 'error' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void refresh()}
              >
                <Text style={[styles.retry, { color: colors.primary }]}>
                  {copy.retry}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm, width: '100%' },
  content: {
    alignItems: 'center',
    flexGrow: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  description: { ...typography.body, maxWidth: 480, textAlign: 'center' },
  error: { ...typography.secondary, maxWidth: 480, textAlign: 'center' },
  icon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  metric: { ...typography.secondary, fontWeight: '700' },
  primaryButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  primaryLabel: { ...typography.body, fontWeight: '700' },
  retry: { ...typography.body, fontWeight: '700', textAlign: 'center' },
  safeArea: { flex: 1 },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  secondaryLabel: { ...typography.body, fontWeight: '700' },
  summary: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.lg,
    width: '100%',
  },
  title: { ...typography.pageTitle, maxWidth: 480, textAlign: 'center' },
  warning: { ...typography.metadata, maxWidth: 480, textAlign: 'center' },
});
