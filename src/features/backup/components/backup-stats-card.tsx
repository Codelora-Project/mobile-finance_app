import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { BackupStats } from '@/features/backup/backup-types';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type BackupStatsCardProps = {
  currentStats: BackupStats | null;
  loadingStats: boolean;
  t: TranslationSchema;
};

export const BackupStatsCard = memo(function BackupStatsCard({
  currentStats,
  loadingStats,
  t,
}: BackupStatsCardProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionGroup}>
      <Text
        style={[styles.sectionHeaderLabel, { color: colors.textSecondary }]}
      >
        {t.backup.statsTitle}
      </Text>

      <View
        style={[
          styles.statsGridCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {loadingStats ? (
          <ActivityIndicator
            color={colors.primary}
            size="small"
            style={{ paddingVertical: spacing.lg }}
          />
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {currentStats?.transactionsCount ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t.backup.transactions}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.accentSky }]}>
                {currentStats?.categoriesCount ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t.backup.categories}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.accentPurple }]}>
                {currentStats?.paymentMethodsCount ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t.backup.paymentMethods}
              </Text>
            </View>

            <View
              style={[
                styles.statRowDivider,
                { backgroundColor: colors.border },
              ]}
            />

            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.positive }]}>
                {currentStats?.goalsCount ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t.backup.goals}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.accentOrange }]}>
                {currentStats?.budgetsCount ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t.backup.budgets}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.warning }]}>
                {currentStats?.claimsCount ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t.backup.claims}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  sectionGroup: {
    gap: spacing.xs + 2,
  },
  sectionHeaderLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    paddingHorizontal: spacing.xs,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minWidth: '30%',
    paddingVertical: spacing.sm,
  },
  statLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  statNumber: {
    ...typography.sectionTitle,
    fontSize: 18,
    fontWeight: '800',
  },
  statRowDivider: {
    height: 1,
    width: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  statsGridCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
