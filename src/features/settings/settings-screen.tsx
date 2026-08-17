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
import { formatShortcutLabel } from '@/lib/money';
import { parseIntegerInput } from '@/lib/strings';
import { useTheme, type ThemeSetting } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function SettingsScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { colors, isDark, setThemeSetting, themeSetting } = useTheme();

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
    const parsed = parseIntegerInput(newShortcutInput);
    if (!parsed) {
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

    const next = [...shortcuts, parsed].sort((a, b) => a - b);
    void handleSaveShortcuts(next);
    setNewShortcutInput('');
    setShortcutError(null);
    setAddShortcutModalVisible(false);
  }, [
    handleSaveShortcuts,
    newShortcutInput,
    shortcuts,
    t.settings.errorShortcutDuplicate,
    t.settings.errorShortcutInvalid,
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
                    size={22}
                  />
                </View>
                <View style={styles.vaultTextContainer}>
                  <Text
                    style={[styles.vaultTitle, { color: colors.textPrimary }]}
                  >
                    Offline & Private Vault
                  </Text>
                  <Text
                    style={[styles.vaultDesc, { color: colors.textSecondary }]}
                  >
                    {t.settings.dataDesc}
                  </Text>
                </View>
              </View>
            </View>

            {/* SECTION 1: TAMPILAN & PREFERENSI (Appearance & Preferences) */}
            <View style={styles.sectionGroup}>
              <Text
                style={[
                  styles.sectionHeaderLabel,
                  { color: colors.textSecondary },
                ]}
              >
                {language === 'id'
                  ? 'TAMPILAN & SHORTCUT'
                  : 'APPEARANCE & SHORTCUTS'}
              </Text>

              <View
                style={[
                  styles.groupedCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* 🌓 Theme Mode */}
                <View style={styles.cardItemPadding}>
                  <View style={styles.itemHeaderBetween}>
                    <View style={styles.iconTitleRow}>
                      <View
                        style={[
                          styles.itemIconBadge,
                          {
                            backgroundColor: isDark
                              ? colors.surfaceSecondary
                              : '#EEF2FF',
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          color={colors.primary}
                          name="theme-light-dark"
                          size={18}
                        />
                      </View>
                      <Text
                        accessibilityRole="header"
                        style={[
                          styles.itemTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {t.settings.themeSection}
                      </Text>
                    </View>
                  </View>

                  {/* Segmented Pill Selector */}
                  <View
                    style={[
                      styles.themeSegmentTrack,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceSecondary
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    {(
                      [
                        {
                          icon: 'white-balance-sunny',
                          key: 'light',
                          label: t.settings.themeLight,
                        },
                        {
                          icon: 'weather-night',
                          key: 'dark',
                          label: t.settings.themeDark,
                        },
                        {
                          icon: 'cellphone-cog',
                          key: 'system',
                          label: t.settings.themeSystem,
                        },
                      ] as const
                    ).map((item) => {
                      const isSelected = themeSetting === item.key;
                      return (
                        <Pressable
                          accessibilityLabel={`Pilih Tema ${item.label}`}
                          accessibilityRole="button"
                          key={item.key}
                          onPress={() =>
                            setThemeSetting(item.key as ThemeSetting)
                          }
                          style={[
                            styles.themeSegmentTab,
                            isSelected
                              ? [
                                  styles.themeSegmentTabActive,
                                  { backgroundColor: colors.surface },
                                ]
                              : null,
                          ]}
                        >
                          <MaterialCommunityIcons
                            color={
                              isSelected ? colors.primary : colors.textSecondary
                            }
                            name={item.icon}
                            size={16}
                          />
                          <Text
                            adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={[styles.themeSegmentTabText,
                              {
                                color: isSelected
                                  ? colors.primary
                                  : colors.textSecondary,
                                fontWeight: isSelected ? '800' : '600',
                              },
                            ]}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View
                  style={[
                    styles.cardInnerDivider,
                    { backgroundColor: colors.border },
                  ]}
                />

                {/* ⚡ Quick Amount Shortcuts */}
                <View style={styles.cardItemPadding}>
                  <View style={styles.itemHeaderBetween}>
                    <View style={styles.iconTitleRow}>
                      <View
                        style={[
                          styles.itemIconBadge,
                          {
                            backgroundColor: isDark
                              ? colors.surfaceSecondary
                              : '#FEF3C7',
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          color="#D97706"
                          name="lightning-bolt"
                          size={18}
                        />
                      </View>
                      <Text
                        accessibilityRole="header"
                        style={[
                          styles.itemTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {t.settings.shortcutsSection}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={handleResetShortcuts}
                    >
                      <Text
                        style={[
                          styles.resetActionLink,
                          { color: colors.primary },
                        ]}
                      >
                        {t.settings.resetShortcuts}
                      </Text>
                    </Pressable>
                  </View>

                  <Text
                    style={[
                      styles.itemSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.settings.shortcutsDesc}
                  </Text>

                  {/* Shortcut Chips Grid */}
                  <View style={styles.shortcutChipsWrap}>
                    {shortcuts.map((amount) => (
                      <View
                        key={amount}
                        style={[
                          styles.shortcutPillBadge,
                          {
                            backgroundColor: isDark
                              ? colors.surfaceSecondary
                              : '#EFF6FF',
                            borderColor: isDark ? colors.border : '#BFDBFE',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.shortcutPillText,
                            { color: colors.primary },
                          ]}
                        >
                          {formatShortcutLabel(amount)}
                        </Text>
                        <Pressable
                          accessibilityLabel={`Hapus shortcut ${amount}`}
                          accessibilityRole="button"
                          hitSlop={6}
                          onPress={() => handleRemoveShortcut(amount)}
                          style={styles.shortcutRemoveIcon}
                        >
                          <MaterialCommunityIcons
                            color="#EF4444"
                            name="close-circle"
                            size={16}
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>

                  {shortcuts.length < 8 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setShortcutError(null);
                        setAddShortcutModalVisible(true);
                      }}
                      style={[
                        styles.addShortcutCardBtn,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceSecondary
                            : '#F8FAFC',
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={colors.primary}
                        name="plus"
                        size={18}
                      />
                      <Text
                        style={[
                          styles.addShortcutCardText,
                          { color: colors.primary },
                        ]}
                      >
                        {t.settings.addShortcut}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.cardInnerDivider,
                    { backgroundColor: colors.border },
                  ]}
                />

                {/* 🌐 Language Selection */}
                <View style={styles.cardItemPadding}>
                  <View style={styles.iconTitleRow}>
                    <View
                      style={[
                        styles.itemIconBadge,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceSecondary
                            : '#E0F2FE',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color="#0284C7"
                        name="translate"
                        size={18}
                      />
                    </View>
                    <Text
                      accessibilityRole="header"
                      style={[styles.itemTitle, { color: colors.textPrimary }]}
                    >
                      {t.settings.languageSection}
                    </Text>
                  </View>

                  <View style={styles.languagePillsRow}>
                    {/* Indonesian */}
                    <Pressable
                      accessibilityLabel="Pilih Bahasa Indonesia"
                      accessibilityRole="button"
                      onPress={() => void setLanguage('id')}
                      style={[
                        styles.langPillOption,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceSecondary
                            : '#F8FAFC',
                          borderColor: colors.border,
                        },
                        language === 'id'
                          ? [
                              styles.langPillOptionActive,
                              { borderColor: colors.primary },
                            ]
                          : null,
                      ]}
                    >
                      <Text style={styles.langFlagIcon}>🇮🇩</Text>
                      <Text
                        adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={[styles.langOptionText,
                          { color: colors.textPrimary },
                          language === 'id'
                            ? [
                                styles.langOptionTextActive,
                                { color: colors.primary },
                              ]
                            : null,
                        ]}
                      >
                        {t.settings.langIndonesian}
                      </Text>
                    </Pressable>

                    {/* English */}
                    <Pressable
                      accessibilityLabel="Select English language"
                      accessibilityRole="button"
                      onPress={() => void setLanguage('en')}
                      style={[
                        styles.langPillOption,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceSecondary
                            : '#F8FAFC',
                          borderColor: colors.border,
                        },
                        language === 'en'
                          ? [
                              styles.langPillOptionActive,
                              { borderColor: colors.primary },
                            ]
                          : null,
                      ]}
                    >
                      <Text style={styles.langFlagIcon}>🇬🇧</Text>
                      <Text
                        adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={[styles.langOptionText,
                          { color: colors.textPrimary },
                          language === 'en'
                            ? [
                                styles.langOptionTextActive,
                                { color: colors.primary },
                              ]
                            : null,
                        ]}
                      >
                        {t.settings.langEnglish}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            {/* SECTION 2: KELOLA KEUANGAN (Manage Financial Data) */}
            <View style={styles.sectionGroup}>
              <Text
                accessibilityRole="header"
                style={[
                  styles.sectionHeaderLabel,
                  { color: colors.textSecondary },
                ]}
              >
                {t.settings.manageSection}
              </Text>

              <View
                style={[
                  styles.groupedCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Categories Row */}
                <Pressable
                  accessibilityLabel={t.settings.categories}
                  accessibilityRole="button"
                  onPress={() => router.push('/categories')}
                  style={({ pressed }) => [
                    styles.navRowItem,
                    pressed ? styles.rowPressed : null,
                  ]}
                >
                  <View style={styles.navRowLeft}>
                    <View
                      style={[
                        styles.itemIconBadge,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceSecondary
                            : '#FFEDD5',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color="#EA580C"
                        name="tag-multiple-outline"
                        size={19}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.navRowTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {t.settings.categories}
                      </Text>
                      <Text
                        style={[
                          styles.navRowSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {language === 'id'
                          ? 'Kelola kategori pemasukan & pengeluaran'
                          : 'Manage income & expense categories'}
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    color={colors.textSecondary}
                    name="chevron-right"
                    size={22}
                  />
                </Pressable>

                <View
                  style={[
                    styles.cardInnerDivider,
                    { backgroundColor: colors.border },
                  ]}
                />

                {/* Payment Methods Row */}
                <Pressable
                  accessibilityLabel={t.settings.paymentMethods}
                  accessibilityRole="button"
                  onPress={() => router.push('/payment-methods')}
                  style={({ pressed }) => [
                    styles.navRowItem,
                    pressed ? styles.rowPressed : null,
                  ]}
                >
                  <View style={styles.navRowLeft}>
                    <View
                      style={[
                        styles.itemIconBadge,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceSecondary
                            : '#EDE9FE',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color="#7C3AED"
                        name="credit-card-outline"
                        size={19}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.navRowTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {t.settings.paymentMethods}
                      </Text>
                      <Text
                        style={[
                          styles.navRowSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {language === 'id'
                          ? 'Tunai, rekening bank, & e-wallet'
                          : 'Cash, bank accounts, & e-wallets'}
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    color={colors.textSecondary}
                    name="chevron-right"
                    size={22}
                  />
                </Pressable>

                <View
                  style={[
                    styles.cardInnerDivider,
                    { backgroundColor: colors.border },
                  ]}
                />

                {/* Backup & Restore Row */}
                <Pressable
                  accessibilityLabel={t.backup.title}
                  accessibilityRole="button"
                  onPress={() => router.push('/settings/backup')}
                  style={({ pressed }) => [
                    styles.navRowItem,
                    pressed ? styles.rowPressed : null,
                  ]}
                >
                  <View style={styles.navRowLeft}>
                    <View
                      style={[
                        styles.itemIconBadge,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceSecondary
                            : '#DBEAFE',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color="#2563EB"
                        name="database-sync-outline"
                        size={19}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.navRowTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {t.backup.title}
                      </Text>
                      <Text
                        style={[
                          styles.navRowSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t.backup.subtitle}
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    color={colors.textSecondary}
                    name="chevron-right"
                    size={22}
                  />
                </Pressable>

                <View
                  style={[
                    styles.cardInnerDivider,
                    { backgroundColor: colors.border },
                  ]}
                />

                {/* Currency Row (Read Only) */}
                <View
                  accessibilityLabel="Currency, Indonesian Rupiah, IDR, read only"
                  style={styles.navRowItem}
                >
                  <View style={styles.navRowLeft}>
                    <View
                      style={[
                        styles.itemIconBadge,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceSecondary
                            : '#DCFCE7',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color="#16A34A"
                        name="cash"
                        size={19}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.navRowTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {overview.currencyName}
                      </Text>
                      <Text
                        style={[
                          styles.navRowSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {overview.currencyCode}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.readOnlyPillBadge,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceSecondary
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.readOnlyPillText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.settings.readOnly}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* SECTION 3: ZONA DATA & PRIVASI (Danger Zone) */}
            <View style={styles.sectionGroup}>
              <Text
                accessibilityRole="header"
                style={[
                  styles.sectionHeaderLabel,
                  { color: colors.textSecondary },
                ]}
              >
                {t.settings.dataSection}
              </Text>

              <View
                style={[
                  styles.groupedCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
                  },
                ]}
              >
                <Pressable
                  accessibilityLabel={t.settings.deleteAllData}
                  accessibilityRole="button"
                  disabled={resetting}
                  onPress={requestReset}
                  style={({ pressed }) => [
                    styles.navRowItem,
                    pressed ? styles.rowPressed : null,
                  ]}
                >
                  <View style={styles.navRowLeft}>
                    <View
                      style={[
                        styles.itemIconBadge,
                        {
                          backgroundColor: isDark ? '#450A0A' : '#FEE2E2',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color="#EF4444"
                        name="trash-can-outline"
                        size={19}
                      />
                    </View>
                    <View>
                      <Text style={styles.dangerRowTitle}>
                        {t.settings.deleteAllData}
                      </Text>
                      <Text
                        style={[
                          styles.navRowSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {language === 'id'
                          ? 'Hapus seluruh riwayat transaksi & reset data'
                          : 'Delete all records & restore defaults'}
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    color="#EF4444"
                    name="chevron-right"
                    size={22}
                  />
                </Pressable>
              </View>
            </View>

            {/* SECTION 4: TENTANG APLIKASI (About Footer) */}
            <View style={styles.aboutFooterContainer}>
              <Text style={[styles.appName, { color: colors.textPrimary }]}>
                Personal Finance
              </Text>
              <Text
                style={[styles.appVersionText, { color: colors.textSecondary }]}
              >
                {t.settings.version} {Constants.expoConfig?.version ?? '1.0.0'}
              </Text>
              <Text
                style={[styles.aboutDescText, { color: colors.textSecondary }]}
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
            <Text
              style={[styles.secondaryText, { color: colors.textSecondary }]}
            >
              {t.settings.enterShortcutAmount}
            </Text>

            <View
              style={[
                styles.modalInputWrap,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={styles.modalInputPrefix}>Rp</Text>
              <TextInput
                autoFocus
                keyboardType="number-pad"
                onChangeText={(text) => {
                  setNewShortcutInput(text);
                  setShortcutError(null);
                }}
                placeholder="15000"
                placeholderTextColor={colors.textSecondary}
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
  aboutDescText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 320,
    textAlign: 'center',
  },
  aboutFooterContainer: {
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  addShortcutCardBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingVertical: 10,
  },
  addShortcutCardText: {
    fontSize: 13,
    fontWeight: '700',
  },
  appName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  appVersionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardInnerDivider: {
    height: 1,
    marginLeft: 54,
  },
  cardItemPadding: {
    padding: spacing.md,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  dangerRowTitle: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
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
  groupedCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  header: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  iconTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 10,
  },
  itemHeaderBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  itemIconBadge: {
    alignItems: 'center',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  itemSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  itemTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  langFlagIcon: {
    fontSize: 20,
  },
  langOptionText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  langOptionTextActive: {
    fontWeight: '800',
  },
  langPillOption: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  langPillOptionActive: {
    borderWidth: 2,
    elevation: 1,
  },
  languagePillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  modalCard: {
    borderRadius: 22,
    borderWidth: 1,
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
    borderRadius: radius.md,
    borderWidth: 1,
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
  navRowItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  navRowLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 12,
    paddingRight: 8,
  },
  navRowSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  navRowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  readOnlyPillBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  readOnlyPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  resetActionLink: {
    flexShrink: 0,
    fontSize: 13,
    fontWeight: '700',
  },
  rowPressed: {
    opacity: 0.72,
  },
  sectionGroup: {
    gap: spacing.xs + 2,
  },
  sectionHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xs,
    textTransform: 'uppercase',
  },
  shortcutChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  shortcutErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  shortcutPillBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shortcutPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  shortcutRemoveIcon: {
    marginLeft: 2,
  },
  state: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  themeSegmentTab: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  themeSegmentTabActive: {
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  themeSegmentTabText: {
    flexShrink: 1,
    fontSize: 12,
  },
  themeSegmentTrack: {
    borderRadius: radius.md,
    flexDirection: 'row',
    marginTop: spacing.sm,
    padding: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  vaultBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  vaultTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  vaultDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  vaultHeroCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  vaultIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  vaultTextContainer: {
    flex: 1,
  },
  secondaryText: {
    fontSize: typography.secondary.fontSize,
    lineHeight: typography.secondary.lineHeight,
  },
});
