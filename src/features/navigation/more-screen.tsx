import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type MenuItem = {
  bgColor: string;
  borderColor: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
  label: string;
  route:
    '/goals' | '/claims' | '/categories' | '/settings/backup' | '/settings';
};

type MenuSection = {
  id: string;
  items: MenuItem[];
  title: string;
};

export function MoreScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors } = useTheme();

  const goalsItem: MenuItem = {
    bgColor: colors.incomeBackground,
    borderColor: colors.positiveBorder,
    description: t.more.goalsDescription,
    icon: 'bullseye-arrow',
    iconColor: colors.positive,
    label: t.more.goalsLabel,
    route: '/goals',
  };
  const categoriesItem: MenuItem = {
    bgColor: colors.accentPurpleBackground,
    borderColor: colors.accentPurpleBorder,
    description: t.more.categoriesDescription,
    icon: 'tag-multiple-outline',
    iconColor: colors.accentPurple,
    label: t.more.categoriesLabel,
    route: '/categories',
  };
  const claimsItem: MenuItem = {
    bgColor: colors.warningBackground,
    borderColor: colors.warningBorder,
    description: t.more.claimsDescription,
    icon: 'briefcase-outline',
    iconColor: colors.warning,
    label: t.more.claimsLabel,
    route: '/claims',
  };
  const settingsItem: MenuItem = {
    bgColor: colors.accentIndigoBackground,
    borderColor: colors.accentIndigoBorder,
    description: t.more.settingsDescription,
    icon: 'cog-outline',
    iconColor: colors.accentIndigo,
    label: t.more.settingsLabel,
    route: '/settings',
  };
  const backupItem: MenuItem = {
    bgColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
    description: t.more.backupDescription,
    icon: 'cloud-sync-outline',
    iconColor: colors.accentSky,
    label: t.more.backupLabel,
    route: '/settings/backup',
  };

  const sections: MenuSection[] = [
    {
      id: 'planning',
      items: [goalsItem],
      title: t.more.planningSection,
    },
    {
      id: 'transactions',
      items: [categoriesItem, claimsItem],
      title: t.more.transactionsSection,
    },
    {
      id: 'app-data',
      items: [settingsItem, backupItem],
      title: t.more.appDataSection,
    },
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.textPrimary }]}
        >
          {t.more.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t.more.subtitle}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.id} style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {section.title.toUpperCase()}
            </Text>

            <View
              style={[
                styles.cardsList,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {section.items.map((item, index) => (
                <Pressable
                  accessibilityLabel={`${item.label}, ${item.description}`}
                  accessibilityRole="button"
                  key={item.route}
                  onPress={() => router.push(item.route)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth:
                        index === section.items.length - 1
                          ? 0
                          : StyleSheet.hairlineWidth,
                    },
                    pressed
                      ? [
                          styles.pressed,
                          { backgroundColor: colors.surfaceSecondary },
                        ]
                      : null,
                  ]}
                >
                  <View
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor: item.bgColor,
                        borderColor: item.borderColor,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={item.iconColor}
                      name={item.icon}
                      size={24}
                    />
                  </View>

                  <View style={styles.text}>
                    <Text
                      numberOfLines={1}
                      style={[styles.label, { color: colors.textPrimary }]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.description,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.description}
                    </Text>
                  </View>

                  <MaterialCommunityIcons
                    color={colors.textMuted}
                    name="chevron-right"
                    size={22}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardsList: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    alignSelf: 'center',
    gap: spacing.lg,
    maxWidth: contentMaxWidth,
    paddingBottom: spacing.xxl + 84,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    width: '100%',
  },
  description: {
    ...typography.metadata,
    fontSize: 12,
  },
  header: {
    alignSelf: 'center',
    gap: spacing.xs,
    maxWidth: contentMaxWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    width: '100%',
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  label: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 76,
    padding: spacing.md,
  },
  sectionContainer: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xs,
  },
  subtitle: {
    ...typography.secondary,
  },
  text: {
    flex: 1,
    gap: 3,
  },
  title: {
    ...typography.pageTitle,
  },
});
