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
 * THESIS: A high-trust, privacy-first personal finance authentication screen
 * featuring a live floating dashboard card stack preview that demonstrates
 * speed, clarity, and offline-first peace of mind before signing in.
 *
 * OWN-WORLD: Clean vector micro-icons, floating interactive mockup cards, category pastel tokens,
 * tactile Google Sign-In, dynamic Dark/Light surface contrast, and full a11y.
 */
export function LoginScreen() {
  const { clearError, error, isBusy, signInWithGoogle, status } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const authCopy = t.auth;
  const previewCopy = authCopy.preview;

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
          {/* Top Group: Brand Badge & Floating Preview Stack */}
          <View style={styles.topGroup}>
            {/* App Brand Badge */}
            <View
              style={[
                styles.brandBadge,
                {
                  backgroundColor: isDark
                    ? 'rgba(59, 130, 246, 0.12)'
                    : colors.primaryLight,
                  borderColor: isDark
                    ? 'rgba(59, 130, 246, 0.3)'
                    : 'rgba(37, 99, 235, 0.2)',
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name="wallet-outline"
                size={14}
              />
              <Text style={[styles.brandBadgeText, { color: colors.primary }]}>
                {authCopy.appName}
              </Text>
              <View
                style={[
                  styles.brandBadgeDot,
                  { backgroundColor: colors.positive },
                ]}
              />
              <Text
                style={[
                  styles.brandBadgeTagline,
                  { color: colors.textSecondary },
                ]}
              >
                {authCopy.appTagline}
              </Text>
            </View>

            {/* Floating Dashboard Preview Stack */}
            <View style={styles.previewSection}>
              {/* Ambient subtle glow backdrop */}
              <View
                pointerEvents="none"
                style={[
                  styles.ambientGlow,
                  {
                    backgroundColor: isDark
                      ? 'rgba(59, 130, 246, 0.08)'
                      : 'rgba(37, 99, 235, 0.06)',
                  },
                ]}
              />

              {/* Top Floating Micro-Chip */}
              <View
                style={[
                  styles.floatingChipTop,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? '#303034' : '#E2E8F0',
                    shadowColor: colors.shadow,
                  },
                ]}
              >
                <View
                  style={[
                    styles.chipIconWrap,
                    {
                      backgroundColor: isDark
                        ? 'rgba(234, 88, 12, 0.2)'
                        : '#FFEDD5',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={isDark ? '#FB923C' : '#EA580C'}
                    name="food-fork-drink"
                    size={13}
                  />
                </View>
                <Text
                  style={[styles.chipTitle, { color: colors.textPrimary }]}
                >
                  {previewCopy.tx1Title}
                </Text>
                <Text
                  style={[
                    styles.chipAmountNegative,
                    { color: colors.destructive },
                  ]}
                >
                  {previewCopy.tx1Amount}
                </Text>
              </View>

              {/* Main Floating Dashboard Card */}
              <View
                style={[
                  styles.mainCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? '#303034' : '#E2E8F0',
                    shadowColor: colors.shadow,
                  },
                ]}
              >
                {/* Card Top Row */}
                <View style={styles.mainCardHeader}>
                  <View style={styles.mainCardLabelRow}>
                    <MaterialCommunityIcons
                      color={colors.textSecondary}
                      name="shield-check-outline"
                      size={15}
                    />
                    <Text
                      style={[
                        styles.mainCardSubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {previewCopy.totalBalanceLabel}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.speedBadge,
                      {
                        backgroundColor: isDark
                          ? 'rgba(59, 130, 246, 0.18)'
                          : colors.primaryLight,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={colors.primary}
                      name="lightning-bolt"
                      size={12}
                    />
                    <Text
                      style={[styles.speedBadgeText, { color: colors.primary }]}
                    >
                      {previewCopy.speedBadge}
                    </Text>
                  </View>
                </View>

                {/* Main Balance Display */}
                <Text
                  style={[styles.mainCardAmount, { color: colors.textPrimary }]}
                >
                  {previewCopy.totalBalanceValue}
                </Text>

                {/* Income & Expense Breakdown Pills */}
                <View style={styles.mainCardBreakdownRow}>
                  <View
                    style={[
                      styles.breakdownPill,
                      {
                        backgroundColor: isDark
                          ? 'rgba(74, 222, 128, 0.12)'
                          : '#DCFCE7',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={colors.positive}
                      name="arrow-down-left"
                      size={13}
                    />
                    <Text
                      style={[
                        styles.breakdownLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {previewCopy.incomeLabel}
                    </Text>
                    <Text
                      style={[
                        styles.breakdownValuePositive,
                        { color: colors.positive },
                      ]}
                    >
                      {previewCopy.incomeValue}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.breakdownPill,
                      {
                        backgroundColor: isDark
                          ? 'rgba(251, 113, 133, 0.12)'
                          : '#FEE2E2',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={colors.destructive}
                      name="arrow-up-right"
                      size={13}
                    />
                    <Text
                      style={[
                        styles.breakdownLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {previewCopy.expenseLabel}
                    </Text>
                    <Text
                      style={[
                        styles.breakdownValueNegative,
                        { color: colors.destructive },
                      ]}
                    >
                      {previewCopy.expenseValue}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bottom Floating Micro-Chip */}
              <View
                style={[
                  styles.floatingChipBottom,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? '#303034' : '#E2E8F0',
                    shadowColor: colors.shadow,
                  },
                ]}
              >
                <View
                  style={[
                    styles.chipIconWrap,
                    {
                      backgroundColor: isDark
                        ? 'rgba(74, 222, 128, 0.2)'
                        : '#DCFCE7',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.positive}
                    name="briefcase-outline"
                    size={13}
                  />
                </View>
                <Text
                  style={[styles.chipTitle, { color: colors.textPrimary }]}
                >
                  {previewCopy.tx2Title}
                </Text>
                <Text
                  style={[styles.chipAmountPositive, { color: colors.positive }]}
                >
                  {previewCopy.tx2Amount}
                </Text>
              </View>
            </View>
          </View>

          {/* Middle Group: Value Headline & Vector Trust Tags */}
          <View style={styles.middleGroup}>
            <View style={styles.copyBlock}>
              <Text
                accessibilityRole="header"
                style={[styles.heroTitle, { color: colors.textPrimary }]}
              >
                {authCopy.heroTitle}
              </Text>
              <Text
                style={[
                  styles.heroDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {authCopy.heroDescription}
              </Text>
            </View>

            {/* Curated Vector Micro-Icons Trust Tags */}
            <View style={styles.tagsRow}>
              <View
                style={[
                  styles.tagPill,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="database-lock-outline"
                  size={13}
                />
                <Text
                  style={[styles.tagPillText, { color: colors.textSecondary }]}
                >
                  {previewCopy.tagOffline}
                </Text>
              </View>
              <View
                style={[
                  styles.tagPill,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="shield-check-outline"
                  size={13}
                />
                <Text
                  style={[styles.tagPillText, { color: colors.textSecondary }]}
                >
                  {previewCopy.tagNoAds}
                </Text>
              </View>
              <View
                style={[
                  styles.tagPill,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="lock-outline"
                  size={13}
                />
                <Text
                  style={[styles.tagPillText, { color: colors.textSecondary }]}
                >
                  {previewCopy.tagPrivate}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Group: Action Section & Footnote */}
          <View style={styles.bottomGroup}>
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
                  backgroundColor: isDark ? '#1E1E24' : '#FFFFFF',
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

            {/* Privacy Footnote */}
            <View style={styles.privacyRow}>
              <MaterialCommunityIcons
                color={colors.textMuted}
                name="cellphone-lock"
                size={14}
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

const styles = StyleSheet.create({
  alertBanner: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    width: '100%',
  },
  alertCopy: { flex: 1 },
  alertMessage: { ...typography.secondary, fontSize: 13, lineHeight: 18 },
  alertTitle: { ...typography.secondary, fontWeight: '800' },
  ambientGlow: {
    borderRadius: 140,
    height: 170,
    position: 'absolute',
    top: 25,
    width: 260,
  },
  bottomGroup: {
    gap: spacing.sm + 2,
    marginTop: spacing.md,
    width: '100%',
  },
  brandBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  brandBadgeDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  brandBadgeTagline: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  brandBadgeText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  breakdownLabel: {
    ...typography.metadata,
    fontSize: 10,
  },
  breakdownPill: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  breakdownValueNegative: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '700',
  },
  breakdownValuePositive: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '700',
  },
  buttonDisabled: { opacity: 0.65 },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  chipAmountNegative: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  chipAmountPositive: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  chipIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  chipTitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
    maxWidth: 440,
    width: '100%',
  },
  copyBlock: {
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
  },
  floatingChipBottom: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: 2,
    elevation: 5,
    flexDirection: 'row',
    gap: 6,
    left: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    position: 'absolute',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    zIndex: 4,
  },
  floatingChipTop: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    elevation: 5,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    position: 'absolute',
    right: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    top: 2,
    zIndex: 4,
  },
  googleButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    elevation: 2,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    width: '100%',
  },
  googleButtonText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroDescription: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 350,
    textAlign: 'center',
  },
  heroTitle: {
    ...typography.pageTitle,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 29,
    maxWidth: 350,
    textAlign: 'center',
  },
  mainCard: {
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    elevation: 3,
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    width: '92%',
  },
  mainCardAmount: {
    ...typography.displayAmount,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  mainCardBreakdownRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginTop: 2,
  },
  mainCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mainCardLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  mainCardSubtitle: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  middleGroup: {
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginVertical: spacing.xs,
    width: '100%',
  },
  previewSection: {
    alignItems: 'center',
    height: 218,
    justifyContent: 'center',
    marginTop: spacing.xs,
    position: 'relative',
    width: '100%',
  },
  privacyNote: {
    ...typography.metadata,
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },
  privacyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  safeArea: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  speedBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  speedBadgeText: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '800',
  },
  tagPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tagPillText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    justifyContent: 'center',
  },
  topGroup: {
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
  },
});
