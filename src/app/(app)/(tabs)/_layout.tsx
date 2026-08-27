import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/lib/i18n/language-context';
import {
  TabBarVisibilityProvider,
  useTabBarVisibility,
} from '@/lib/navigation/tab-bar-visibility-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

type BottomTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

type TabIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

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
    default:
      return 'circle';
  }
}

function TabItem({
  focused,
  label,
  name,
  onPress,
}: {
  focused: boolean;
  label: string;
  name: string;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [scaleAnim] = useState(() => new Animated.Value(focused ? 1 : 0.88));

  useEffect(() => {
    Animated.spring(scaleAnim, {
      friction: 6,
      tension: 140,
      toValue: focused ? 1 : 0.88,
      useNativeDriver: true,
    }).start();
  }, [focused, scaleAnim]);

  const activeBg = isDark ? '#1E3A8A' : '#EFF6FF';
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
      style={styles.tabItemPressable}
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
        maxFontSizeMultiplier={1.4}
        minimumFontScale={0.85}
        numberOfLines={1}
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
  const { tabBarAnim } = useTabBarVisibility();
  const [fabScale] = useState(() => new Animated.Value(1));

  const handlePressIn = useCallback(() => {
    Animated.spring(fabScale, {
      friction: 5,
      tension: 200,
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  }, [fabScale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(fabScale, {
      friction: 5,
      tension: 200,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [fabScale]);

  const fabBottom = insets.bottom + 64 + spacing.md;

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
          {
            backgroundColor: colors.primary,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <MaterialCommunityIcons
          accessibilityElementsHidden
          color="#FFFFFF"
          importantForAccessibility="no-hide-descendants"
          name="cash-plus"
          size={20}
        />
        <Text style={[styles.fabLabel, { color: colors.onPrimary }]}>
          {label}
        </Text>
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
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            height: 64 + insets.bottom,
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
              focused={isFocused}
              key={route.key}
              label={label}
              name={route.name}
              onPress={onPress}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

function MainTabLayoutContent() {
  const { language, t } = useLanguage();
  const pathname = usePathname();
  const showTransactionFab = pathname !== '/analytics';

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
          accessibilityLabel={
            language === 'id' ? 'Catat transaksi' : 'Add transaction'
          }
          label={language === 'id' ? 'Catat' : 'Record'}
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
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
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
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});
