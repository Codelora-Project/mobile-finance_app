import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import { ClaimFormHeader } from '@/features/claims/components/claim-form-header';
import { ClaimFormStepDetails } from '@/features/claims/components/claim-form-step-details';
import { ClaimFormStepExpenses } from '@/features/claims/components/claim-form-step-expenses';
import { ClaimFormStepReview } from '@/features/claims/components/claim-form-step-review';
import { useClaimFormViewModel } from '@/features/claims/hooks/use-claim-form-view-model';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export type ClaimFormScreenProps = { claimId?: number };

export function ClaimFormScreen({ claimId }: ClaimFormScreenProps) {
  const { actions, state } = useClaimFormViewModel({ claimId });

  if (state.loading) {
    return (
      <Screen style={styles.state}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Loading claim…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* 1. Header with Back/Previous & Step Indicator */}
      <ClaimFormHeader
        claimId={state.claimId}
        onBack={actions.requestBack}
        step={state.step}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {state.error ? (
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            {state.error}
          </Text>
        ) : null}

        {/* Step 1: Details (Title, Description, Period) */}
        {state.step === 1 ? (
          <ClaimFormStepDetails
            description={state.description}
            onChangeDescription={actions.setDescription}
            onChangePeriodEnd={actions.setPeriodEnd}
            onChangePeriodMode={actions.setPeriodMode}
            onChangePeriodStart={actions.setPeriodStart}
            onChangeTitle={actions.setTitle}
            onNext={() => {
              if (actions.validateDetails()) actions.setStep(2);
            }}
            periodEnd={state.periodEnd}
            periodMode={state.periodMode}
            periodStart={state.periodStart}
            title={state.title}
          />
        ) : null}

        {/* Step 2: Select Reimbursable Expenses */}
        {state.step === 2 ? (
          <ClaimFormStepExpenses
            expenses={state.expenses}
            onNext={() => {
              if (state.selectedIds.length === 0) {
                actions.setError('Select at least one reimbursable expense.');
              } else if (state.totalMinor === null) {
                actions.setError('The selected expense total is too large.');
              } else {
                actions.setError(null);
                actions.setStep(3);
              }
            }}
            onToggleExpense={actions.toggleExpense}
            selectedIds={state.selectedIds}
          />
        ) : null}

        {/* Step 3: Review & Save */}
        {state.step === 3 ? (
          <ClaimFormStepReview
            attachedCount={state.attachedCount}
            onSave={() => void actions.save()}
            periodEnd={state.periodEnd}
            periodMode={state.periodMode}
            periodStart={state.periodStart}
            saving={state.saving}
            selectedCurrency={state.selectedCurrency}
            selectedExpenses={state.selectedExpenses}
            title={state.title}
            totalMinor={state.totalMinor}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  error: {
    color: colors.destructive,
    fontSize: 14,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  stateText: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
