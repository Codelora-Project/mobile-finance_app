import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type AppInputProps = TextInputProps & {
  error?: string | null;
  label: string;
};

export function AppInput({ error, label, style, ...props }: AppInputProps) {
  const { colors } = useTheme();

  return (
    <View>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.destructive : colors.border,
            color: colors.textPrimary,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.error, { color: colors.destructive }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
    lineHeight: typography.secondary.lineHeight,
    marginBottom: spacing.xs,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: typography.body.fontSize,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  error: {
    fontSize: typography.secondary.fontSize,
    lineHeight: typography.secondary.lineHeight,
    marginTop: spacing.xs,
  },
});
