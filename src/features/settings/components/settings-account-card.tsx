import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { AuthUser } from '@/features/auth/auth-types';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type SettingsAccountCardProps = {
  claimingLegacy: boolean;
  isBusy: boolean;
  language: Language;
  onClaimLegacy(): void;
  onLogout(): void;
  showLegacyAction: boolean;
  user: AuthUser;
};

export function SettingsAccountCard({
  claimingLegacy,
  isBusy,
  language,
  onClaimLegacy,
  onLogout,
  showLegacyAction,
  user,
}: SettingsAccountCardProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);

  const initial = (user.name?.trim() || user.email).charAt(0).toUpperCase();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {t.settings.accountSection}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.profileRow}>
          {user.photoUrl && user.photoUrl !== failedPhotoUrl ? (
            <Image
              accessibilityLabel={user.name ?? user.email}
              onError={() => setFailedPhotoUrl(user.photoUrl)}
              source={{ uri: user.photoUrl }}
              style={styles.avatar}
            />
          ) : (
            <View
              style={[styles.avatar, { backgroundColor: colors.primaryLight }]}
            >
              <Text style={[styles.initial, { color: colors.primary }]}>
                {initial}
              </Text>
            </View>
          )}
          <View style={styles.identity}>
            <Text
              numberOfLines={1}
              style={[styles.name, { color: colors.textPrimary }]}
            >
              {user.name || user.email}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.email, { color: colors.textSecondary }]}
            >
              {user.email}
            </Text>
            <View style={styles.offlineRow}>
              <MaterialCommunityIcons
                color={colors.positive}
                name="check-circle-outline"
                size={14}
              />
              <Text style={[styles.offline, { color: colors.positive }]}>
                {t.settings.offlineReady}
              </Text>
            </View>
          </View>
        </View>

        {showLegacyAction ? (
          <Pressable
            accessibilityRole="button"
            disabled={claimingLegacy}
            onPress={onClaimLegacy}
            style={({ pressed }) => [
              styles.actionRow,
              { borderTopColor: colors.border },
              pressed ? styles.pressed : null,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.primary}
              name="database-import-outline"
              size={20}
            />
            <Text style={[styles.actionLabel, { color: colors.primary }]}>
              {t.settings.connectLegacyData}
            </Text>
            {claimingLegacy ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <MaterialCommunityIcons
                color={colors.textMuted}
                name="chevron-right"
                size={20}
              />
            )}
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={onLogout}
          style={({ pressed }) => [
            styles.actionRow,
            { borderTopColor: colors.border },
            pressed ? styles.pressed : null,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.destructive}
            name="logout"
            size={20}
          />
          <Text style={[styles.actionLabel, { color: colors.destructive }]}>
            {t.settings.signOut}
          </Text>
          {isBusy ? (
            <ActivityIndicator color={colors.destructive} size="small" />
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionLabel: { ...typography.body, flex: 1, fontWeight: '700' },
  actionRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  email: { ...typography.metadata },
  identity: { flex: 1, gap: 2 },
  initial: { fontSize: 20, fontWeight: '800' },
  name: { ...typography.body, fontWeight: '800' },
  offline: { ...typography.metadata, fontWeight: '700' },
  offlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 2,
  },
  pressed: { opacity: 0.7 },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  section: { gap: spacing.xs },
  sectionLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xs,
  },
});
