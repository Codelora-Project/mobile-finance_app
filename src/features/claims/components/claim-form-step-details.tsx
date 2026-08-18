import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import type { ClaimPeriodMode } from '@/features/claims/claim-repository';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ClaimFormStepDetailsProps = {
  description: string;
  onChangeDescription: (value: string) => void;
  onChangePeriodEnd: (value: string) => void;
  onChangePeriodMode: (mode: ClaimPeriodMode) => void;
  onChangePeriodStart: (value: string) => void;
  onChangeTitle: (value: string) => void;
  onNext: () => void;
  periodEnd: string;
  periodMode: ClaimPeriodMode;
  periodStart: string;
  title: string;
};

export const ClaimFormStepDetails = memo(function ClaimFormStepDetails({
  description,
  onChangeDescription,
  onChangePeriodEnd,
  onChangePeriodMode,
  onChangePeriodStart,
  onChangeTitle,
  onNext,
  periodEnd,
  periodMode,
  periodStart,
  title,
}: ClaimFormStepDetailsProps) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Claim details
      </Text>
      <AppInput
        label="Title *"
        maxLength={100}
        onChangeText={onChangeTitle}
        value={title}
      />
      <AppInput
        label="Description"
        maxLength={500}
        multiline
        onChangeText={onChangeDescription}
        value={description}
      />
      <Text style={styles.label}>Period</Text>
      <View style={styles.choiceRow}>
        {(['auto', 'manual'] as const).map((mode) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: periodMode === mode }}
            key={mode}
            onPress={() => onChangePeriodMode(mode)}
            style={[
              styles.choice,
              periodMode === mode ? styles.choiceSelected : null,
            ]}
          >
            <Text style={styles.choiceText}>
              {mode === 'auto' ? 'Based on expense dates' : 'Manual'}
            </Text>
          </Pressable>
        ))}
      </View>
      {periodMode === 'manual' ? (
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <AppInput
              label="From"
              onChangeText={onChangePeriodStart}
              placeholder="YYYY-MM-DD"
              value={periodStart}
            />
          </View>
          <View style={styles.dateField}>
            <AppInput
              label="To"
              onChangeText={onChangePeriodEnd}
              placeholder="YYYY-MM-DD"
              value={periodEnd}
            />
          </View>
        </View>
      ) : null}
      <AppButton
        label="Select Expenses"
        onPress={onNext}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  choice: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  choiceSelected: {
    borderColor: colors.primary,
  },
  choiceText: {
    textAlign: 'center',
  },
  dateField: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
});
