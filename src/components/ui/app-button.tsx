import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type AppButtonProps = Pick<
  PressableProps,
  'accessibilityLabel' | 'disabled' | 'onPress' | 'testID'
> & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
};

export function AppButton({
  accessibilityLabel,
  disabled = false,
  label,
  loading = false,
  onPress,
  testID,
  variant = 'primary',
}: AppButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const indicatorColor =
    variant === 'primary' ? colors.surface : colors.primary;

  const variantStyle: StyleProp<ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    destructive: {
      backgroundColor: colors.surface,
      borderColor: colors.destructive,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
  }[variant];

  const labelStyle: StyleProp<TextStyle> = {
    primary: {
      color: '#FFFFFF',
    },
    secondary: {
      color: colors.textPrimary,
    },
    destructive: {
      color: colors.destructive,
    },
    ghost: {
      color: colors.primary,
    },
  }[variant];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : (
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    lineHeight: typography.body.lineHeight,
    textAlign: 'center',
  },
});
