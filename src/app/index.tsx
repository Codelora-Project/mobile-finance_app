import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function BootstrapRoute() {
  const router = useRouter();
  const { feedback, savedTransactionId } = useLocalSearchParams<{
    feedback?: string | string[];
    savedTransactionId?: string | string[];
  }>();
  const feedbackMessage = Array.isArray(feedback) ? feedback[0] : feedback;
  const savedIdValue = Array.isArray(savedTransactionId)
    ? savedTransactionId[0]
    : savedTransactionId;
  const savedId = Number(savedIdValue);
  const canEditSavedTransaction = Number.isSafeInteger(savedId) && savedId > 0;

  return (
    <Screen>
      <View style={styles.screen}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            Personal Finance
          </Text>
          <Text style={styles.message}>
            Record expenses and income, or manage the categories and payment
            methods used to organize them.
          </Text>
        </View>

        {feedbackMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.feedback}>
            {feedbackMessage}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <AppButton
            label="Transactions"
            onPress={() => router.push('/transactions')}
          />
          <AppButton
            label="Add transaction"
            onPress={() => router.push('/transactions/new')}
            variant="secondary"
          />
          {canEditSavedTransaction ? (
            <AppButton
              label="Edit saved transaction"
              onPress={() => router.push(`/transactions/${savedId}/edit`)}
              variant="secondary"
            />
          ) : null}
          <AppButton
            label="Categories"
            onPress={() => router.push('/categories')}
            variant="secondary"
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
  feedback: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    color: colors.positive,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
});
