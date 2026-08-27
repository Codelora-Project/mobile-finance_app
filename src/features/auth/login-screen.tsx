import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

/**
 * The login continues onboarding's Input → Impact story without replaying it:
 * one quick-record sequence, one Google action, and one calm local-data promise.
 */
export function LoginScreen() {
  const { clearError, error, isBusy, signInWithGoogle, status } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const authCopy = t.auth;

  const errorMessage = error
    ? error.code === 'UNKNOWN'
      ? error.message || authCopy.errors.UNKNOWN
      : authCopy.errors[error.code] || authCopy.errors.UNKNOWN
    : null;

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.brandRow}>
            <View
              style={[styles.brandMark, { backgroundColor: colors.primary }]}
            >
              <MaterialCommunityIcons
                color={colors.onPrimary}
                name="wallet-outline"
                size={20}
              />
            </View>
            <Text style={[styles.brandName, { color: colors.textPrimary }]}>
              {authCopy.appName}
            </Text>
          </View>

          <View
            accessibilityLabel={authCopy.speedSequenceLabel}
            style={[
              styles.quickSequence,
              {
                backgroundColor: colors.primaryLight,
                borderColor: isDark ? colors.primary : colors.border,
              },
            ]}
          >
            <QuickStep
              color={colors.primary}
              icon="cash-fast"
              label="Rp 25.000"
              textColor={colors.textPrimary}
            />
            <MaterialCommunityIcons
              color={colors.textMuted}
              name="chevron-right"
              size={18}
            />
            <QuickStep
              color={isDark ? '#FB923C' : '#EA580C'}
              icon="food-fork-drink"
              label={t.onboarding.demoCategoryShort}
              textColor={colors.textPrimary}
            />
            <MaterialCommunityIcons
              color={colors.textMuted}
              name="chevron-right"
              size={18}
            />
            <QuickStep
              color={colors.positive}
              icon="check-circle-outline"
              label={t.onboarding.demoSaved}
              textColor={colors.textPrimary}
            />
          </View>

          <View style={styles.copyBlock}>
            <Text
              accessibilityRole="header"
              style={[styles.heroTitle, { color: colors.textPrimary }]}
            >
              {authCopy.heroTitle}
            </Text>
            <Text
              style={[styles.heroDescription, { color: colors.textSecondary }]}
            >
              {authCopy.heroDescription}
            </Text>
          </View>

          <View style={styles.actionSection}>
            {status === 'reauth_required' ? (
              <View
                accessibilityRole="alert"
                style={[
                  styles.alertBanner,
                  {
                    backgroundColor: colors.warningBackground,
                    borderColor: isDark ? '#78350F' : '#FDE68A',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.warning}
                  name="alert-circle-outline"
                  size={20}
                />
                <View style={styles.alertCopy}>
                  <Text style={[styles.alertTitle, { color: colors.warning }]}>
                    {authCopy.reauthTitle}
                  </Text>
                  <Text
                    style={[styles.alertMessage, { color: colors.textPrimary }]}
                  >
                    {authCopy.reauthDescription}
                  </Text>
                </View>
              </View>
            ) : null}

            {errorMessage ? (
              <Pressable
                accessibilityLabel={authCopy.dismissErrorLabel}
                accessibilityRole="button"
                onPress={clearError}
                style={[
                  styles.alertBanner,
                  {
                    backgroundColor: colors.expenseBackground,
                    borderColor: isDark ? '#7F1D1D' : '#FECACA',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.destructive}
                  name="alert-circle-outline"
                  size={20}
                />
                <Text
                  accessibilityLiveRegion="assertive"
                  style={[
                    styles.alertMessage,
                    styles.alertCopy,
                    { color: colors.destructive },
                  ]}
                >
                  {errorMessage}
                </Text>
                <MaterialCommunityIcons
                  color={colors.destructive}
                  name="close"
                  size={18}
                />
              </Pressable>
            ) : null}

            <Pressable
              accessibilityHint={authCopy.googleButtonHint}
              accessibilityLabel={
                isBusy ? authCopy.googleButtonLoading : authCopy.googleButton
              }
              accessibilityRole="button"
              accessibilityState={{ busy: isBusy, disabled: isBusy }}
              android_ripple={{
                borderless: false,
                color: isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.06)',
              }}
              disabled={isBusy}
              onPress={() => void signInWithGoogle()}
              style={({ pressed }) => [
                styles.googleButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? '#3F3F46' : '#CBD5E1',
                  shadowColor: colors.shadow,
                },
                pressed && Platform.OS === 'ios' ? styles.buttonPressed : null,
                isBusy ? styles.buttonDisabled : null,
              ]}
            >
              {isBusy ? (
                <>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text
                    style={[
                      styles.googleButtonText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {authCopy.googleButtonLoading}
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    color="#4285F4"
                    name="google"
                    size={22}
                  />
                  <Text
                    style={[
                      styles.googleButtonText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {authCopy.googleButton}
                  </Text>
                </>
              )}
            </Pressable>

            <View style={styles.privacyRow}>
              <MaterialCommunityIcons
                color={colors.textMuted}
                name="cellphone-lock"
                size={16}
              />
              <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
                {authCopy.privacyNote}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickStep({
  color,
  icon,
  label,
  textColor,
}: {
  color: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  textColor: string;
}) {
  return (
    <View style={styles.quickStep}>
      <MaterialCommunityIcons color={color} name={icon} size={23} />
      <Text
        numberOfLines={1}
        style={[styles.quickStepLabel, { color: textColor }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionSection: { gap: spacing.md, width: '100%' },
  alertBanner: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    width: '100%',
  },
  alertCopy: { flex: 1 },
  alertMessage: { ...typography.secondary, fontSize: 13, lineHeight: 18 },
  alertTitle: { ...typography.secondary, fontWeight: '800' },
  brandMark: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  brandName: { ...typography.secondary, fontWeight: '800' },
  brandRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  container: {
    alignItems: 'center',
    gap: spacing.xl,
    maxWidth: 480,
    width: '100%',
  },
  copyBlock: { alignItems: 'center', gap: spacing.sm },
  googleButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    width: '100%',
  },
  googleButtonText: { ...typography.body, fontWeight: '800' },
  heroDescription: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 390,
    textAlign: 'center',
  },
  heroTitle: {
    ...typography.pageTitle,
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 35,
    maxWidth: 390,
    textAlign: 'center',
  },
  privacyNote: {
    ...typography.metadata,
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  privacyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  quickSequence: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    width: '100%',
  },
  quickStep: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs + 2,
    minWidth: 0,
  },
  quickStepLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    maxWidth: '100%',
    textAlign: 'center',
  },
  safeArea: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
});
