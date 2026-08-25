import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type BackupRestoreCardProps = {
  onSelectBackupFile: () => void;
  restoring: boolean;
  t: TranslationSchema;
};

export const BackupRestoreCard = memo(function BackupRestoreCard({
  onSelectBackupFile,
  restoring,
  t,
}: BackupRestoreCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.sectionGroup}>
      <Text
        style={[styles.sectionHeaderLabel, { color: colors.textSecondary }]}
      >
        {t.backup.restoreSection}
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
                backgroundColor: isDark ? colors.surfaceSecondary : '#FEF3C7',
              },
            ]}
          >
            <MaterialCommunityIcons
              color="#D97706"
              name="backup-restore"
              size={22}
            />
          </View>
          <View style={styles.cardHeaderTexts}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {t.backup.restoreSection}
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              {t.backup.restoreDesc}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.warningNoticeBox,
            {
              backgroundColor: isDark ? '#451A03' : '#FFFBEB',
              borderColor: isDark ? '#78350F' : '#FDE68A',
            },
          ]}
        >
          <MaterialCommunityIcons
            color="#D97706"
            name="alert-circle-outline"
            size={18}
          />
          <Text
            style={[
              styles.warningNoticeText,
              { color: isDark ? '#FDE68A' : '#92400E' },
            ]}
          >
            {t.backup.restoreWarning}
          </Text>
        </View>

        <View style={styles.cardActionArea}>
          <AppButton
            accessibilityLabel={t.backup.selectBackupBtn}
            disabled={restoring}
            label={t.backup.selectBackupBtn}
            loading={restoring}
            onPress={onSelectBackupFile}
            variant="secondary"
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
  warningNoticeBox: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm + 2,
  },
  warningNoticeText: {
    ...typography.metadata,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
