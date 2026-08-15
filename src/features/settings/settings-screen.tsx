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
import {
  getSettingsOverview,
  resetApplicationData,
  type SettingsOverview,
} from '@/features/settings/settings-repository';
import { isCodedError, mapError } from '@/lib/errors';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function SettingsScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
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
      Alert.alert(
        'Data deleted',
        'Transactions, receipts, claims, custom options, and cached exports were removed. Defaults are ready to use.',
        [{ text: 'Done', onPress: () => router.replace('/') }],
      );
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
      'Permanently delete all data?',
      'This cannot be undone. Default categories, payment methods, and IDR settings will be restored.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Data',
          onPress: () => void performReset(),
          style: 'destructive',
        },
      ],
    );
  }

  function requestReset() {
    Alert.alert(
      'Delete all data?',
      'Transactions, receipts, claims, custom categories, custom payment methods, and generated PDFs will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: confirmPermanentReset,
          style: 'destructive',
        },
      ],
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Settings
          </Text>
        </View>

        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.secondaryText}>Loading settings…</Text>
          </View>
        ) : null}

        {error ? (
          <View accessibilityLiveRegion="assertive" style={styles.errorPanel}>
            <Text style={styles.errorText}>{error}</Text>
            {!overview ? (
              <AppButton
                label="Try again"
                onPress={() => void loadSettings()}
              />
            ) : null}
          </View>
        ) : null}

        {overview ? (
          <>
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Manage
              </Text>
              <AppButton
                label="Categories"
                onPress={() => router.push('/categories')}
                variant="secondary"
              />
              <AppButton
                label="Payment Methods"
                onPress={() => router.push('/payment-methods')}
                variant="secondary"
              />
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Currency
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
                <Text style={styles.readOnlyLabel}>Read-only</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Data
              </Text>
              <Text style={styles.secondaryText}>
                All information stays on this device. No account, cloud, or
                telemetry is used.
              </Text>
              <AppButton
                disabled={resetting}
                label="Delete All Data"
                loading={resetting}
                onPress={requestReset}
                variant="destructive"
              />
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                About
              </Text>
              <Text style={styles.rowTitle}>Personal Finance</Text>
              <Text style={styles.secondaryText}>
                Version {Constants.expoConfig?.version ?? '1.0.0'}
              </Text>
              <Text style={styles.secondaryText}>
                Offline-first personal finance for Android. Receipt OCR runs
                on-device.
              </Text>
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
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  readOnlyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  secondaryText: {
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  readOnlyLabel: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
    fontWeight: '600',
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
