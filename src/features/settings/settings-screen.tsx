import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import {
  DEFAULT_QUICK_SHORTCUTS,
  getSettingsOverview,
  resetApplicationData,
  setQuickShortcutsSetting,
  type SettingsOverview,
} from '@/features/settings/settings-repository';
import { isCodedError, mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function formatShortcutLabel(amount: number): string {
  if (amount >= 1_000_000) {
    return `+${amount / 1_000_000}M`;
  }
  if (amount >= 1_000) {
    const k = amount / 1_000;
    return `+${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `+${amount}`;
}

export function SettingsScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { colors, setThemeSetting, themeSetting } = useTheme();

  const resettingRef = useRef(false);
  const [overview, setOverview] = useState<SettingsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shortcuts Customization State
  const [shortcuts, setShortcuts] = useState<number[]>([
    ...DEFAULT_QUICK_SHORTCUTS,
  ]);
  const [addShortcutModalVisible, setAddShortcutModalVisible] = useState(false);
  const [newShortcutInput, setNewShortcutInput] = useState('');
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSettingsOverview(database);
      setOverview(data);
      setShortcuts(data.quickShortcuts);
    } catch (loadError) {
      if (__DEV__) console.warn('Settings load failed.', loadError);
      setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setLoading(false);
    }
  }, [database]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings]),
  );

  const handleSaveShortcuts = useCallback(
    async (nextShortcuts: number[]) => {
      setShortcuts(nextShortcuts);
      try {
        await setQuickShortcutsSetting(database, nextShortcuts);
      } catch (err) {
        if (__DEV__) console.warn('Failed to save shortcuts', err);
      }
    },
    [database],
  );

  const handleAddShortcut = useCallback(() => {
    const parsed = parseInt(newShortcutInput.replace(/\D/g, ''), 10);
    if (!parsed || parsed <= 0) {
      setShortcutError('Masukkan nominal angka yang valid (contoh: 15000).');
      return;
    }
    if (shortcuts.includes(parsed)) {
      setShortcutError('Nominal ini sudah ada di daftar shortcut.');
      return;
    }
    if (shortcuts.length >= 8) {
      setShortcutError(t.settings.shortcutLimit);
      return;
    }

    const next = [...shortcuts, parsed].sort((a, b) => a - b);
    void handleSaveShortcuts(next);
    setNewShortcutInput('');
    setShortcutError(null);
    setAddShortcutModalVisible(false);
  }, [
    handleSaveShortcuts,
    newShortcutInput,
    shortcuts,
    t.settings.shortcutLimit,
  ]);

  const handleRemoveShortcut = useCallback(
    (targetAmount: number) => {
      if (shortcuts.length <= 1) {
        Alert.alert(
          'Minimal 1 Shortcut',
          'Aplikasi membutuhkan minimal 1 tombol shortcut nominal.',
        );
        return;
      }
      const next = shortcuts.filter((amt) => amt !== targetAmount);
      void handleSaveShortcuts(next);
    },
    [handleSaveShortcuts, shortcuts],
  );

  const handleResetShortcuts = useCallback(() => {
    void handleSaveShortcuts([...DEFAULT_QUICK_SHORTCUTS]);
  }, [handleSaveShortcuts]);

  async function performReset() {
    if (resettingRef.current) return;
    resettingRef.current = true;
    setResetting(true);
    setError(null);
    try {
      await resetApplicationData(database);
      Alert.alert(t.settings.dataDeletedTitle, t.settings.dataDeletedDesc, [
        { text: t.settings.done, onPress: () => router.replace('/') },
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
  }

  function confirmPermanentReset() {
    Alert.alert(
      t.settings.permanentDeleteTitle,
      t.settings.permanentDeleteDesc,
      [
        { text: t.settings.cancel, style: 'cancel' },
        {
          onPress: () => void performReset(),
          style: 'destructive',
          text: t.settings.deleteAllData,
        },
      ],
    );
  }

  function requestReset() {
    Alert.alert(t.settings.deleteDialogTitle, t.settings.deleteDialogDesc, [
      { style: 'cancel', text: t.settings.cancel },
      {
        onPress: confirmPermanentReset,
        style: 'destructive',
        text: t.settings.continue,
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
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
            {/* Theme Selection Section */}
            <View style={styles.section}>
              <Text
                accessibilityRole="header"
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                {t.settings.themeSection}
              </Text>
              <Text
                style={[styles.secondaryText, { color: colors.textSecondary }]}
              >
                {t.settings.themeDesc}
              </Text>

              <View style={styles.optionsRow}>
                {/* Light Option */}
                <Pressable
                  accessibilityLabel="Pilih Tema Terang"
                  accessibilityRole="button"
                  onPress={() => setThemeSetting('light')}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    themeSetting === 'light' ? styles.optionCardSelected : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={
                      themeSetting === 'light'
                        ? colors.primary
                        : colors.textSecondary
                    }
                    name="white-balance-sunny"
                    size={22}
                  />
                  <Text
                    style={[
                      styles.optionCardText,
                      { color: colors.textPrimary },
                      themeSetting === 'light'
                        ? styles.optionCardTextSelected
                        : null,
                    ]}
                  >
                    {t.settings.themeLight}
                  </Text>
                </Pressable>

                {/* Dark Option */}
                <Pressable
                  accessibilityLabel="Pilih Tema Gelap"
                  accessibilityRole="button"
                  onPress={() => setThemeSetting('dark')}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    themeSetting === 'dark' ? styles.optionCardSelected : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={
                      themeSetting === 'dark'
                        ? colors.primary
                        : colors.textSecondary
                    }
                    name="weather-night"
                    size={22}
                  />
                  <Text
                    style={[
                      styles.optionCardText,
                      { color: colors.textPrimary },
                      themeSetting === 'dark'
                        ? styles.optionCardTextSelected
                        : null,
                    ]}
                  >
                    {t.settings.themeDark}
                  </Text>
                </Pressable>

                {/* System Option */}
                <Pressable
                  accessibilityLabel="Pilih Tema Sistem"
                  accessibilityRole="button"
                  onPress={() => setThemeSetting('system')}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    themeSetting === 'system'
                      ? styles.optionCardSelected
                      : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={
                      themeSetting === 'system'
                        ? colors.primary
                        : colors.textSecondary
                    }
                    name="cellphone-cog"
                    size={22}
                  />
                  <Text
                    style={[
                      styles.optionCardText,
                      { color: colors.textPrimary },
                      themeSetting === 'system'
                        ? styles.optionCardTextSelected
                        : null,
                    ]}
                  >
                    {t.settings.themeSystem}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Quick Shortcuts Customization Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderBetween}>
                <Text
                  accessibilityRole="header"
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  {t.settings.shortcutsSection}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleResetShortcuts}
                >
                  <Text style={styles.resetLinkText}>
                    {t.settings.resetShortcuts}
                  </Text>
                </Pressable>
              </View>

              <Text
                style={[styles.secondaryText, { color: colors.textSecondary }]}
              >
                {t.settings.shortcutsDesc}
              </Text>

              {/* Shortcut Chips Grid */}
              <View style={styles.shortcutsList}>
                {shortcuts.map((amount) => (
                  <View
                    key={amount}
                    style={[
                      styles.shortcutManageChip,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.shortcutManageText,
                        { color: colors.primary },
                      ]}
                    >
                      {formatShortcutLabel(amount)} (
                      {formatMoney(amount, 'IDR')})
                    </Text>
                    <Pressable
                      accessibilityLabel={`Hapus shortcut ${amount}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => handleRemoveShortcut(amount)}
                      style={styles.removeShortcutBtn}
                    >
                      <MaterialCommunityIcons
                        color="#EF4444"
                        name="close-circle"
                        size={18}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>

              {shortcuts.length < 8 ? (
                <AppButton
                  label={t.settings.addShortcut}
                  onPress={() => {
                    setShortcutError(null);
                    setAddShortcutModalVisible(true);
                  }}
                  variant="secondary"
                />
              ) : null}
            </View>

            {/* Language Selection Section */}
            <View style={styles.section}>
              <Text
                accessibilityRole="header"
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                {t.settings.languageSection}
              </Text>
              <Text
                style={[styles.secondaryText, { color: colors.textSecondary }]}
              >
                {t.settings.languageDesc}
              </Text>

              <View style={styles.languageOptions}>
                {/* Indonesian Option */}
                <Pressable
                  accessibilityLabel="Pilih Bahasa Indonesia"
                  accessibilityRole="button"
                  android_ripple={{ color: '#DBEAFE' }}
                  hitSlop={8}
                  onPress={() => {
                    void setLanguage('id');
                  }}
                  style={({ pressed }) => [
                    styles.languageCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    language === 'id' ? styles.languageCardSelected : null,
                    pressed ? styles.languageCardPressed : null,
                  ]}
                >
                  <View style={styles.languageCardLeft}>
                    <Text style={styles.languageFlag}>🇮🇩</Text>
                    <Text
                      style={[
                        styles.languageCardText,
                        { color: colors.textPrimary },
                        language === 'id'
                          ? styles.languageCardTextSelected
                          : null,
                      ]}
                    >
                      {t.settings.langIndonesian}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    color={language === 'id' ? colors.primary : '#94A3B8'}
                    name={
                      language === 'id' ? 'radiobox-marked' : 'radiobox-blank'
                    }
                    size={26}
                  />
                </Pressable>

                {/* English Option */}
                <Pressable
                  accessibilityLabel="Select English language"
                  accessibilityRole="button"
                  android_ripple={{ color: '#DBEAFE' }}
                  hitSlop={8}
                  onPress={() => {
                    void setLanguage('en');
                  }}
                  style={({ pressed }) => [
                    styles.languageCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    language === 'en' ? styles.languageCardSelected : null,
                    pressed ? styles.languageCardPressed : null,
                  ]}
                >
                  <View style={styles.languageCardLeft}>
                    <Text style={styles.languageFlag}>🇬🇧</Text>
                    <Text
                      style={[
                        styles.languageCardText,
                        { color: colors.textPrimary },
                        language === 'en'
                          ? styles.languageCardTextSelected
                          : null,
                      ]}
                    >
                      {t.settings.langEnglish}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    color={language === 'en' ? colors.primary : '#94A3B8'}
                    name={
                      language === 'en' ? 'radiobox-marked' : 'radiobox-blank'
                    }
                    size={26}
                  />
                </Pressable>
              </View>
            </View>

            {/* Management Section */}
            <View style={styles.section}>
              <Text
                accessibilityRole="header"
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                {t.settings.manageSection}
              </Text>
              <AppButton
                label={t.settings.categories}
                onPress={() => router.push('/categories')}
                variant="secondary"
              />
              <AppButton
                label={t.settings.paymentMethods}
                onPress={() => router.push('/payment-methods')}
                variant="secondary"
              />
            </View>

            {/* Currency Section */}
            <View style={styles.section}>
              <Text
                accessibilityRole="header"
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                {t.settings.currencySection}
              </Text>
              <View
                accessibilityLabel="Currency, Indonesian Rupiah, IDR, read only"
                style={[
                  styles.readOnlyRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View>
                  <Text
                    style={[styles.rowTitle, { color: colors.textPrimary }]}
                  >
                    {overview.currencyName}
                  </Text>
                  <Text
                    style={[
                      styles.secondaryText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {overview.currencyCode}
                  </Text>
                </View>
                <Text style={styles.readOnlyLabel}>{t.settings.readOnly}</Text>
              </View>
            </View>

            {/* Data Management Section */}
            <View style={styles.section}>
              <Text
                accessibilityRole="header"
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                {t.settings.dataSection}
              </Text>
              <Text
                style={[styles.secondaryText, { color: colors.textSecondary }]}
              >
                {t.settings.dataDesc}
              </Text>
              <AppButton
                disabled={resetting}
                label={t.settings.deleteAllData}
                loading={resetting}
                onPress={requestReset}
                variant="destructive"
              />
            </View>

            {/* About Section */}
            <View style={styles.section}>
              <Text
                accessibilityRole="header"
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                {t.settings.aboutSection}
              </Text>
              <Text style={[styles.appName, { color: colors.textPrimary }]}>
                Personal Finance
              </Text>
              <Text
                style={[styles.secondaryText, { color: colors.textSecondary }]}
              >
                {t.settings.version} {Constants.expoConfig?.version ?? '1.0.0'}
              </Text>
              <Text
                style={[styles.secondaryText, { color: colors.textSecondary }]}
              >
                {t.settings.aboutDesc}
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Add Shortcut Modal */}
      <Modal
        animationType="fade"
        onRequestClose={() => setAddShortcutModalVisible(false)}
        transparent
        visible={addShortcutModalVisible}
      >
        <Pressable
          onPress={() => setAddShortcutModalVisible(false)}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t.settings.addShortcut}
            </Text>
            <Text
              style={[styles.secondaryText, { color: colors.textSecondary }]}
            >
              {t.settings.enterShortcutAmount}
            </Text>

            <View style={styles.modalInputWrap}>
              <Text style={styles.modalInputPrefix}>Rp</Text>
              <TextInput
                autoFocus
                keyboardType="number-pad"
                onChangeText={(text) => {
                  setNewShortcutInput(text);
                  setShortcutError(null);
                }}
                placeholder="15000"
                placeholderTextColor="#94A3B8"
                style={[styles.modalInput, { color: colors.textPrimary }]}
                value={newShortcutInput}
              />
            </View>

            {shortcutError ? (
              <Text style={styles.shortcutErrorText}>{shortcutError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <AppButton
                label={t.common.cancel}
                onPress={() => setAddShortcutModalVisible(false)}
                variant="ghost"
              />
              <AppButton
                label={t.common.save}
                onPress={handleAddShortcut}
                variant="primary"
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  appName: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  errorPanel: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorText: {
    color: '#991B1B',
    fontSize: typography.secondary.fontSize,
  },
  header: {
    gap: spacing.xs,
  },
  languageCard: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  languageCardLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  languageCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  languageCardSelected: {
    borderColor: '#2563EB',
    elevation: 2,
    shadowColor: '#2563EB',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  languageCardText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  languageCardTextSelected: {
    color: '#2563EB',
    fontWeight: '800',
  },
  languageFlag: {
    fontSize: 24,
  },
  languageOptions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  modalCard: {
    borderRadius: 20,
    gap: spacing.sm,
    padding: spacing.lg,
    width: '90%',
  },
  modalInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
  },
  modalInputPrefix: {
    color: '#64748B',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 6,
  },
  modalInputWrap: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
    flexDirection: 'row',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '800',
  },
  optionCard: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  optionCardSelected: {
    borderColor: '#2563EB',
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#2563EB',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  optionCardText: {
    fontSize: 12,
    fontWeight: '700',
  },
  optionCardTextSelected: {
    color: '#2563EB',
    fontWeight: '800',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  readOnlyLabel: {
    color: '#64748B',
    fontSize: typography.metadata.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  readOnlyRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  removeShortcutBtn: {
    marginLeft: 2,
  },
  resetLinkText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  rowTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  secondaryText: {
    fontSize: typography.secondary.fontSize,
    lineHeight: typography.secondary.lineHeight,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeaderBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '700',
  },
  shortcutErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  shortcutManageChip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shortcutManageText: {
    fontSize: 13,
    fontWeight: '700',
  },
  shortcutsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  state: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  title: {
    fontSize: typography.pageTitle.fontSize,
    fontWeight: '800',
  },
});
