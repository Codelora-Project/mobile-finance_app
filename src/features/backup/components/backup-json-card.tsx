import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type BackupJsonCardProps = {
  creatingBackup: boolean;
  onCreateBackup: () => void;
  t: TranslationSchema;
};

export const BackupJsonCard = memo(function BackupJsonCard({
  creatingBackup,
  onCreateBackup,
  t,
}: BackupJsonCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.sectionGroup}>
      <Text
        style={[styles.sectionHeaderLabel, { color: colors.textSecondary }]}
      >
        {t.backup.backupSection}
      </Text>

      <View
        style={[
          styles.actionCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View
            style={[
              styles.cardIconBadge,
              {
                backgroundColor: isDark
                  ? colors.surfaceSecondary
                  : '#EFF6FF',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.primary}
              name="database-export-outline"
              size={22}
            />
          </View>
          <View style={styles.cardHeaderTexts}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {t.backup.backupSection}
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              {t.backup.backupDesc}
            </Text>
          </View>
        </View>

        <View style={styles.cardActionArea}>
          <AppButton
            accessibilityLabel={t.backup.createBackupBtn}
            disabled={creatingBackup}
            label={
              creatingBackup
                ? t.backup.creatingBackup
                : t.backup.createBackupBtn
            }
            loading={creatingBackup}
            onPress={onCreateBackup}
            variant="primary"
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  actionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  cardActionArea: {
    marginTop: spacing.xs,
  },
  cardDesc: {
    ...typography.metadata,
    fontSize: 12,
    lineHeight: 17,
  },
  cardHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  cardHeaderTexts: {
    flex: 1,
    gap: 3,
  },
  cardIconBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '700',
  },
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
});
