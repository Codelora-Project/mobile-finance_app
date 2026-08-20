import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type HomeQuickShortcutsProps = {
  language: 'id' | 'en';
  t: TranslationSchema;
};

export const HomeQuickShortcuts = memo(function HomeQuickShortcuts({
  language,
  t,
}: HomeQuickShortcutsProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const SHORTCUTS: {
    badge?: string;
    bgColor: string;
    borderColor: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    iconColor: string;
    key: string;
    onPress: () => void;
    subtitle: string;
    title: string;
  }[] = [
    {
      bgColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
      borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A',
      icon: 'briefcase',
      iconColor: '#D97706',
      key: 'claims',
      onPress: () => router.push('/claims'),
      subtitle: language === 'id' ? 'Reimburse' : 'Reimbursement',
      title: language === 'id' ? 'Klaim Kantor' : 'Claims',
    },
    {
      bgColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#D1FAE5',
      borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0',
      icon: 'bullseye-arrow',
      iconColor: '#059669',
      key: 'goals',
      onPress: () => router.push('/goals'),
      subtitle: language === 'id' ? 'Menabung' : 'Savings',
      title: language === 'id' ? 'Target' : 'Goals',
    },
    {
      bgColor: isDark ? 'rgba(139, 92, 246, 0.12)' : '#EDE9FE',
      borderColor: isDark ? 'rgba(139, 92, 246, 0.25)' : '#DDD6FE',
      icon: 'tag-multiple',
      iconColor: '#7C3AED',
      key: 'categories',
      onPress: () => router.push('/categories'),
      subtitle: language === 'id' ? 'Kelola Pos' : 'Manage',
      title: language === 'id' ? 'Kategori' : 'Categories',
    },
    {
      bgColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#DBEAFE',
      borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE',
      icon: 'cloud-sync',
      iconColor: '#2563EB',
      key: 'backup',
      onPress: () => router.push('/settings/backup'),
      subtitle: language === 'id' ? 'Cadangan' : 'Export & Sync',
      title: language === 'id' ? 'Data' : 'Backup',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {SHORTCUTS.map((item) => (
          <Pressable
            accessibilityLabel={`${item.title}, ${item.subtitle}`}
            accessibilityRole="button"
            key={item.key}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.card,
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
                size={20}
              />
            </View>

            <View style={styles.textCol}>
              <Text
                numberOfLines={1}
                style={[styles.title, { color: colors.textPrimary }]}
              >
                {item.title}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.subtitle, { color: colors.textMuted }]}
              >
                {item.subtitle}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    minWidth: '47%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  container: {
    marginTop: -spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 4,
    justifyContent: 'space-between',
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  subtitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
