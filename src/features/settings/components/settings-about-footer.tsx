import Constants from 'expo-constants';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type SettingsAboutFooterProps = {
  aboutDesc: string;
  appName?: string;
  onReplayIntroduction: () => void;
  replayIntroductionLabel: string;
  version: string;
  versionLabel: string;
};

export const SettingsAboutFooter = memo(function SettingsAboutFooter({
  aboutDesc,
  appName = Constants.expoConfig?.name ?? 'KeuanganKu',
  onReplayIntroduction,
  replayIntroductionLabel,
  version,
  versionLabel,
}: SettingsAboutFooterProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.aboutFooterContainer}>
      <Text style={[styles.appName, { color: colors.textPrimary }]}>
        {appName}
      </Text>
      <Text style={[styles.appVersionText, { color: colors.textSecondary }]}>
        {versionLabel} {version}
      </Text>
      <Text style={[styles.aboutDescText, { color: colors.textSecondary }]}>
        {aboutDesc}
      </Text>
      <Pressable
        accessibilityLabel={replayIntroductionLabel}
        accessibilityRole="button"
        onPress={onReplayIntroduction}
        style={({ pressed }) => [
          styles.introductionButton,
          { borderColor: colors.border },
          pressed ? styles.pressed : null,
        ]}
      >
        <MaterialCommunityIcons
          color={colors.primary}
          name="play-circle-outline"
          size={19}
        />
        <Text style={[styles.introductionLabel, { color: colors.primary }]}>
          {replayIntroductionLabel}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  aboutDescText: {
    ...typography.metadata,
    fontSize: 11,
    lineHeight: 16,
    maxWidth: 280,
    textAlign: 'center',
  },
  aboutFooterContainer: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  appName: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
  },
  appVersionText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  introductionButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  introductionLabel: {
    ...typography.secondary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.68,
  },
});
