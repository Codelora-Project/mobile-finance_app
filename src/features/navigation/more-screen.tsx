import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
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
    | '/goals'
    | '/claims'
    | '/categories'
    | '/settings/backup'
    | '/settings';
};

type MenuSection = {
  id: string;
  items: MenuItem[];
  title: string;
};

export function MoreScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const { colors, isDark } = useTheme();

  const sections: MenuSection[] = [
    {
      id: 'financial',
      items:
        language === 'id'
          ? [
              {
                bgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                description: 'Pantau target dan progres tabungan',
                icon: 'bullseye-arrow',
                iconColor: isDark ? '#34D399' : '#059669',
                label: 'Target Tabungan',
                route: '/goals',
              },
              {
                bgColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                description: 'Kelola penggantian biaya kantor & reimbursement',
                icon: 'briefcase-outline',
                iconColor: isDark ? '#FBBF24' : '#D97706',
                label: 'Klaim Kantor',
                route: '/claims',
              },
              {
                bgColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#EDE9FE',
                borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : '#DDD6FE',
                description: 'Atur pos pengeluaran dan pemasukan',
                icon: 'tag-multiple-outline',
                iconColor: isDark ? '#A78BFA' : '#7C3AED',
                label: 'Kelola Kategori',
                route: '/categories',
              },
            ]
          : [
              {
                bgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                description: 'Track savings goals and progress',
                icon: 'bullseye-arrow',
                iconColor: isDark ? '#34D399' : '#059669',
                label: 'Savings Goals',
                route: '/goals',
              },
              {
                bgColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                description: 'Manage expense reimbursements & claims',
                icon: 'briefcase-outline',
                iconColor: isDark ? '#FBBF24' : '#D97706',
                label: 'Claims & Reimburse',
                route: '/claims',
              },
              {
                bgColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#EDE9FE',
                borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : '#DDD6FE',
                description: 'Manage income and expense categories',
                icon: 'tag-multiple-outline',
                iconColor: isDark ? '#A78BFA' : '#7C3AED',
                label: 'Categories',
                route: '/categories',
              },
            ],
      title: language === 'id' ? 'Fitur & Finansial' : 'Financial Tools',
    },
    {
      id: 'preferences',
      items:
        language === 'id'
          ? [
              {
                bgColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
                borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
                description: 'Cadangkan, pulihkan, dan ekspor data',
                icon: 'cloud-sync-outline',
                iconColor: isDark ? '#60A5FA' : '#2563EB',
                label: 'Backup & Ekspor Data',
                route: '/settings/backup',
              },
              {
                bgColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE',
                description: 'Tampilan tema, mata uang, dan preferensi',
                icon: 'cog-outline',
                iconColor: isDark ? '#818CF8' : '#4F46E5',
                label: 'Pengaturan Aplikasi',
                route: '/settings',
              },
            ]
          : [
              {
                bgColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
                borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
                description: 'Export, restore, and safeguard your data',
                icon: 'cloud-sync-outline',
                iconColor: isDark ? '#60A5FA' : '#2563EB',
                label: 'Backup & Export',
                route: '/settings/backup',
              },
              {
                bgColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE',
                description: 'Theme appearance, currency, and preferences',
                icon: 'cog-outline',
                iconColor: isDark ? '#818CF8' : '#4F46E5',
                label: 'Settings',
                route: '/settings',
              },
            ],
      title: language === 'id' ? 'Data & Preferensi' : 'Data & Preferences',
    },
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.textPrimary }]}
        >
          {language === 'id' ? 'Lainnya' : 'More'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {language === 'id'
            ? 'Fitur pendukung dan pengelolaan aplikasi'
            : 'Additional tools and app management'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.id} style={styles.sectionContainer}>
            <Text
              style={[styles.sectionTitle, { color: colors.textMuted }]}
            >
              {section.title.toUpperCase()}
            </Text>

            <View style={styles.cardsList}>
              {section.items.map((item) => (
                <Pressable
                  accessibilityLabel={`${item.label}, ${item.description}`}
                  accessibilityRole="button"
                  key={item.route}
                  onPress={() => router.push(item.route)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    pressed && styles.pressed,
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
                      numberOfLines={1}
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
    gap: spacing.sm,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl + 84,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  description: {
    ...typography.metadata,
    fontSize: 12,
  },
  header: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
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
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
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
