import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { useLanguage } from '@/lib/i18n/language-context';
import { typography } from '@/theme/typography';

export type ClaimFormHeaderProps = {
  claimId?: number;
  onBack: () => void;
  step: 1 | 2 | 3;
};

export const ClaimFormHeader = memo(function ClaimFormHeader({
  claimId,
  onBack,
  step,
}: ClaimFormHeaderProps) {
  const { t } = useLanguage();

  return (
    <View style={styles.header}>
      <AppButton
        label={step === 1 ? t.common.back : t.claims.previous}
        onPress={onBack}
        variant="ghost"
      />
      <Text accessibilityRole="header" style={styles.title}>
        {claimId === undefined ? t.claims.newClaim : t.claims.editClaimTitle}
      </Text>
      <Text style={styles.step}>
        {t.claims.stepProgress.replace('{step}', String(step))}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  step: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
});
