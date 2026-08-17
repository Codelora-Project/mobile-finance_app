import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { useTheme } from '@/lib/theme/theme-context';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ClaimsHeaderProps = {
  onNewClaim: () => void;
  title?: string;
};

export const ClaimsHeader = memo(function ClaimsHeader({
  onNewClaim,
  title = 'Claims',
}: ClaimsHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.textPrimary }]}
      >
        {title}
      </Text>
      <AppButton
        label="New Claim"
        onPress={onNewClaim}
        variant="ghost"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight,
  },
});
