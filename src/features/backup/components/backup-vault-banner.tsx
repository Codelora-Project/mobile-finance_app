import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export const BackupVaultBanner = memo(function BackupVaultBanner({
  t,
}: {
  t: TranslationSchema;
}) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.vaultHeroCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.vaultBadgeRow}>
        <View
          style={[
            styles.vaultIconCircle,
            { backgroundColor: isDark ? '#14532D' : '#DCFCE7' },
          ]}
        >
          <MaterialCommunityIcons
            color={colors.positive}
            name="shield-check"
            size={24}
          />
        </View>
        <View style={styles.vaultTextContainer}>
          <Text style={[styles.vaultTitle, { color: colors.textPrimary }]}>
            {t.backup.vaultBadge}
          </Text>
          <Text style={[styles.vaultDesc, { color: colors.textSecondary }]}>
            {t.backup.vaultDesc}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  vaultBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  vaultDesc: {
    ...typography.metadata,
    fontSize: 12,
    lineHeight: 17,
  },
  vaultHeroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  vaultIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  vaultTextContainer: {
    flex: 1,
    gap: 2,
  },
  vaultTitle: {
    ...typography.sectionTitle,
    fontSize: 14,
    fontWeight: '700',
  },
});
