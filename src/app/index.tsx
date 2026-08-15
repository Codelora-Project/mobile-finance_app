import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function BootstrapRoute() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.screen}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            Personal Finance
          </Text>
          <Text style={styles.message}>
            Set up the categories and payment methods used to organize your
            transactions.
          </Text>
        </View>

        <View style={styles.actions}>
          <AppButton
            label="Categories"
            onPress={() => router.push('/categories')}
          />
          <AppButton
            label="Payment methods"
            onPress={() => router.push('/payment-methods')}
            variant="secondary"
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight,
  },
  message: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
});
