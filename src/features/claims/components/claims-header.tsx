import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ClaimsHeaderProps = {
  backLabel: string;
  newClaimLabel: string;
  onBack: () => void;
  onNewClaim?: () => void;
  title: string;
};

export const ClaimsHeader = memo(function ClaimsHeader({
  backLabel,
  newClaimLabel,
  onBack,
  onNewClaim,
  title,
}: ClaimsHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Pressable
        accessibilityLabel={backLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <MaterialCommunityIcons
          color={colors.textPrimary}
          name="chevron-left"
          size={28}
        />
      </Pressable>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.textPrimary }]}
      >
        {title}
      </Text>
      {onNewClaim ? (
        <AppButton label={newClaimLabel} onPress={onNewClaim} variant="ghost" />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginLeft: -spacing.sm,
    width: 40,
  },
  header: {
    alignSelf: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: contentMaxWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: '100%',
  },
  title: {
    flex: 1,
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight,
  },
  pressed: {
    opacity: 0.65,
  },
});
