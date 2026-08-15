import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type TabIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ color, name }: { color: ColorValue; name: TabIconName }) {
  return (
    <MaterialCommunityIcons
      accessibilityElementsHidden
      color={color}
      importantForAccessibility="no-hide-descendants"
      name={name}
      size={24}
    />
  );
}

function AddActionButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel="Add transaction"
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => router.push('/add')}
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
          size={30}
        />
      </View>
      <Text style={styles.addLabel}>Add</Text>
    </Pressable>
  );
}

export default function MainTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
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
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name="format-list-bulleted" />
          ),
          title: 'Transactions',
        }}
      />
      <Tabs.Screen
        name="action"
        options={{
          tabBarButton: () => <AddActionButton />,
          title: 'Add',
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
          title: 'Claims',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} name={focused ? 'cog' : 'cog-outline'} />
          ),
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 76,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  tabLabel: {
    fontSize: typography.metadata.fontSize,
    fontWeight: '600',
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
    height: 56,
    justifyContent: 'center',
    shadowColor: colors.textPrimary,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    width: 56,
  },
  addLabel: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
    fontWeight: '600',
    marginTop: 0,
  },
});
