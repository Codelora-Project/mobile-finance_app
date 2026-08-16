import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import { useLanguage } from '@/lib/i18n/language-context';

type TabIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ color, name }: { color: ColorValue; name: TabIconName }) {
  return (
    <MaterialCommunityIcons
      accessibilityElementsHidden
      color={color}
      importantForAccessibility="no-hide-descendants"
      name={name}
      size={26}
    />
  );
}

function AddActionButton({ label }: { label: string }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => router.push('/transactions/new')}
      style={({ pressed }) => [
        styles.addAction,
        pressed ? styles.addActionPressed : null,
      ]}
    >
      <View style={styles.addCircle}>
        <MaterialCommunityIcons
          accessibilityElementsHidden
          color={colors.surface}
          importantForAccessibility="no-hide-descendants"
          name="plus"
          size={32}
        />
      </View>
      <Text style={styles.addLabel}>{label}</Text>
    </Pressable>
  );
}

export default function MainTabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : spacing.sm;
  const tabHeight = 64 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: '#475569',
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabHeight,
            paddingBottom: bottomPadding,
            paddingTop: spacing.xs + 2,
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
              name={focused ? 'home-variant' : 'home-variant-outline'}
            />
          ),
          title: t.tabs.home,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name="format-list-bulleted" />
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
        name="claims"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              name={focused ? 'file-document' : 'file-document-outline'}
            />
          ),
          title: t.tabs.claims,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} name={focused ? 'cog' : 'cog-outline'} />
          ),
          title: t.tabs.settings,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: '#CBD5E1',
    borderTopWidth: 1.5,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  addAction: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    marginTop: -spacing.lg,
  },
  addActionPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  addCircle: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 4,
    elevation: 4,
    height: 58,
    justifyContent: 'center',
    shadowColor: colors.textPrimary,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    width: 58,
  },
  addLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 0,
  },
});
