import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { useTheme } from '@/lib/theme/theme-context';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ClaimsEmptyStateProps = {
  hasStatusFilter: boolean;
  onCreateClaim: () => void;
};

export const ClaimsEmptyState = memo(function ClaimsEmptyState({
  hasStatusFilter,
  onCreateClaim,
}: ClaimsEmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.state}>
      <Text
        accessibilityRole="header"
        style={[styles.emptyTitle, { color: colors.textPrimary }]}
      >
        No claims found
      </Text>
      <Text style={[styles.stateText, { color: colors.textSecondary }]}>
        {hasStatusFilter
          ? 'Try selecting a different status filter.'
          : 'Submit work expenses for reimbursement by creating a claim.'}
      </Text>
      {!hasStatusFilter ? (
        <View style={styles.emptyAction}>
          <AppButton label="Create Claim" onPress={onCreateClaim} />
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
