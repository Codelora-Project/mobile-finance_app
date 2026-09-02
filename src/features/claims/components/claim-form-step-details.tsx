import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import type { ClaimPeriodMode } from '@/features/claims/claim-repository';
import { useLanguage } from '@/lib/i18n/language-context';
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
  const { t } = useLanguage();

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {t.claims.detailsTitle}
      </Text>
      <AppInput
        label={t.claims.titleLabel}
        maxLength={100}
        onChangeText={onChangeTitle}
        value={title}
      />
      <AppInput
        label={t.claims.descriptionLabel}
        maxLength={500}
        multiline
        onChangeText={onChangeDescription}
        value={description}
      />
      <Text style={styles.label}>{t.claims.periodLabel}</Text>
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
              {mode === 'auto'
                ? t.claims.automaticPeriod
                : t.claims.manualPeriod}
            </Text>
          </Pressable>
        ))}
      </View>
      {periodMode === 'manual' ? (
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <AppInput
              label={t.claims.fromLabel}
              onChangeText={onChangePeriodStart}
              placeholder="YYYY-MM-DD"
              value={periodStart}
            />
          </View>
          <View style={styles.dateField}>
            <AppInput
              label={t.claims.toLabel}
              onChangeText={onChangePeriodEnd}
              placeholder="YYYY-MM-DD"
              value={periodEnd}
            />
          </View>
        </View>
      ) : null}
      <AppButton label={t.claims.selectExpenses} onPress={onNext} />
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
