import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/auth-context';
import { darkColors, lightColors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

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

export function LoginScreen() {
  const { clearError, error, isBusy, signInWithGoogle, status } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const isId = isIndonesianLocale();
  const copy = isId
    ? {
        button: 'Lanjutkan dengan Google',
        description:
          'Masuk sekali dengan Google. Catatan keuangan tetap tersimpan lokal dan dapat digunakan tanpa internet.',
        privacy:
          'Google hanya digunakan untuk identitas akun. Data keuangan tidak dikirim ke Google atau cloud.',
        reauth:
          'Sesi Google berakhir. Silakan login kembali untuk membuka data akun.',
        errors: {
          CONFIGURATION:
            'Konfigurasi Google belum lengkap. Periksa Web Client ID aplikasi.',
          IN_PROGRESS: 'Proses login Google sedang berjalan.',
          OFFLINE: 'Internet diperlukan untuk login Google pertama kali.',
          PLAY_SERVICES:
            'Google Play Services tidak tersedia atau perlu diperbarui.',
          REAUTH_REQUIRED: 'Sesi Google perlu diverifikasi kembali.',
        },
        title: 'Keuangan pribadi, tetap privat',
      }
    : {
        button: 'Continue with Google',
        description:
          'Sign in once with Google. Your financial records stay local and remain available offline.',
        privacy:
          'Google is used only for account identity. Financial data is not sent to Google or the cloud.',
        reauth:
          'Your Google session ended. Sign in again to open this account data.',
        errors: {
          CONFIGURATION:
            'Google configuration is incomplete. Check the app Web Client ID.',
          IN_PROGRESS: 'Google sign-in is already in progress.',
          OFFLINE: 'Internet is required for the first Google sign-in.',
          PLAY_SERVICES:
            'Google Play Services is unavailable or needs an update.',
          REAUTH_REQUIRED: 'Your Google session needs to be verified again.',
        },
        title: 'Personal finance, kept private',
      };

  const errorMessage = error
    ? error.code === 'UNKNOWN'
      ? error.message
      : copy.errors[error.code]
    : null;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons
              color={colors.primary}
              name="wallet-bifold-outline"
              size={42}
            />
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>
            Personal Finance
          </Text>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.textPrimary }]}
          >
            {copy.title}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {copy.description}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {status === 'reauth_required' ? (
            <Text style={[styles.reauth, { color: colors.warning }]}>
              {copy.reauth}
            </Text>
          ) : null}
          {errorMessage ? (
            <Pressable accessibilityRole="button" onPress={clearError}>
              <Text
                accessibilityLiveRegion="assertive"
                style={[styles.error, { color: colors.destructive }]}
              >
                {errorMessage}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={copy.button}
            accessibilityRole="button"
            accessibilityState={{ busy: isBusy, disabled: isBusy }}
            disabled={isBusy}
            onPress={() => void signInWithGoogle()}
            style={({ pressed }) => [
              styles.googleButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed ? styles.pressed : null,
              isBusy ? styles.disabled : null,
            ]}
          >
            {isBusy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <MaterialCommunityIcons
                  color="#4285F4"
                  name="google"
                  size={22}
                />
                <Text
                  style={[styles.buttonLabel, { color: colors.textPrimary }]}
                >
                  {copy.button}
                </Text>
              </>
            )}
          </Pressable>
          <Text style={[styles.privacy, { color: colors.textMuted }]}>
            {copy.privacy}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appName: { ...typography.secondary, fontWeight: '800', letterSpacing: 0.4 },
  buttonLabel: { ...typography.body, fontWeight: '700' },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    width: '100%',
  },
  content: {
    alignItems: 'center',
    flexGrow: 1,
    gap: spacing.xl,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  description: { ...typography.body, maxWidth: 420, textAlign: 'center' },
  disabled: { opacity: 0.55 },
  error: { ...typography.secondary, fontWeight: '600', textAlign: 'center' },
  googleButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  hero: { alignItems: 'center', gap: spacing.md },
  logo: {
    alignItems: 'center',
    borderRadius: 28,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  pressed: { opacity: 0.72 },
  privacy: { ...typography.metadata, textAlign: 'center' },
  reauth: { ...typography.secondary, fontWeight: '600', textAlign: 'center' },
  safeArea: { flex: 1 },
  title: { ...typography.pageTitle, maxWidth: 420, textAlign: 'center' },
});
