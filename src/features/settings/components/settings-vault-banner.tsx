import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type SettingsVaultBannerProps = {
  description: string;
};

export const SettingsVaultBanner = memo(function SettingsVaultBanner({
  description,
}: SettingsVaultBannerProps) {
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
            size={22}
          />
        </View>
        <View style={styles.vaultTextContainer}>
          <Text style={[styles.vaultTitle, { color: colors.textPrimary }]}>
            Offline & Private Vault
          </Text>
          <Text style={[styles.vaultDesc, { color: colors.textSecondary }]}>
            {description}
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
    lineHeight: 16,
  },
  vaultHeroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  vaultIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  vaultTextContainer: {
    flex: 1,
    gap: 2,
  },
  vaultTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
  },
});
