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
import {
  getSettingsOverview,
  resetApplicationData,
  type SettingsOverview,
} from '@/features/settings/settings-repository';
import { isCodedError, mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function SettingsScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const resettingRef = useRef(false);
  const [overview, setOverview] = useState<SettingsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await getSettingsOverview(database));
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
          text: t.settings.deleteAllData,
          onPress: () => void performReset(),
          style: 'destructive',
        },
      ],
    );
  }

  function requestReset() {
    Alert.alert(t.settings.deleteDialogTitle, t.settings.deleteDialogDesc, [
      { text: t.settings.cancel, style: 'cancel' },
      {
        text: t.settings.continue,
        onPress: confirmPermanentReset,
        style: 'destructive',
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {t.settings.title}
          </Text>
        </View>

        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.secondaryText}>{t.settings.loading}</Text>
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
            {/* Language Selection Section */}
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {t.settings.languageSection}
              </Text>
              <Text style={styles.secondaryText}>
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
                    language === 'id' ? styles.languageCardSelected : null,
                    pressed ? styles.languageCardPressed : null,
                  ]}
                >
                  <View style={styles.languageCardLeft}>
                    <Text style={styles.languageFlag}>🇮🇩</Text>
                    <Text
                      style={[
                        styles.languageCardText,
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
                    language === 'en' ? styles.languageCardSelected : null,
                    pressed ? styles.languageCardPressed : null,
                  ]}
                >
                  <View style={styles.languageCardLeft}>
                    <Text style={styles.languageFlag}>🇬🇧</Text>
                    <Text
                      style={[
                        styles.languageCardText,
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

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
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

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {t.settings.currencySection}
              </Text>
              <View
                accessibilityLabel="Currency, Indonesian Rupiah, IDR, read only"
                style={styles.readOnlyRow}
              >
                <View>
                  <Text style={styles.rowTitle}>{overview.currencyName}</Text>
                  <Text style={styles.secondaryText}>
                    {overview.currencyCode}
                  </Text>
                </View>
                <Text style={styles.readOnlyLabel}>{t.settings.readOnly}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {t.settings.dataSection}
              </Text>
              <Text style={styles.secondaryText}>{t.settings.dataDesc}</Text>
              <AppButton
                disabled={resetting}
                label={t.settings.deleteAllData}
                loading={resetting}
                onPress={requestReset}
                variant="destructive"
              />
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {t.settings.aboutSection}
              </Text>
              <Text style={styles.rowTitle}>Personal Finance</Text>
              <Text style={styles.secondaryText}>
                {t.settings.version} {Constants.expoConfig?.version ?? '1.0.0'}
              </Text>
              <Text style={styles.secondaryText}>{t.settings.aboutDesc}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    borderBottomColor: '#CBD5E1',
    borderBottomWidth: 1.5,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: typography.pageTitle.lineHeight,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: '#CBD5E1',
    borderRadius: 18,
    borderWidth: 1.5,
    elevation: 2,
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  languageOptions: {
    gap: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  languageCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  languageCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
  },
  languageCardPressed: {
    opacity: 0.75,
  },
  languageCardLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  languageFlag: {
    fontSize: 22,
  },
  languageCardText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '600',
  },
  languageCardTextSelected: {
    color: colors.primary,
    fontWeight: '800',
  },
  readOnlyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  readOnlyLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  state: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  errorPanel: {
    gap: spacing.md,
    marginHorizontal: spacing.lg,
  },
  errorText: {
    color: colors.destructive,
    fontSize: typography.body.fontSize,
  },
});
