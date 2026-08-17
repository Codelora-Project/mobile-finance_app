import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type SettingsAboutFooterProps = {
  aboutDesc: string;
  version: string;
  versionLabel: string;
};

export const SettingsAboutFooter = memo(function SettingsAboutFooter({
  aboutDesc,
  version,
  versionLabel,
}: SettingsAboutFooterProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.aboutFooterContainer}>
      <Text style={[styles.appName, { color: colors.textPrimary }]}>
        Personal Finance
      </Text>
      <Text style={[styles.appVersionText, { color: colors.textSecondary }]}>
        {versionLabel} {version}
      </Text>
      <Text style={[styles.aboutDescText, { color: colors.textSecondary }]}>
        {aboutDesc}
      </Text>
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
    gap: 4,
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
});
