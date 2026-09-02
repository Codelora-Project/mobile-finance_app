import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
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

type PageId = 'record' | 'impact' | 'wallets';

const PAGES: readonly PageId[] = ['record', 'impact', 'wallets'];

export function OnboardingScreen({ mode, onFinish }: OnboardingScreenProps) {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const listRef = useRef<FlatList<PageId>>(null);
  const [reveal] = useState(() => new Animated.Value(1));
  const [floatingAnim] = useState(() => new Animated.Value(0));
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
    if (reduceMotion) return;
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [floatingAnim, reduceMotion]);

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

  const floatTranslateY = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-3, 3],
  });

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
            <RecordPage
              colors={colors}
              floatTranslateY={floatTranslateY}
              isDark={isDark}
              reduceMotion={reduceMotion}
              t={t.onboarding}
            />
          ) : item === 'impact' ? (
            <ImpactPage
              colors={colors}
              floatTranslateY={floatTranslateY}
              isDark={isDark}
              reduceMotion={reduceMotion}
              t={t.onboarding}
            />
          ) : (
            <WalletsPage
              colors={colors}
              floatTranslateY={floatTranslateY}
              isDark={isDark}
              reduceMotion={reduceMotion}
              t={t.onboarding}
            />
          )}
        </Animated.View>
      </ScrollView>
    ),
    [
      colors,
      floatTranslateY,
      isDark,
      pageWidth,
      reduceMotion,
      reveal,
      t.onboarding,
    ],
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
                  width: index === activeIndex ? 26 : 8,
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
  floatTranslateY: Animated.AnimatedInterpolation<number>;
  isDark: boolean;
  reduceMotion: boolean;
  t: ReturnType<typeof useLanguage>['t']['onboarding'];
};

// ==========================================
// 1. SLIDE 1: RECORD (Catat Kilat)
// ==========================================
function RecordPage({
  colors,
  floatTranslateY,
  isDark,
  reduceMotion,
  t,
}: PageProps) {
  const [amountAnim] = useState(
    () => new Animated.Value(reduceMotion ? 1 : 0.7),
  );
  const [categoryAnim] = useState(
    () => new Animated.Value(reduceMotion ? 1 : 0),
  );
  const [walletAnim] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const [badgeAnim] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.spring(amountAnim, {
        bounciness: 8,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(categoryAnim, {
        delay: 100,
        duration: 300,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(walletAnim, {
        delay: 220,
        duration: 300,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(badgeAnim, {
        bounciness: 12,
        delay: 360,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [amountAnim, badgeAnim, categoryAnim, reduceMotion, walletAnim]);

  return (
    <>
      <Animated.View
        style={[
          styles.demoStage,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? '#27272A' : '#E2E8F0',
            shadowColor: colors.shadow,
            transform: [{ translateY: floatTranslateY }],
          },
        ]}
      >
        <View style={styles.demoHeader}>
          <View>
            <Text style={[styles.demoTitle, { color: colors.textPrimary }]}>
              {t.demoExpense}
            </Text>
            <Text style={[styles.demoMeta, { color: colors.textSecondary }]}>
              {t.demoToday} · 19:30
            </Text>
          </View>

          {/* Animated Saved Badge */}
          <Animated.View
            style={[
              styles.savedBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(74, 222, 128, 0.16)'
                  : colors.incomeBackground,
                borderColor: isDark
                  ? 'rgba(74, 222, 128, 0.3)'
                  : 'rgba(34, 197, 94, 0.2)',
                transform: [{ scale: badgeAnim }],
              },
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
          </Animated.View>
        </View>

        {/* Animated Big Amount */}
        <Animated.Text
          style={[
            styles.demoAmount,
            {
              color: colors.textPrimary,
              transform: [{ scale: amountAnim }],
            },
          ]}
        >
          Rp 25.000
        </Animated.Text>

        {/* Animated Category Row */}
        <Animated.View
          style={{
            opacity: categoryAnim,
            transform: [
              {
                translateY: categoryAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          }}
        >
          <DemoField
            colors={colors}
            icon="food-fork-drink"
            iconBackground={isDark ? '#3A2416' : '#FFEDD5'}
            iconColor={isDark ? '#FB923C' : '#EA580C'}
            label={t.demoCategoryLabel}
            value={t.demoCategory}
          />
        </Animated.View>

        <View
          style={[
            styles.demoDivider,
            { backgroundColor: isDark ? '#27272A' : '#F1F5F9' },
          ]}
        />

        {/* Animated Wallet Row */}
        <Animated.View
          style={{
            opacity: walletAnim,
            transform: [
              {
                translateY: walletAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          }}
        >
          <DemoField
            colors={colors}
            icon="cash"
            iconBackground={isDark ? 'rgba(16, 185, 129, 0.16)' : '#DCFCE7'}
            iconColor="#10B981"
            label={t.demoWalletLabel}
            value={t.demoWallet}
          />
        </Animated.View>
      </Animated.View>

      <PageCopy
        colors={colors}
        description={t.recordDescription}
        title={t.recordTitle}
      />
    </>
  );
}

// ==========================================
// 2. SLIDE 2: IMPACT (Pantau Anggaran & Arus Kas)
// ==========================================
function ImpactPage({
  colors,
  floatTranslateY,
  isDark,
  reduceMotion,
  t,
}: PageProps) {
  const [progressAnim] = useState(
    () => new Animated.Value(reduceMotion ? 0.65 : 0),
  );

  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(progressAnim, {
      delay: 150,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      toValue: 0.65,
      useNativeDriver: false,
    }).start();
  }, [progressAnim, reduceMotion]);

  const progressPercent = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <>
      <Animated.View
        style={[
          styles.demoStage,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? '#27272A' : '#E2E8F0',
            shadowColor: colors.shadow,
            transform: [{ translateY: floatTranslateY }],
          },
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
              {
                backgroundColor: isDark
                  ? 'rgba(59, 130, 246, 0.16)'
                  : colors.primaryLight,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.primary}
              name="chart-timeline-variant"
              size={22}
            />
          </View>
        </View>

        {/* Animated Budget Bar */}
        <View style={styles.budgetTrackWrap}>
          <View style={styles.budgetMetaRow}>
            <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>
              Anggaran Bulanan
            </Text>
            <Text style={[styles.budgetValue, { color: colors.positive }]}>
              Sisa 65% (Aman)
            </Text>
          </View>
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: isDark ? '#27272A' : '#E2E8F0' },
            ]}
          >
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.positive,
                  width: progressPercent,
                },
              ]}
            />
          </View>
        </View>

        <View
          style={[
            styles.demoDivider,
            { backgroundColor: isDark ? '#27272A' : '#F1F5F9' },
          ]}
        />

        {/* Mini Arus Kas Summary */}
        <View style={styles.impactCashflowRow}>
          <View style={styles.impactStatCol}>
            <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
              Pemasukan
            </Text>
            <Text style={[styles.statValue, { color: colors.positive }]}>
              +Rp 1.200.000
            </Text>
          </View>
          <View
            style={[
              styles.verticalDivider,
              { backgroundColor: isDark ? '#27272A' : '#E2E8F0' },
            ]}
          />
          <View style={styles.impactStatCol}>
            <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
              Pengeluaran
            </Text>
            <Text style={[styles.statValue, { color: colors.destructive }]}>
              -Rp 420.000
            </Text>
          </View>
        </View>
      </Animated.View>

      <PageCopy
        colors={colors}
        description={t.impactDescription}
        title={t.impactTitle}
      />
    </>
  );
}

// ==========================================
// 3. SLIDE 3: WALLETS
// ==========================================
function WalletsPage({
  colors,
  floatTranslateY,
  isDark,
  reduceMotion,
  t,
}: PageProps) {
  const [row1Anim] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const [row2Anim] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const [row3Anim] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) return;
    Animated.stagger(120, [
      Animated.spring(row1Anim, {
        bounciness: 6,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(row2Anim, {
        bounciness: 6,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(row3Anim, {
        bounciness: 6,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion, row1Anim, row2Anim, row3Anim]);

  return (
    <>
      <Animated.View
        style={[
          styles.demoStage,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? '#27272A' : '#E2E8F0',
            shadowColor: colors.shadow,
            transform: [{ translateY: floatTranslateY }],
          },
        ]}
      >
        <View style={styles.demoHeader}>
          <View>
            <Text style={[styles.demoTitle, { color: colors.textPrimary }]}>
              {t.demoWalletsTotal}
            </Text>
            <Text style={[styles.impactAmount, { color: colors.textPrimary }]}>
              Rp 10.575.000
            </Text>
          </View>
          <View
            style={[
              styles.savedBadge,
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
              name="shield-check"
              size={15}
            />
            <Text style={[styles.savedText, { color: colors.primary }]}>
              Privat
            </Text>
          </View>
        </View>

        {/* Wallet 1: BCA */}
        <Animated.View
          style={{
            opacity: row1Anim,
            transform: [
              {
                translateY: row1Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          }}
        >
          <DemoWalletItem
            amount="Rp 10.000.000"
            colors={colors}
            icon="bank"
            iconColor="#0066AE"
            isDark={isDark}
            name="Bank BCA"
            subtitle={t.demoOperationalAccount}
          />
        </Animated.View>

        {/* Wallet 2: GoPay */}
        <Animated.View
          style={{
            opacity: row2Anim,
            transform: [
              {
                translateY: row2Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          }}
        >
          <DemoWalletItem
            amount="Rp 450.000"
            colors={colors}
            icon="cellphone"
            iconColor="#00AED6"
            isDark={isDark}
            name="GoPay"
            subtitle={t.demoDigitalWallet}
          />
        </Animated.View>

        {/* Wallet 3: Tunai */}
        <Animated.View
          style={{
            opacity: row3Anim,
            transform: [
              {
                translateY: row3Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          }}
        >
          <DemoWalletItem
            amount="Rp 125.000"
            colors={colors}
            icon="cash"
            iconColor="#10B981"
            isDark={isDark}
            name={t.demoWallet}
            subtitle={t.demoCashWallet}
          />
        </Animated.View>
      </Animated.View>

      <PageCopy
        colors={colors}
        description={t.walletsDescription}
        title={t.walletsTitle}
      />
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
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconBackground: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.demoField}>
      <View style={[styles.fieldIconBox, { backgroundColor: iconBackground }]}>
        <MaterialCommunityIcons color={iconColor} name={icon} size={20} />
      </View>
      <View style={styles.fieldTextCol}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function DemoWalletItem({
  amount,
  colors,
  icon,
  iconColor,
  isDark,
  name,
  subtitle,
}: {
  amount: string;
  colors: ColorPalette;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  isDark: boolean;
  name: string;
  subtitle: string;
}) {
  return (
    <View style={styles.demoWalletRow}>
      <View
        style={[
          styles.fieldIconBox,
          {
            backgroundColor: isDark ? `${iconColor}22` : `${iconColor}14`,
            borderColor: isDark ? `${iconColor}44` : `${iconColor}28`,
            borderWidth: 1,
          },
        ]}
      >
        <MaterialCommunityIcons color={iconColor} name={icon} size={19} />
      </View>
      <View style={styles.fieldTextCol}>
        <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
          {name}
        </Text>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
      <Text style={[styles.walletAmountText, { color: colors.textPrimary }]}>
        {amount}
      </Text>
    </View>
  );
}

function PageCopy({
  colors,
  description,
  title,
}: {
  colors: ColorPalette;
  description: string;
  title: string;
}) {
  return (
    <View style={styles.copyBlock}>
      <Text style={[styles.copyTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.copyDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandMark: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  brandName: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  budgetLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  budgetMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetTrackWrap: {
    gap: 6,
    marginTop: spacing.xs,
  },
  budgetValue: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '800',
  },
  copyBlock: {
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  copyDescription: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  copyTitle: {
    ...typography.pageTitle,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  demoAmount: {
    ...typography.displayAmount,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginVertical: spacing.xs,
  },
  demoDivider: {
    height: 1,
    marginVertical: spacing.xs + 2,
  },
  demoField: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  demoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  demoMeta: {
    ...typography.metadata,
    fontSize: 12,
    marginTop: 1,
  },
  demoStage: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 4,
    gap: spacing.xs,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    width: '100%',
  },
  demoTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
  },
  demoWalletRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingVertical: 5,
  },
  disabled: {
    opacity: 0.5,
  },
  fieldIconBox: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  fieldLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '500',
  },
  fieldTextCol: {
    flex: 1,
    gap: 1,
  },
  fieldValue: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    alignSelf: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  impactAmount: {
    ...typography.sectionTitle,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  impactCashflowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingTop: spacing.xs,
  },
  impactIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  impactStatCol: {
    flex: 1,
    gap: 2,
  },
  impactTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  pageScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  pager: {
    alignSelf: 'center',
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 52,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  primaryLabel: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  primaryPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  progressBarFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  progressBarTrack: {
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  progressDot: {
    borderRadius: radius.pill,
    height: 8,
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
    justifyContent: 'center',
  },
  progressText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  safeArea: {
    flex: 1,
  },
  savedBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savedText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
  },
  skipButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  skipText: {
    ...typography.metadata,
    fontSize: 14,
    fontWeight: '700',
  },
  statTitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '800',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  verticalDivider: {
    alignSelf: 'stretch',
    marginHorizontal: spacing.md,
    width: 1,
  },
  walletAmountText: {
    ...typography.sectionTitle,
    fontSize: 14,
    fontWeight: '800',
  },
});
