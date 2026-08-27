import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import type { ColorPalette } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type OnboardingMode = 'first_run' | 'replay';

type OnboardingScreenProps = Readonly<{
  mode: OnboardingMode;
  onFinish(): Promise<void> | void;
}>;

type PageId = 'record' | 'impact';

const PAGES: readonly PageId[] = ['record', 'impact'];

/**
 * THESIS: One quick entry visibly becomes useful financial understanding; this
 * refuses the generic feature-carousel onboarding pattern.
 * OWN-WORLD: Material-native blue actions, quiet ledger surfaces, and finance
 * data rendered as the illustration itself.
 * STORY: See a transaction captured, see its effect, then sign in and do it.
 * FIRST VIEWPORT: A working-example stage leads; concise copy and the primary
 * action sit below, with progress and Skip always clear.
 * FORM: Input → Impact, selected grounded structure; seed 2a6c145b.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
 */
export function OnboardingScreen({ mode, onFinish }: OnboardingScreenProps) {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const listRef = useRef<FlatList<PageId>>(null);
  const [reveal] = useState(() => new Animated.Value(1));
  const [activeIndex, setActiveIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const pageWidth = Math.min(width, 520);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      reveal.setValue(1);
      return;
    }
    reveal.setValue(0.82);
    Animated.timing(reveal, {
      duration: 260,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, reduceMotion, reveal]);

  const goToPage = useCallback(
    (index: number) => {
      listRef.current?.scrollToOffset({
        animated: !reduceMotion,
        offset: pageWidth * index,
      });
      setActiveIndex(index);
    },
    [pageWidth, reduceMotion],
  );

  useEffect(() => {
    if (activeIndex === 0) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        goToPage(activeIndex - 1);
        return true;
      },
    );
    return () => subscription.remove();
  }, [activeIndex, goToPage]);

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await onFinish();
    } finally {
      setFinishing(false);
    }
  }, [finishing, onFinish]);

  const handlePrimaryAction = useCallback(() => {
    if (activeIndex < PAGES.length - 1) {
      goToPage(activeIndex + 1);
    } else {
      void finish();
    }
  }, [activeIndex, finish, goToPage]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      setActiveIndex(Math.max(0, Math.min(PAGES.length - 1, index)));
    },
    [pageWidth],
  );

  const renderPage = useCallback(
    ({ item }: { item: PageId }) => (
      <ScrollView
        contentContainerStyle={styles.pageScrollContent}
        showsVerticalScrollIndicator={false}
        style={{ width: pageWidth }}
      >
        <Animated.View
          style={[
            styles.page,
            {
              opacity: reveal,
              transform: [
                {
                  translateY: reveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {item === 'record' ? (
            <RecordPage colors={colors} isDark={isDark} t={t.onboarding} />
          ) : (
            <ImpactPage colors={colors} isDark={isDark} t={t.onboarding} />
          )}
        </Animated.View>
      </ScrollView>
    ),
    [colors, isDark, pageWidth, reveal, t.onboarding],
  );

  const finalLabel = mode === 'replay' ? t.onboarding.done : t.onboarding.start;

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons
              color={colors.onPrimary}
              name="wallet-outline"
              size={18}
            />
          </View>
          <Text style={[styles.brandName, { color: colors.textPrimary }]}>
            {t.auth.appName}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={
            mode === 'replay' ? t.onboarding.close : t.onboarding.skip
          }
          accessibilityRole="button"
          disabled={finishing}
          hitSlop={8}
          onPress={() => void finish()}
          style={({ pressed }) => [
            styles.skipButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            {mode === 'replay' ? t.onboarding.close : t.onboarding.skip}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={PAGES}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          index,
          length: pageWidth,
          offset: pageWidth * index,
        })}
        horizontal
        keyExtractor={(item) => item}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        pagingEnabled
        ref={listRef}
        renderItem={renderPage}
        showsHorizontalScrollIndicator={false}
        style={[styles.pager, { width: pageWidth }]}
      />

      <View style={[styles.footer, { maxWidth: pageWidth }]}>
        <View
          accessibilityLabel={t.onboarding.progress(activeIndex + 1)}
          style={styles.progressRow}
        >
          {PAGES.map((page, index) => (
            <View
              key={page}
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    index === activeIndex ? colors.primary : colors.border,
                  width: index === activeIndex ? 24 : 8,
                },
              ]}
            />
          ))}
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {activeIndex + 1}/{PAGES.length}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={
            activeIndex === PAGES.length - 1 ? finalLabel : t.onboarding.next
          }
          accessibilityRole="button"
          accessibilityState={{ busy: finishing, disabled: finishing }}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.16)' }}
          disabled={finishing}
          onPress={handlePrimaryAction}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.primary },
            pressed && Platform.OS === 'ios' ? styles.primaryPressed : null,
            finishing ? styles.disabled : null,
          ]}
        >
          <Text style={[styles.primaryLabel, { color: colors.onPrimary }]}>
            {activeIndex === PAGES.length - 1 ? finalLabel : t.onboarding.next}
          </Text>
          <MaterialCommunityIcons
            color={colors.onPrimary}
            name={activeIndex === PAGES.length - 1 ? 'check' : 'arrow-right'}
            size={20}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

type PageProps = {
  colors: ColorPalette;
  isDark: boolean;
  t: ReturnType<typeof useLanguage>['t']['onboarding'];
};

function RecordPage({ colors, isDark, t }: PageProps) {
  return (
    <>
      <View
        style={[
          styles.demoStage,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.demoHeader}>
          <View>
            <Text style={[styles.demoTitle, { color: colors.textPrimary }]}>
              {t.demoExpense}
            </Text>
            <Text style={[styles.demoMeta, { color: colors.textSecondary }]}>
              {t.demoToday}
            </Text>
          </View>
          <View
            style={[
              styles.savedBadge,
              { backgroundColor: colors.incomeBackground },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.positive}
              name="check-circle"
              size={15}
            />
            <Text style={[styles.savedText, { color: colors.positive }]}>
              {t.demoSaved}
            </Text>
          </View>
        </View>
        <Text style={[styles.demoAmount, { color: colors.textPrimary }]}>
          Rp 25.000
        </Text>
        <DemoField
          colors={colors}
          icon="food-fork-drink"
          iconBackground={isDark ? '#3A2416' : '#FFEDD5'}
          iconColor={isDark ? '#FB923C' : '#EA580C'}
          label={t.demoCategoryLabel}
          value={t.demoCategory}
        />
        <View
          style={[styles.demoDivider, { backgroundColor: colors.divider }]}
        />
        <DemoField
          colors={colors}
          icon="cash"
          iconBackground={colors.primaryLight}
          iconColor={colors.primary}
          label={t.demoWalletLabel}
          value={t.demoWallet}
        />
      </View>
      <PageCopy
        colors={colors}
        description={t.recordDescription}
        title={t.recordTitle}
      />
    </>
  );
}

function ImpactPage({ colors, isDark, t }: PageProps) {
  return (
    <>
      <View
        style={[
          styles.demoStage,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.impactTopRow}>
          <View>
            <Text style={[styles.demoMeta, { color: colors.textSecondary }]}>
              {t.demoTodaySpending}
            </Text>
            <Text style={[styles.impactAmount, { color: colors.textPrimary }]}>
              Rp 25.000
            </Text>
          </View>
          <View
            style={[
              styles.impactIcon,
              { backgroundColor: colors.expenseBackground },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.destructive}
              name="chart-timeline-variant"
              size={24}
            />
          </View>
        </View>
        <View style={[styles.impactTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.impactTrackValue,
              { backgroundColor: colors.primary },
            ]}
          />
        </View>
        <View style={[styles.transactionRow, { borderColor: colors.divider }]}>
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: isDark ? '#3A2416' : '#FFEDD5' },
            ]}
          >
            <MaterialCommunityIcons
              color={isDark ? '#FB923C' : '#EA580C'}
              name="food-fork-drink"
              size={22}
            />
          </View>
          <View style={styles.demoFieldCopy}>
            <Text
              style={[styles.demoFieldValue, { color: colors.textPrimary }]}
            >
              {t.demoCategory}
            </Text>
            <Text style={[styles.demoMeta, { color: colors.textSecondary }]}>
              {t.demoWallet} · {t.demoToday}
            </Text>
          </View>
          <Text
            style={[styles.transactionAmount, { color: colors.destructive }]}
          >
            − Rp 25.000
          </Text>
        </View>
        <View
          style={[
            styles.localAssurance,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <MaterialCommunityIcons
            color={colors.primary}
            name="cellphone-lock"
            size={18}
          />
          <Text
            style={[styles.localAssuranceText, { color: colors.textPrimary }]}
          >
            {t.localAssurance}
          </Text>
        </View>
      </View>
      <PageCopy
        colors={colors}
        description={t.impactDescription}
        title={t.impactTitle}
      >
        <View style={styles.identityNote}>
          <MaterialCommunityIcons
            color={colors.textMuted}
            name="google"
            size={15}
          />
          <Text style={[styles.identityNoteText, { color: colors.textMuted }]}>
            {t.identityNote}
          </Text>
        </View>
      </PageCopy>
    </>
  );
}

function DemoField({
  colors,
  icon,
  iconBackground,
  iconColor,
  label,
  value,
}: {
  colors: ColorPalette;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconBackground: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.demoFieldRow}>
      <View style={[styles.categoryIcon, { backgroundColor: iconBackground }]}>
        <MaterialCommunityIcons color={iconColor} name={icon} size={22} />
      </View>
      <View style={styles.demoFieldCopy}>
        <Text style={[styles.demoFieldLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
        <Text style={[styles.demoFieldValue, { color: colors.textPrimary }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function PageCopy({
  children,
  colors,
  description,
  title,
}: React.PropsWithChildren<{
  colors: ColorPalette;
  description: string;
  title: string;
}>) {
  return (
    <View style={styles.copyBlock}>
      <Text
        accessibilityRole="header"
        style={[styles.pageTitle, { color: colors.textPrimary }]}
      >
        {title}
      </Text>
      <Text style={[styles.pageDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  brandMark: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  brandName: { ...typography.secondary, fontWeight: '800' },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copyBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  demoAmount: {
    ...typography.displayAmount,
    fontSize: 36,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    lineHeight: 44,
  },
  demoDivider: { height: StyleSheet.hairlineWidth },
  demoFieldCopy: { flex: 1, gap: 1 },
  demoFieldLabel: { ...typography.metadata, fontSize: 11 },
  demoFieldRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  demoFieldValue: { ...typography.secondary, fontWeight: '700' },
  demoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  demoMeta: { ...typography.metadata },
  demoStage: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    width: '100%',
  },
  demoTitle: { ...typography.secondary, fontWeight: '800' },
  disabled: { opacity: 0.65 },
  footer: {
    alignSelf: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  identityNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  identityNoteText: {
    ...typography.metadata,
    flexShrink: 1,
    textAlign: 'center',
  },
  impactAmount: {
    ...typography.pageTitle,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    lineHeight: 34,
    marginTop: 2,
  },
  impactIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  impactTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  impactTrack: {
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
  },
  impactTrackValue: {
    borderRadius: radius.pill,
    height: '100%',
    width: '34%',
  },
  localAssurance: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  localAssuranceText: {
    ...typography.metadata,
    flex: 1,
    fontWeight: '700',
  },
  page: { gap: spacing.lg, maxWidth: 472, width: '100%' },
  pageDescription: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 390,
    textAlign: 'center',
  },
  pageScrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pageTitle: {
    ...typography.pageTitle,
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 33,
    maxWidth: 400,
    textAlign: 'center',
  },
  pager: { alignSelf: 'center', flex: 1 },
  pressed: { opacity: 0.65 },
  primaryButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    elevation: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  primaryLabel: { ...typography.body, fontWeight: '800' },
  primaryPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  progressDot: { borderRadius: radius.pill, height: 8 },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
    justifyContent: 'center',
    minHeight: 16,
  },
  progressText: {
    ...typography.metadata,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  safeArea: { flex: 1 },
  savedBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.sm + 2,
  },
  savedText: { ...typography.metadata, fontWeight: '800' },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 56,
    paddingHorizontal: spacing.sm,
  },
  skipText: { ...typography.secondary, fontWeight: '700' },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  transactionAmount: {
    ...typography.secondary,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  transactionRow: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingTop: spacing.md,
  },
});
