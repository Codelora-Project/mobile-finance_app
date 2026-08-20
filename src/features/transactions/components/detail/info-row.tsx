import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type DetailInfoRowProps = {
  customValue?: React.ReactNode;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor?: string;
  isLast?: boolean;
  label: string;
  onPress?: () => void;
  rightActionIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  value?: string | null;
  valueColor?: string;
};

export const DetailInfoRow = memo(function DetailInfoRow({
  customValue,
  icon,
  iconColor,
  isLast = false,
  label,
  onPress,
  rightActionIcon,
  value,
  valueColor,
}: DetailInfoRowProps) {
  const { colors, isDark } = useTheme();

  const content = (
    <View
      style={[
        styles.rowContainer,
        !isLast
          ? [
              styles.rowDivider,
              {
                borderBottomColor: isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'rgba(0, 0, 0, 0.05)',
              },
            ]
          : null,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.05)'
              : '#F1F5F9',
          },
        ]}
      >
        <MaterialCommunityIcons
          color={iconColor || colors.textSecondary}
          name={icon}
          size={18}
        />
      </View>

      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>

      <View style={styles.valueContainer}>
        {customValue ? (
          customValue
        ) : (
          <View style={styles.valueWithIconRow}>
            <Text
              numberOfLines={2}
              style={[
                styles.rowValue,
                { color: valueColor || colors.textPrimary },
              ]}
            >
              {value || '-'}
            </Text>
            {rightActionIcon ? (
              <MaterialCommunityIcons
                color={colors.primary}
                name={rightActionIcon}
                size={16}
              />
            ) : null}
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }

  return content;
});

export { DetailInfoRow as TransactionDetailItemRow };

const styles = StyleSheet.create({
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pressed: {
    opacity: 0.7,
  },
  rowContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
  },
  rowLabel: {
    ...typography.metadata,
    fontSize: 13,
    fontWeight: '500',
  },
  rowValue: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  valueContainer: {
    alignItems: 'flex-end',
    flex: 1,
  },
  valueWithIconRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});
