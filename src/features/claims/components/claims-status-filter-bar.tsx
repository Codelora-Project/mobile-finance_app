import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ClaimStatus } from '@/features/claims/claim-repository';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

export type ClaimsStatusFilterBarProps = {
  onSelectStatus: (status: ClaimStatus | undefined) => void;
  selectedStatus?: ClaimStatus;
};

export const ClaimsStatusFilterBar = memo(function ClaimsStatusFilterBar({
  onSelectStatus,
  selectedStatus,
}: ClaimsStatusFilterBarProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const filters = [
    { label: t.claims.allStatuses, value: undefined },
    { label: t.claims.statusDraft, value: 'draft' as const },
    { label: t.claims.statusSubmitted, value: 'submitted' as const },
    { label: t.claims.statusReimbursed, value: 'reimbursed' as const },
    { label: t.claims.statusRejected, value: 'rejected' as const },
  ];

  return (
    <View style={styles.filters}>
      {filters.map((filter) => {
        const isSelected = filter.value === selectedStatus;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            key={filter.value ?? 'all'}
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
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    maxWidth: contentMaxWidth,
    padding: spacing.md,
    width: '100%',
  },
});
