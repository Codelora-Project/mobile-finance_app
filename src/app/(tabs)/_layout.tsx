import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, useRouter } from 'expo-router';
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

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

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
    case 'goals':
      return focused ? 'bullseye-arrow' : 'bullseye';
    case 'claims':
      return focused ? 'file-document' : 'file-document-outline';
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
      accessibilityRole="button"
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
        maxFontSizeMultiplier={1.2}
        minimumFontScale={0.75}
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

function FloatingActionButton({ label }: { label: string }) {
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

  const bottomMargin = insets.bottom > 0 ? insets.bottom + 10 : 20;
  const fabBottom = bottomMargin + 72;

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
        accessibilityLabel={label}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => router.push('/transactions/new')}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.fabButton,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]}
      >
        <MaterialCommunityIcons
          accessibilityElementsHidden
          color="#FFFFFF"
          importantForAccessibility="no-hide-descendants"
          name="plus"
          size={28}
        />
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
  const { colors, isDark } = useTheme();
  const { tabBarAnim } = useTabBarVisibility();

  const bottomMargin = insets.bottom > 0 ? insets.bottom + 10 : 20;

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
          bottom: bottomMargin,
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
            shadowColor: isDark ? '#000000' : colors.textPrimary,
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
  const { t } = useLanguage();

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

      {/* Floating Action Button (FAB) aligned right with card */}
      <FloatingActionButton label={t.tabs.add} />
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
    left: spacing.md,
    position: 'absolute',
    right: spacing.md,
    zIndex: 900,
  },
  fabButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 8,
    height: 52,
    justifyContent: 'center',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    width: 52,
  },
  fabContainer: {
    alignItems: 'flex-end',
    position: 'absolute',
    right: spacing.md,
    zIndex: 999,
  },
  floatingPillBar: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 8,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingVertical: 4,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
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
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
});