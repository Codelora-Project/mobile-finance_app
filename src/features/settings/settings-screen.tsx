import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/features/auth/auth-context';
import { useLegacyData } from '@/features/auth/legacy-data-context';
import { AddShortcutModal } from '@/features/settings/components/add-shortcut-modal';
import { CurrencyPickerModal } from '@/features/settings/components/currency-picker-modal';
import { ShortcutsModal } from '@/features/settings/components/shortcuts-modal';
import {
  exportBackupToJsonFile,
  exportTransactionsCsvFile,
  shareFile,
} from '@/features/backup/backup-service';
import { SettingsAboutFooter } from '@/features/settings/components/settings-about-footer';
import { SettingsAccountCard } from '@/features/settings/components/settings-account-card';
import { SettingsAppearanceCard } from '@/features/settings/components/settings-appearance-card';
import { SettingsDangerZoneCard } from '@/features/settings/components/settings-danger-zone-card';
import { SettingsDataManagementCard } from '@/features/settings/components/settings-data-management-card';
import { SettingsVaultBanner } from '@/features/settings/components/settings-vault-banner';
import { useReceiptStorage } from '@/features/receipts/receipt-storage-context';
import {
  clearTemporaryCache,
  DEFAULT_QUICK_SHORTCUTS,
  formatStorageSize,
  getRecommendedShortcuts,
  getSettingsOverview,
  getStorageStats,
  resetApplicationData,
  SUPPORTED_CURRENCIES,
  setQuickShortcutsSetting,
  type SettingsOverview,
  type StorageStats,
  type SupportedCurrencyCode,
} from '@/features/settings/settings-repository';
import { useCurrency } from '@/lib/currency/currency-context';
import { isCodedError, mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language } from '@/lib/i18n/translations';
import { getCurrencyFractionDigits, parseMoneyInput } from '@/lib/money';
import { useTheme, type ThemeSetting } from '@/lib/theme/theme-context';
import type { BrandTheme } from '@/theme/colors';
import { contentMaxWidth } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function SettingsScreen() {
  const database = useSQLiteContext();
  const receiptStorage = useReceiptStorage();
  const router = useRouter();
  const { isBusy: authBusy, signOut, user } = useAuth();
  const legacyData = useLegacyData();
  const { language, setLanguage, t } = useLanguage();
  const { brandTheme, colors, setBrandTheme, setThemeSetting, themeSetting } =
    useTheme();
  const { currencyCode, currencySymbol, setCurrency } = useCurrency();

  const [overview, setOverview] = useState<SettingsOverview | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claimingLegacy, setClaimingLegacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [shortcuts, setShortcuts] = useState<number[]>([]);
  const [shortcutsModalVisible, setShortcutsModalVisible] = useState(false);
  const [addShortcutModalVisible, setAddShortcutModalVisible] = useState(false);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [newShortcutInput, setNewShortcutInput] = useState('');
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  const resettingRef = useRef(false);
  const claimingLegacyRef = useRef(false);
  const appearanceMutationRef = useRef(false);
  const loadRequestRef = useRef(0);
  const shortcutMutationRef = useRef(false);

  const showAppearanceSaveError = useCallback(
    (caughtError: unknown) => {
      Alert.alert(
        t.common.settingNotSaved,
        mapError(caughtError, 'DATABASE_WRITE_FAILED', t.appErrors).message,
      );
    },
    [t.appErrors, t.common.settingNotSaved],
  );

  const handleLanguageChange = useCallback(
    async (nextLanguage: Language) => {
      if (appearanceMutationRef.current || nextLanguage === language) return;
      appearanceMutationRef.current = true;
      try {
        await setLanguage(nextLanguage);
      } catch (caughtError) {
        showAppearanceSaveError(caughtError);
      } finally {
        appearanceMutationRef.current = false;
      }
    },
    [language, setLanguage, showAppearanceSaveError],
  );

  const handleThemeChange = useCallback(
    async (nextTheme: ThemeSetting) => {
      if (appearanceMutationRef.current || nextTheme === themeSetting) return;
      appearanceMutationRef.current = true;
      try {
        await setThemeSetting(nextTheme);
      } catch (caughtError) {
        showAppearanceSaveError(caughtError);
      } finally {
        appearanceMutationRef.current = false;
      }
    },
    [setThemeSetting, showAppearanceSaveError, themeSetting],
  );

  const handleBrandThemeChange = useCallback(
    async (nextBrandTheme: BrandTheme) => {
      if (appearanceMutationRef.current || nextBrandTheme === brandTheme) {
        return;
      }
      appearanceMutationRef.current = true;
      try {
        await setBrandTheme(nextBrandTheme);
      } catch (caughtError) {
        showAppearanceSaveError(caughtError);
      } finally {
        appearanceMutationRef.current = false;
      }
    },
    [brandTheme, setBrandTheme, showAppearanceSaveError],
  );

  const loadSettings = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const [nextOverview, nextStorage] = await Promise.all([
        getSettingsOverview(database),
        getStorageStats(database, receiptStorage),
      ]);
      if (requestId !== loadRequestRef.current) return;
      setOverview(nextOverview);
      setStorageStats(nextStorage);
      setShortcuts(nextOverview.quickShortcuts ?? DEFAULT_QUICK_SHORTCUTS);
    } catch (loadError) {
      if (requestId === loadRequestRef.current) {
        const mappedError = mapError(
          loadError,
          'DATABASE_WRITE_FAILED',
          t.appErrors,
        );
        setError(mappedError.message);
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [database, receiptStorage, t.appErrors]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
      return () => {
        loadRequestRef.current += 1;
      };
    }, [loadSettings]),
  );

  const handleResetShortcuts = useCallback(async () => {
    if (shortcutMutationRef.current) return;
    shortcutMutationRef.current = true;
    try {
      const targetCode = overview?.currencyCode ?? currencyCode;
      const recommended = getRecommendedShortcuts(targetCode);
      await setQuickShortcutsSetting(database, recommended);
      setShortcuts(recommended);
    } catch (err) {
      if (__DEV__) console.warn('Could not reset shortcuts', err);
      Alert.alert(
        t.settings.shortcutsNotSaved,
        mapError(err, 'DATABASE_WRITE_FAILED', t.appErrors).message,
      );
    } finally {
      shortcutMutationRef.current = false;
    }
  }, [
    currencyCode,
    database,
    overview,
    t.appErrors,
    t.settings.shortcutsNotSaved,
  ]);

  const handleRemoveShortcut = useCallback(
    async (amount: number) => {
      if (shortcuts.length <= 1 || shortcutMutationRef.current) return;
      shortcutMutationRef.current = true;
      const updated = shortcuts.filter((s) => s !== amount);
      try {
        await setQuickShortcutsSetting(database, updated);
        setShortcuts(updated);
      } catch (err) {
        if (__DEV__) console.warn('Could not remove shortcut', err);
        Alert.alert(
          t.settings.shortcutsNotSaved,
          mapError(err, 'DATABASE_WRITE_FAILED', t.appErrors).message,
        );
      } finally {
        shortcutMutationRef.current = false;
      }
    },
    [database, shortcuts, t.appErrors, t.settings.shortcutsNotSaved],
  );

  const handleAddShortcut = useCallback(async () => {
    if (shortcutMutationRef.current) return;
    const targetCode = overview?.currencyCode ?? currencyCode;
    let parsed: number;
    try {
      const minor = parseMoneyInput(newShortcutInput, targetCode);
      parsed = minor / 10 ** getCurrencyFractionDigits(targetCode);
    } catch {
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
    shortcutMutationRef.current = true;
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
    } finally {
      shortcutMutationRef.current = false;
    }
  }, [
    currencyCode,
    database,
    newShortcutInput,
    overview,
    shortcuts,
    t.settings,
  ]);

  const performReset = useCallback(async () => {
    if (resettingRef.current) return;
    resettingRef.current = true;
    setResetting(true);
    setError(null);

    try {
      await resetApplicationData(database, receiptStorage);
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
  }, [database, receiptStorage, router, t.settings]);

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

  const handleReplayIntroduction = useCallback(() => {
    router.push('/settings/onboarding');
  }, [router]);

  const handleSelectCurrency = useCallback(
    (selected: SupportedCurrencyCode) => {
      const current = overview?.currencyCode ?? currencyCode;
      if (selected === current) return;
      Alert.alert(
        t.settings.currencyChangeTitle,
        t.settings.currencyChangeDescription.replace('{currency}', selected),
        [
          { style: 'cancel', text: t.common.cancel },
          {
            onPress: () => {
              void (async () => {
                setError(null);
                try {
                  await setCurrency(selected);
                  const selectedCurrency = SUPPORTED_CURRENCIES.find(
                    (currency) => currency.code === selected,
                  );
                  setOverview((currentOverview) =>
                    currentOverview
                      ? {
                          ...currentOverview,
                          currencyCode: selected,
                          currencyName:
                            selectedCurrency?.name ??
                            currentOverview.currencyName,
                        }
                      : currentOverview,
                  );
                } catch (currencyError) {
                  setError(
                    isCodedError(currencyError) &&
                      currencyError.code === 'VALIDATION_FAILED'
                      ? t.settings.currencyPrecisionError
                      : mapError(
                          currencyError,
                          'DATABASE_WRITE_FAILED',
                          t.appErrors,
                        ).message,
                  );
                }
              })();
            },
            text: t.settings.currencyChangeConfirm,
          },
        ],
      );
    },
    [currencyCode, overview?.currencyCode, setCurrency, t],
  );

  const handleClearCache = useCallback(async () => {
    if (clearingCache) return;
    setClearingCache(true);
    try {
      const result = await clearTemporaryCache();
      const nextStorage = await getStorageStats(database, receiptStorage);
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
  }, [clearingCache, database, receiptStorage, t.settings]);

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
            : t.settings.exportFailedMessage;
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

  const handleLogout = useCallback(() => {
    Alert.alert(t.settings.signOutTitle, t.settings.signOutDescription, [
      {
        style: 'cancel',
        text: t.common.cancel,
      },
      {
        onPress: () => void signOut(),
        style: 'destructive',
        text: t.settings.signOut,
      },
    ]);
  }, [signOut, t.common.cancel, t.settings]);

  const executeLegacyClaim = useCallback(async () => {
    if (claimingLegacyRef.current) return;
    claimingLegacyRef.current = true;
    setClaimingLegacy(true);
    try {
      await legacyData.claim();
      Alert.alert(
        t.settings.legacyConnectedTitle,
        t.settings.legacyConnectedDescription,
        [{ onPress: () => router.replace('/'), text: t.common.okay }],
      );
    } catch (claimError) {
      Alert.alert(
        t.settings.legacyConnectionFailed,
        claimError instanceof Error
          ? claimError.message
          : t.settings.legacyConnectionPreserved,
      );
    } finally {
      claimingLegacyRef.current = false;
      setClaimingLegacy(false);
    }
  }, [legacyData, router, t.common.okay, t.settings]);

  const prepareLegacyClaim = useCallback(async () => {
    if (claimingLegacyRef.current) return;
    claimingLegacyRef.current = true;
    setClaimingLegacy(true);
    try {
      const backup = await exportBackupToJsonFile(database, receiptStorage);
      await shareFile(
        backup.uri,
        t.settings.saveBackupBeforeReplace,
        'application/json',
        'public.json',
      );
    } catch (backupError) {
      Alert.alert(
        t.settings.backupRequiredTitle,
        backupError instanceof Error
          ? backupError.message
          : t.settings.legacyNotConnected,
      );
      return;
    } finally {
      claimingLegacyRef.current = false;
      setClaimingLegacy(false);
    }

    Alert.alert(
      t.settings.finalConfirmation,
      t.settings.replaceDataDescription,
      [
        { style: 'cancel', text: t.common.cancel },
        {
          onPress: () => void executeLegacyClaim(),
          style: 'destructive',
          text: t.settings.replaceData,
        },
      ],
    );
  }, [
    database,
    executeLegacyClaim,
    receiptStorage,
    t.common.cancel,
    t.settings,
  ]);

  const handleLegacyClaim = useCallback(() => {
    Alert.alert(
      t.settings.connectLegacyTitle,
      t.settings.connectLegacyDescription,
      [
        { style: 'cancel', text: t.common.cancel },
        {
          onPress: () => void prepareLegacyClaim(),
          text: t.settings.createBackup,
        },
      ],
    );
  }, [prepareLegacyClaim, t.common.cancel, t.settings]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Screen Title */}
        <View style={styles.header}>
          <Pressable
            accessibilityLabel={t.common.back}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name="chevron-left"
              size={28}
            />
          </Pressable>
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
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
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
            {user ? (
              <SettingsAccountCard
                claimingLegacy={claimingLegacy}
                isBusy={authBusy}
                language={language}
                onClaimLegacy={handleLegacyClaim}
                onLogout={handleLogout}
                showLegacyAction={legacyData.status === 'archived'}
                user={user}
              />
            ) : null}

            {/* SECTION 1: GENERAL & APPEARANCE */}
            <SettingsAppearanceCard
              brandTheme={brandTheme}
              currencyCode={overview.currencyCode}
              currencySymbol={currencySymbol}
              language={language}
              onOpenCurrencyPicker={() => setCurrencyPickerVisible(true)}
              onOpenShortcutsModal={() => setShortcutsModalVisible(true)}
              onSelectBrandTheme={(nextBrandTheme) =>
                void handleBrandThemeChange(nextBrandTheme)
              }
              onSelectLanguage={(nextLanguage) =>
                void handleLanguageChange(nextLanguage)
              }
              onSelectTheme={(nextTheme) => void handleThemeChange(nextTheme)}
              shortcuts={shortcuts}
              t={t}
              themeSetting={themeSetting}
            />

            {/* SECTION 2: TRANSACTION SETUP & DATA MANAGEMENT */}
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

            {/* SECTION 3: DATA & PRIVACY */}
            <View style={styles.privacySection}>
              <Text
                style={[
                  styles.sectionHeaderLabel,
                  { color: colors.textSecondary },
                ]}
              >
                {t.settings.dataPrivacy}
              </Text>
              <SettingsVaultBanner
                description={t.settings.dataDesc}
                title={t.settings.localDataTitle}
              />
            </View>

            {/* SECTION 4: DANGER ZONE */}
            <SettingsDangerZoneCard
              language={language}
              onRequestReset={requestReset}
              resetting={resetting}
              t={t}
            />

            {/* SECTION 5: ABOUT */}
            <SettingsAboutFooter
              aboutDesc={t.settings.aboutDesc}
              appName={Constants.expoConfig?.name ?? t.auth.appName}
              onReplayIntroduction={handleReplayIntroduction}
              replayIntroductionLabel={t.settings.viewIntroduction}
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
        onSelectCurrency={handleSelectCurrency}
        selectedCode={overview?.currencyCode ?? currencyCode}
        visible={currencyPickerVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    gap: spacing.lg,
    maxWidth: contentMaxWidth,
    paddingBottom: spacing.xxl + 24,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    width: '100%',
  },
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginLeft: -spacing.sm,
    width: 40,
  },
  errorPanel: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorText: {
    ...typography.metadata,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.65,
  },
  privacySection: {
    gap: spacing.xs,
  },
  sectionHeaderLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xs,
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
