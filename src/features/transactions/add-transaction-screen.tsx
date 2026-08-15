import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type AddOptionProps = Readonly<{
  description: string;
  disabled?: boolean;
  label: string;
  onPress?: () => void;
}>;

function AddOption({
  description,
  disabled = false,
  label,
  onPress,
}: AddOptionProps) {
  return (
    <View style={styles.option}>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <AppButton
        accessibilityLabel={label}
        disabled={disabled}
        label="Choose"
        onPress={onPress}
        variant="secondary"
      />
    </View>
  );
}

export function AddTransactionScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.header}>
        <AppButton label="Back" onPress={() => router.back()} variant="ghost" />
        <Text accessibilityRole="header" style={styles.title}>
          Add Transaction
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        <Text style={styles.intro}>
          Choose how you want to record this transaction.
        </Text>
        <View style={styles.options}>
          <AddOption
            description="Enter an expense or income without scanning."
            label="Enter Manually"
            onPress={() => router.push('/transactions/new')}
          />
          <AddOption
            description="Capture a receipt with the camera."
            label="Scan Receipt"
            onPress={() => router.push('/receipt/camera')}
          />
          <AddOption
            description="Choose one receipt image from your gallery."
            label="Import Receipt"
            onPress={() => router.push('/receipt/import')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 72,
  },
  content: {
    padding: spacing.lg,
  },
  intro: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  options: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 104,
    padding: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  optionDescription: {
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
    lineHeight: typography.secondary.lineHeight,
    marginTop: spacing.xs,
  },
});
