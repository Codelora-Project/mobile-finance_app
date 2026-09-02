import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/auth-context';
import { useReduceMotion } from '@/lib/accessibility/use-reduce-motion';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function LoginScreen() {
  const { clearError, error, isBusy, signInWithGoogle, status } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const reduceMotion = useReduceMotion();
  const authCopy = t.auth;
  const previewCopy = authCopy.preview;

  // Gentle, organic floating animation values (Native Driver powered)
  const floatAnimTop = useMemo(() => new Animated.Value(0), []);
  const floatAnimBottom = useMemo(() => new Animated.Value(0), []);
  const floatAnimMain = useMemo(() => new Animated.Value(0), []);

  // Staggered entry animation values
  const entryBrandOp = useMemo(() => new Animated.Value(0), []);
  const entryBrandTY = useMemo(() => new Animated.Value(-10), []);
  const entryCopyOp = useMemo(() => new Animated.Value(0), []);
  const entryCopyTY = useMemo(() => new Animated.Value(-6), []);
  const entryPreviewOp = useMemo(() => new Animated.Value(0), []);
  const entryPreviewScale = useMemo(() => new Animated.Value(0.95), []);
  const entryTagsOp = useMemo(() => new Animated.Value(0), []);
  const entryBottomOp = useMemo(() => new Animated.Value(0), []);
  const entryBottomTY = useMemo(() => new Animated.Value(14), []);

  useEffect(() => {
    if (reduceMotion) {
      floatAnimTop.setValue(0);
      floatAnimBottom.setValue(0);
      floatAnimMain.setValue(0);
      return;
    }
    // Top chip: 2.6s floating cycle
    const animTop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimTop, {
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimTop, {
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    // Bottom chip: 3.2s counter-phase floating cycle
    const animBottom = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimBottom, {
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimBottom, {
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    // Main card: subtle 4.0s breathing levitation
    const animMain = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimMain, {
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimMain, {
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    animTop.start();
    animBottom.start();
    animMain.start();

    return () => {
      animTop.stop();
      animBottom.stop();
      animMain.stop();
    };
  }, [floatAnimBottom, floatAnimMain, floatAnimTop, reduceMotion]);

  // Staggered entry animation sequence: Badge -> Headline -> Preview -> Tags -> CTA
  useEffect(() => {
    if (reduceMotion) {
      entryBrandOp.setValue(1);
      entryBrandTY.setValue(0);
      entryCopyOp.setValue(1);
      entryCopyTY.setValue(0);
      entryPreviewOp.setValue(1);
      entryPreviewScale.setValue(1);
      entryTagsOp.setValue(1);
      entryBottomOp.setValue(1);
      entryBottomTY.setValue(0);
      return;
    }
    const entrySequence = Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(entryBrandOp, {
          duration: 450,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(entryBrandTY, {
          duration: 450,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(entryCopyOp, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(entryCopyTY, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(entryPreviewOp, {
          duration: 550,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(entryPreviewScale, {
          duration: 550,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(entryTagsOp, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(entryBottomOp, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(entryBottomTY, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    ]);
    entrySequence.start();
  }, [
    entryBrandOp,
    entryBrandTY,
    entryCopyOp,
    entryCopyTY,
    entryPreviewOp,
    entryPreviewScale,
    entryTagsOp,
    entryBottomOp,
    entryBottomTY,
    reduceMotion,
  ]);

  // Interpolations for natural floating physics
  const topTranslateY = useMemo(
    () =>
      floatAnimTop.interpolate({
        inputRange: [0, 1],
        outputRange: [-4, 4],
      }),
    [floatAnimTop],
  );
  const topRotate = useMemo(
    () =>
      floatAnimTop.interpolate({
        inputRange: [0, 1],
        outputRange: ['-1deg', '1.5deg'],
      }),
    [floatAnimTop],
  );

  const bottomTranslateY = useMemo(
    () =>
      floatAnimBottom.interpolate({
        inputRange: [0, 1],
        outputRange: [4, -4],
      }),
    [floatAnimBottom],
  );
  const bottomRotate = useMemo(
    () =>
      floatAnimBottom.interpolate({
        inputRange: [0, 1],
        outputRange: ['1.5deg', '-1deg'],
      }),
    [floatAnimBottom],
  );

  const mainTranslateY = useMemo(
    () =>
      floatAnimMain.interpolate({
        inputRange: [0, 1],
        outputRange: [-2, 2],
      }),
    [floatAnimMain],
  );

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
          {/* ── Upper Content: Brand Badge + Headline + Preview + Trust Tags ── */}
          <View style={styles.heroGroup}>
            {/* App Brand Badge */}
            <Animated.View
              style={[
                styles.brandBadge,
                {
                  backgroundColor: isDark
                    ? 'rgba(59, 130, 246, 0.12)'
                    : colors.primaryLight,
                  borderColor: isDark
                    ? 'rgba(59, 130, 246, 0.28)'
                    : 'rgba(37, 99, 235, 0.2)',
                  opacity: entryBrandOp,
                  transform: [{ translateY: entryBrandTY }],
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
            </Animated.View>

            {/* Value Headline & Description */}
            <Animated.View
              style={[
                styles.copyBlock,
                {
                  opacity: entryCopyOp,
                  transform: [{ translateY: entryCopyTY }],
                },
              ]}
            >
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
            </Animated.View>

            {/* Floating Dashboard Preview Stack */}
            <Animated.View
              style={[
                styles.previewSection,
                {
                  opacity: entryPreviewOp,
                  transform: [{ scale: entryPreviewScale }],
                },
              ]}
            >
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

              {/* Animated Top Floating Micro-Chip */}
              <Animated.View
                style={[
                  styles.floatingChipTop,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? '#27272A' : '#E2E8F0',
                    shadowColor: colors.shadow,
                    transform: [
                      { translateY: topTranslateY },
                      { rotate: topRotate },
                    ],
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
                <Text style={[styles.chipTitle, { color: colors.textPrimary }]}>
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
              </Animated.View>

              {/* Animated Main Floating Dashboard Card */}
              <Animated.View
                style={[
                  styles.mainCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? '#27272A' : '#E2E8F0',
                    shadowColor: colors.shadow,
                    transform: [{ translateY: mainTranslateY }],
                  },
                ]}
              >
                {/* Card Top Row */}
                <View style={styles.mainCardHeader}>
                  <View style={styles.mainCardLabelRow}>
                    <MaterialCommunityIcons
                      color={colors.primary}
                      name="shield-check"
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
                          ? 'rgba(59, 130, 246, 0.16)'
                          : colors.primaryLight,
                        borderColor: isDark
                          ? 'rgba(59, 130, 246, 0.3)'
                          : 'rgba(37, 99, 235, 0.2)',
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
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  numberOfLines={1}
                  style={[styles.mainCardAmount, { color: colors.textPrimary }]}
                >
                  {previewCopy.totalBalanceValue}
                </Text>

                {/* Clean Minimalist Horizontal Divider */}
                <View
                  style={[
                    styles.cardDivider,
                    { backgroundColor: isDark ? '#27272A' : '#F1F5F9' },
                  ]}
                />

                {/* Income & Expense Clean Minimalist Breakdown (Stacked labels to avoid overlap) */}
                <View style={styles.mainCardBreakdownRow}>
                  {/* Income */}
                  <View style={styles.breakdownCol}>
                    <View style={styles.breakdownLabelRow}>
                      <View
                        style={[
                          styles.metricDot,
                          { backgroundColor: colors.positive },
                        ]}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.breakdownLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {previewCopy.incomeLabel}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.breakdownValueText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {previewCopy.incomeValue}
                    </Text>
                  </View>

                  {/* Center Vertical Divider */}
                  <View
                    style={[
                      styles.verticalDivider,
                      { backgroundColor: isDark ? '#27272A' : '#E2E8F0' },
                    ]}
                  />

                  {/* Expense */}
                  <View style={styles.breakdownCol}>
                    <View style={styles.breakdownLabelRow}>
                      <View
                        style={[
                          styles.metricDot,
                          { backgroundColor: colors.destructive },
                        ]}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.breakdownLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {previewCopy.expenseLabel}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.breakdownValueText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {previewCopy.expenseValue}
                    </Text>
                  </View>
                </View>

                {/* Second Divider for Budget Bar */}
                <View
                  style={[
                    styles.cardDivider,
                    { backgroundColor: isDark ? '#27272A' : '#F1F5F9' },
                  ]}
                />

                {/* Monthly Budget Progress Section (Option A Visual Richness) */}
                <View style={styles.budgetSection}>
                  <View style={styles.budgetHeaderRow}>
                    <View style={styles.budgetLabelWrap}>
                      <MaterialCommunityIcons
                        color={colors.primary}
                        name="chart-donut"
                        size={13}
                      />
                      <Text
                        style={[
                          styles.budgetLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {previewCopy.budgetLabel}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.budgetUsedText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {previewCopy.budgetUsed}
                    </Text>
                  </View>

                  {/* Progress Track & Fill */}
                  <View
                    style={[
                      styles.budgetTrack,
                      { backgroundColor: isDark ? '#27272A' : '#F1F5F9' },
                    ]}
                  >
                    <View
                      style={[
                        styles.budgetFill,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.budgetRemainingText,
                      { color: colors.textMuted },
                    ]}
                  >
                    {previewCopy.budgetRemaining}
                  </Text>
                </View>
              </Animated.View>

              {/* Animated Bottom Floating Micro-Chip */}
              <Animated.View
                style={[
                  styles.floatingChipBottom,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? '#27272A' : '#E2E8F0',
                    shadowColor: colors.shadow,
                    transform: [
                      { translateY: bottomTranslateY },
                      { rotate: bottomRotate },
                    ],
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
                <Text style={[styles.chipTitle, { color: colors.textPrimary }]}>
                  {previewCopy.tx2Title}
                </Text>
                <Text
                  style={[
                    styles.chipAmountPositive,
                    { color: colors.positive },
                  ]}
                >
                  {previewCopy.tx2Amount}
                </Text>
              </Animated.View>
            </Animated.View>

            {/* Curated Vector Micro-Icons Trust Tags */}
            <Animated.View style={[styles.tagsRow, { opacity: entryTagsOp }]}>
              <View
                style={[
                  styles.tagPill,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : colors.surface,
                    borderColor: isDark ? '#27272A' : '#E2E8F0',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="database-lock-outline"
                  size={14}
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
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : colors.surface,
                    borderColor: isDark ? '#27272A' : '#E2E8F0',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.positive}
                  name="shield-check-outline"
                  size={14}
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
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : colors.surface,
                    borderColor: isDark ? '#27272A' : '#E2E8F0',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="lock-outline"
                  size={14}
                />
                <Text
                  style={[styles.tagPillText, { color: colors.textSecondary }]}
                >
                  {previewCopy.tagPrivate}
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* ── Bottom Content: CTA & Privacy Footnote ── */}
          <Animated.View
            style={[
              styles.bottomGroup,
              {
                opacity: entryBottomOp,
                transform: [{ translateY: entryBottomTY }],
              },
            ]}
          >
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

            {/* High-Contrast Tactile Google Sign-In Button */}
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
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(0, 0, 0, 0.08)',
              }}
              disabled={isBusy}
              onPress={() => void signInWithGoogle()}
              style={({ pressed }) => [
                styles.googleButton,
                {
                  backgroundColor: isDark ? colors.surface : '#FFFFFF',
                  borderColor: isDark ? '#3F3F46' : '#D1D5DB',
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
          </Animated.View>
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
    top: 20,
    width: 260,
  },
  bottomGroup: {
    gap: spacing.sm + 2,
    marginTop: spacing.xs,
    width: '100%',
  },
  brandBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
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
  breakdownCol: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  breakdownLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  breakdownLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  breakdownValueText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '800',
  },
  budgetFill: {
    borderRadius: radius.pill,
    height: '100%',
    width: '65%',
  },
  budgetHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  budgetLabelWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  budgetRemainingText: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
    textAlign: 'right',
  },
  budgetSection: {
    gap: 3,
    marginTop: 1,
  },
  budgetTrack: {
    borderRadius: radius.pill,
    height: 6,
    marginTop: 2,
    overflow: 'hidden',
    width: '100%',
  },
  budgetUsedText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  buttonDisabled: { opacity: 0.65 },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  cardDivider: {
    height: 1,
    marginVertical: 6,
  },
  chipAmountNegative: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
  },
  chipAmountPositive: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
  },
  chipIconWrap: {
    alignItems: 'center',
    borderRadius: 7,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  chipTitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  container: {
    alignItems: 'center',
    gap: spacing.md + 2,
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
    elevation: 4,
    flexDirection: 'row',
    gap: 6,
    left: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    position: 'absolute',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    zIndex: 4,
  },
  floatingChipTop: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    position: 'absolute',
    right: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    top: 2,
    zIndex: 4,
  },
  googleButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    elevation: 5,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    width: '100%',
  },
  googleButtonText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  heroDescription: {
    ...typography.body,
    fontSize: 13.5,
    lineHeight: 19,
    maxWidth: 350,
    textAlign: 'center',
  },
  heroGroup: {
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  heroTitle: {
    ...typography.pageTitle,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 30,
    maxWidth: 350,
    textAlign: 'center',
  },
  mainCard: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    width: '94%',
  },
  mainCardAmount: {
    ...typography.displayAmount,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 34,
    marginTop: 2,
  },
  mainCardBreakdownRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
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
    fontWeight: '700',
  },
  metricDot: {
    borderRadius: radius.pill,
    height: 7,
    width: 7,
  },
  previewSection: {
    alignItems: 'center',
    height: 248,
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  privacyNote: {
    ...typography.metadata,
    flexShrink: 1,
    fontSize: 11.5,
    lineHeight: 16,
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
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  speedBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagPillText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    justifyContent: 'center',
    marginTop: -2,
  },
  verticalDivider: {
    alignSelf: 'stretch',
    width: 1,
  },
});
