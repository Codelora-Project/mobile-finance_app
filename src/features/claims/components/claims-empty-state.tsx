import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { useTheme } from '@/lib/theme/theme-context';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ClaimsEmptyStateProps = {
  createLabel: string;
  description: string;
  filteredDescription: string;
  hasStatusFilter: boolean;
  onCreateClaim: () => void;
  title: string;
};

export const ClaimsEmptyState = memo(function ClaimsEmptyState({
  createLabel,
  description,
  filteredDescription,
  hasStatusFilter,
  onCreateClaim,
  title,
}: ClaimsEmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.state}>
      <Text
        accessibilityRole="header"
        style={[styles.emptyTitle, { color: colors.textPrimary }]}
      >
        {title}
      </Text>
      <Text style={[styles.stateText, { color: colors.textSecondary }]}>
        {hasStatusFilter ? filteredDescription : description}
      </Text>
      {!hasStatusFilter ? (
        <View style={styles.emptyAction}>
          <AppButton label={createLabel} onPress={onCreateClaim} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  emptyAction: {
    marginTop: spacing.lg,
    width: '100%',
  },
  emptyTitle: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  stateText: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
