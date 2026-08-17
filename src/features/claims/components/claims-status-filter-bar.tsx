import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ClaimStatus } from '@/features/claims/claim-repository';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

export const CLAIM_STATUS_FILTERS: readonly Readonly<{
  label: string;
  value: ClaimStatus | undefined;
}>[] = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Reimbursed', value: 'reimbursed' },
  { label: 'Rejected', value: 'rejected' },
];

export type ClaimsStatusFilterBarProps = {
  onSelectStatus: (status: ClaimStatus | undefined) => void;
  selectedStatus?: ClaimStatus;
};

export const ClaimsStatusFilterBar = memo(function ClaimsStatusFilterBar({
  onSelectStatus,
  selectedStatus,
}: ClaimsStatusFilterBarProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.filters}>
      {CLAIM_STATUS_FILTERS.map((filter) => {
        const isSelected = filter.value === selectedStatus;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={filter.label}
            onPress={() => onSelectStatus(filter.value)}
            style={[
              styles.filter,
              {
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: isSelected ? '#FFFFFF' : colors.textPrimary,
                  fontWeight: isSelected ? '700' : '400',
                },
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  filter: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterText: {
    fontSize: 14,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.md,
  },
});
