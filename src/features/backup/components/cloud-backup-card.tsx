import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import type { CloudBackupState } from '@/features/cloud-backup';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type CloudBackupCardProps = {
  busy: boolean;
  email: string;
  language: 'id' | 'en';
  onBackup(): void;
  onRestore(): void;
  onToggleAutomatic(enabled: boolean): void;
  state: CloudBackupState | null;
  t: TranslationSchema;
};

function formatBackupTime(value: number | null, language: 'id' | 'en') {
  if (!value) return null;
  return new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatFileSize(value: number, language: 'id' | 'en') {
  const megabytes = value / (1024 * 1024);
  return `${new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
    maximumFractionDigits: 1,
  }).format(megabytes)} MB`;
}

export const CloudBackupCard = memo(function CloudBackupCard({
  busy,
  email,
  language,
  onBackup,
  onRestore,
  onToggleAutomatic,
  state,
  t,
}: CloudBackupCardProps) {
  const { colors, isDark } = useTheme();
  const backupTime = formatBackupTime(state?.lastBackupAt ?? null, language);

  return (
    <View style={styles.sectionGroup}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {t.backup.cloudSection}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.headerRow}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: isDark
                  ? colors.surfaceSecondary
                  : colors.primaryLight,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.primary}
              name="google-drive"
              size={24}
            />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t.backup.cloudSection}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t.backup.cloudDesc}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBox,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <View style={styles.statusRow}>
            <MaterialCommunityIcons
              color={colors.positive}
              name="check-circle-outline"
              size={17}
            />
            <Text style={[styles.statusText, { color: colors.textPrimary }]}>
              {t.backup.cloudStatusReady}
            </Text>
          </View>
          <Text style={[styles.metadata, { color: colors.textSecondary }]}>
            {t.backup.cloudConnectedAs}: {email}
          </Text>
          <Text style={[styles.metadata, { color: colors.textSecondary }]}>
            {backupTime
              ? `${t.backup.cloudLastBackup}: ${backupTime}`
              : t.backup.cloudNeverBackedUp}
          </Text>
          {state?.lastBackupSizeBytes !== null &&
          state?.lastBackupSizeBytes !== undefined ? (
            <Text style={[styles.metadata, { color: colors.textSecondary }]}>
              {formatFileSize(state.lastBackupSizeBytes, language)} ·{' '}
              {state.lastTransactionCount ?? 0} {t.backup.transactions}
            </Text>
          ) : null}
          {state?.isDirty ? (
            <Text style={[styles.pending, { color: colors.warning }]}>
              {t.backup.cloudPendingChanges}
            </Text>
          ) : null}
          {state?.lastError ? (
            <Text style={[styles.pending, { color: colors.destructive }]}>
              {t.backup.cloudLastError}: {state.lastError}
            </Text>
          ) : null}
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
              {t.backup.cloudAutomatic}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t.backup.cloudAutomaticDesc}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t.backup.cloudAutomatic}
            disabled={busy || !state}
            onValueChange={onToggleAutomatic}
            thumbColor={colors.surface}
            trackColor={{ false: colors.border, true: colors.primary }}
            value={state?.enabled ?? false}
          />
        </View>

        <View style={styles.actions}>
          <AppButton
            disabled={busy}
            label={busy ? t.backup.cloudBackingUp : t.backup.cloudBackupNow}
            loading={busy}
            onPress={onBackup}
          />
          <AppButton
            disabled={busy}
            label={t.backup.cloudRestore}
            onPress={onRestore}
            variant="secondary"
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  description: { ...typography.metadata, fontSize: 12, lineHeight: 17 },
  headerCopy: { flex: 1, gap: 3 },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  metadata: { ...typography.metadata },
  pending: { ...typography.metadata, fontWeight: '700' },
  sectionGroup: { gap: spacing.xs + 2 },
  sectionLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    paddingHorizontal: spacing.xs,
    textTransform: 'uppercase',
  },
  statusBox: { borderRadius: radius.md, gap: spacing.xs, padding: spacing.sm },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  statusText: { ...typography.metadata, fontWeight: '700' },
  title: { ...typography.sectionTitle, fontSize: 15, fontWeight: '700' },
  toggleCopy: { flex: 1, gap: 2 },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  toggleTitle: { ...typography.body, fontWeight: '700' },
});
