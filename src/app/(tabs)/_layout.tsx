import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

type TabIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({
  color,
  focused,
  name,
}: {
  color: ColorValue;
  focused?: boolean;
  name: TabIconName;
}) {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.iconContainer,
        focused
          ? [
              styles.iconPillFocused,
              { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' },
            ]
          : null,
      ]}
    >
      <MaterialCommunityIcons
        accessibilityElementsHidden
        color={color}
        importantForAccessibility="no-hide-descendants"
        name={name}
        size={22}
      />
    </View>
  );
}

function AddActionButton({ label }: { label: string }) {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={6}
      onPress={() => router.push('/transactions/new')}
      style={({ pressed }) => [
        styles.addAction,
        pressed ? styles.addActionPressed : null,
      ]}
    >
      <View
        style={[
          styles.addCircle,
          {
            backgroundColor: colors.primary,
            borderColor: isDark ? '#334155' : colors.surface,
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
      </View>
      <Text style={[styles.addLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function MainTabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const bottomPadding = insets.bottom > 0 ? insets.bottom : spacing.xs + 2;
  const tabHeight = 60 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: [
          styles.dockTabBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: isDark ? 'rgba(51, 65, 85, 0.7)' : colors.border,
            height: tabHeight,
            paddingBottom: bottomPadding,
            shadowColor: isDark ? '#000000' : colors.textPrimary,
          },
        ],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              name={focused ? 'home-variant' : 'home-variant-outline'}
            />
          ),
          title: t.tabs.home,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              name={
                focused ? 'format-list-bulleted-square' : 'format-list-bulleted'
              }
            />
          ),
          title: t.tabs.transactions,
        }}
      />
      <Tabs.Screen
        name="action"
        options={{
          tabBarButton: () => <AddActionButton label={t.tabs.add} />,
          title: t.tabs.add,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              name={focused ? 'chart-box' : 'chart-box-outline'}
            />
          ),
          title: t.tabs.analytics,
        }}
      />
      <Tabs.Screen
        name="claims"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              name={focused ? 'file-document' : 'file-document-outline'}
            />
          ),
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
  );
}

const styles = StyleSheet.create({
  addAction: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    marginTop: -14,
  },
  addActionPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
  addCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 3.5,
    elevation: 4,
    height: 48,
    justifyContent: 'center',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    width: 48,
  },
  addLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  dockTabBar: {
    borderTopWidth: 1.5,
    elevation: 4,
    paddingHorizontal: 4,
    paddingTop: 4,
    shadowOffset: { height: -2, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 26,
    justifyContent: 'center',
    width: 48,
  },
  iconPillFocused: {
    borderRadius: 13,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
});
