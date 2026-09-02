import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/lib/i18n/language-context';
import { useReduceMotion } from '@/lib/accessibility/use-reduce-motion';
import {
  TabBarVisibilityProvider,
  useTabBarVisibility,
} from '@/lib/navigation/tab-bar-visibility-context';
import { useTheme } from '@/lib/theme/theme-context';
import { fixedSemanticColors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

type BottomTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

type TabIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Android can report a requested 1.3 scale a few hundredths lower.
const ADAPTIVE_GRID_FONT_SCALE = 1.25;

function getTabBarHeight(fontScale: number) {
  if (fontScale >= ADAPTIVE_GRID_FONT_SCALE) return 132;
  return 64 + Math.max(0, fontScale - 1) * 44;
}

function getTabIcon(routeName: string, focused: boolean): TabIconName {
  switch (routeName) {
    case 'index':
      return focused ? 'home-variant' : 'home-variant-outline';
    case 'wallets':
      return focused ? 'wallet' : 'wallet-outline';
    case 'transactions':
      return focused ? 'format-list-bulleted-square' : 'format-list-bulleted';
    case 'analytics':
      return focused ? 'chart-box' : 'chart-box-outline';
    case 'claims':
      return focused ? 'briefcase' : 'briefcase-outline';
    case 'goals':
      return focused ? 'bullseye-arrow' : 'bullseye';
    case 'more':
      return focused ? 'dots-grid' : 'dots-grid';
    case 'action':
      return 'cash-plus';
    default:
      return 'circle';
  }
}

function TabItem({
  adaptiveGrid = false,
  focused,
  label,
  name,
  onPress,
}: {
  adaptiveGrid?: boolean;
  focused: boolean;
  label: string;
  name: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const [scaleAnim] = useState(() => new Animated.Value(focused ? 1 : 0.88));

  useEffect(() => {
    if (reduceMotion) {
      scaleAnim.setValue(focused ? 1 : 0.88);
      return;
    }
    Animated.spring(scaleAnim, {
      friction: 6,
      tension: 140,
      toValue: focused ? 1 : 0.88,
      useNativeDriver: true,
    }).start();
  }, [focused, reduceMotion, scaleAnim]);

  const activeBg = colors.primaryLight;
  const activeColor = colors.primary;
  const inactiveColor = colors.textSecondary;
  const iconName = getTabIcon(name, focused);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      hitSlop={4}
      onPress={onPress}
      style={[
        styles.tabItemPressable,
        adaptiveGrid ? styles.tabItemAdaptiveGrid : null,
      ]}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          focused
            ? [
                styles.iconPillFocused,
                {
                  backgroundColor: activeBg,
                  transform: [{ scale: scaleAnim }],
                },
              ]
            : null,
        ]}
      >
        <MaterialCommunityIcons
          accessibilityElementsHidden
          color={focused ? activeColor : inactiveColor}
          importantForAccessibility="no-hide-descendants"
          name={iconName}
          size={22}
        />
      </Animated.View>
      <Text
        adjustsFontSizeToFit
        maxFontSizeMultiplier={adaptiveGrid ? 1.5 : 2}
        minimumFontScale={0.85}
        numberOfLines={2}
        style={[
          styles.tabLabel,
          {
            color: focused ? activeColor : inactiveColor,
            fontWeight: focused ? '800' : '600',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FloatingActionButton({
  accessibilityLabel,
  label,
}: {
  accessibilityLabel: string;
  label: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const resolvedFontScale = fontScale || 1;
  const reduceMotion = useReduceMotion();
  const { tabBarAnim } = useTabBarVisibility();
  const [fabScale] = useState(() => new Animated.Value(1));

  const handlePressIn = useCallback(() => {
    if (reduceMotion) return;
    Animated.spring(fabScale, {
      friction: 5,
      tension: 200,
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  }, [fabScale, reduceMotion]);

  const handlePressOut = useCallback(() => {
    if (reduceMotion) return;
    Animated.spring(fabScale, {
      friction: 5,
      tension: 200,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [fabScale, reduceMotion]);

  const compact = resolvedFontScale >= 1.5;
  const tabBarHeight = getTabBarHeight(resolvedFontScale);
  const fabBottom = insets.bottom + tabBarHeight + spacing.md;

  const translateY = tabBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 160],
  });
  const opacity = tabBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.fabContainer,
        {
          bottom: fabBottom,
          opacity,
          transform: [{ translateY }, { scale: fabScale }],
        },
      ]}
    >
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => router.push('/transactions/new')}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.fabButton,
          compact ? styles.fabButtonCompact : null,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <MaterialCommunityIcons
          accessibilityElementsHidden
          color={fixedSemanticColors.contentOnStrong}
          importantForAccessibility="no-hide-descendants"
          name="cash-plus"
          size={20}
        />
        {!compact ? (
          <Text
            maxFontSizeMultiplier={2}
            numberOfLines={2}
            style={[styles.fabLabel, { color: colors.onPrimary }]}
          >
            {label}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function CustomFloatingTabBar({
  descriptors,
  navigation,
  state,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const resolvedFontScale = fontScale || 1;
  const adaptiveGrid = resolvedFontScale >= ADAPTIVE_GRID_FONT_SCALE;
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { tabBarAnim } = useTabBarVisibility();

  const HIDDEN_TAB_NAMES = new Set(['action', 'settings', 'goals', 'claims']);

  const visibleRoutes = state.routes.filter((route) => {
    if (HIDDEN_TAB_NAMES.has(route.name)) return false;
    const href = (
      descriptors[route.key]?.options as { href?: string | null } | undefined
    )?.href;
    return href !== null;
  });

  const translateY = tabBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 160],
  });
  const opacity = tabBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.barWrapper,
        {
          bottom: 0,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[
          styles.floatingPillBar,
          adaptiveGrid ? styles.floatingPillBarAdaptiveGrid : null,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            minHeight: getTabBarHeight(resolvedFontScale) + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {visibleRoutes.map((route) => {
          const isFocused = state.routes[state.index]?.name === route.name;
          const { options } = descriptors[route.key] || {};
          const label =
            typeof options?.title === 'string' ? options.title : route.name;

          const onPress = () => {
            const event = navigation.emit({
              canPreventDefault: true,
              target: route.key,
              type: 'tabPress',
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              adaptiveGrid={adaptiveGrid}
              focused={isFocused}
              key={route.key}
              label={label}
              name={route.name}
              onPress={onPress}
            />
          );
        })}
        {adaptiveGrid && pathname !== '/analytics' ? (
          <TabItem
            adaptiveGrid
            focused={false}
            label={t.common.record}
            name="action"
            onPress={() => router.push('/transactions/new')}
          />
        ) : null}
      </View>
    </Animated.View>
  );
}

function MainTabLayoutContent() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { fontScale } = useWindowDimensions();
  const showTransactionFab =
    pathname !== '/analytics' && (fontScale || 1) < ADAPTIVE_GRID_FONT_SCALE;

  return (
    <View style={styles.rootContainer}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
        tabBar={(props) => <CustomFloatingTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t.tabs.home,
          }}
        />
        <Tabs.Screen
          name="wallets"
          options={{
            title: t.tabs.wallets,
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: t.tabs.transactions,
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: t.tabs.analytics,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: t.common.more,
          }}
        />
        <Tabs.Screen
          name="goals"
          options={{
            href: null,
            title: t.tabs.goals,
          }}
        />
        <Tabs.Screen
          name="action"
          options={{
            href: null,
            title: t.tabs.add,
          }}
        />
        <Tabs.Screen
          name="claims"
          options={{
            href: null,
            title: t.tabs.claims,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {showTransactionFab ? (
        <FloatingActionButton
          accessibilityLabel={t.common.addTransaction}
          label={t.common.record}
        />
      ) : null}
    </View>
  );
}

export default function MainTabLayout() {
  return (
    <TabBarVisibilityProvider>
      <MainTabLayoutContent />
    </TabBarVisibilityProvider>
  );
}

const styles = StyleSheet.create({
  barWrapper: {
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 900,
  },
  fabButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    elevation: 3,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
  },
  fabContainer: {
    alignItems: 'flex-end',
    position: 'absolute',
    right: spacing.md,
    zIndex: 999,
  },
  fabButtonCompact: {
    borderRadius: radius.pill,
    height: 52,
    paddingHorizontal: 0,
    paddingVertical: 0,
    width: 52,
  },
  fabLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  floatingPillBar: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingVertical: 4,
    width: '100%',
  },
  floatingPillBarAdaptiveGrid: {
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 44,
  },
  iconPillFocused: {
    borderRadius: 14,
  },
  rootContainer: {
    flex: 1,
  },
  tabItemPressable: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 0,
    paddingVertical: 2,
  },
  tabItemAdaptiveGrid: {
    flexBasis: '33.333%',
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 62,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
    minHeight: 14,
    textAlign: 'center',
  },
});
