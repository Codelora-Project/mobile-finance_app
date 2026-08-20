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
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  route:
    '/goals' | '/claims' | '/categories' | '/settings/backup' | '/settings';
};

export function MoreScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const { colors } = useTheme();
  const items: MenuItem[] =
    language === 'id'
      ? [
          {
            description: 'Pantau progres tabungan',
            icon: 'bullseye-arrow',
            label: 'Target',
            route: '/goals',
          },
          {
            description: 'Kelola penggantian biaya',
            icon: 'briefcase-outline',
            label: 'Klaim',
            route: '/claims',
          },
          {
            description: 'Atur kategori transaksi',
            icon: 'shape-outline',
            label: 'Kategori',
            route: '/categories',
          },
          {
            description: 'Ekspor, pulihkan, dan amankan data',
            icon: 'database-outline',
            label: 'Backup & Data',
            route: '/settings/backup',
          },
          {
            description: 'Tampilan dan preferensi aplikasi',
            icon: 'cog-outline',
            label: 'Pengaturan',
            route: '/settings',
          },
        ]
      : [
          {
            description: 'Track your savings progress',
            icon: 'bullseye-arrow',
            label: 'Goals',
            route: '/goals',
          },
          {
            description: 'Manage expense reimbursements',
            icon: 'briefcase-outline',
            label: 'Claims',
            route: '/claims',
          },
          {
            description: 'Manage transaction categories',
            icon: 'shape-outline',
            label: 'Categories',
            route: '/categories',
          },
          {
            description: 'Export, restore, and protect data',
            icon: 'database-outline',
            label: 'Backup & Data',
            route: '/settings/backup',
          },
          {
            description: 'Appearance and app preferences',
            icon: 'cog-outline',
            label: 'Settings',
            route: '/settings',
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
            ? 'Fitur tambahan dan pengaturan aplikasi'
            : 'Additional features and app settings'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item) => (
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
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <View
              style={[styles.icon, { backgroundColor: colors.primaryLight }]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name={item.icon}
                size={22}
              />
            </View>
            <View style={styles.text}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {item.label}
              </Text>
              <Text
                style={[styles.description, { color: colors.textSecondary }]}
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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl + 84,
    paddingHorizontal: spacing.md,
  },
  description: { ...typography.metadata },
  header: { gap: spacing.xs, padding: spacing.md },
  icon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  label: { ...typography.body, fontWeight: '800' },
  row: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.md,
  },
  subtitle: { ...typography.secondary },
  text: { flex: 1, gap: 2 },
  title: { ...typography.pageTitle },
});
