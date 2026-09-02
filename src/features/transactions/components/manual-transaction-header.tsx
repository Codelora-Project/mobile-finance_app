import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ManualTransactionHeaderProps = {
  deleting?: boolean;
  isEditMode: boolean;
  onClose: () => void;
  onDelete?: () => void;
  title: string;
};

export const ManualTransactionHeader = memo(function ManualTransactionHeader({
  deleting,
  isEditMode,
  onClose,
  onDelete,
  title,
}: ManualTransactionHeaderProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View
      style={[
        styles.topBar,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={t.transactions.closeForm}
        accessibilityRole="button"
        hitSlop={12}
        onPress={onClose}
        style={styles.closeBtn}
      >
        <MaterialCommunityIcons
          color={colors.textPrimary}
          name="close"
          size={24}
        />
      </Pressable>

      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[styles.screenTitle, { color: colors.textPrimary }]}
      >
        {title}
      </Text>

      {isEditMode && onDelete ? (
        <Pressable
          accessibilityLabel={t.transactions.deleteTransactionAccessibility}
          accessibilityRole="button"
          disabled={deleting}
          hitSlop={12}
          onPress={onDelete}
          style={styles.deleteTopBtn}
        >
          <MaterialCommunityIcons
            color={colors.destructive}
            name="trash-can-outline"
            size={22}
          />
        </Pressable>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  closeBtn: {
    padding: spacing.xs,
  },
  deleteTopBtn: {
    padding: spacing.xs,
  },
  headerSpacer: {
    width: 32,
  },
  screenTitle: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  topBar: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
});
