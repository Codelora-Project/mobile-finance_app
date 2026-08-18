import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { AddShortcutModal } from '@/features/settings/components/add-shortcut-modal';
import { CurrencyPickerModal } from '@/features/settings/components/currency-picker-modal';
import { ShortcutsModal } from '@/features/settings/components/shortcuts-modal';
import {
  exportTransactionsCsvFile,
  shareFile,
} from '@/features/backup/backup-service';
import { SettingsAboutFooter } from '@/features/settings/components/settings-about-footer';
import { SettingsAppearanceCard } from '@/features/settings/components/settings-appearance-card';
import { SettingsDangerZoneCard } from '@/features/settings/components/settings-danger-zone-card';
import { SettingsDataManagementCard } from '@/features/settings/components/settings-data-management-card';
import { SettingsVaultBanner } from '@/features/settings/components/settings-vault-banner';
import {
  clearTemporaryCache,
  DEFAULT_QUICK_SHORTCUTS,
  formatStorageSize,
  getRecommendedShortcuts,
  getSettingsOverview,
  getStorageStats,
  resetApplicationData,
  setCurrencySetting,
  setQuickShortcutsSetting,
  type SettingsOverview,
  type StorageStats,
  type SupportedCurrencyCode,
} from '@/features/settings/settings-repository';
import { useCurrency } from '@/lib/currency/currency-context';
import { isCodedError, mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function SettingsScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { colors, setThemeSetting, themeSetting } = useTheme();
  const { currencyCode, currencySymbol, setCurrency } = useCurrency();

  const [overview, setOverview] = useState<SettingsOverview | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [shortcuts, setShortcuts] = useState<number[]>([]);
  const [shortcutsModalVisible, setShortcutsModalVisible] = useState(false);
  const [addShortcutModalVisible, setAddShortcutModalVisible] = useState(false);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [newShortcutInput, setNewShortcutInput] = useState('');
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  const resettingRef = useRef(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextOverview, nextStorage] = await Promise.all([
        getSettingsOverview(database),
        getStorageStats(database),
      ]);
      setOverview(nextOverview);
      setStorageStats(nextStorage);
      setShortcuts(nextOverview.quickShortcuts ?? DEFAULT_QUICK_SHORTCUTS);
    } catch (loadError) {
      const mappedError = mapError(loadError, 'DATABASE_WRITE_FAILED');
      setError(mappedError.message);
    } finally {
      setLoading(false);
    }
  }, [database]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings]),
  );

  const handleResetShortcuts = useCallback(async () => {
    try {
      const targetCode = overview?.currencyCode ?? currencyCode;
      const recommended = getRecommendedShortcuts(targetCode);
      await setQuickShortcutsSetting(database, recommended);
      setShortcuts(recommended);
    } catch (err) {
      if (__DEV__) console.warn('Could not reset shortcuts', err);
    }
  }, [currencyCode, database, overview?.currencyCode]);

  const handleRemoveShortcut = useCallback(
    async (amount: number) => {
      if (shortcuts.length <= 1) return;
      const updated = shortcuts.filter((s) => s !== amount);
      try {
        await setQuickShortcutsSetting(database, updated);
        setShortcuts(updated);
      } catch (err) {
        if (__DEV__) console.warn('Could not remove shortcut', err);
      }
    },
    [database, shortcuts],
  );

  const handleAddShortcut = useCallback(async () => {
    const parsed = Number(newShortcutInput.replace(/[^0-9]/g, ''));
    if (!parsed || parsed <= 0) {
      setShortcutError(t.settings.errorShortcutInvalid);
      return;
    }
    if (shortcuts.includes(parsed)) {
      setShortcutError(t.settings.errorShortcutDuplicate);
      return;
    }
    if (shortcuts.length >= 8) {
      setShortcutError(t.settings.shortcutLimit);
      return;
    }

    const updated = [...shortcuts, parsed].sort((a, b) => a - b);
    try {
      await setQuickShortcutsSetting(database, updated);
      setShortcuts(updated);
      setNewShortcutInput('');
      setAddShortcutModalVisible(false);
      setShortcutError(null);
    } catch (err) {
      setShortcutError(
        isCodedError(err) ? err.message : t.settings.errorShortcutInvalid,
      );
    }
  }, [database, newShortcutInput, shortcuts, t.settings]);

  const performReset = useCallback(async () => {
    if (resettingRef.current) return;
    resettingRef.current = true;
    setResetting(true);
    setError(null);

    try {
      await resetApplicationData(database);
      Alert.alert(t.settings.dataDeletedTitle, t.settings.dataDeletedDesc, [
        {
          onPress: () => router.replace('/'),
          text: t.settings.done,
        },
      ]);
    } catch (resetError) {
      const message = isCodedError(resetError)
        ? resetError.message
        : mapError(resetError, 'DATABASE_WRITE_FAILED').message;
      setError(message);
    } finally {
      resettingRef.current = false;
      setResetting(false);
    }
  }, [database, router, t.settings]);

  const confirmPermanentReset = useCallback(() => {
    Alert.alert(
      t.settings.permanentDeleteTitle,
      t.settings.permanentDeleteDesc,
      [
        { style: 'cancel', text: t.settings.cancel },
        {
          onPress: () => void performReset(),
          style: 'destructive',
          text: t.settings.deleteAllData,
        },
      ],
    );
  }, [performReset, t.settings]);

  const requestReset = useCallback(() => {
    Alert.alert(t.settings.deleteDialogTitle, t.settings.deleteDialogDesc, [
      { style: 'cancel', text: t.settings.cancel },
      {
        onPress: confirmPermanentReset,
        style: 'destructive',
        text: t.settings.continue,
      },
    ]);
  }, [confirmPermanentReset, t.settings]);

  const handleNavigateCategories = useCallback(() => {
    router.push('/categories');
  }, [router]);

  const handleNavigatePaymentMethods = useCallback(() => {
    router.push('/payment-methods');
  }, [router]);

  const handleNavigateBackup = useCallback(() => {
    router.push('/settings/backup');
  }, [router]);

  const handleClearCache = useCallback(async () => {
    if (clearingCache) return;
    setClearingCache(true);
    try {
      const result = await clearTemporaryCache();
      const nextStorage = await getStorageStats(database);
      setStorageStats(nextStorage);
      if (result.freedBytes > 0) {
        Alert.alert(
          t.settings.storageSection,
          t.settings.clearCacheSuccess.replace(
            '{size}',
            formatStorageSize(result.freedBytes),
          ),
        );
      } else {
        Alert.alert(t.settings.storageSection, t.settings.clearCacheEmpty);
      }
    } catch (err) {
      if (__DEV__) console.warn('Clear cache error:', err);
    } finally {
      setClearingCache(false);
    }
  }, [clearingCache, database, t.settings]);

  const executeExport = useCallback(
    async (scope: 'this_month' | 'all') => {
      if (exportingCsv) return;
      setExportingCsv(true);
      try {
        const result = await exportTransactionsCsvFile(database, {
          language,
          scope,
        });
        if (result.count === 0) {
          Alert.alert(t.settings.quickExportTitle, t.backup.noTransactions);
        } else {
          await shareFile(
            result.uri,
            result.fileName,
            'text/csv',
            'public.comma-separated-values-text',
          );
        }
      } catch (err) {
        if (__DEV__) console.warn('Quick CSV export error:', err);
        const msg =
          isCodedError(err) || err instanceof Error
            ? err.message
            : language === 'id'
              ? 'Gagal mengekspor data transaksi.'
              : 'Failed to export transaction data.';
        Alert.alert(t.settings.quickExportTitle, msg);
      } finally {
        setExportingCsv(false);
      }
    },
    [database, exportingCsv, language, t.backup.noTransactions, t.settings],
  );

  const handleQuickExport = useCallback(() => {
    Alert.alert(
      t.settings.exportDialogTitle,
      t.settings.exportDialogDesc,
      [
        {
          onPress: () => void executeExport('this_month'),
          text: t.settings.exportThisMonth,
        },
        {
          onPress: () => void executeExport('all'),
          text: t.settings.exportAll,
        },
        {
          style: 'cancel',
          text: t.settings.cancel,
        },
      ],
      { cancelable: true },
    );
  }, [executeExport, t.settings]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Screen Title */}
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.textPrimary }]}
          >
            {t.settings.title}
          </Text>
        </View>

        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} />
            <Text
              style={[styles.secondaryText, { color: colors.textSecondary }]}
            >
              {t.settings.loading}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View accessibilityLiveRegion="assertive" style={styles.errorPanel}>
            <Text style={styles.errorText}>{error}</Text>
            {!overview ? (
              <AppButton
                label={t.common.tryAgain}
                onPress={() => void loadSettings()}
              />
            ) : null}
          </View>
        ) : null}

        {overview ? (
          <>
            {/* 🛡️ Hero Trust Banner: 100% Private & Offline */}
            <SettingsVaultBanner description={t.settings.dataDesc} />

            {/* SECTION 1: TAMPILAN & PREFERENSI (Appearance & Preferences) */}
            <SettingsAppearanceCard
              currencyCode={overview.currencyCode}
              currencySymbol={currencySymbol}
              language={language}
              onOpenCurrencyPicker={() => setCurrencyPickerVisible(true)}
              onOpenShortcutsModal={() => setShortcutsModalVisible(true)}
              onSelectLanguage={(lang) => void setLanguage(lang)}
              onSelectTheme={setThemeSetting}
              shortcuts={shortcuts}
              t={t}
              themeSetting={themeSetting}
            />

            {/* SECTION 2: KELOLA KEUANGAN (Manage Financial Data) */}
            <SettingsDataManagementCard
              clearingCache={clearingCache}
              currencyCode={overview.currencyCode}
              currencyName={overview.currencyName}
              exportingCsv={exportingCsv}
              language={language}
              onClearCache={handleClearCache}
              onNavigateBackup={handleNavigateBackup}
              onNavigateCategories={handleNavigateCategories}
              onNavigatePaymentMethods={handleNavigatePaymentMethods}
              onQuickExport={handleQuickExport}
              storageStats={storageStats}
              t={t}
            />

            {/* SECTION 3: ZONA DATA & PRIVASI (Danger Zone) */}
            <SettingsDangerZoneCard
              language={language}
              onRequestReset={requestReset}
              resetting={resetting}
              t={t}
            />

            {/* SECTION 4: TENTANG APLIKASI (About Footer) */}
            <SettingsAboutFooter
              aboutDesc={t.settings.aboutDesc}
              version={Constants.expoConfig?.version ?? '1.0.0'}
              versionLabel={t.settings.version}
            />
          </>
        ) : null}
      </ScrollView>

      {/* Shortcuts Manager & Live Preview Modal */}
      {overview ? (
        <ShortcutsModal
          currencyCode={overview.currencyCode}
          currencySymbol={currencySymbol}
          onClose={() => setShortcutsModalVisible(false)}
          onOpenAddShortcut={() => {
            setShortcutError(null);
            setAddShortcutModalVisible(true);
          }}
          onRemoveShortcut={(amount) => void handleRemoveShortcut(amount)}
          onResetShortcuts={() => void handleResetShortcuts()}
          shortcuts={shortcuts}
          t={t}
          visible={shortcutsModalVisible}
        />
      ) : null}

      {/* Add Shortcut Modal */}
      <AddShortcutModal
        currencyCode={overview?.currencyCode ?? currencyCode}
        currencySymbol={currencySymbol}
        error={shortcutError}
        input={newShortcutInput}
        onChangeInput={(text) => {
          setNewShortcutInput(text);
          setShortcutError(null);
        }}
        onClose={() => setAddShortcutModalVisible(false)}
        onSave={() => void handleAddShortcut()}
        t={t}
        visible={addShortcutModalVisible}
      />

      {/* Base Currency Picker Modal */}
      <CurrencyPickerModal
        onClose={() => setCurrencyPickerVisible(false)}
        onSelectCurrency={(selected) => {
          setCurrency(selected);
          void loadSettings();
        }}
        selectedCode={overview?.currencyCode ?? currencyCode}
        visible={currencyPickerVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl + 24,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  errorPanel: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorText: {
    ...typography.metadata,
    color: '#EF4444',
  },
  header: {
    paddingVertical: spacing.xs,
  },
  secondaryText: {
    ...typography.metadata,
    fontSize: 12,
  },
  state: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  title: {
    ...typography.pageTitle,
    fontSize: 22,
    fontWeight: '900',
  },
});
